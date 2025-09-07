import { Router } from 'express';
import { z } from 'zod';
import pool from '../database/connection';
import { format } from 'date-fns';
import { apiKeyAuth } from '../middleware/auth.middleware';
import { BenchmarkService } from '../services/benchmark.service';

const router = Router();
const benchmarkService = new BenchmarkService();

const syncBenchmarkSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

// GET /api/benchmarks/prices
router.get('/prices', async (req, res) => {
  try {
    const from = req.query.from as string;
    const to = req.query.to as string;
    
    let query = 'SELECT date, close FROM benchmark_prices';
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (from) {
      conditions.push(`date >= $${paramIndex++}`);
      values.push(from);
    }
    
    if (to) {
      conditions.push(`date <= $${paramIndex++}`);
      values.push(to);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY date ASC';
    
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting benchmark prices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/benchmarks/external-prices - Fetch S&P 500 data from Yahoo Finance
router.get('/external-prices', apiKeyAuth, async (req, res) => {
  try {
    const period = (req.query.period as string) || '1y';
    
    // Yahoo Finance API endpoint para S&P 500 (^GSPC)
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?period1=0&period2=9999999999&interval=1d&range=${period}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.chart?.result?.[0]) {
      throw new Error('Invalid response from Yahoo Finance');
    }

    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const closes = result.indicators.quote[0].close;

    const priceData = timestamps.map((timestamp: number, index: number) => ({
      date: new Date(timestamp * 1000).toISOString().split('T')[0],
      close: closes[index]
    })).filter((item: any) => item.close !== null && !isNaN(item.close));

    res.json(priceData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch S&P 500 data' });
  }
});

// POST /api/benchmarks/sync
router.post('/sync', apiKeyAuth, async (req, res) => {
  try {
    const validatedData = syncBenchmarkSchema.parse(req.body);
    
    // Determinar rango de fechas
    const toDate = validatedData.to || new Date().toISOString().split('T')[0];
    const fromDate = validatedData.from || (() => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      return oneYearAgo.toISOString().split('T')[0];
    })();
    
    const result = await benchmarkService.syncBenchmarkData(fromDate, toDate);
    
    res.json({
      ...result,
      period: { from: fromDate, to: toDate }
    });
    
  } catch (error) {
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors,
        source: 'yahoo'
      });
    }
    
    // Manejo específico de errores de Yahoo Finance
    if (error.message?.includes('fetch') || error.message?.includes('network')) {
      return res.status(503).json({ 
        error: 'Unable to connect to Yahoo Finance. Please try again later.',
        source: 'yahoo',
        type: 'network_error'
      });
    }
    
    if (error.message?.includes('Invalid symbol') || error.message?.includes('No data')) {
      return res.status(404).json({ 
        error: 'No data available for the specified period',
        source: 'yahoo',
        type: 'no_data'
      });
    } else {
      res.status(500).json({ 
        error: 'Internal server error while syncing benchmark data',
        source: 'yahoo',
        type: 'server_error'
      });
    }
  }
});

export default router;