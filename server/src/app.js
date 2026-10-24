import express from 'express';
import { wifiRoutes } from './routes/wifi.routes.js';
import { analysisRoutes } from './routes/analysis.routes.js';
import cors from 'cors';
import { databaseReady } from './config/db.js';
import { deviceRoutes } from './routes/device.routes.js';
import { telemetryRoutes } from './routes/telemetry.routes.js';
import { HttpError, errorHandler } from './middleware/errorHandler.js';

export function createApp(config) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: config.corsOrigin, methods: ['GET', 'POST'], allowedHeaders: ['Content-Type', 'X-Device-Key', 'X-Solar-Setup'] }));
  app.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.get('/api/v1/health', (req, res) => {
    const connected = databaseReady();
    res.status(connected ? 200 : 503).json({ status: connected ? 'ok' : 'degraded', database: connected ? 'connected' : 'disconnected', milestone: 5, serverTime: new Date().toISOString() });
  });
  app.use(express.json({ limit: '4kb', strict: true }));
  app.use('/api/v1/devices', wifiRoutes(config));
  app.use('/api/v1', (req, res, next) => {
    if (!databaseReady()) return next(new HttpError(503, 'DATABASE_UNAVAILABLE', 'Database is unavailable. Retry later.'));
    next();
  });
  app.use('/api/v1/telemetry', telemetryRoutes(config));
  app.use('/api/v1/devices', deviceRoutes(config));
  app.use('/api/v1/devices', analysisRoutes(config));
  app.use((req, res, next) => next(new HttpError(404, 'NOT_FOUND', 'Route not found.')));
  app.use(errorHandler);
  return app;
}
