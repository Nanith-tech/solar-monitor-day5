import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { parseRangeQuery, readingsCSV, csvCell, historicalReadings, generationStatistics, exportReadings, MAX_EXPORT_ROWS } from '../src/services/analysis.service.js';
import { Reading } from '../src/models/Reading.js';
import { analysisRoutes } from '../src/routes/analysis.routes.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
const query = { from: '2026-10-01T00:00:00.000Z', to: '2026-10-01T00:01:00.000Z', source: 'sensor' };
const now = Date.parse('2026-10-03T00:00:00Z');
const doc = (i = 0) => ({ _id: (i + 1).toString(16).padStart(24, '0'), deviceId: 'solar-node-001', source: 'sensor', bootId: 'analysis-boot', sequence: i, uptimeMs: (i + 1) * 5000, receivedAt: new Date(Date.parse(query.from) + i * 5000), voltageV: 1, currentMA: 1000, powerMW: 1000, rssiDbm: -55 });
const chain = value => ({ sort() { return this; }, limit() { return this; }, lean() { return this; }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } });
test('range validation rejects malformed calendar dates, future/endless ranges and query injection', () => {
  assert.equal(parseRangeQuery(query, 'statistics', now).source, 'sensor');
  for (const q of [{ ...query, from: '2026-02-30T00:00:00Z' }, { ...query, from: query.to }, { ...query, to: '2027-01-01T00:00:00Z' }, { ...query, from: '2026-08-01T00:00:00Z' }, { ...query, from: [] }, { ...query, source: {} }, { ...query, extra: 'x' }]) assert.throws(() => parseRangeQuery(q, 'statistics', now));
  for (const limit of ['0', '501', '1.1', []]) assert.throws(() => parseRangeQuery({ ...query, limit }, 'history', now));
});
test('keyset history handles equal reception times and binds cursor to source/range', async () => {
  let filter;
  const docs = [doc(0), doc(1), doc(2)]; docs.forEach(d => { d.receivedAt = new Date(query.from); });
  const spy = mock.method(Reading, 'find', value => { filter = value; return chain(docs); });
  try {
    const page = await historicalReadings('solar-node-001', { ...query, limit: '2' });
    assert.equal(page.readings.length, 2); assert.ok(page.nextCursor);
    await historicalReadings('solar-node-001', { ...query, limit: '2', cursor: page.nextCursor });
    assert.equal(filter.$or[1]._id.$gt.toString(), docs[1]._id);
    assert.throws(() => parseRangeQuery({ ...query, source: 'simulator', cursor: page.nextCursor }, 'history', now));
    assert.throws(() => parseRangeQuery({ ...query, cursor: 'garbage' }, 'history', now));
  } finally { spy.mock.restore(); }
});
test('statistics service includes boundary context, streams rows and closes cursor', async () => {
  let closed = false; const docs = [doc(0), doc(1), doc(2)];
  const findOne = mock.method(Reading, 'findOne', () => chain(null));
  const find = mock.method(Reading, 'find', filter => {
    assert.equal(filter.source, 'sensor');
    const q = chain(); q.cursor = () => ({ async *[Symbol.asyncIterator]() { yield* docs; }, async close() { closed = true; } }); return q;
  });
  try { const result = await generationStatistics('solar-node-001', query); assert.equal(result.summary.sampleCount, 3); assert.equal(result.summary.coveredMs, 10000); assert.equal(result.summary.coveragePercent, 100 / 6); assert.ok(closed); }
  finally { find.mock.restore(); findOne.mock.restore(); }
});
test('CSV preserves units, timestamps, signed numerics, quoting and guards text formulas', () => {
  const csv = readingsCSV([{ ...doc(), deviceId: '=BAD', bootId: 'quoted"id', currentMA: -1 }]);
  assert.ok(csv.startsWith('\uFEFFdeviceId,source,bootId,sequence,receivedAt,voltageV,currentMA,powerMW,uptimeMs,rssiDbm\r\n'));
  assert.ok(csv.includes('"\'=BAD"')); assert.ok(csv.includes('"quoted""id"')); assert.ok(csv.includes('"-1"'));
  assert.equal(csvCell('@bad'), '"\'@bad"'); assert.equal(readingsCSV([]).split('\r\n').length, 2);
});
test('oversized CSV rejects rather than exporting a partial file', async () => {
  const spy = mock.method(Reading, 'find', () => chain(Array(MAX_EXPORT_ROWS + 1).fill(doc())));
  try { await assert.rejects(exportReadings('solar-node-001', query), error => error.status === 422); }
  finally { spy.mock.restore(); }
});
test('HTTP history/statistics/export routes validate device, status and download headers', async () => {
  const service = { historicalReadings: async (id, q) => ({ deviceId: id, ...parseRangeQuery(q, 'history'), readings: [], nextCursor: null }), generationStatistics: async (id, q) => ({ deviceId: id, ...parseRangeQuery(q) }), exportReadings: async (id, q) => { parseRangeQuery(q, 'export'); return { filename: 'sensor.csv', csv: readingsCSV([doc()]) }; } };
  const app = express(); app.use('/devices', analysisRoutes({ deviceId: 'solar-node-001' }, service)); app.use(errorHandler);
  const params = new URLSearchParams(query).toString();
  await request(app).get(`/devices/solar-node-001/history?${params}`).expect(200);
  await request(app).get(`/devices/solar-node-001/statistics?${params}`).expect(200);
  const csv = await request(app).get(`/devices/solar-node-001/export.csv?${params}`).expect(200);
  assert.match(csv.headers['content-type'], /text\/csv/); assert.match(csv.headers['content-disposition'], /attachment; filename="sensor.csv"/);
  await request(app).get(`/devices/other/statistics?${params}`).expect(404);
  await request(app).get('/devices/solar-node-001/statistics?source=sensor').expect(400);
});

test('dense statistics range fails with no partial total and closes the cursor', async () => {
  let closed = false;
  const findOne = mock.method(Reading, 'findOne', () => chain(null));
  const find = mock.method(Reading, 'find', () => {
    const q = chain(); q.cursor = () => ({ async *[Symbol.asyncIterator]() { for (let i = 0; i <= 600000; i++) yield doc(0); }, async close() { closed = true; } }); return q;
  });
  try { await assert.rejects(generationStatistics('solar-node-001', query), error => error.status === 422); assert.ok(closed); }
  finally { find.mock.restore(); findOne.mock.restore(); }
});
