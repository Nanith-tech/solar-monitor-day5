import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeReadings, chartSegments, validReading } from '../src/utils/live.js';

const row = sequence => ({ id: String(sequence).padStart(4, '0'), deviceId: 'solar-node-001', source: 'sensor', bootId: 'test-boot', sequence, voltageV: 1, currentMA: 10, powerMW: 10, rssiDbm: -55, uptimeMs: sequence * 5000, receivedAt: new Date(1000000 + sequence * 5000).toISOString() });
test('snapshot/live overlap and duplicate deliveries keep one point and chronological order', () => {
  const rows = mergeReadings([row(3), row(1)], [row(2), row(3)]);
  assert.deepEqual(rows.map(r => r.sequence), [1, 2, 3]);
});
test('buffer drops oldest points and rejects wrong source/device/non-finite values', () => {
  const rows = mergeReadings([], Array.from({ length: 500 }, (_, i) => row(i)));
  assert.equal(rows.length, 120); assert.equal(rows[0].sequence, 380);
  assert.ok(validReading(row(0), 'sensor', 'solar-node-001'));
  assert.ok(!validReading(row(0), 'simulator', 'solar-node-001'));
  assert.ok(!validReading({ ...row(0), powerMW: NaN }, 'sensor', 'solar-node-001'));
  assert.ok(!validReading({ ...row(0), deviceId: 'other' }, 'sensor', 'solar-node-001'));
});
test('plot lines break at outages and device restart rather than interpolate gaps', () => {
  const rows = [row(0), row(1), row(10), { ...row(11), bootId: 'new-boot' }];
  assert.deepEqual(chartSegments(rows).map(segment => segment.length), [2, 1, 1]);
});
