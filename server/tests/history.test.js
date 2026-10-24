import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHistoryQuery } from '../src/services/history.service.js';

test('history defaults to bounded sensor window; source is explicit', () => {
  const now = Date.now(); const result = parseHistoryQuery({}, now);
  assert.equal(result.limit, 120); assert.equal(result.source, 'sensor');
  assert.equal(result.since.getTime(), now - 3600000);
  assert.equal(parseHistoryQuery({ source: 'simulator', limit: '300' }).source, 'simulator');
});
test('history rejects unbounded limits, injection objects and invalid dates', () => {
  for (const query of [{ limit: '0' }, { limit: '301' }, { limit: '1.2' }, { limit: [] }, { source: {} }, { since: 'not-a-date' }, { since: new Date(Date.now() + 60000).toISOString() }, { since: new Date(Date.now() - 90000000).toISOString() }, { extra: 'yes' }]) assert.throws(() => parseHistoryQuery(query));
});
