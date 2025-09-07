import { Router } from 'express';
import { z } from 'zod';
import { RiskService } from '../services/risk.service';

const router = Router();
const riskService = new RiskService();

const calculatePositionSchema = z.object({
  symbol: z.string().min(1),
  entry_price: z.number().positive(),
  stop_price: z.number().positive(),
  risk_pct: z.number().positive().optional()
});

const calculateRMultipleSchema = z.object({
  entry_price: z.number().positive(),
  exit_price: z.number().positive(),
  stop_price: z.number().positive(),
  side: z.enum(['BUY', 'SELL'])
});

// POST /api/risk/position-size
router.post('/position-size', async (req, res) => {
  try {
    const validatedData = calculatePositionSchema.parse(req.body);
    
    const calculation = await riskService.calculatePositionSize(
      validatedData.symbol,
      validatedData.entry_price,
      validatedData.stop_price,
      validatedData.risk_pct
    );
    
    res.json(calculation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
    } else {
      console.error('Error calculating position size:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// POST /api/risk/r-multiple
router.post('/r-multiple', async (req, res) => {
  try {
    const validatedData = calculateRMultipleSchema.parse(req.body);
    
    const rMultiple = await riskService.calculateRMultiple(
      validatedData.entry_price,
      validatedData.exit_price,
      validatedData.stop_price,
      validatedData.side
    );
    
    res.json({ r_multiple: rMultiple });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
    } else {
      console.error('Error calculating R multiple:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// GET /api/risk/distribution
router.get('/distribution', async (req, res) => {
  try {
    const from = req.query.from as string;
    const to = req.query.to as string;
    
    const distribution = await riskService.getRDistribution(from, to);
    res.json(distribution);
  } catch (error) {
    console.error('Error getting R distribution:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;