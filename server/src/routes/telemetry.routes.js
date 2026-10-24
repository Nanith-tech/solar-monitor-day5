import { Router } from 'express';
import { deviceAuth } from '../middleware/deviceAuth.js';
import { HttpError } from '../middleware/errorHandler.js';
import { telemetryController } from '../controllers/telemetry.controller.js';

export function telemetryRoutes(config) {
  const router = Router();
  router.post('/', deviceAuth(config), (req, res, next) => {
    if (!req.is('application/json')) return next(new HttpError(415, 'JSON_REQUIRED', 'Use Content-Type: application/json.'));
    next();
  }, telemetryController(config));
  return router;
}
