import { Router } from 'express';
import { z } from 'zod';
import pool from '../database/connection';

const router = Router();

const updateSettingsSchema = z.object({
  starting_cash: z.number().positive().optional(),
  default_fee: z.number().nonnegative().optional(),
  risk_pct: z.number().positive().optional(),
  entry_reasons: z.array(z.string()).optional(),
  exit_reasons: z.array(z.string()).optional(),
  benchmark_source: z.string().optional()
});

const updateApiKeySchema = z.object({
  new_api_key: z.string().min(10)
});

// GET /api/settings
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM settings LIMIT 1');
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Settings not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/settings
router.put('/', async (req, res) => {
  try {
    const validatedData = updateSettingsSchema.parse(req.body);
    
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (validatedData.starting_cash !== undefined) {
      updateFields.push(`starting_cash = $${paramIndex++}`);
      values.push(validatedData.starting_cash);
    }
    
    if (validatedData.default_fee !== undefined) {
      updateFields.push(`default_fee = $${paramIndex++}`);
      values.push(validatedData.default_fee);
    }
    
    if (validatedData.risk_pct !== undefined) {
      updateFields.push(`risk_pct = $${paramIndex++}`);
      values.push(validatedData.risk_pct);
    }
    
    if (validatedData.entry_reasons !== undefined) {
      updateFields.push(`entry_reasons = $${paramIndex++}`);
      values.push(validatedData.entry_reasons);
    }
    
    if (validatedData.exit_reasons !== undefined) {
      updateFields.push(`exit_reasons = $${paramIndex++}`);
      values.push(validatedData.exit_reasons);
    }
    
    if (validatedData.benchmark_source !== undefined) {
      updateFields.push(`benchmark_source = $${paramIndex++}`);
      values.push(validatedData.benchmark_source);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    const query = `
      UPDATE settings 
      SET ${updateFields.join(', ')}, updated_at = NOW()
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Settings not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
    } else {
      console.error('Error updating settings:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// PUT /api/settings/api-key
router.put('/api-key', async (req, res) => {
  try {
    const validatedData = updateApiKeySchema.parse(req.body);
    
    const result = await pool.query(
      'UPDATE settings SET api_key = $1, updated_at = NOW() RETURNING api_key',
      [validatedData.new_api_key]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Settings not found' });
    }
    
    res.json({ 
      message: 'API key updated successfully',
      api_key: result.rows[0].api_key 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
    } else {
      console.error('Error updating API key:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// POST /api/settings/generate-api-key
router.post('/generate-api-key', async (req, res) => {
  try {
    // Generate a new API key
    const newApiKey = `tk_live_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
    
    const result = await pool.query(
      'UPDATE settings SET api_key = $1, updated_at = NOW() RETURNING api_key',
      [newApiKey]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Settings not found' });
    }
    
    res.json({ 
      message: 'New API key generated successfully',
      api_key: result.rows[0].api_key 
    });
  } catch (error) {
    console.error('Error generating API key:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;