import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { Bonjour } from 'bonjour-service';
import { lanAddresses, advertisement, startDiscovery } from '../src/discovery/advertise.js';
import { readConfig } from '../src/config/env.js';
const config = readConfig({ DEVICE_KEY: 'a'.repeat(64) });
const tick = () => new Promise(resolve => setImmediate(resolve));
test('advertises explicit metadata without credentials and excludes loopback/IPv6', () => {
  assert.deepEqual(lanAddresses({ WiFi: [{ internal: false, family: 'IPv4', address: '192.168.43.10' }, { internal: false, family: 'IPv6', address: '::2' }], loop: [{ internal: true, family: 'IPv4', address: '127.0.0.1' }] }), ['192.168.43.10']);
  const record = advertisement(config, '192.168.43.10'); assert.equal(record.type, 'solar-monitor'); assert.equal(record.port, 4000); assert.equal(record.txt.path, '/api/v1/telemetry'); assert.ok(!JSON.stringify(record).includes(config.deviceKey));
  assert.throws(() => readConfig({ DEVICE_KEY: config.deviceKey, DISCOVERY_ENABLED: 'maybe' }));
});
test('network-address change restarts advertisement/socket; close and disabled mode clean up', async () => {
  let addresses = ['192.168.43.10']; const instances = [], published = []; let stopped = 0, destroyed = 0;
  const makeBonjour = () => { const instance = { publish: value => { published.push(value); const service = new EventEmitter(); service.records = () => [{ type: 'A', data: addresses[0] }, { type: 'A', data: '10.0.0.3' }, { type: 'TXT' }]; service.stop = cb => { stopped++; cb(); }; return service; }, destroy: () => destroyed++ }; instances.push(instance); return instance; };
  const discovery = startDiscovery(config, { makeBonjour, addresses: () => addresses, log() {}, warn() {} });
  await tick(); assert.equal(published.length, 1);
  await discovery.refresh(); assert.equal(published.length, 1);
  addresses = ['192.168.44.15']; await discovery.refresh(); assert.equal(published.length, 2); assert.equal(stopped, 1); assert.equal(destroyed, 1);
  await discovery.close(); await discovery.close(); assert.equal(stopped, 2); assert.equal(destroyed, 2);
  const disabled = startDiscovery({ ...config, discoveryEnabled: false }, { makeBonjour }); await disabled.close(); assert.equal(instances.length, 2);
});
test('discovery errors leave the HTTP application usable', async () => {
  const warnings = []; const discovery = startDiscovery(config, { makeBonjour: () => { throw new Error('blocked'); }, addresses: () => ['192.168.43.10'], warn: value => warnings.push(value) });
  await tick(); assert.ok(warnings.length); await discovery.close();
});
test('actual local mDNS publishes device, port and protocol over UDP', { skip: process.env.SOLAR_TEST_MDNS !== 'true' }, async () => {
  const publisher = new Bonjour({}, () => {}), browserInstance = new Bonjour({}, () => {});
  const type = `solar-test${Math.floor(Math.random() * 9999)}`;
  let browser;
  try {
    const found = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('mDNS not received in this environment')), 8000);
      browser = browserInstance.find({ type }, service => { clearTimeout(timer); resolve(service); });
    });
    const service = publisher.publish({ ...advertisement(config, '192.168.43.10'), name: `Solar Test ${Date.now()}`, type }); service.on('error', () => {});
    const result = await found;
    assert.equal(result.port, 4000); assert.equal(result.txt.deviceId, config.deviceId); assert.equal(result.txt.path, '/api/v1/telemetry');
  } finally {
    browser?.stop(); browserInstance.destroy();
    await new Promise(resolve => { const timer = setTimeout(resolve, 500); publisher.unpublishAll(() => { clearTimeout(timer); resolve(); }); }); publisher.destroy();
  }
});
