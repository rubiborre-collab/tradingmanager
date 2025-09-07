import pool from '../database/connection';
import { StatsOverview, DailyPnL, SetupStats } from '../types';
import { format } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz/utcToZonedTime';

const TIMEZONE = 'Europe/Madrid';

export class StatsService {
  
  async getOverview(): Promise<StatsOverview> {
    const client = await pool.connect();
    
    try {
      // Obtener configuración inicial
      const settingsResult = await client.query('SELECT starting_cash FROM settings LIMIT 1');
      const startingCash = settingsResult.rows[0]?.starting_cash || 10000;
      
      // Obtener flujos de caja
      const cashFlowsResult = await client.query(
        `SELECT SUM(CASE WHEN type = 'DEPOSIT' THEN amount ELSE -amount END) as net_cash_flows
         FROM cash_flows`
      );
      const netCashFlows = cashFlowsResult.rows[0]?.net_cash_flows || 0;
      
      // Obtener PnL realizado e no realizado
      const pnlResult = await client.query(
        `SELECT 
           SUM(realized_pnl) as total_realized_pnl,
           SUM(unrealized_pnl) as total_unrealized_pnl
         FROM positions`
      );
      
      const realizedPnL = pnlResult.rows[0]?.total_realized_pnl || 0;
      const unrealizedPnL = pnlResult.rows[0]?.total_unrealized_pnl || 0;
      
      // Calcular equity
      const equity = startingCash + netCashFlows + realizedPnL + unrealizedPnL;
      
      // Calcular winrate
      const winrateResult = await client.query(
        `SELECT 
           COUNT(CASE WHEN realized_pnl > 0 THEN 1 END) as wins,
           COUNT(*) as total_trades
         FROM positions 
         WHERE closed_at IS NOT NULL AND realized_pnl != 0`
      );
      
      const wins = winrateResult.rows[0]?.wins || 0;
      const totalTrades = winrateResult.rows[0]?.total_trades || 0;
      const winrate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
      
      // Calcular payoff
      const payoffResult = await client.query(
        `SELECT 
           AVG(CASE WHEN realized_pnl > 0 THEN realized_pnl END) as avg_win,
           AVG(CASE WHEN realized_pnl < 0 THEN ABS(realized_pnl) END) as avg_loss
         FROM positions 
         WHERE closed_at IS NOT NULL AND realized_pnl != 0`
      );
      
      const avgWin = payoffResult.rows[0]?.avg_win || 0;
      const avgLoss = payoffResult.rows[0]?.avg_loss || 0;
      const payoff = avgLoss > 0 ? avgWin / avgLoss : 0;
      
      // Top símbolos
      const topSymbolsResult = await client.query(
        `SELECT 
           symbol,
           SUM(realized_pnl) as pnl,
           COUNT(*) as trades
         FROM positions 
         WHERE closed_at IS NOT NULL
         GROUP BY symbol
         ORDER BY pnl DESC
         LIMIT 10`
      );
      
      // Top setups por entry_reason
      const topSetupsResult = await client.query(
        `SELECT 
           p.symbol,
           e.entry_reason as setup,
           SUM(p.realized_pnl) as pnl,
           COUNT(DISTINCT p.id) as trades,
           COUNT(CASE WHEN p.realized_pnl > 0 THEN 1 END) * 100.0 / COUNT(*) as winrate
         FROM positions p
         JOIN executions e ON p.id = e.position_id AND e.side = 'BUY'
         WHERE p.closed_at IS NOT NULL AND e.entry_reason IS NOT NULL
         GROUP BY p.symbol, e.entry_reason
         HAVING COUNT(*) >= 3
         ORDER BY pnl DESC
         LIMIT 10`
      );
      
      return {
        equity: parseFloat(equity.toFixed(2)),
        realized_pnl: parseFloat(realizedPnL.toFixed(2)),
        unrealized_pnl: parseFloat(unrealizedPnL.toFixed(2)),
        max_drawdown: 0, // TODO: Calcular drawdown máximo
        winrate: parseFloat(winrate.toFixed(2)),
        payoff: parseFloat(payoff.toFixed(2)),
        avg_risk_per_trade: 0, // TODO: Calcular riesgo promedio
        r_distribution: {}, // TODO: Calcular distribución de R
        top_symbols: topSymbolsResult.rows.map(row => ({
          symbol: row.symbol,
          pnl: parseFloat(row.pnl),
          trades: parseInt(row.trades)
        })),
        top_setups: topSetupsResult.rows.map(row => ({
          setup: row.setup,
          pnl: parseFloat(row.pnl),
          trades: parseInt(row.trades),
          winrate: parseFloat(row.winrate)
        }))
      };
      
    } finally {
      client.release();
    }
  }
  
  async getDailyPnL(from?: string, to?: string): Promise<DailyPnL[]> {
    const client = await pool.connect();
    
    try {
      let query = `
        SELECT 
          DATE(executed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid') as date,
          SUM(lm.realized_pnl) as realized_pnl,
          ARRAY_AGG(DISTINCT e.symbol) as symbols
        FROM lot_matches lm
        JOIN executions e ON lm.sell_execution_id = e.id
      `;
      
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      if (from) {
        conditions.push(`DATE(executed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid') >= $${paramIndex++}`);
        values.push(from);
      }
      
      if (to) {
        conditions.push(`DATE(executed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid') <= $${paramIndex++}`);
        values.push(to);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += `
        GROUP BY DATE(executed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid')
        ORDER BY date DESC
      `;
      
      const result = await client.query(query, values);
      
      return result.rows.map(row => ({
        date: format(new Date(row.date), 'yyyy-MM-dd'),
        realized_pnl: parseFloat(row.realized_pnl),
        symbols: row.symbols.filter((s: string) => s) // Remove nulls
      }));
      
    } finally {
      client.release();
    }
  }
  
  async getSetupStats(from?: string, to?: string): Promise<SetupStats[]> {
    const client = await pool.connect();
    
    try {
      let query = `
        SELECT 
          e.entry_reason as setup,
          COUNT(DISTINCT p.id) as trades,
          COUNT(CASE WHEN p.realized_pnl > 0 THEN 1 END) * 100.0 / COUNT(DISTINCT p.id) as winrate,
          SUM(p.realized_pnl) as pnl,
          AVG(CASE WHEN p.realized_pnl > 0 THEN p.realized_pnl END) as avg_win,
          AVG(CASE WHEN p.realized_pnl < 0 THEN ABS(p.realized_pnl) END) as avg_loss
        FROM positions p
        JOIN executions e ON p.id = e.position_id AND e.side = 'BUY'
        WHERE p.closed_at IS NOT NULL AND e.entry_reason IS NOT NULL
      `;
      
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      if (from) {
        conditions.push(`p.closed_at >= $${paramIndex++}`);
        values.push(from);
      }
      
      if (to) {
        conditions.push(`p.closed_at <= $${paramIndex++}`);
        values.push(to);
      }
      
      if (conditions.length > 0) {
        query += ' AND ' + conditions.join(' AND ');
      }
      
      query += `
        GROUP BY e.entry_reason
        HAVING COUNT(DISTINCT p.id) >= 3
        ORDER BY pnl DESC
      `;
      
      const result = await client.query(query, values);
      
      return result.rows.map(row => ({
        setup: row.setup,
        winrate: parseFloat(row.winrate || 0),
        pnl: parseFloat(row.pnl || 0),
        trades: parseInt(row.trades || 0),
        payoff: (row.avg_loss && row.avg_loss > 0) ? parseFloat(row.avg_win || 0) / parseFloat(row.avg_loss) : 0
      }));
      
    } finally {
      client.release();
    }
  }
}