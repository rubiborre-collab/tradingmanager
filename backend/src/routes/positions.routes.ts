import { Router } from 'express';
import { TradingService } from '../services/trading.service';

const router = Router();
const tradingService = new TradingService();

// GET /api/positions
router.get('/', async (req, res) => {
  try {
    const positions = await tradingService.getPositions();
    res.json(positions);
  } catch (error) {
    console.error('Error getting positions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/positions/:id
router.get('/:id', async (req, res) => {
  try {
    const details = await tradingService.getPositionDetails(req.params.id);
    
    if (!details) {
      return res.status(404).json({ error: 'Position not found' });
    }
    
    res.json(details);
  } catch (error) {
    console.error('Error getting position details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;