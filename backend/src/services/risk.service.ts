import pool from '../database/connection';
import { StatsService } from './stats.service';

export interface RiskCalculation {
  suggested_position_size: number;
  risk_per_share: number;
  risk_amount: number;
  target_3r: number;
  risk_percent: number;
}

export class RiskService {
  private statsService = new StatsService();

  async calculatePositionSize(
    symbol: string,
    entry_price: number,
    stop_price: number,
    risk_pct?: number
  ): Promise<RiskCalculation> {
    try {
      // Obtener equity actual
      const overview = await this.statsService.getOverview();
      const current_equity = overview.equity;
      
      // Obtener configuración de riesgo por defecto
      const settingsResult = await pool.query('SELECT risk_pct FROM settings LIMIT 1');
      const default_risk_pct = settingsResult.rows[0]?.risk_pct || 1.0;
      
      // Usar el riesgo proporcionado o el por defecto
      const final_risk_pct = risk_pct || default_risk_pct;
      
      // Calcular riesgo por acción
      const risk_per_share = Math.abs(entry_price - stop_price);
      
      if (risk_per_share <= 0) {
        throw new Error('El precio de stop debe ser diferente al precio de entrada');
      }
      
      // Calcular cantidad de riesgo en euros
      const risk_amount = (current_equity * final_risk_pct) / 100;
      
      // Calcular tamaño de posición sugerido
      const suggested_position_size = Math.floor(risk_amount / risk_per_share);
      
      // Calcular target 3R
      const target_3r = entry_price > stop_price 
        ? entry_price + (3 * risk_per_share)  // Long position
        : entry_price - (3 * risk_per_share); // Short position
      
      return {
        suggested_position_size,
        risk_per_share,
        risk_amount,
        target_3r,
        risk_percent: final_risk_pct
      };
      
    } catch (error) {
      console.error('Error calculating position size:', error);
      throw error;
    }
  }
  
  async calculateRMultiple(
    entry_price: number,
    exit_price: number,
    stop_price: number,
    side: 'BUY' | 'SELL'
  ): Promise<number> {
    const risk_per_share = Math.abs(entry_price - stop_price);
    
    if (risk_per_share <= 0) {
      return 0;
    }
    
    let profit_per_share: number;
    
    if (side === 'BUY') {
      profit_per_share = exit_price - entry_price;
    } else {
      profit_per_share = entry_price - exit_price;
    }
    
    return profit_per_share / risk_per_share;
  }
  
  async getRDistribution(from?: string, to?: string): Promise<Record<string, number>> {
    const client = await pool.connect();
    
    try {
      let query = `
        SELECT 
          e_buy.price as entry_price,
          e_sell.price as exit_price,
          e_buy.notes as stop_info,
          lm.quantity,
          lm.realized_pnl
        FROM lot_matches lm
        JOIN executions e_sell ON lm.sell_execution_id = e_sell.id
        JOIN buy_lots bl ON lm.buy_lot_id = bl.id
        JOIN executions e_buy ON bl.execution_id = e_buy.id
        WHERE e_buy.notes IS NOT NULL
      `;
      
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      if (from) {
        conditions.push(`e_sell.executed_at >= $${paramIndex++}`);
        values.push(from);
      }
      
      if (to) {
        conditions.push(`e_sell.executed_at <= $${paramIndex++}`);
        values.push(to);
      }
      
      if (conditions.length > 0) {
        query += ' AND ' + conditions.join(' AND ');
      }
      
      const result = await client.query(query, values);
      
      const rDistribution: Record<string, number> = {
        '< -2R': 0,
        '-2R a -1R': 0,
        '-1R a 0R': 0,
        '0R a 1R': 0,
        '1R a 2R': 0,
        '2R a 3R': 0,
        '> 3R': 0
      };
      
      for (const row of result.rows) {
        // Intentar extraer el stop del campo notes
        const stopMatch = row.stop_info?.match(/stop[:\s]*([0-9.]+)/i);
        if (!stopMatch) continue;
        
        const stop_price = parseFloat(stopMatch[1]);
        const r_multiple = await this.calculateRMultiple(
          row.entry_price,
          row.exit_price,
          stop_price,
          'BUY'
        );
        
        if (r_multiple < -2) rDistribution['< -2R']++;
        else if (r_multiple >= -2 && r_multiple < -1) rDistribution['-2R a -1R']++;
        else if (r_multiple >= -1 && r_multiple < 0) rDistribution['-1R a 0R']++;
        else if (r_multiple >= 0 && r_multiple < 1) rDistribution['0R a 1R']++;
        else if (r_multiple >= 1 && r_multiple < 2) rDistribution['1R a 2R']++;
        else if (r_multiple >= 2 && r_multiple < 3) rDistribution['2R a 3R']++;
        else if (r_multiple >= 3) rDistribution['> 3R']++;
      }
      
      return rDistribution;
      
    } finally {
      client.release();
    }
  }
}