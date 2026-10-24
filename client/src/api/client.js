const base = (import.meta.env?.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
export const configuredDevice = import.meta.env?.VITE_DEVICE_ID || 'solar-node-001';

export async function getJSON(path, signal) {
  let response;
  try { response = await fetch(`${base}${path}`, { signal, cache: 'no-store' }); }
  catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('Cannot reach the API. Check that the backend is running and the API address is correct.');
  }
  let body;
  try { body = await response.json(); }
  catch { throw new Error('The API did not return JSON. Check the API address and proxy settings.'); }
  if (!response.ok) throw new Error(body.error?.message || `API request failed (${response.status}). Check the backend and database connection.`);
  return body;
}

export function socketOrigin() {
  return import.meta.env?.VITE_SOCKET_URL || (/^https?:\/\//.test(base) ? new URL(base).origin : undefined);
}

export async function fetchRecentReadings(deviceId, source, signal) {
  const result = await getJSON(`/devices/${encodeURIComponent(deviceId)}/readings?source=${source}&limit=120`, signal);
  if (result.deviceId !== deviceId || result.source !== source || !Array.isArray(result.readings)) throw new Error('Unexpected chart history response.');
  return result.readings;
}

export async function fetchDashboard(source, signal) {
  const startedAt = Date.now();
  const [health, devices] = await Promise.all([getJSON('/health', signal), getJSON('/devices', signal)]);
  if (!Array.isArray(devices.devices)) throw new Error('Unexpected device response from the API.');
  const device = devices.devices.find(item => item.deviceId === configuredDevice);
  if (!device) throw new Error(`Device ${configuredDevice} was not found. Check VITE_DEVICE_ID.`);
  const latest = await getJSON(`/devices/${encodeURIComponent(device.deviceId)}/latest?source=${source}`, signal);
  if (latest.source !== source || latest.deviceId !== device.deviceId) throw new Error('Unexpected telemetry source from the API.');
  if (latest.reading && (!['voltageV', 'currentMA', 'powerMW', 'uptimeMs', 'rssiDbm'].every(key => Number.isFinite(latest.reading[key])) || !Number.isFinite(Date.parse(latest.reading.receivedAt)) || latest.reading.source !== source)) {
    throw new Error('The API returned an invalid telemetry reading.');
  }
  return { health, device, latest, source, checkedAt: Date.now(), clockOffsetMs: Number.isFinite(Date.parse(health.serverTime)) ? Date.parse(health.serverTime) - startedAt : 0 };
}

export async function downloadCSV(deviceId, query, signal) {
  const response = await fetch(`${base}/devices/${encodeURIComponent(deviceId)}/export.csv?${query}`, { signal, cache: 'no-store' });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error?.message || `CSV export failed (${response.status}).`);
  }
  if (!response.headers.get('content-type')?.includes('text/csv')) throw new Error('Unexpected export response. Check the API address.');
  return response.blob();
}
