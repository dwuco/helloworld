import express from 'express';
import cors from 'cors';
import { getDb } from './db/database';
import carsRouter from './routes/cars';
import specsRouter from './routes/specs';
import pricesRouter from './routes/prices';
import { scheduleDailyUpdate, stopDailyUpdate } from './jobs/dailyUpdate';
import { runDailySync, logger } from './services/syncService';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api', carsRouter);
app.use('/api/specs', specsRouter);
app.use('/api/prices', pricesRouter);

// Admin routes
app.post('/api/admin/sync', async (_req, res) => {
  try {
    logger.info('Manual sync triggered via API');
    const result = await runDailySync();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error: ' + err.message);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Initialize DB and start server
async function main() {
  // Initialize DB (runs schema)
  getDb();
  logger.info('Database initialized');

  // Start server
  const server = app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
  });

  // Schedule daily cron job
  scheduleDailyUpdate();

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down...');
    stopDailyUpdate();
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down...');
    stopDailyUpdate();
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });
}

main().catch(err => {
  logger.error('Fatal error: ' + err.message);
  process.exit(1);
});
