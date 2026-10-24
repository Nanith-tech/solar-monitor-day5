import { Router } from 'express';
import { isIP } from 'node:net';
import { HttpError } from '../middleware/errorHandler.js';
export function privateIPv4(ip) {
  if (typeof ip !== 'string' || isIP(ip) !== 4) return false;
  const [a,b,,d] = ip.split('.').map(Number);
  return d !== 0 && d !== 255 && (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168));
}
export function wifiRoutes(config, request = fetch) {
  const router = Router(); let busy = false, last = 0;
  router.post('/:deviceId/wifi', async (req,res,next) => {
    try {
      // Administrative operation is available only through this laptop's browser.
      const remote = req.socket.remoteAddress;
      let origin = req.get('Origin');
      if (!origin) { try { origin = new URL(req.get('Referer')).origin; } catch {} }
      const allowed = new Set([config.corsOrigin, config.corsOrigin.replace('localhost', '127.0.0.1')]);
      if (!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(remote) || req.get('X-Solar-Setup') !== '1' || !allowed.has(origin)) throw new HttpError(403,'LOCAL_SETUP_ONLY','Use the dashboard on the backend laptop.');
      if (req.params.deviceId !== config.deviceId) throw new HttpError(404,'UNKNOWN_DEVICE','Configured device does not match.');
      const { espIp, ssid, password } = req.body || {};
      if (!privateIPv4(espIp) || typeof ssid !== 'string' || Buffer.byteLength(ssid) < 1 || Buffer.byteLength(ssid) > 32 || /[\x00-\x1f\x7f]/.test(ssid) || typeof password !== 'string' || (password !== '' && !/^[\x20-\x7e]{8,63}$/.test(password))) throw new HttpError(400,'INVALID_WIFI','Use a private ESP32 IPv4 address, a 1–32 byte SSID and an empty or 8–63 ASCII character password.');
      if (busy || Date.now()-last < 5000) throw new HttpError(429,'SETUP_BUSY','Wait five seconds before another Wi-Fi change.');
      busy = true; last = Date.now();
      try {
        const url = `http://${espIp}`;
        const info = await request(`${url}/solar-info`, {signal:AbortSignal.timeout(5000),redirect:'error'});
        const identity = await info.json();
        if (!info.ok || identity.deviceId !== config.deviceId || identity.wifiSetup !== 1) throw new HttpError(409,'WRONG_ESP32','Address is not the configured Day 5 ESP32.');
        const answer = await request(`${url}/wifi`, {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded','X-Device-Key':config.deviceKey},body:new URLSearchParams({ssid,password}).toString(),signal:AbortSignal.timeout(8000),redirect:'error'});
        if (answer.status === 401) throw new HttpError(401,'DEVICE_KEY_MISMATCH','ESP32 and server DEVICE_KEY must match.');
        if (answer.status !== 202) throw new HttpError(502,'ESP32_REJECTED','ESP32 could not save the settings. Check its Serial Monitor.');
        res.status(202).json({status:'accepted',message:'Settings saved on ESP32. It will try the new network; this does not yet confirm a successful connection.'});
      } catch (error) {
        if (error instanceof HttpError) throw error;
        throw new HttpError(502,'ESP32_UNREACHABLE','Cannot reach the ESP32. Check its IP, Day 5 firmware, or join its setup hotspot.');
      } finally {busy=false;}
    } catch(error) {next(error);}
  }); return router;
}
