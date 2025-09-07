import { Router } from 'express';
import { StatsService } from '../services/stats.service';

const router = Router();
const statsService = new StatsService();

// GET /api/stats/overview
router.get('/overview', async (req, res) => {
  try {
    const overview = await statsService.getOverview();
    res.json(overview);
  } catch (error) {
    console.error('Error getting stats overview:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/stats/daily
router.get('/daily', async (req, res) => {
  try {
    const from = req.query.from as string;
    const to = req.query.to as string;
    
    const dailyPnL = await statsService.getDailyPnL(from, to);
    res.json(dailyPnL);
  } catch (error) {
    console.error('Error getting daily PnL:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/stats/setups
router.get('/setups', async (req, res) => {
  try {
    const from = req.query.from as string;
    const to = req.query.to as string;
    
    const setupStats = await statsService.getSetupStats(from, to);
    res.json(setupStats);
  } catch (error) {
    console.error('Error getting setup stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;