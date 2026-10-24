import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { readConfig } from '../src/config/env.js';
import { Reading } from '../src/models/Reading.js';

let mongo;
let config;
let app;
const sample = { deviceId: 'solar-node-001', bootId: 'integration-boot-001', sequence: 0,
  voltageV: 1.23, currentMA: 12.3, powerMW: 15.129, uptimeMs: 5000, rssiDbm: -55, source: 'sensor' };
const post = value => request(app).post('/api/v1/telemetry').set('X-Device-Key', config.deviceKey).send(value);

before(async () => {
  // Starts a real disposable mongod, never touches the user's configured database.
  mongo = await MongoMemoryServer.create();
  config = readConfig({ DEVICE_KEY: 'b'.repeat(64), ALLOW_SIMULATOR: 'true', MONGODB_URI: mongo.getUri('solar_monitor_test') });
  await connectDatabase(config);
  app = createApp(config);
}, { timeout: 180000 });

beforeEach(async () => { await Reading.deleteMany({}); });
after(async () => { await disconnectDatabase(); if (mongo) await mongo.stop(); });

test('health and empty device stream return useful state without secrets', async () => {
  const health = await request(app).get('/api/v1/health').expect(200);
  assert.equal(health.body.database, 'connected');
  const latest = await request(app).get('/api/v1/devices/solar-node-001/latest').expect(200);
  assert.equal(latest.body.reading, null);
  assert.equal(latest.body.status, 'never-seen');
  const devices = await request(app).get('/api/v1/devices').expect(200);
  assert.equal(devices.body.devices[0].deviceId, config.deviceId);
  assert.ok(!JSON.stringify(devices.body).includes(config.deviceKey));
});

test('valid sample persists in MongoDB and latest returns all units', async () => {
  const response = await post(sample).expect(201);
  assert.equal(response.body.duplicate, false);
  assert.equal(response.body.reading.powerMW, 15.129);
  const stored = await Reading.findOne().lean();
  assert.equal(stored.currentMA, 12.3);
  assert.ok(stored.receivedAt instanceof Date);
  const latest = await request(app).get('/api/v1/devices/solar-node-001/latest').expect(200);
  assert.equal(latest.body.reading.id, response.body.reading.id);
  assert.equal(latest.body.status, 'online');
});

test('identical replay preserves one row and original receipt time', async () => {
  const first = await post(sample).expect(201);
  const replay = await post(sample).expect(200);
  assert.equal(replay.body.duplicate, true);
  assert.deepEqual(replay.body.reading, first.body.reading);
  assert.equal(await Reading.countDocuments(), 1);
});

test('concurrent retries are serialized by unique index', async () => {
  const responses = await Promise.all(Array.from({ length: 8 }, () => post(sample)));
  assert.equal(responses.filter(r => r.status === 201).length, 1);
  assert.equal(responses.filter(r => r.status === 200).length, 7);
  assert.equal(await Reading.countDocuments(), 1);
});

test('identity reused with different measurements is rejected without overwriting', async () => {
  await post(sample).expect(201);
  const response = await post({ ...sample, voltageV: 2, powerMW: 24.6 }).expect(409);
  assert.equal(response.body.error.code, 'IDENTITY_CONFLICT');
  assert.equal((await Reading.findOne().lean()).voltageV, sample.voltageV);
});

test('simulator does not mark real sensor online or replace default latest', async () => {
  await post({ ...sample, source: 'simulator' }).expect(201);
  const sensor = await request(app).get('/api/v1/devices/solar-node-001/latest').expect(200);
  assert.equal(sensor.body.reading, null);
  const simulator = await request(app).get('/api/v1/devices/solar-node-001/latest?source=simulator').expect(200);
  assert.equal(simulator.body.reading.source, 'simulator');
  const device = (await request(app).get('/api/v1/devices').expect(200)).body.devices[0];
  assert.equal(device.status, 'never-seen');
  assert.equal(device.simulator.status, 'online');
});

test('missing/wrong key, unauthorized device, invalid body and oversized JSON fail', async () => {
  await request(app).post('/api/v1/telemetry').send(sample).expect(401);
  await request(app).post('/api/v1/telemetry').set('X-Device-Key', 'c'.repeat(64)).send(sample).expect(401);
  await post({ ...sample, deviceId: 'other-device' }).expect(403);
  await post({ ...sample, currentMA: '12.3' }).expect(400);
  await post({ ...sample, powerMW: 999 }).expect(400);
  await post({ ...sample, extra: 'x'.repeat(5000) }).expect(413);
  await request(app).post('/api/v1/telemetry').set('X-Device-Key', config.deviceKey)
    .set('Content-Type', 'application/json').send('{bad').expect(400);
  await request(app).post('/api/v1/telemetry').set('X-Device-Key', config.deviceKey)
    .set('Content-Type', 'text/plain').send('hello').expect(415);
  assert.equal(await Reading.countDocuments(), 0);
});

test('bad device/source lookups and unknown route return consistent errors', async () => {
  await request(app).get('/api/v1/devices/other/latest').expect(404);
  await request(app).get('/api/v1/devices/solar-node-001/latest?source=bogus').expect(400);
  await request(app).get('/api/v1/devices/solar-node-001/latest?source[$ne]=sensor').expect(400);
  const unknown = await request(app).get('/unknown').expect(404);
  assert.equal(unknown.body.error.code, 'NOT_FOUND');
});

test('offline samples and duplicate replays stay offline', async () => {
  await post(sample).expect(201);
  // Native fixture update bypasses immutable schema solely to simulate elapsed wall time.
  await Reading.collection.updateOne({}, { $set: { receivedAt: new Date(Date.now() - 30000) } });
  await post(sample).expect(200);
  const latest = await request(app).get('/api/v1/devices/solar-node-001/latest').expect(200);
  assert.equal(latest.body.status, 'offline');
});

test('database disconnect is visible and stored data survives reconnection', async () => {
  const first = await post(sample).expect(201);
  await disconnectDatabase();
  await request(app).get('/api/v1/health').expect(503);
  await post(sample).expect(503);
  await connectDatabase(config);
  const replay = await post(sample).expect(200);
  assert.equal(replay.body.reading.id, first.body.reading.id);
  assert.equal(await Reading.countDocuments(), 1);
});

test('recent history is bounded, ordered and source-specific', async () => {
  for (let sequence = 0; sequence < 3; sequence++) await post({ ...sample, sequence, uptimeMs: sequence * 5000 }).expect(201);
  await post({ ...sample, bootId: 'simulator-history-boot', source: 'simulator' }).expect(201);
  const response = await request(app).get('/api/v1/devices/solar-node-001/readings?source=sensor&limit=2').expect(200);
  assert.deepEqual(response.body.readings.map(row => row.sequence), [1, 2]);
  assert.ok(response.body.readings.every(row => row.source === 'sensor'));
  const simulator = await request(app).get('/api/v1/devices/solar-node-001/readings?source=simulator').expect(200);
  assert.equal(simulator.body.readings.length, 1);
  await request(app).get('/api/v1/devices/solar-node-001/readings?limit=301').expect(400);
  await request(app).get('/api/v1/devices/other/readings').expect(404);
});

test('date-range history paginates, statistics use covered intervals, and CSV is complete', async () => {
  const start = Date.parse('2026-10-01T00:00:00Z');
  const docs = Array.from({ length: 4 }, (_, i) => ({ ...sample, sequence: i, uptimeMs: (i + 1) * 5000, receivedAt: new Date(start + i * 5000), voltageV: 1, currentMA: 1000, powerMW: 1000 }));
  await Reading.insertMany(docs);
  await Reading.create({ ...docs[0], bootId: 'simulator-date-range', source: 'simulator' });
  const params = new URLSearchParams({ from: new Date(start).toISOString(), to: new Date(start + 20000).toISOString(), source: 'sensor' }).toString();
  const base = '/api/v1/devices/solar-node-001';
  const first = await request(app).get(`${base}/history?${params}&limit=2`).expect(200);
  assert.deepEqual(first.body.readings.map(r => r.sequence), [0, 1]);
  const second = await request(app).get(`${base}/history?${params}&limit=2&cursor=${first.body.nextCursor}`).expect(200);
  assert.deepEqual(second.body.readings.map(r => r.sequence), [2, 3]); assert.equal(second.body.nextCursor, null);
  const stats = (await request(app).get(`${base}/statistics?${params}`).expect(200)).body;
  assert.equal(stats.summary.sampleCount, 4); assert.equal(stats.summary.coveredMs, 15000); assert.equal(stats.summary.coveragePercent, 75);
  assert.ok(Math.abs(stats.summary.generatedEnergyMWh - 1000 * 15000 / 3600000) < 1e-8);
  const csv = await request(app).get(`${base}/export.csv?${params}`).expect(200);
  assert.match(csv.headers['content-type'], /text\/csv/); assert.equal(csv.text.trim().split('\r\n').length, 5);
  await request(app).get(`${base}/statistics?source=sensor`).expect(400);
});
