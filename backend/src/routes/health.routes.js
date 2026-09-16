import { Router } from 'express';
import { query } from '../config/database.js';

const router = Router();

// Liveness probe: Is the Express process running?
router.get('/live', (_req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Readiness probe: Can the API talk to PostgreSQL?
router.get('/ready', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.status(200).json({
      status: 'READY',
      database: 'CONNECTED',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'NOT_READY',
      database: 'DISCONNECTED',
      error: error.message,
    });
  }
});

export default router;