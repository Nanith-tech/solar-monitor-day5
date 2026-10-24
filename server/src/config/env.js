import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

export function loadEnv() {
  dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });
}

export function readConfig(env = process.env) {
  const number = (key, fallback, min, max, integer = true) => {
    const value = env[key] === undefined ? fallback : Number(env[key]);
    if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
      throw new Error(`${key} must be ${integer ? 'an integer' : 'a number'} between ${min} and ${max}.`);
    }
    return value;
  };
  const deviceId = env.DEVICE_ID || 'solar-node-001';
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(deviceId)) throw new Error('DEVICE_ID must use 1–64 letters, digits, underscores or hyphens.');
  const deviceKey = env.DEVICE_KEY || '';
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(deviceKey) || deviceKey.startsWith('replace-')) {
    throw new Error('Set DEVICE_KEY to 32–128 random letters/digits/underscores/hyphens (npm run setup generates it).');
  }
  const mongoUri = env.MONGODB_URI || 'mongodb://127.0.0.1:27017/solar_monitor';
  if (!/^mongodb(?:\+srv)?:\/\//.test(mongoUri)) throw new Error('MONGODB_URI must be a MongoDB connection URI.');
  const discovery = env.DISCOVERY_ENABLED ?? 'true';
  if (!['true', 'false'].includes(discovery)) throw new Error('DISCOVERY_ENABLED must be true or false.');
  const discoveryHost = env.DISCOVERY_HOST || 'solar-laptop';
  if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(discoveryHost)) throw new Error('DISCOVERY_HOST must be a simple hostname of 1–63 characters.');
  const simulator = env.ALLOW_SIMULATOR ?? 'false';
  if (!['true', 'false'].includes(simulator)) throw new Error('ALLOW_SIMULATOR must be true or false.');
  return Object.freeze({
    discoveryEnabled: discovery === 'true',
    discoveryHost,
    host: env.HOST || '0.0.0.0',
    port: number('PORT', 4000, 1, 65535),
    mongoUri,
    deviceId,
    deviceName: (env.DEVICE_NAME || 'Solar panel 1').slice(0, 100),
    deviceKey,
    offlineAfterMs: number('OFFLINE_AFTER_MS', 20000, 1000, 3600000),
    corsOrigin: env.CORS_ORIGIN || 'http://localhost:5173',
    allowSimulator: simulator === 'true',
    maxVoltageV: number('MAX_VOLTAGE_V', 26, 0.001, 1000, false),
    maxCurrentMA: number('MAX_CURRENT_MA', 3200, 0.001, 1000000, false),
    maxPowerMW: number('MAX_POWER_MW', 83200, 0.001, 1000000000, false)
  });
}
