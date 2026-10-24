import { Reading } from '../models/Reading.js';
import { publicReading } from './telemetry.service.js';
import { HttpError } from '../middleware/errorHandler.js';

export function parseHistoryQuery(query, now = Date.now()) {
  if (Object.keys(query).some(key => !['source', 'limit', 'since'].includes(key))) throw new HttpError(400, 'INVALID_QUERY', 'Supported query fields: source, limit, since.');
  const source = query.source ?? 'sensor';
  if (typeof source !== 'string' || !['sensor', 'simulator'].includes(source)) throw new HttpError(400, 'INVALID_SOURCE', 'source must be sensor or simulator.');
  const limit = query.limit === undefined ? 120 : Number(query.limit);
  if ((query.limit !== undefined && (typeof query.limit !== 'string' || !/^\d+$/.test(query.limit))) || !Number.isInteger(limit) || limit < 1 || limit > 300) throw new HttpError(400, 'INVALID_LIMIT', 'limit must be an integer from 1 to 300.');
  let since = new Date(now - 3600000);
  if (query.since !== undefined) {
    if (typeof query.since !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(query.since) || !Number.isFinite(Date.parse(query.since))) throw new HttpError(400, 'INVALID_SINCE', 'since must be a UTC ISO timestamp.');
    since = new Date(query.since);
    if (since.getTime() < now - 86400000 || since.getTime() > now) throw new HttpError(400, 'INVALID_SINCE', 'since must be within the past 24 hours.');
  }
  return { source, limit, since };
}

export async function recentReadings(deviceId, query) {
  const { source, limit, since } = parseHistoryQuery(query);
  const rows = await Reading.find({ deviceId, source, receivedAt: { $gte: since } }).sort({ receivedAt: -1, _id: -1 }).limit(limit).lean();
  return { deviceId, source, limit, since, readings: rows.reverse().map(publicReading), serverTime: new Date().toISOString() };
}
