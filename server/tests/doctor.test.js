import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diagnose } from '../../scripts/doctor.mjs';
const config = { host: '0.0.0.0', port: 4000, deviceId: 'solar-node-001' };
const fetcher = (milestone = 5) => async url => ({ ok: true, json: async () => url.endsWith('health') ? { database: 'connected', milestone } : url.endsWith('devices') ? { devices: [{ deviceId: config.deviceId }] } : { status: 'offline', lastReceivedAt: null } });
test('doctor distinguishes reachable backend/offline device from older server and refusal', async () => {
  const healthy = await diagnose(config, fetcher()); assert.equal(healthy.ok, true); assert.ok(healthy.results.some(r => r.includes('Real sensor: offline')));
  assert.equal((await diagnose(config, fetcher(4))).ok, false);
  assert.equal((await diagnose(config, async () => { throw new Error('refused'); })).ok, false);
});
