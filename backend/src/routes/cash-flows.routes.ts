import { Router } from 'express';
import { z } from 'zod';
import pool from '../database/connection';
import { CashFlowType } from '../types';

const router = Router();

const createCashFlowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number(),
  type: z.nativeEnum(CashFlowType),
  note: z.string().optional()
});

// GET /api/cash_flows
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM cash_flows ORDER BY date DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting cash flows:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/cash_flows
router.post('/', async (req, res) => {
  try {
    const validatedData = createCashFlowSchema.parse(req.body);
    
    const result = await pool.query(
      `INSERT INTO cash_flows (date, amount, type, note)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [validatedData.date, validatedData.amount, validatedData.type, validatedData.note]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
    } else {
      console.error('Error creating cash flow:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;