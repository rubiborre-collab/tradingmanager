import pool from '../database/connection';
import { 
  Execution, 
  Position, 
  BuyLot, 
  LotMatch, 
  ExecutionSide, 
  ExecutionStatus,
  CreateExecutionRequest,
  UpdateExecutionRequest 
} from '../types';
import { format, parseISO } from 'date-fns';
import { zonedTimeToUtc } from 'date-fns-tz/zonedTimeToUtc';
import { utcToZonedTime } from 'date-fns-tz/utcToZonedTime';

const TIMEZONE = 'Europe/Madrid';

export class TradingService {
  
  async createExecution(data: CreateExecutionRequest): Promise<Execution> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Verificar idempotencia
      if (data.external_id) {
        const existingResult = await client.query(
          'SELECT * FROM executions WHERE external_id = $1',
          [data.external_id]
        );
        
        if (existingResult.rows.length > 0) {
          await client.query('ROLLBACK');
          return existingResult.rows[0] as Execution;
        }
      }
      
      // Encontrar o crear posición
      let position = await this.findOrCreatePosition(client, data.symbol);
      
      // Preparar datos de ejecución
      const executedAt = data.executed_at 
        ? zonedTimeToUtc(parseISO(data.executed_at), TIMEZONE)
        : new Date();
      
      const fee = data.fee ?? 0.34;
      
      // Determinar status
      const status = (data.side === ExecutionSide.BUY && !data.entry_reason) || 
                    (data.side === ExecutionSide.SELL && !data.exit_reason)
                    ? ExecutionStatus.INCOMPLETO 
                    : ExecutionStatus.COMPLETO;
      
      // Crear ejecución
      const executionResult = await client.query(
        `INSERT INTO executions 
         (symbol, side, quantity, price, fee, executed_at, notes, entry_reason, exit_reason, external_id, position_id, tags, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          data.symbol,
          data.side,
          data.quantity,
          data.price,
          fee,
          executedAt,
          data.notes || null,
          data.entry_reason || null,
          data.exit_reason || null,
          data.external_id || null,
          position.id,
          data.tags || [],
          status
        ]
      );
      
      const execution = executionResult.rows[0] as Execution;
      
      // Aplicar lógica de trading
      if (data.side === ExecutionSide.BUY) {
        await this.processBuyExecution(client, execution, position);
      } else {
        await this.processSellExecution(client, execution, position);
      }
      
      await client.query('COMMIT');
      return execution;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  async updateExecution(id: string, data: UpdateExecutionRequest): Promise<Execution> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (data.notes !== undefined) {
      updateFields.push(`notes = $${paramIndex++}`);
      values.push(data.notes);
    }
    
    if (data.entry_reason !== undefined) {
      updateFields.push(`entry_reason = $${paramIndex++}`);
      values.push(data.entry_reason);
    }
    
    if (data.exit_reason !== undefined) {
      updateFields.push(`exit_reason = $${paramIndex++}`);
      values.push(data.exit_reason);
    }
    
    if (data.status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    
    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }
    
    values.push(id);
    
    const query = `
      UPDATE executions 
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('Execution not found');
    }
    
    return result.rows[0] as Execution;
  }
  
  private async findOrCreatePosition(client: any, symbol: string): Promise<Position> {
    // Buscar posición abierta
    let result = await client.query(
      'SELECT * FROM positions WHERE symbol = $1 AND closed_at IS NULL ORDER BY created_at DESC LIMIT 1',
      [symbol]
    );
    
    if (result.rows.length > 0) {
      return result.rows[0] as Position;
    }
    
    // Crear nueva posición
    result = await client.query(
      `INSERT INTO positions (symbol, open_quantity, avg_cost, realized_pnl, unrealized_pnl, max_drawdown)
       VALUES ($1, 0, 0, 0, 0, 0)
       RETURNING *`,
      [symbol]
    );
    
    return result.rows[0] as Position;
  }
  
  private async processBuyExecution(client: any, execution: Execution, position: Position): Promise<void> {
    // Crear buy_lot
    await client.query(
      `INSERT INTO buy_lots (position_id, execution_id, qty_remaining, price)
       VALUES ($1, $2, $3, $4)`,
      [position.id, execution.id, execution.quantity, execution.price]
    );
    
    // Actualizar posición
    const newQuantity = position.open_quantity + execution.quantity;
    const newAvgCost = newQuantity > 0 
      ? ((position.avg_cost * position.open_quantity) + (execution.price * execution.quantity)) / newQuantity
      : 0;
    
    await client.query(
      `UPDATE positions 
       SET open_quantity = $1, avg_cost = $2, updated_at = NOW()
       WHERE id = $3`,
      [newQuantity, newAvgCost, position.id]
    );
  }
  
  private async processSellExecution(client: any, execution: Execution, position: Position): Promise<void> {
    let remainingQty = execution.quantity;
    let totalRealizedPnL = 0;
    
    // Obtener lotes de compra ordenados por FIFO
    const buyLotsResult = await client.query(
      `SELECT * FROM buy_lots 
       WHERE position_id = $1 AND qty_remaining > 0 
       ORDER BY created_at ASC`,
      [position.id]
    );
    
    const buyLots = buyLotsResult.rows as BuyLot[];
    
    for (const lot of buyLots) {
      if (remainingQty <= 0) break;
      
      const matchQty = Math.min(remainingQty, lot.qty_remaining);
      
      // Calcular PnL realizado (incluye comisiones)
      const grossProfit = (execution.price - lot.price) * matchQty;
      const realizedPnL = grossProfit - execution.fee - (execution.fee * (matchQty / execution.quantity));
      
      // Crear lot_match
      await client.query(
        `INSERT INTO lot_matches (sell_execution_id, buy_lot_id, quantity, realized_pnl)
         VALUES ($1, $2, $3, $4)`,
        [execution.id, lot.id, matchQty, realizedPnL]
      );
      
      // Actualizar buy_lot
      await client.query(
        'UPDATE buy_lots SET qty_remaining = qty_remaining - $1 WHERE id = $2',
        [matchQty, lot.id]
      );
      
      remainingQty -= matchQty;
      totalRealizedPnL += realizedPnL;
    }
    
    // Actualizar posición
    const newOpenQuantity = position.open_quantity - (execution.quantity - remainingQty);
    const newRealizedPnL = position.realized_pnl + totalRealizedPnL;
    
    await client.query(
      `UPDATE positions 
       SET open_quantity = $1, realized_pnl = $2, updated_at = NOW(), closed_at = CASE WHEN $1 = 0 THEN NOW() ELSE closed_at END
       WHERE id = $3`,
      [newOpenQuantity, newRealizedPnL, position.id]
    );
  }
  
  async getExecutions(filters: {
    symbol?: string;
    side?: ExecutionSide;
    from?: string;
    to?: string;
    status?: ExecutionStatus;
  }): Promise<Execution[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (filters.symbol) {
      conditions.push(`symbol = $${paramIndex++}`);
      values.push(filters.symbol);
    }
    
    if (filters.side) {
      conditions.push(`side = $${paramIndex++}`);
      values.push(filters.side);
    }
    
    if (filters.from) {
      conditions.push(`executed_at >= $${paramIndex++}`);
      values.push(zonedTimeToUtc(parseISO(filters.from), TIMEZONE));
    }
    
    if (filters.to) {
      conditions.push(`executed_at <= $${paramIndex++}`);
      values.push(zonedTimeToUtc(parseISO(filters.to), TIMEZONE));
    }
    
    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    }
    
    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    
    const query = `
      SELECT * FROM executions 
      ${whereClause}
      ORDER BY executed_at DESC
    `;
    
    const result = await pool.query(query, values);
    return result.rows as Execution[];
  }
  
  async getPositions(): Promise<Position[]> {
    const result = await pool.query(
      'SELECT * FROM positions ORDER BY created_at DESC'
    );
    return result.rows as Position[];
  }
  
  async getPositionById(id: string): Promise<Position | null> {
    const result = await pool.query(
      'SELECT * FROM positions WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0] as Position;
  }
  
  async getPositionDetails(id: string) {
    const client = await pool.connect();
    
    try {
      // Obtener posición
      const positionResult = await client.query(
        'SELECT * FROM positions WHERE id = $1',
        [id]
      );
      
      if (positionResult.rows.length === 0) {
        return null;
      }
      
      const position = positionResult.rows[0] as Position;
      
      // Obtener ejecuciones
      const executionsResult = await client.query(
        'SELECT * FROM executions WHERE position_id = $1 ORDER BY executed_at',
        [id]
      );
      
      // Obtener lotes
      const lotsResult = await client.query(
        `SELECT bl.*, e.symbol, e.executed_at 
         FROM buy_lots bl
         JOIN executions e ON bl.execution_id = e.id
         WHERE bl.position_id = $1 
         ORDER BY bl.created_at`,
        [id]
      );
      
      // Obtener matches
      const matchesResult = await client.query(
        `SELECT lm.*, e.executed_at as sell_date, bl.price as buy_price
         FROM lot_matches lm
         JOIN executions e ON lm.sell_execution_id = e.id
         JOIN buy_lots bl ON lm.buy_lot_id = bl.id
         WHERE bl.position_id = $1
         ORDER BY lm.created_at`,
        [id]
      );
      
      return {
        position,
        executions: executionsResult.rows,
        lots: lotsResult.rows,
        matches: matchesResult.rows
      };
      
    } finally {
      client.release();
    }
  }
}