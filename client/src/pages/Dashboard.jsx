import React, { useEffect, useState } from 'react';
import SolarLab from '../components/SolarLab.jsx';
import WifiSetup from '../components/WifiSetup.jsx';
import HistoryExplorer from '../components/HistoryExplorer.jsx';
import { useTelemetry, POLL_INTERVAL_MS } from '../hooks/useTelemetry.js';
import Icon from '../components/Icon.jsx';
import MetricCard from '../components/MetricCard.jsx';
import DeviceStatus from '../components/DeviceStatus.jsx';
import TelemetryChart from '../components/TelemetryChart.jsx';
import { deviceStatus, elapsedLabel, readingAge, receptionLabel } from '../utils/telemetry.js';

export default function Dashboard() {
  const [source, setSource] = useState('sensor');
  const [helpOpen, setHelpOpen] = useState(false);
  const [section, setSection] = useState(() => window.location.hash || '#overview');
  useEffect(() => { const update = () => setSection(window.location.hash || '#overview'); window.addEventListener('hashchange', update); return () => window.removeEventListener('hashchange', update); }, []);
  const [now, setNow] = useState(Date.now());
  const { data, readings, error, historyError, loading, fetching, live, refresh } = useTelemetry(source);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const reading = data?.latest?.reading;
  const status = deviceStatus(data, now, Boolean(error));
  const age = readingAge(data, now);
  const stale = Boolean(reading) && (status !== 'online');
  const deviceId = data?.device?.deviceId || import.meta.env.VITE_DEVICE_ID || 'solar-node-001';
  const note = stale ? 'Last received value · stale' : source === 'simulator' ? 'Simulated reading' : 'Latest sensor reading';
  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#overview"><span className="brand-mark"><Icon name="sun" size={27} /></span><span>SOLAR<span className="brand-small">ENERGY MONITOR</span></span></a>
      
      <nav aria-label="Main navigation"><a className={`nav-item ${section === '#overview' ? 'active' : ''}`} aria-current={section === '#overview' ? 'location' : undefined} href="#overview"><Icon name="grid" />Overview</a><a className={`nav-item ${section === '#solar-lab' ? 'active' : ''}`} aria-current={section === '#solar-lab' ? 'location' : undefined} href="#solar-lab"><Icon name="sun" />Solar playground</a><a className={`nav-item ${section === '#history' ? 'active' : ''}`} aria-current={section === '#history' ? 'location' : undefined} href="#history"><Icon name="wave" />History & energy</a><a className={`nav-item ${section === '#wifi-setup' ? 'active' : ''}`} aria-current={section === '#wifi-setup' ? 'location' : undefined} href="#wifi-setup"><Icon name="wifi" />Wi-Fi setup</a><a className={`nav-item ${section === '#device' ? 'active' : ''}`} aria-current={section === '#device' ? 'location' : undefined} href="#device"><Icon name="wifi" />Device details</a><button className={`nav-item ${helpOpen ? 'selected' : ''}`} onClick={() => setHelpOpen(value => !value)} aria-expanded={helpOpen} aria-controls="connection-help"><Icon name="help" />Connection help</button></nav>
      <div className="sidebar-bottom"><span className="tiny-label">YOUR SOLAR NODE</span><strong>{deviceId}</strong><span>ESP32 · INA219</span><div className="sidebar-line" /><p>A small panel.<br />A clearer picture.</p></div>
    </aside>
    <main id="overview">
      <header className="page-header"><div><h1>A little sunlight. A lot to discover.</h1><p className="page-subtitle">Your solar lab, connected. Follow the light from panel to pixel.</p></div><div className="api-badge"><span className={`status-dot ${error ? 'dot-error' : data ? 'dot-live' : 'dot-wait'}`} />{error ? 'API unavailable' : data ? 'API connected' : 'Connecting to API'}</div></header>
      <div className="live-connection" role="status" data-testid="live-status"><span className={`status-dot ${live === 'connected' ? 'dot-live' : 'dot-wait'}`} />{live === 'connected' ? 'Live stream connected' : live === 'connecting' ? 'Connecting live stream…' : 'Live stream unavailable · REST fallback active'}</div>
      <section className="toolbar" aria-label="Telemetry controls"><div className="source-switch" role="group" aria-label="Reading source"><button aria-pressed={source === 'sensor'} className={source === 'sensor' ? 'chosen' : ''} onClick={() => setSource('sensor')}>Real sensor</button><button aria-pressed={source === 'simulator'} className={source === 'simulator' ? 'chosen' : ''} onClick={() => setSource('simulator')}>Simulator</button></div><div className="poll-controls"><span>{live === 'connected' ? 'Live updates · periodic recovery' : `Fallback every ${POLL_INTERVAL_MS / 1000}s`}</span><button className="refresh-button" onClick={refresh} disabled={fetching} aria-label="Refresh readings"><Icon name="refresh" className={fetching ? 'spinning' : ''} /><span>Refresh</span></button></div></section>
      {source === 'simulator' && <div className="notice notice-simulator" role="status"><Icon name="help" /><span><strong>Simulator mode.</strong> These are synthetic readings, separate from your solar measurements.</span></div>}
      {error && <div className="notice notice-error" role="alert"><Icon name="help" /><span><strong>Connection needs attention.</strong> {error} {reading ? 'The last successful values are shown below and may be stale.' : ''}</span><button onClick={refresh}>Retry</button></div>}
      {loading && <div className="notice notice-neutral" role="status">Loading your device and latest measurements…</div>}
      {!loading && !error && !reading && <div className="notice notice-neutral" role="status"><Icon name="help" /><span><strong>No {source === 'sensor' ? 'sensor' : 'simulator'} readings yet.</strong> {source === 'sensor' ? 'Keep the API running, power the ESP32 and check its Wi-Fi connection.' : 'Enable ALLOW_SIMULATOR=true on the backend and run npm run simulate.'}</span></div>}
      {status === 'offline' && <div className="notice notice-neutral" role="status">No new readings for {elapsedLabel(age)}. Showing the last received measurements.</div>}
      <SolarLab reading={reading} status={status} source={source} />
      <section className="metrics-grid" aria-label="Current measurements">
        <MetricCard title="Voltage" unit="V" value={reading?.voltageV} icon="wave" note={note} muted={stale} />
        <MetricCard title="Current" unit="mA" value={reading?.currentMA} icon="bolt" note={note} muted={stale} />
        <MetricCard title="Power" unit="mW" value={reading?.powerMW} icon="sun" note={note} muted={stale} accent />
      </section>
      <section className="charts-section" aria-label="Live measurement charts"><div className="charts-title"><div><h2>The rhythm of sunlight</h2></div><span>{source === 'sensor' ? 'Sensor measurements' : 'Simulated measurements'}{stale ? ' · stale' : ''}</span></div>
        {historyError && <div className="notice notice-neutral" role="status">History recovery needs attention: {historyError} New live samples can still appear.</div>}
        <div className="charts-grid"><TelemetryChart title="Voltage" field="voltageV" unit="V" rows={readings} color="#b66609" /><TelemetryChart title="Current" field="currentMA" unit="mA" rows={readings} color="#916c3f" /><TelemetryChart title="Power" field="powerMW" unit="mW" rows={readings} color="#b66609" /></div><p className="charts-footnote">Gaps over 15 seconds and device restarts break the lines. Hover a point for its measurement.</p>
      </section>
      <HistoryExplorer key={source} source={source} />
      <div className="details-grid">
        <section className="panel device-panel" id="device"><div className="panel-heading"><div><h2>Device connection</h2></div><DeviceStatus status={status} source={source} /></div><div className="device-identity"><span className="device-icon"><Icon name="wifi" size={25} /></span><div><strong>{data?.device?.name || 'Solar panel 1'}</strong><span>{deviceId}</span></div></div><dl className="detail-list"><div><dt>Last received</dt><dd data-testid="last-received">{receptionLabel(reading?.receivedAt)}<small>{reading ? `${elapsedLabel(age)} ago · IST` : 'Waiting for the first sample'}</small></dd></div><div><dt>Wi-Fi signal</dt><dd>{reading && reading.rssiDbm !== -127 ? `${reading.rssiDbm} dBm` : 'Not available'}<small>{source === 'simulator' ? 'Simulated signal' : 'At the time of sampling'}</small></dd></div><div><dt>Device uptime</dt><dd>{reading ? elapsedLabel(reading.uptimeMs) : 'Not available'}<small>{source === 'simulator' ? 'Simulator session uptime' : 'At the time of sampling'}</small></dd></div><div><dt>Sample sequence</dt><dd>{reading?.sequence ?? '—'}</dd></div></dl></section>
        <section className="panel observation-panel"><h2>Understand your measurements</h2><p className="observation-copy">Your panel drives a 100 Ω load. The INA219 reports load-side voltage and current; ESP32 turns them into a continuous record.</p><div className="formula-display"><span>Power</span><strong>V × mA = mW</strong></div><div className="hardware-tags"><span>ESP32</span><span>INA219</span><span>I²C</span><span>HTTP / REST</span></div><p className="observation-copy">Try shading the real panel, then watch the charts. Power near zero or a small negative current is still a measurement worth inspecting.</p><a className="setup-link" href="#solar-lab">Explore the visual model <Icon name="arrow" size={18} /></a></section>
      </div>
      <WifiSetup deviceId={deviceId} />
      <section className="panel pipeline-panel"><div><h2>From your panel to this screen</h2></div><div className="pipeline"><span><span className={`status-dot ${status === 'online' ? 'dot-live' : 'dot-wait'}`} />{source === 'sensor' ? 'ESP32 sensor' : 'Simulator'}</span><Icon name="arrow" /><span><span className={`status-dot ${data && !error ? 'dot-live' : 'dot-wait'}`} />API</span><Icon name="arrow" /><span><span className={`status-dot ${data && !error ? 'dot-live' : 'dot-wait'}`} />MongoDB</span><Icon name="arrow" /><span><Icon name="grid" size={16} />Dashboard</span></div><p>{error ? 'The backend connection is unavailable. Device status cannot currently be verified.' : data ? `Last successful check ${elapsedLabel(now - data.checkedAt)} ago. Database connected.` : 'Waiting for the first successful connection check.'}</p></section>
      <section className="panel help-panel" id="connection-help" hidden={!helpOpen}><h2>Connection help</h2><ol><li>Start both apps with <code>npm run dev:all</code>, or keep separate backend/frontend terminals running.</li><li>Run <code>npm run doctor</code> in another terminal to check the backend, database and sensor freshness.</li><li>For real readings, check the ESP32 Serial Monitor for HTTP 201 or 200. Day 5 firmware discovers the laptop automatically; if the hotspot blocks discovery, its fallback URL must use your laptop’s current Wi-Fi IPv4 address.</li><li>For simulator readings, enable <code>ALLOW_SIMULATOR=true</code>, restart the backend and run <code>npm run simulate</code>.</li><li>If your backend port changes, copy <code>client/.env.example</code> to <code>client/.env</code>, update <code>SOLAR_API_TARGET</code> and restart the frontend.</li></ol></section>
      <footer><span><Icon name="sun" size={16} /> Solar Monitor</span><span>Measurements in V · mA · mW</span></footer>
    </main>
  </div>;
}
