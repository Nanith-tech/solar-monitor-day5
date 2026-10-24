import { Bonjour } from 'bonjour-service';
import { networkInterfaces } from 'node:os';
import { createHash } from 'node:crypto';
export function lanAddresses(interfaces = networkInterfaces()) {
  return [...new Set(Object.values(interfaces).flatMap(entries => (entries || []).filter(row => !row.internal && (row.family === 'IPv4' || row.family === 4)).map(row => row.address)))].sort();
}
export function advertisement(config, address) {
  return { name: `Solar Monitor ${config.deviceId.slice(0,24)} ${address}`, type: 'solar-monitor', protocol: 'tcp', port: config.port, host: `${config.discoveryHost.slice(0,40)}-${address.replaceAll('.', '-')}.local`, disableIPv6: true,
    txt: { deviceId: config.deviceId, apiVersion: '1', path: '/api/v1/telemetry' } };
}
export function startDiscovery(config, options = {}) {
  const log = options.log || console.log, warn = options.warn || console.warn;
  const getAddresses = options.addresses || lanAddresses;
  const makeBonjour = options.makeBonjour || ((onError) => new Bonjour({}, onError));
  let instance, services = [], timer, fingerprint = '', closed = false;
  const stopServices = async () => {
    const previous = services; services = [];
    await Promise.all(previous.map(service => new Promise(resolve => {
      const deadline = setTimeout(resolve, 750); deadline.unref();
      service.stop(() => { clearTimeout(deadline); resolve(); });
    })));
  };
  async function close() {
    if (closed) return; closed = true; clearInterval(timer);
    await stopServices(); instance?.destroy();
  }
  if (!config.discoveryEnabled || !['0.0.0.0', '::'].includes(config.host)) {
    if (config.discoveryEnabled) warn('Discovery disabled: HOST must be 0.0.0.0 or :: for LAN access.');
    return { close, refresh: async () => {} };
  }
  let refreshing = false;
  async function refresh() {
    if (closed || refreshing) return;
    refreshing = true;
    try {
      const addresses = getAddresses();
      const nextFingerprint = createHash('sha256').update(addresses.join(',')).digest('hex');
      if (nextFingerprint === fingerprint) return;
      await stopServices();
      if (closed) return;
      instance?.destroy();
      instance = makeBonjour(() => { fingerprint = ''; warn('mDNS socket error; HTTP continues. Check UDP 5353/firewall.'); });
      for (const address of addresses) {
        const service = instance.publish(advertisement(config, address));
        // bonjour-service's records() normally lists every adapter. A separate
        // service per IPv4 keeps a VPN address from hiding the hotspot address.
        const records = service.records.bind(service);
        service.records = () => records().filter(row => row.type !== 'A' || row.data === address);
        service.on('error', () => warn('mDNS service could not be advertised; manual fallback remains available.'));
        service.on('up', () => { if (!closed) log(`Discovery advertised on ${address}:${config.port} for ${config.deviceId}.`); });
        services.push(service);
      }
      fingerprint = nextFingerprint;
      if (!addresses.length) warn('No LAN IPv4 address for discovery. Connect laptop Wi-Fi to the hotspot.');
    } catch { warn('Discovery unavailable; HTTP continues. Check UDP 5353/firewall or use manual fallback.'); }
    finally { refreshing = false; }
  }
  try {
    refresh();
    timer = setInterval(refresh, 10000); timer.unref();
  } catch { warn('Cannot start discovery. Manual telemetry URL remains supported.'); }
  return { close, refresh };
}
