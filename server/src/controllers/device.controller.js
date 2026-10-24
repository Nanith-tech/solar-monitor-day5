import { latestReading, streamStatus } from '../services/telemetry.service.js';
import { HttpError } from '../middleware/errorHandler.js';
import { recentReadings } from '../services/history.service.js';

export function deviceControllers(config) {
  const checkDevice = req => {
    if (req.params.deviceId !== config.deviceId) throw new HttpError(404, 'DEVICE_NOT_FOUND', 'Device not found.');
  };
  return {
    readings: async (req, res) => {
      checkDevice(req);
      res.json(await recentReadings(config.deviceId, req.query));
    },
    list: async (req, res) => {
      const [sensor, simulator] = await Promise.all([
        latestReading(config.deviceId, 'sensor'), latestReading(config.deviceId, 'simulator')
      ]);
      res.json({ devices: [{
        deviceId: config.deviceId, name: config.deviceName,
        ...streamStatus(sensor, config.offlineAfterMs),
        offlineAfterMs: config.offlineAfterMs,
        rssiDbm: sensor?.rssiDbm ?? null, uptimeMs: sensor?.uptimeMs ?? null,
        simulator: streamStatus(simulator, config.offlineAfterMs)
      }] });
    },
    latest: async (req, res) => {
      checkDevice(req);
      if (Object.keys(req.query).some(key => key !== 'source')) {
        throw new HttpError(400, 'INVALID_QUERY', 'Only the source query parameter is supported.');
      }
      const source = req.query.source ?? 'sensor';
      if (typeof source !== 'string' || !['sensor', 'simulator'].includes(source)) {
        throw new HttpError(400, 'INVALID_SOURCE', 'source must be sensor or simulator.');
      }
      const reading = await latestReading(config.deviceId, source);
      res.json({ deviceId: config.deviceId, source, ...streamStatus(reading, config.offlineAfterMs), reading });
    }
  };
}
