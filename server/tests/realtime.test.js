import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { setTimeout as sleep } from 'node:timers/promises';
import { io as client } from 'socket.io-client';
import { createRealtimeServer, publishTelemetry } from '../src/realtime/socket.js';
import { telemetryController } from '../src/controllers/telemetry.controller.js';
import { readConfig } from '../src/config/env.js';

function event(socket, name) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { socket.off(name, handler); reject(new Error(`Timed out waiting for ${name}`)); }, 3000);
    const handler = value => { clearTimeout(timeout); resolve(value); };
    socket.once(name, handler);
  });
}

test('actual Socket.IO delivery: after persistence, two browsers, source isolation, duplicates and failed saves', async () => {
  const config = readConfig({ DEVICE_KEY: 'r'.repeat(64), ALLOW_SIMULATOR: 'true' });
  const server = createServer((req, res) => res.end('ok'));
  const io = createRealtimeServer(server, config);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const sockets = [];
  try {
    const arrays = [];
    for (const source of ['sensor', 'sensor', 'simulator']) {
      const socket = client(url, { auth: { deviceId: config.deviceId, source }, autoConnect: false, transports: ['websocket'] });
      sockets.push(socket); const rows = []; arrays.push(rows);
      socket.on('telemetry:new', message => rows.push(message));
      const ready = event(socket, 'stream:ready'); socket.connect(); await ready;
    }
    const sample = { deviceId: config.deviceId, bootId: 'realtime-boot-001', sequence: 0, voltageV: 1.23, currentMA: 12.3, powerMW: 15.129, uptimeMs: 5000, rssiDbm: -55, source: 'sensor' };
    const saved = { duplicate: false, reading: { ...sample, id: 'fixture-id', receivedAt: new Date().toISOString() } };
    let commit;
    const pendingCommit = new Promise(resolve => { commit = resolve; });
    const handler = telemetryController(config, () => pendingCommit);
    const req = { body: sample, app: { get: () => io } };
    const res = { status() { return this; }, json() {} };
    const processing = handler(req, res);
    await sleep(30); assert.equal(arrays[0].length, 0, 'No uncommitted reading must escape');
    const delivered = [event(sockets[0], 'telemetry:new'), event(sockets[1], 'telemetry:new')];
    commit(saved); await processing; const results = await Promise.all(delivered);
    assert.equal(results[0].reading.id, saved.reading.id); assert.equal(results[1].reading.id, saved.reading.id);
    await telemetryController(config, async () => ({ ...saved, duplicate: true }))(req, res);
    await assert.rejects(telemetryController(config, async () => { throw new Error('write failed'); })(req, res));
    await sleep(30);
    assert.equal(arrays[0].length, 1); assert.equal(arrays[1].length, 1); assert.equal(arrays[2].length, 0);
    const simulator = event(sockets[2], 'telemetry:new');
    publishTelemetry(io, { duplicate: false, reading: { ...saved.reading, source: 'simulator' } });
    await simulator; await sleep(20);
    assert.equal(arrays[0].length, 1); assert.equal(arrays[2].length, 1);
    const bad = client(url, { auth: { deviceId: 'other', source: 'sensor' }, autoConnect: false, reconnection: false });
    sockets.push(bad); const rejected = event(bad, 'connect_error'); bad.connect();
    assert.match((await rejected).message, /Unknown device/);
  } finally {
    sockets.forEach(socket => socket.disconnect());
    await new Promise(resolve => io.close(resolve));
  }
});
