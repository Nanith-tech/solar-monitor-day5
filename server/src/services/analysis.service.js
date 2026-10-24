import mongoose from 'mongoose';
import { Reading } from '../models/Reading.js';
import { HttpError } from '../middleware/errorHandler.js';
import { publicReading } from './telemetry.service.js';
import { createEnergyAccumulator, MAX_GAP_MS } from './energy.service.js';
export const MAX_ANALYSIS_ROWS = 600000;
export const MAX_EXPORT_ROWS = 50000;
export function parseRangeQuery(query, mode = 'statistics', now = Date.now()) {
  const allowed = mode === 'history' ? ['source', 'from', 'to', 'limit', 'cursor'] : ['source', 'from', 'to'];
  if (Object.keys(query).some(key => !allowed.includes(key))) throw new HttpError(400, 'INVALID_QUERY', `Supported fields: ${allowed.join(', ')}.`);
  const source = query.source ?? 'sensor';
  if (typeof source !== 'string' || !['sensor', 'simulator'].includes(source)) throw new HttpError(400, 'INVALID_SOURCE', 'source must be sensor or simulator.');
  const parse = value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value)) throw new HttpError(400, 'INVALID_RANGE', 'from and to must be UTC ISO timestamps.');
    const date = new Date(value);
    if (!Number.isFinite(+date) || date.toISOString() !== value.replace(/Z$/, value.includes('.') ? 'Z' : '.000Z')) throw new HttpError(400, 'INVALID_RANGE', 'Invalid calendar date.');
    return date;
  };
  const from = parse(query.from), to = parse(query.to);
  if (+from >= +to || +to > now || +to - +from > 31 * 86400000) throw new HttpError(400, 'INVALID_RANGE', 'Choose a past range longer than zero and at most 31 days.');
  const limit = query.limit === undefined ? 100 : Number(query.limit);
  if (mode === 'history' && (query.limit !== undefined && (typeof query.limit !== 'string' || !/^\d+$/.test(query.limit)) || !Number.isInteger(limit) || limit < 1 || limit > 500)) throw new HttpError(400, 'INVALID_LIMIT', 'limit must be an integer from 1 to 500.');
  let cursor = null;
  if (query.cursor !== undefined) {
    try {
      if (typeof query.cursor !== 'string' || query.cursor.length > 1000 || !/^[A-Za-z0-9_-]+$/.test(query.cursor)) throw new Error();
      cursor = JSON.parse(Buffer.from(query.cursor, 'base64url').toString());
      if (typeof cursor.id !== 'string' || typeof cursor.time !== 'string' || cursor.source !== source || cursor.from !== from.toISOString() || cursor.to !== to.toISOString() || !/^[a-f0-9]{24}$/.test(cursor.id) || !Number.isFinite(Date.parse(cursor.time)) || Date.parse(cursor.time) < +from || Date.parse(cursor.time) >= +to) throw new Error();
    } catch { throw new HttpError(400, 'INVALID_CURSOR', 'Invalid cursor or changed range/source. Start a new history search.'); }
  }
  return { source, from, to, limit, cursor };
}
const match = (deviceId, range) => ({ deviceId, source: range.source, receivedAt: { $gte: range.from, $lt: range.to } });
export async function historicalReadings(deviceId, query) {
  const range = parseRangeQuery(query, 'history');
  const filter = match(deviceId, range);
  if (range.cursor) filter.$or = [{ receivedAt: { $gt: new Date(range.cursor.time) } }, { receivedAt: new Date(range.cursor.time), _id: { $gt: new mongoose.Types.ObjectId(range.cursor.id) } }];
  const rows = await Reading.find(filter).sort({ receivedAt: 1, _id: 1 }).limit(range.limit + 1).lean();
  const hasMore = rows.length > range.limit;
  const page = rows.slice(0, range.limit).map(publicReading);
  const last = page.at(-1);
  const nextCursor = hasMore ? Buffer.from(JSON.stringify({ source: range.source, from: range.from.toISOString(), to: range.to.toISOString(), time: last.receivedAt, id: last.id })).toString('base64url') : null;
  return { deviceId, source: range.source, from: range.from, to: range.to, limit: range.limit, readings: page, nextCursor, serverTime: new Date().toISOString() };
}
export async function generationStatistics(deviceId, query) {
  const range = parseRangeQuery(query);
  const accumulator = createEnergyAccumulator(+range.from, +range.to);
  const base = { deviceId, source: range.source };
  // Context samples clip boundary intervals; they are not counted as in-range measurements.
  const before = await Reading.findOne({ ...base, receivedAt: { $gte: new Date(+range.from - MAX_GAP_MS), $lt: range.from } }).sort({ receivedAt: -1, _id: -1 }).lean();
  const after = await Reading.findOne({ ...base, receivedAt: { $gte: range.to, $lte: new Date(+range.to + MAX_GAP_MS) } }).sort({ receivedAt: 1, _id: 1 }).lean();
  if (before) accumulator.add(before);
  const cursor = Reading.find(match(deviceId, range)).sort({ receivedAt: 1, _id: 1 }).limit(MAX_ANALYSIS_ROWS + 1).lean().cursor();
  let count = 0;
  try {
    for await (const row of cursor) {
      if (++count > MAX_ANALYSIS_ROWS) throw new HttpError(422, 'RANGE_TOO_DENSE', 'More than 600000 samples. Choose a shorter range; no partial total is returned.');
      accumulator.add(row);
    }
  } finally { await cursor.close(); }
  if (after) accumulator.add(after);
  return { deviceId, source: range.source, from: range.from, to: range.to, ...accumulator.result(), serverTime: new Date().toISOString() };
}
export function csvCell(value, numeric = false) {
  let text = String(value ?? '');
  if (!numeric && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function readingsCSV(rows) {
  const fields = ['deviceId', 'source', 'bootId', 'sequence', 'receivedAt', 'voltageV', 'currentMA', 'powerMW', 'uptimeMs', 'rssiDbm'];
  const numeric = new Set(['sequence', 'voltageV', 'currentMA', 'powerMW', 'uptimeMs', 'rssiDbm']);
  return '\uFEFF' + fields.join(',') + '\r\n' + rows.map(row => fields.map(field => csvCell(row[field] instanceof Date ? row[field].toISOString() : row[field], numeric.has(field))).join(',')).join('\r\n') + (rows.length ? '\r\n' : '');
}
export async function exportReadings(deviceId, query) {
  const range = parseRangeQuery(query, 'export');
  const rows = await Reading.find(match(deviceId, range)).sort({ receivedAt: 1, _id: 1 }).limit(MAX_EXPORT_ROWS + 1).lean();
  if (rows.length > MAX_EXPORT_ROWS) throw new HttpError(422, 'EXPORT_TOO_LARGE', 'CSV export supports 50000 samples. Choose a shorter date range; no partial CSV is returned.');
  return { csv: readingsCSV(rows), filename: `solar-${deviceId}-${range.source}-${range.from.toISOString().slice(0, 10)}-${range.to.toISOString().slice(0, 10)}.csv` };
}
