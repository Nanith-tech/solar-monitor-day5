const DAY_MS = 86400000, OFFSET_MS = 19800000;
export function istDate(now = Date.now()) { return new Date(now + OFFSET_MS).toISOString().slice(0, 10); }
export function presetDates(preset, now = Date.now()) {
  const day = Math.floor((now + OFFSET_MS) / DAY_MS) * DAY_MS;
  const from = preset === 'week' ? day - ((new Date(day).getUTCDay() + 6) % 7) * DAY_MS : preset === 'month' ? Date.UTC(new Date(day).getUTCFullYear(), new Date(day).getUTCMonth(), 1) : day;
  return { startDate: new Date(from).toISOString().slice(0, 10), endDate: istDate(now) };
}
export function dateRange(startDate, endDate, now = Date.now()) {
  const valid = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  if (!valid(startDate) || !valid(endDate)) throw new Error('Select valid start and end dates.');
  const from = Date.parse(`${startDate}T00:00:00Z`) - OFFSET_MS;
  const dayEnd = Date.parse(`${endDate}T00:00:00Z`) - OFFSET_MS + DAY_MS;
  if (endDate < startDate || endDate > istDate(now)) throw new Error('End date must follow the start date and cannot be in the future.');
  // Inclusive calendar dates, with a fixed upper bound at Apply time for today.
  const to = Math.min(dayEnd, now);
  if (from >= to || dayEnd - from > 31 * DAY_MS) throw new Error('Choose a range of 1 to 31 calendar days.');
  return { from: new Date(from).toISOString(), to: new Date(to).toISOString() };
}
export function rangeQuery(source, range) { return new URLSearchParams({ source, from: range.from, to: range.to }).toString(); }
export function historyNumber(value, digits = 4) {
  if (!Number.isFinite(value)) return '—';
  return value !== 0 && Math.abs(value) < 10 ** -digits ? value.toExponential(2) : value.toLocaleString('en-IN', { maximumFractionDigits: digits });
}
