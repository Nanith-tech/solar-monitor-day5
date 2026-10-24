import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { setTimeout as sleep } from 'node:timers/promises';
import { clientConfig, sendSample } from './device-client.mjs';

const config = clientConfig();
const interval = Number(process.env.SIMULATOR_INTERVAL_MS || 5000);
if (!Number.isInteger(interval) || interval < 1000 || interval > 60000) throw new Error('SIMULATOR_INTERVAL_MS must be 1000–60000.');
if (process.env.ALLOW_SIMULATOR !== 'true') throw new Error('Set ALLOW_SIMULATOR=true in server/.env and restart the server first.');
const limit = process.argv[2] === undefined ? Infinity : Number(process.argv[2]);
if (limit !== Infinity && (!Number.isSafeInteger(limit) || limit < 1)) throw new Error('Optional count must be a positive integer: npm run simulate -- 3');
const bootId = randomUUID();
const started = performance.now();
const controller = new AbortController();
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => controller.abort());
console.log('SIMULATOR MODE — synthetic values, not solar measurements. Ctrl+C stops.');
try {
  for (let sequence = 0; sequence < limit && !controller.signal.aborted; sequence++) {
    // Vary illumination while obeying I = V / 100 ohms for the default load.
    const voltageV = Number((2.5 + 2.2 * Math.sin(sequence / 8)).toFixed(4));
    const currentMA = Number((voltageV * 10).toFixed(4));
    const powerMW = Number((voltageV * currentMA).toFixed(4));
    const sample = { deviceId: config.deviceId, bootId, sequence, voltageV, currentMA, powerMW,
      uptimeMs: Math.floor(performance.now() - started), rssiDbm: -55, source: 'simulator' };
    try {
      const result = await sendSample(config, sample, controller.signal);
      console.log(`[SIMULATOR] #${sequence} ${voltageV} V / ${currentMA} mA / ${powerMW} mW — ${result.duplicate ? 'already saved' : 'saved'}`);
    } catch (error) {
      if (controller.signal.aborted) break;
      if (error.permanent) throw error;
      console.error(`Sample #${sequence} dropped after bounded retries: ${error.message}`);
    }
    if (sequence + 1 < limit) await sleep(interval, undefined, { signal: controller.signal });
  }
} catch (error) {
  if (!controller.signal.aborted) { console.error(error.message); process.exitCode = 1; }
}
