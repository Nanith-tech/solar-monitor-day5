import React, { useState } from 'react';
import Icon from './Icon.jsx';
import { formatValue } from '../utils/telemetry.js';

const parts = {
  panel: { title: 'Photovoltaic panel', text: 'Light produces a voltage across the panel. The 100 Ω load completes the circuit so current can flow. Shade the real panel to watch its measured output change.' },
  sensor: { title: 'INA219 measurement', text: 'The sensor measures load-side voltage and signed current through its shunt. ESP32 reads it over I²C on GPIO21 (SDA) and GPIO22 (SCL).' },
  node: { title: 'ESP32 connection', text: 'The USB-powered board sends JSON measurements through Wi-Fi and HTTP. mDNS discovers the laptop service when the network allows multicast.' },
  load: { title: '100 Ω resistive load', text: 'The resistor draws current from the panel. This setup observes load output, not the panel’s maximum available power or conversion efficiency.' }
};
export default function SolarLab({ reading, status, source }) {
  const [mode, setMode] = useState('live');
  const [part, setPart] = useState('panel');
  const [sunlight, setSunlight] = useState(80);
  const [angle, setAngle] = useState(20);
  const [shaded, setShaded] = useState([]);
  const experiment = mode === 'experiment';
  const relative = Math.round(sunlight * Math.cos(angle * Math.PI / 180) * (1 - shaded.length / 24));
  const flowing = experiment ? relative > 0 : Boolean(reading && status === 'online' && reading.powerMW > 0);
  function toggleCell(index) { setShaded(previous => previous.includes(index) ? previous.filter(value => value !== index) : [...previous, index]); }
  function reset() { setSunlight(80); setAngle(20); setShaded([]); }
  return <section className={`solar-lab ${experiment ? 'is-experiment' : ''} ${flowing ? 'energy-flowing' : ''}`} id="solar-lab" aria-label="Interactive solar panel">
    <div className="lab-header"><div><h2>Meet your solar panel.</h2><p>{experiment ? 'Explore light and shade. Your measurements stay untouched.' : 'A closer look at the hardware behind every reading.'}</p></div><div className="lab-mode" role="group" aria-label="Panel mode"><button aria-pressed={!experiment} onClick={() => setMode('live')}>Live view</button><button aria-pressed={experiment} onClick={() => setMode('experiment')}>Experiment</button></div></div>
    <div className="lab-layout">
      <div className="solar-stage">
        <div className="stage-caption"><span className="stage-state"><span className={`status-dot ${flowing ? 'dot-live' : 'dot-wait'}`} />{experiment ? 'Illustrative model' : source === 'simulator' ? 'Simulator telemetry' : status === 'online' ? 'Sensor online' : 'Awaiting fresh telemetry'}</span><span>24-cell visual model</span></div>
        <div className="sun-disc" aria-hidden="true" style={{ opacity: experiment ? .25 + sunlight / 135 : .8 }}><Icon name="sun" size={54} /></div>
        <div className="panel-rig">
          <div className="panel-foot" /><div className="panel-support" />
          <div className="panel-frame" style={{ transform: `rotateX(${experiment ? 20 + angle * .35 : 32}deg) rotateZ(-12deg)` }}>
            {Array.from({ length: 24 }, (_, index) => <button type="button" className={`solar-cell ${experiment && shaded.includes(index) ? 'cell-shaded' : ''}`} key={index} aria-label={experiment ? `${shaded.includes(index) ? 'Unshade' : 'Shade'} cell ${index + 1}` : `Inspect panel cell ${index + 1}`} aria-pressed={experiment && shaded.includes(index)} onClick={() => experiment ? toggleCell(index) : setPart('panel')}><span aria-hidden="true" /></button>)}
          </div>
        </div>
        <div className="energy-wire" aria-hidden="true"><i /><i /><i /></div>
        <div className="hardware-strip" role="group" aria-label="Inspect hardware">{[['panel', 'Solar panel'], ['sensor', 'INA219'], ['node', 'ESP32'], ['load', '100 Ω load']].map(([key, label]) => <button key={key} aria-pressed={part === key} onClick={() => setPart(key)}>{label}</button>)}</div>
        <p className="stage-hint">{experiment ? 'Tap individual cells to add or remove shade.' : 'Select a component to see how it works.'}</p>
      </div>
      <div className="lab-inspector">
        {experiment ? <>
          <div className="experiment-title"><h3>Sunlight playground</h3><button className="text-button" onClick={reset}>Reset</button></div>
          <p className="model-disclaimer">Educational only. These controls do not move your panel or change recorded readings.</p>
          <label className="lab-slider" htmlFor="sunlight">Sunlight intensity <output>{sunlight}%</output><input id="sunlight" type="range" min="0" max="100" value={sunlight} onChange={event => setSunlight(Number(event.target.value))} /></label>
          <label className="lab-slider" htmlFor="incidence">Light incidence angle <output>{angle}°</output><input id="incidence" type="range" min="0" max="90" value={angle} onChange={event => setAngle(Number(event.target.value))} /></label>
          <div className="shade-summary"><span>Shaded cells</span><strong>{shaded.length} / 24</strong><button className="text-button" disabled={!shaded.length} onClick={() => setShaded([])}>Clear shade</button></div>
          <div className="relative-output"><span>Illustrative relative output</span><strong data-testid="relative-output">{relative}<small>%</small></strong><div className="output-track"><span style={{ width: `${relative}%` }} /></div><p>Light × cos(angle) × unshaded fraction. A simplified comparison, not a physical panel prediction.</p></div>
        </> : <>
          <div className="component-heading"><span className="component-dot" /><h3>{parts[part].title}</h3></div><p className="component-description">{parts[part].text}</p>
          <dl className="lab-readout"><div><dt>Load power</dt><dd>{formatValue(reading?.powerMW)} <small>mW</small></dd></div><div><dt>Voltage × current</dt><dd>{formatValue(reading?.voltageV)} V × {formatValue(reading?.currentMA)} mA</dd></div></dl>
          <p className="measurement-state">{status !== 'online' ? 'No fresh sensor confirmation. Any retained values are stale.' : source === 'simulator' ? 'Synthetic measurements from your backend simulator.' : 'Measured values from your INA219 sensor.'}</p>
          <button className="experiment-cta" onClick={() => setMode('experiment')}><Icon name="sun" size={18} /> Explore light & shade <Icon name="arrow" size={18} /></button>
        </>}
      </div>
    </div>
  </section>;
}
