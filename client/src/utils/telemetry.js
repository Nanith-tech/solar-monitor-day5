export function formatValue(value, digits = 3) {
  return Number.isFinite(value) ? value.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits }) : '—';
}

export function elapsedLabel(ms) {
  if (!Number.isFinite(ms)) return 'Not available';
  const seconds = Math.max(0, Math.floor(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export function readingAge(data, now) {
  const receivedAt = data?.latest?.reading?.receivedAt;
  if (!receivedAt || !Number.isFinite(Date.parse(receivedAt))) return null;
  return Math.max(0, now + (data.clockOffsetMs || 0) - Date.parse(receivedAt));
}

export function deviceStatus(data, now, hasError = false) {
  if (hasError) return 'unverified';
  const age = readingAge(data, now);
  if (age === null) return 'never-seen';
  return age > (data.device.offlineAfterMs || 20000) ? 'offline' : 'online';
}

export function receptionLabel(timestamp) {
  if (!timestamp || !Number.isFinite(Date.parse(timestamp))) return 'No readings received';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'Asia/Kolkata' }).format(new Date(timestamp));
}
