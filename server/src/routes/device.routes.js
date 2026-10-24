import { Router } from 'express';
import { deviceControllers } from '../controllers/device.controller.js';

export function deviceRoutes(config) {
  const router = Router();
  const controllers = deviceControllers(config);
  router.get('/', controllers.list);
  router.get('/:deviceId/latest', controllers.latest);
  router.get('/:deviceId/readings', controllers.readings);
  return router;
}
