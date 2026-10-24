import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { loadEnv, readConfig } from '../server/src/config/env.js';
export async function diagnose(config, fetcher = fetch) {
  const results = [];
  let interfaces = {};
  try { interfaces = networkInterfaces(); } catch { results.push('LAN adapter enumeration unavailable; check IPv4 manually with ipconfig.'); }
  const addresses = Object.entries(interfaces).flatMap(([name, rows]) => (rows || []).filter(row => !row.internal && row.family === 'IPv4').map(row => ({ name, address: row.address })));
  results.push(`Backend configured: ${config.host}:${config.port}; device ${config.deviceId}.`);
  for (const { name, address } of addresses) results.push(`LAN (${name}): http://${address}:${config.port}/api/v1/telemetry`);
  if (!addresses.length) results.push('No LAN IPv4 address found. Connect laptop Wi-Fi to the hotspot.');
  try {
    const response = await fetcher(`http://127.0.0.1:${config.port}/api/v1/health`, { signal: AbortSignal.timeout(6000) });
    const health = await response.json();
    if (!response.ok || health.database !== 'connected') { results.push('API reachable, database not ready. Check backend terminal and Atlas network access.'); return { ok: false, results }; }
    results.push(`API/database ready; milestone ${health.milestone}.`);
    const deviceResponse = await fetcher(`http://127.0.0.1:${config.port}/api/v1/devices`, { signal: AbortSignal.timeout(6000) });
    const devices = await deviceResponse.json();
    if (!deviceResponse.ok || !devices.devices?.some(d => d.deviceId === config.deviceId) || health.milestone !== 5) {
      results.push('Wrong or older backend is running on this port. Stop the previous project and start Day 5.'); return { ok: false, results };
    }
    const latest = await fetcher(`http://127.0.0.1:${config.port}/api/v1/devices/${encodeURIComponent(config.deviceId)}/latest`, { signal: AbortSignal.timeout(6000) }).then(r => r.json());
    results.push(`Real sensor: ${latest.status}; last reception ${latest.lastReceivedAt || 'none'}.`);
    if (latest.status !== 'online') results.push('Backend works. Check ESP32 Serial Monitor for Wi-Fi, discovery endpoint and HTTP 201/200.');
    return { ok: true, results };
  } catch { results.push('Cannot reach the configured backend. Run npm start in a separate terminal; check PORT/HOST or a startup failure.'); return { ok: false, results }; }
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    loadEnv(); const config = readConfig();
    const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url)));
    if (manifest.scripts.start !== 'npm run start --workspace server') console.log('Restore root start script: npm run start --workspace server. Run npm run client separately.');
    const result = await diagnose(config); result.results.forEach(line => console.log(line)); process.exitCode = result.ok ? 0 : 1;
  } catch { console.error('Configuration invalid. Keep/copy your working server/.env, then check its settings. No secrets were printed.'); process.exitCode = 1; }
}
