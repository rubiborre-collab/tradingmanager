import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { apiKeyAuth } from './middleware/auth.middleware';
import { BenchmarkService } from './services/benchmark.service';

// Routes
import executionsRoutes from './routes/executions.routes';
import positionsRoutes from './routes/positions.routes';
import statsRoutes from './routes/stats.routes';
import cashFlowsRoutes from './routes/cash-flows.routes';
import benchmarksRoutes from './routes/benchmarks.routes';
import healthRoutes from './routes/health.routes';
import settingsRoutes from './routes/settings.routes';
import riskRoutes from './routes/risk.routes';

dotenv.config();

const benchmarkService = new BenchmarkService();
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes (with authentication)
app.use('/api/executions', apiKeyAuth, executionsRoutes);
app.use('/api/positions', apiKeyAuth, positionsRoutes);
app.use('/api/stats', apiKeyAuth, statsRoutes);
app.use('/api/cash_flows', apiKeyAuth, cashFlowsRoutes);
app.use('/api/benchmarks', apiKeyAuth, benchmarksRoutes);
app.use('/api/settings', apiKeyAuth, settingsRoutes);
app.use('/api/risk', apiKeyAuth, riskRoutes);

// Health endpoint (no auth required)
app.use('/api/health', healthRoutes);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Trading API server running on port ${PORT}`);
  console.log(`📈 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 API endpoints protected with x-api-key authentication`);
  console.log(`🌍 Timezone: Europe/Madrid`);
  
  // Initialize benchmark data in background
  benchmarkService.ensureBenchmarkData().catch(console.error);
});

export default app;