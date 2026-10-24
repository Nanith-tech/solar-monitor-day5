import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

export function clientConfig() {
  dotenv.config({ path: fileURLToPath(new URL('../server/.env', import.meta.url)), quiet: true });
  const apiUrl = (process.env.API_URL || `http://127.0.0.1:${process.env.PORT || 4000}`).replace(/\/$/, '');
  const key = process.env.DEVICE_KEY;
  if (!key || key.startsWith('replace-')) throw new Error('Run npm run setup first and configure server/.env.');
  return { apiUrl, key, deviceId: process.env.DEVICE_ID || 'solar-node-001' };
}

export async function sendSample(config, sample, signal) {
  const body = JSON.stringify(sample);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const timeout = AbortSignal.timeout(3000);
      const response = await fetch(`${config.apiUrl}/api/v1/telemetry`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Device-Key': config.key },
        body, signal: signal ? AbortSignal.any([signal, timeout]) : timeout
      });
      const data = await response.json();
      if (response.status === 200 || response.status === 201) return data;
      const message = `HTTP ${response.status}: ${data.error?.message || 'Request rejected'}`;
      if (response.status < 500 && response.status !== 429) {
        const error = new Error(message); error.permanent = true; throw error;
      }
      if (attempt === 3) throw new Error(message);
    } catch (error) {
      if (error.permanent || attempt === 3 || signal?.aborted) throw error;
    }
    await sleep(1000, undefined, { signal });
  }
}
