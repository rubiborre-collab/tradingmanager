import pool from '../database/connection';
import yahooFinance from 'yahoo-finance2';

export class BenchmarkService {
  
  async ensureBenchmarkData(): Promise<void> {
    const client = await pool.connect();
    
    try {
      // Verificar si ya tenemos datos
      const countResult = await client.query('SELECT COUNT(*) FROM benchmark_prices');
      const recordCount = parseInt(countResult.rows[0].count);
      
      if (recordCount > 0) {
        console.log(`✅ Benchmark data already exists: ${recordCount} records`);
        return;
      }
      
      console.log('🔄 No benchmark data found. Initializing with S&P 500 historical data...');
      
      // Obtener datos de los últimos 2 años para tener suficiente historial
      const toDate = new Date().toISOString().split('T')[0];
      const fromDate = (() => {
        const date = new Date();
        date.setFullYear(date.getFullYear() - 2);
        return date.toISOString().split('T')[0];
      })();
      
      const result = await this.syncBenchmarkData(fromDate, toDate);
      
      if (result.total_records > 0) {
        console.log(`✅ Successfully initialized benchmark data: ${result.total_records} records`);
      } else {
        console.log('⚠️ No data was retrieved from Yahoo Finance during initialization');
      }
      
    } catch (error) {
      // No lanzar error para no bloquear el inicio de la aplicación
    } finally {
      client.release();
    }
  }
  
  async syncBenchmarkData(fromDate: string, toDate: string): Promise<{
    inserted: number;
    updated: number;
    total_records: number;
    source: string;
  }> {
    const client = await pool.connect();
    
    try {
      console.log(`📊 Fetching S&P 500 data from ${fromDate} to ${toDate}`);
      
      const queryOptions = {
        period1: fromDate,
        period2: toDate,
        interval: '1d' as const
      };
      
      const result = await yahooFinance.historical('^GSPC', queryOptions);
      
      if (!result || result.length === 0) {
        console.log('⚠️ No data available from Yahoo Finance for the specified period');
        return {
          inserted: 0,
          updated: 0,
          total_records: 0,
          source: 'yahoo'
        };
      }
      
      let inserted = 0;
      let updated = 0;
      
      await client.query('BEGIN');
      
      for (const quote of result) {
        if (!quote.date || quote.close === null || quote.close === undefined) {
          continue; // Skip invalid entries
        }
        
        const date = quote.date.toISOString().split('T')[0];
        const close = parseFloat(quote.close.toString());
        
        if (isNaN(close) || close <= 0) {
          continue; // Skip invalid prices
        }
        
        const upsertResult = await client.query(
          `INSERT INTO benchmark_prices (date, close, created_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (date) DO UPDATE SET 
             close = EXCLUDED.close,
             created_at = NOW()
           RETURNING (xmax = 0) AS inserted`,
          [date, close]
        );
        
        if (upsertResult.rows[0].inserted) {
          inserted++;
        } else {
          updated++;
        }
      }
      
      await client.query('COMMIT');
      
      return {
        inserted,
        updated,
        total_records: inserted + updated,
        source: 'yahoo'
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}