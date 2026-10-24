import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEnergyAccumulator, intervalEnergy, eligiblePair, bucketStart, nextBucket } from '../src/services/energy.service.js';
const start = Date.parse('2026-10-01T00:00:00Z');
const row = (offset, power = 1000, extra = {}) => ({ deviceId: 'solar-node-001', source: 'sensor', bootId: 'test-boot', sequence: offset / 5000, uptimeMs: offset + 5000, receivedAt: new Date(start + offset), powerMW: power, ...extra });
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
function calculate(rows, from = start, to = start + 10000) { const acc = createEnergyAccumulator(from, to); rows.forEach(r => acc.add(r)); return acc.result(); }

test('constant 1 W for one covered hour gives 1000 mWh with time-weighted average', () => {
  const rows = Array.from({ length: 721 }, (_, i) => row(i * 5000));
  const result = calculate(rows, start, start + 3600000);
  near(result.summary.netEnergyMWh, 1000); near(result.summary.generatedEnergyMWh, 1000);
  near(result.summary.averagePowerMW, 1000); assert.equal(result.summary.coveredMs, 3600000);
  assert.equal(result.summary.sampleCount, 720); assert.equal(result.summary.coveragePercent, 100);
});
test('linear ramp crossing zero integrates positive triangle separately from signed net', () => {
  near(intervalEnergy(-1000, 1000, 10000).net, 0);
  near(intervalEnergy(-1000, 1000, 10000).positive, 1000 * 2500 / 3600000);
  near(intervalEnergy(1000, -3000, 10000).positive, 1000 * 1250 / 3600000);
  const result = calculate([row(0, -1000), row(5000, 1000)]);
  near(result.summary.netEnergyMWh, 0); assert.ok(result.summary.generatedEnergyMWh > 0);
  const negative = calculate([row(0, -1000), row(5000, -1000)]);
  assert.equal(negative.summary.generatedEnergyMWh, 0); assert.ok(negative.summary.netEnergyMWh < 0);
});
test('gaps, restarts, changed source, repeated/backward sequence and uptime are excluded', () => {
  for (const b of [row(20000), row(5000, 1000, { bootId: 'another-boot' }), row(5000, 1000, { source: 'simulator' }), row(5000, 1000, { sequence: 0 }), row(5000, 1000, { uptimeMs: 4000 }), row(5000, 1000, { uptimeMs: 30000 })]) assert.equal(eligiblePair(row(0), b), false);
  const result = calculate([row(0), row(20000)], start, start + 30000);
  assert.equal(result.summary.coveredMs, 0); assert.equal(result.summary.netEnergyMWh, null); assert.equal(result.summary.averagePowerMW, null);
});
test('boundary context is clipped and not counted; nothing extrapolates', () => {
  const result = calculate([row(0, 0), row(10000, 1000)], start + 2500, start + 7500);
  assert.equal(result.summary.sampleCount, 0); assert.equal(result.summary.coveredMs, 5000); near(result.summary.averagePowerMW, 500);
  const partial = calculate([row(0), row(5000)], start, start + 10000);
  assert.equal(partial.summary.coveragePercent, 50); assert.equal(partial.summary.missingMs, 5000);
  const single = calculate([row(0)]); assert.equal(single.summary.generatedEnergyMWh, null); assert.equal(single.summary.peakPowerMW, 1000);
  const empty = calculate([]); assert.equal(empty.summary.peakPowerMW, null); assert.equal(empty.summary.sampleCount, 0);
});
test('millisecond Date objects retain precision; midnight IST splits energy without loss', () => {
  const midnight = Date.parse('2026-10-01T18:30:00Z');
  const a = row(0, 1000, { receivedAt: new Date(midnight - 2500), sequence: 0, uptimeMs: 5000 });
  const b = row(5000, 1000, { receivedAt: new Date(midnight + 2500), sequence: 1, uptimeMs: 10000 });
  const result = calculate([a, b], midnight - 2500, midnight + 2500);
  assert.equal(result.daily.length, 2); assert.equal(result.daily[0].coveredMs, 2500); assert.equal(result.daily[1].coveredMs, 2500);
  near(result.daily.reduce((s, r) => s + r.netEnergyMWh, 0), result.summary.netEnergyMWh);
  assert.equal(calculate([row(0, 1000, { receivedAt: new Date(start + 125) }), row(5000, 1000, { receivedAt: new Date(start + 5875) })]).summary.coveredMs, 5750);
});
test('IST Monday weeks and month/year rollover use calendar boundaries', () => {
  assert.equal(new Date(bucketStart(Date.parse('2026-10-04T19:00:00Z'), 'week')).toISOString(), '2026-10-04T18:30:00.000Z');
  const december = Date.parse('2026-11-30T18:30:00Z');
  assert.equal(new Date(nextBucket(december, 'month')).toISOString(), '2026-12-31T18:30:00.000Z');
  const result = calculate([], Date.parse('2026-09-30T18:30:00Z'), Date.parse('2026-10-31T18:30:00Z'));
  assert.equal(result.daily.length, 31); assert.equal(result.monthly.length, 1); assert.ok(result.daily.every(r => r.netEnergyMWh === null));
});

test('HTTP reception jitter does not change energy based on device uptime', () => {
  const result = calculate([row(0), row(5000, 1000, { receivedAt: new Date(start + 10000) })]);
  assert.equal(result.summary.coveredMs, 10000); assert.equal(result.summary.coveredUptimeMs, 5000);
  near(result.summary.generatedEnergyMWh, 1000 * 5000 / 3600000); near(result.summary.averagePowerMW, 1000);
  const clipped = calculate([row(0), row(5000, 1000, { receivedAt: new Date(start + 10000) })], start + 2500, start + 7500);
  assert.equal(clipped.summary.coveredUptimeMs, 2500); near(clipped.summary.generatedEnergyMWh, 1000 * 2500 / 3600000);
});
