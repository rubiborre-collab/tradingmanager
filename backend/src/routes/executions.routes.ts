import { Router } from 'express';
import { TradingService } from '../services/trading.service';
import { CreateExecutionRequest, UpdateExecutionRequest, ExecutionSide, ExecutionStatus } from '../types';
import { z } from 'zod';

const router = Router();
const tradingService = new TradingService();

// Validation schemas
const createExecutionSchema = z.object({
  symbol: z.string().min(1).max(20),
  side: z.nativeEnum(ExecutionSide),
  quantity: z.number().positive(),
  price: z.number().positive(),
  fee: z.number().optional(),
  executed_at: z.string().optional(),
  notes: z.string().optional(),
  entry_reason: z.string().optional(),
  exit_reason: z.string().optional(),
  external_id: z.string().optional(),
  tags: z.array(z.string()).optional()
});

const updateExecutionSchema = z.object({
  notes: z.string().optional(),
  entry_reason: z.string().optional(),
  exit_reason: z.string().optional(),
  status: z.nativeEnum(ExecutionStatus).optional()
});

// POST /api/executions
router.post('/', async (req, res) => {
  try {
    const validatedData = createExecutionSchema.parse(req.body);
    const execution = await tradingService.createExecution(validatedData);
    res.status(201).json(execution);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
    } else if ((error as Error).message.includes('unique constraint')) {
      res.status(409).json({ error: 'External ID already exists' });
    } else {
      console.error('Error creating execution:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// GET /api/executions
router.get('/', async (req, res) => {
  try {
    const filters = {
      symbol: req.query.symbol as string,
      side: req.query.side as ExecutionSide,
      from: req.query.from as string,
      to: req.query.to as string,
      status: req.query.status as ExecutionStatus
    };
    
    const executions = await tradingService.getExecutions(filters);
    res.json(executions);
  } catch (error) {
    console.error('Error getting executions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/executions/:id
router.put('/:id', async (req, res) => {
  try {
    const validatedData = updateExecutionSchema.parse(req.body);
    const execution = await tradingService.updateExecution(req.params.id, validatedData);
    res.json(execution);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
    } else if ((error as Error).message === 'Execution not found') {
      res.status(404).json({ error: 'Execution not found' });
    } else {
      console.error('Error updating execution:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;