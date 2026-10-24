import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { clientConfig, sendSample } from './device-client.mjs';

const config = clientConfig();
if (process.env.ALLOW_SIMULATOR !== 'true') throw new Error('Smoke test writes simulator data: enable ALLOW_SIMULATOR=true and restart server.');
const sample = { deviceId: config.deviceId, bootId: randomUUID(), sequence: 0,
  voltageV: 1.23, currentMA: 12.3, powerMW: 15.129, uptimeMs: 1000, rssiDbm: -55, source: 'simulator' };
const get = async route => {
  const response = await fetch(`${config.apiUrl}${route}`, { signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, 200); return response.json();
};
assert.equal((await get('/api/v1/health')).database, 'connected');
const inserted = await sendSample(config, sample);
assert.equal(inserted.duplicate, false);
const replay = await sendSample(config, sample);
assert.equal(replay.duplicate, true);
assert.equal(replay.reading.id, inserted.reading.id);
assert.equal(replay.reading.receivedAt, inserted.reading.receivedAt);
const latest = await get(`/api/v1/devices/${encodeURIComponent(config.deviceId)}/latest?source=simulator`);
assert.equal(latest.source, 'simulator');
assert.ok(latest.reading);
assert.equal((await get('/api/v1/devices')).devices[0].deviceId, config.deviceId);
const missingKey = await fetch(`${config.apiUrl}/api/v1/telemetry`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sample), signal: AbortSignal.timeout(5000)
});
assert.equal(missingKey.status, 401);
console.log('Smoke passed: health, persistence response, identical retry, source lookup, device list, missing-key rejection.');
console.log('One explicitly labeled simulator reading was saved. Keep it separate from hardware history.');
