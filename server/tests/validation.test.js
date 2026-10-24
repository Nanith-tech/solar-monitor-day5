import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readConfig } from '../src/config/env.js';
import { validateTelemetry } from '../src/validators/telemetry.js';
import { streamStatus } from '../src/services/telemetry.service.js';

const config = readConfig({ DEVICE_KEY: 'a'.repeat(64), ALLOW_SIMULATOR: 'true' });
const sample = { deviceId: config.deviceId, bootId: 'test-boot-001', sequence: 0,
  voltageV: 1.23, currentMA: 12.3, powerMW: 15.129, uptimeMs: 5000, rssiDbm: -55, source: 'sensor' };

test('explicit units and negative diagnostic current are preserved', () => {
  assert.deepEqual(validateTelemetry(sample, config), sample);
  const negative = { ...sample, currentMA: -0.5, powerMW: -0.615 };
  assert.deepEqual(validateTelemetry(negative, config), negative);
});

test('rejects unsafe identities, forged timestamps, types, non-finite numbers and inconsistent power', () => {
  for (const change of [
    { sequence: -1 }, { sequence: Number.MAX_SAFE_INTEGER + 1 }, { uptimeMs: 1.5 },
    { bootId: 'short' }, { voltageV: NaN }, { voltageV: Infinity }, { voltageV: '1.23' },
    { currentMA: null }, { powerMW: 16 }, { receivedAt: '2026-01-01' },
    { source: 'unknown' }, { rssiDbm: -200 }, { voltageV: 27 }
  ]) assert.throws(() => validateTelemetry({ ...sample, ...change }, config));
});

test('real measurements above nominal panel ratings are accepted within sensor bounds', () => {
  assert.equal(validateTelemetry({ ...sample, voltageV: 8, currentMA: 110, powerMW: 880 }, config).voltageV, 8);
});

test('key authorizes only the configured device and simulator is opt-in', () => {
  assert.throws(() => validateTelemetry({ ...sample, deviceId: 'another-node' }, config), { code: 'DEVICE_FORBIDDEN' });
  assert.throws(() => validateTelemetry({ ...sample, source: 'simulator' }, { ...config, allowSimulator: false }), { code: 'SIMULATOR_DISABLED' });
});

test('configuration fails fast for placeholder keys and invalid bounds', () => {
  assert.throws(() => readConfig({ DEVICE_KEY: 'replace-with-at-least-32-random-characters' }));
  for (const bad of [{ PORT: 'NaN' }, { OFFLINE_AFTER_MS: '0' }, { MAX_VOLTAGE_V: '-1' }, { ALLOW_SIMULATOR: 'yes' }]) {
    assert.throws(() => readConfig({ DEVICE_KEY: 'a'.repeat(64), ...bad }));
  }
});

test('status ages even when no more samples arrive', () => {
  assert.equal(streamStatus(null, 20000).status, 'never-seen');
  const reading = { receivedAt: new Date(100000) };
  assert.equal(streamStatus(reading, 20000, 120000).status, 'online');
  assert.equal(streamStatus(reading, 20000, 120001).status, 'offline');
});
