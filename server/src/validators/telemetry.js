import { HttpError } from '../middleware/errorHandler.js';

export const TELEMETRY_FIELDS = Object.freeze([
  'deviceId', 'bootId', 'sequence', 'voltageV', 'currentMA', 'powerMW', 'uptimeMs', 'rssiDbm', 'source'
]);

export function validateTelemetry(body, config) {
  const errors = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'INVALID_TELEMETRY', 'Telemetry must be a JSON object.');
  }
  for (const key of Object.keys(body)) {
    if (!TELEMETRY_FIELDS.includes(key)) errors.push(`Unknown field: ${key}`);
  }
  if (body.deviceId !== config.deviceId) {
    throw new HttpError(403, 'DEVICE_FORBIDDEN', 'The key is not authorized for this deviceId.');
  }
  if (typeof body.bootId !== 'string' || !/^[A-Za-z0-9_-]{8,80}$/.test(body.bootId)) {
    errors.push('bootId must use 8–80 letters, digits, underscores or hyphens.');
  }
  for (const key of ['sequence', 'uptimeMs']) {
    if (!Number.isSafeInteger(body[key]) || body[key] < 0) errors.push(`${key} must be a nonnegative safe integer.`);
  }
  for (const [key, min, max] of [
    ['voltageV', 0, config.maxVoltageV],
    ['currentMA', -config.maxCurrentMA, config.maxCurrentMA],
    ['powerMW', -config.maxPowerMW, config.maxPowerMW],
    ['rssiDbm', -127, 0]
  ]) {
    if (typeof body[key] !== 'number' || !Number.isFinite(body[key]) || body[key] < min || body[key] > max) {
      errors.push(`${key} must be a finite number between ${min} and ${max}.`);
    }
  }
  if (!Number.isInteger(body.rssiDbm)) errors.push('rssiDbm must be an integer.');
  if (!['sensor', 'simulator'].includes(body.source)) errors.push('source must be sensor or simulator.');
  if (body.source === 'simulator' && !config.allowSimulator) {
    throw new HttpError(403, 'SIMULATOR_DISABLED', 'Set ALLOW_SIMULATOR=true on the server to accept simulated readings.');
  }
  if ([body.voltageV, body.currentMA, body.powerMW].every(Number.isFinite)) {
    const calculated = body.voltageV * body.currentMA;
    if (Math.abs(body.powerMW - calculated) > Math.max(0.05, Math.abs(calculated) * 0.001)) {
      errors.push('powerMW must equal voltageV * currentMA (0.05 mW or 0.1% rounding tolerance).');
    }
  }
  if (errors.length) throw new HttpError(400, 'INVALID_TELEMETRY', 'Telemetry validation failed.', errors);
  return Object.fromEntries(TELEMETRY_FIELDS.map(key => [key, body[key]]));
}
