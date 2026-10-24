import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatValue, elapsedLabel, deviceStatus, readingAge, receptionLabel } from '../src/utils/telemetry.js';

test('missing values do not masquerade as zero; signed small readings remain visible', () => {
  assert.equal(formatValue(undefined), '—');
  assert.equal(formatValue(0), '0.000');
  assert.equal(formatValue(-0.3), '-0.300');
  assert.equal(formatValue(15.129), '15.129');
});
test('offline status follows receipt time with server clock correction', () => {
  const data = { latest: { reading: { receivedAt: new Date(100000).toISOString() } }, device: { offlineAfterMs: 20000 }, clockOffsetMs: 1000 };
  assert.equal(deviceStatus(data, 119000), 'online');
  assert.equal(deviceStatus(data, 119001), 'offline');
  assert.equal(readingAge(data, 120000), 21000);
  assert.equal(deviceStatus(data, 100000, true), 'unverified');
  assert.equal(deviceStatus(null, 100000), 'never-seen');
});
test('timestamps and uptime represent missing data and meaningful units', () => {
  assert.equal(elapsedLabel(null), 'Not available');
  assert.equal(elapsedLabel(65000), '1m 5s');
  assert.equal(elapsedLabel(3660000), '1h 1m');
  assert.equal(receptionLabel(null), 'No readings received');
});
