import { test } from 'node:test';
import assert from 'node:assert/strict';
import { istDate, presetDates, dateRange, rangeQuery, historyNumber } from '../src/utils/history.js';
const now = Date.parse('2026-10-03T17:00:00Z');
test('inclusive IST date ranges become fixed half-open UTC timestamps', () => {
  assert.deepEqual(dateRange('2026-10-01', '2026-10-02', now), { from: '2026-09-30T18:30:00.000Z', to: '2026-10-02T18:30:00.000Z' });
  assert.equal(dateRange('2026-10-03', '2026-10-03', now).to, new Date(now).toISOString());
  assert.equal(istDate(Date.parse('2026-10-03T19:00:00Z')), '2026-10-04');
});
test('presets follow IST calendar weeks and months', () => {
  assert.deepEqual(presetDates('week', now), { startDate: '2026-09-28', endDate: '2026-10-03' });
  assert.deepEqual(presetDates('month', now), { startDate: '2026-10-01', endDate: '2026-10-03' });
});
test('invalid/reversed/future/overlong ranges rejected; missing and zero distinct', () => {
  for (const dates of [['2026-02-30', '2026-03-01'], ['2026-10-03', '2026-10-01'], ['2026-10-01', '2026-10-04'], ['2026-08-01', '2026-10-01']]) assert.throws(() => dateRange(...dates, now));
  assert.equal(historyNumber(null), '—'); assert.equal(historyNumber(0.000001), '1.00e-6'); assert.equal(historyNumber(0), '0');
  assert.equal(new URLSearchParams(rangeQuery('simulator', dateRange('2026-10-01', '2026-10-01', now))).get('source'), 'simulator');
});
