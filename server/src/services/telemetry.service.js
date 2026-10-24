import { Reading } from '../models/Reading.js';
import { TELEMETRY_FIELDS } from '../validators/telemetry.js';
import { HttpError } from '../middleware/errorHandler.js';

export function publicReading(reading) {
  const doc = reading.toObject ? reading.toObject() : reading;
  return { id: String(doc._id), ...Object.fromEntries(TELEMETRY_FIELDS.map(key => [key, doc[key]])), receivedAt: doc.receivedAt };
}

export async function saveTelemetry(sample) {
  try {
    const reading = await Reading.create(sample);
    return { duplicate: false, reading: publicReading(reading) };
  } catch (error) {
    if (error.code !== 11000) throw error;
    const original = await Reading.findOne({ deviceId: sample.deviceId, bootId: sample.bootId, sequence: sample.sequence }).lean();
    if (!original) throw error;
    if (!TELEMETRY_FIELDS.every(key => original[key] === sample[key])) {
      throw new HttpError(409, 'IDENTITY_CONFLICT', 'This bootId and sequence already identify a different sample.');
    }
    // No update: replay must not refresh device status or receivedAt.
    return { duplicate: true, reading: publicReading(original) };
  }
}

export async function latestReading(deviceId, source) {
  const reading = await Reading.findOne({ deviceId, source }).sort({ receivedAt: -1, _id: -1 }).lean();
  return reading ? publicReading(reading) : null;
}

export function streamStatus(reading, offlineAfterMs, now = Date.now()) {
  if (!reading) return { status: 'never-seen', lastReceivedAt: null, ageMs: null };
  const ageMs = Math.max(0, now - new Date(reading.receivedAt).getTime());
  return { status: ageMs <= offlineAfterMs ? 'online' : 'offline', lastReceivedAt: reading.receivedAt, ageMs };
}
