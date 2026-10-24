import { validateTelemetry } from '../validators/telemetry.js';
import { saveTelemetry } from '../services/telemetry.service.js';
import { publishTelemetry } from '../realtime/socket.js';

export function telemetryController(config, persist = saveTelemetry) {
  return async (req, res) => {
    const sample = validateTelemetry(req.body, config);
    const result = await persist(sample);
    publishTelemetry(req.app.get('io'), result);
    res.status(result.duplicate ? 200 : 201).json(result);
  };
}
