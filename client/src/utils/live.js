export const MAX_LIVE_POINTS = 120;

export function validReading(row, source, deviceId) {
  return row && row.source === source && row.deviceId === deviceId && typeof row.bootId === 'string' && Number.isSafeInteger(row.sequence) && row.sequence >= 0 && Number.isFinite(Date.parse(row.receivedAt)) && ['voltageV', 'currentMA', 'powerMW', 'uptimeMs', 'rssiDbm'].every(key => Number.isFinite(row[key]));
}

export function mergeReadings(previous, incoming, limit = MAX_LIVE_POINTS) {
  const rows = new Map();
  for (const row of [...previous, ...incoming]) rows.set(`${row.deviceId}:${row.source}:${row.bootId}:${row.sequence}`, row);
  return [...rows.values()].sort((a, b) => Date.parse(a.receivedAt) - Date.parse(b.receivedAt) || String(a.id || '').localeCompare(String(b.id || ''))).slice(-limit);
}

export function chartSegments(rows, maxGapMs = 15000) {
  const segments = [];
  for (const row of rows) {
    const last = segments.at(-1)?.at(-1);
    if (!last || last.bootId !== row.bootId || last.source !== row.source || row.uptimeMs < last.uptimeMs || row.uptimeMs - last.uptimeMs > maxGapMs || Date.parse(row.receivedAt) - Date.parse(last.receivedAt) > maxGapMs) segments.push([]);
    segments.at(-1).push(row);
  }
  return segments;
}
