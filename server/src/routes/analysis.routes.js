import { Router } from 'express';
import { HttpError } from '../middleware/errorHandler.js';
import * as defaults from '../services/analysis.service.js';
export function analysisRoutes(config, services = defaults) {
  const router = Router();
  router.use('/:deviceId', (req, res, next) => {
    if (req.params.deviceId !== config.deviceId) return next(new HttpError(404, 'DEVICE_NOT_FOUND', 'Device not found.'));
    next();
  });
  router.get('/:deviceId/history', async (req, res) => res.json(await services.historicalReadings(config.deviceId, req.query)));
  router.get('/:deviceId/statistics', async (req, res) => res.json(await services.generationStatistics(config.deviceId, req.query)));
  router.get('/:deviceId/export.csv', async (req, res) => {
    const result = await services.exportReadings(config.deviceId, req.query);
    res.type('text/csv').attachment(result.filename).send(result.csv);
  });
  return router;
}
