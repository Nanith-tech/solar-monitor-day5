import React, { useEffect, useRef, useState } from 'react';
import GenerationChart from './GenerationChart.jsx';
import { configuredDevice, downloadCSV, getJSON } from '../api/client.js';
import { dateRange, historyNumber as number, istDate, presetDates, rangeQuery } from '../utils/history.js';
import { receptionLabel } from '../utils/telemetry.js';

const label = iso => istDate(Date.parse(iso));
function coverageText(value) { return value < 0.01 && value > 0 ? '<0.01%' : `${number(value, 2)}%`; }
function Stat({ name, value, unit, note }) { return <article className="history-stat"><span>{name}</span><strong>{number(value)} <small>{unit}</small></strong><p>{note}</p></article>; }
export default function HistoryExplorer({ source }) {
  const [dates, setDates] = useState(() => presetDates('day'));
  const [selection, setSelection] = useState(null);
  const [data, setData] = useState(null);
  const [rows, setRows] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [period, setPeriod] = useState('daily');
  const [error, setError] = useState(null), [pageError, setPageError] = useState(null), [csvError, setCSVError] = useState(null);
  const [busy, setBusy] = useState(false), [paging, setPaging] = useState(false), [exporting, setExporting] = useState(false);
  const requests = useRef(new Set()), generation = useRef(0), selectionRef = useRef(null);
  const cancel = () => { generation.current++; for (const c of requests.current) c.abort(); requests.current.clear(); };
  const request = async task => {
    const controller = new AbortController(); requests.current.add(controller);
    const timer = setTimeout(() => controller.abort(), 60000);
    try { return await task(controller.signal); }
    finally { clearTimeout(timer); requests.current.delete(controller); }
  };
  useEffect(() => {
    cancel(); selectionRef.current = null; setSelection(null); setData(null); setRows([]); setNextCursor(null); setError(null); setCSVError(null); setPageError(null); setBusy(false); setPaging(false); setExporting(false);
    return cancel;
  }, [source]);
  async function load(nextDates = dates) {
    cancel(); const version = generation.current;
    setData(null); setRows([]); setNextCursor(null); setError(null); setPageError(null); setCSVError(null); setBusy(false); setPaging(false); setExporting(false); selectionRef.current = null; setSelection(null);
    let range;
    try { range = dateRange(nextDates.startDate, nextDates.endDate); }
    catch (e) { setError(e.message); return; }
    const chosen = { source, ...range }; selectionRef.current = chosen; setSelection(chosen); setBusy(true);
    const query = rangeQuery(source, range), base = `/devices/${encodeURIComponent(configuredDevice)}`;
    try {
      const [stats, page] = await request(signal => Promise.all([getJSON(`${base}/statistics?${query}`, signal), getJSON(`${base}/history?${query}&limit=100`, signal)]));
      if (generation.current !== version) return;
      if (stats.source !== source || stats.deviceId !== configuredDevice || !stats.summary || !Array.isArray(stats.daily) || !Array.isArray(stats.weekly) || !Array.isArray(stats.monthly) || page.source !== source || !Array.isArray(page.readings)) throw new Error('Unexpected historical API response.');
      setData(stats); setRows(page.readings); setNextCursor(page.nextCursor);
    } catch (e) { if (generation.current === version) setError(e.name === 'AbortError' ? 'History request timed out. Choose a shorter range and retry.' : e.message); }
    finally { if (generation.current === version) setBusy(false); }
  }
  async function more() {
    if (!nextCursor || paging || rows.length >= 1000) return;
    const version = generation.current; setPaging(true); setPageError(null);
    try {
      const page = await request(signal => getJSON(`/devices/${encodeURIComponent(configuredDevice)}/history?${rangeQuery(selection.source, selection)}&limit=100&cursor=${encodeURIComponent(nextCursor)}`, signal));
      if (generation.current === version) { setRows(previous => [...previous, ...page.readings]); setNextCursor(page.nextCursor); }
    } catch (e) { if (generation.current === version) setPageError(e.name === 'AbortError' ? 'Page request timed out. Retry.' : e.message); }
    finally { if (generation.current === version) setPaging(false); }
  }
  async function exportCSV() {
    if (!selection || exporting) return;
    const version = generation.current; setExporting(true); setCSVError(null);
    try {
      const blob = await request(signal => downloadCSV(configuredDevice, rangeQuery(selection.source, selection), signal));
      if (generation.current !== version) return;
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = `solar-${selection.source}-${label(selection.from)}-${label(new Date(Date.parse(selection.to) - 1).toISOString())}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { if (generation.current === version) setCSVError(e.name === 'AbortError' ? 'CSV export timed out. Try a shorter range.' : e.message); }
    finally { if (generation.current === version) setExporting(false); }
  }
  const summary = data?.summary;
  return <section className="history-section panel" id="history" aria-label="Historical generation">
    <div className="history-heading"><div><h2>History & energy</h2><p>Explore {source === 'sensor' ? 'sensor' : 'simulator'} readings and estimated load energy.</p></div><span className="history-source">{source === 'sensor' ? 'Real sensor' : 'Synthetic data'}</span></div>
    <div className="history-presets" role="group" aria-label="Date presets">{[['day', 'Today'], ['week', 'This week'], ['month', 'This month']].map(([preset, title]) => <button key={preset} disabled={busy} onClick={() => { const value = presetDates(preset); setDates(value); load(value); }}>{title}</button>)}</div>
    <form className="history-filter" onSubmit={event => { event.preventDefault(); load(); }}>
      <label>Start date (IST)<input type="date" required value={dates.startDate} max={istDate()} onChange={e => setDates(value => ({ ...value, startDate: e.target.value }))} /></label>
      <label>End date (IST)<input type="date" required value={dates.endDate} max={istDate()} onChange={e => setDates(value => ({ ...value, endDate: e.target.value }))} /></label>
      <button className="history-apply" disabled={busy}>{busy ? 'Loading…' : 'Apply range'}</button>
      <button type="button" className="history-export" onClick={exportCSV} disabled={!data || busy || exporting}>{exporting ? 'Exporting…' : 'Export CSV'}</button>
    </form>
    {error && <div className="notice notice-error" role="alert">{error}</div>}
    {csvError && <div className="notice notice-error" role="alert">{csvError}</div>}
    {!selection && !error && <p className="history-empty">Choose a preset or apply dates to load persisted history. Dates include the entire day in IST; today ends at the time you apply.</p>}
    {busy && <p role="status" className="history-empty">Reading saved samples and calculating coverage…</p>}
    {summary && <>
      <p className="history-snapshot">Snapshot: {receptionLabel(selection.from)} → {receptionLabel(selection.to)}. Apply again to include newer readings.</p>
      <div className="history-stats" data-testid="generation-summary">
        <Stat name="Estimated generation" value={summary.generatedEnergyMWh} unit="mWh" note="Positive load energy in covered intervals" />
        <Stat name="Net energy" value={summary.netEnergyMWh} unit="mWh" note="Signed energy; negative readings retained" />
        <Stat name="Average power" value={summary.averagePowerMW} unit="mW" note="Weighted by covered device uptime" />
        <Stat name="Peak sampled power" value={summary.peakPowerMW} unit="mW" note={`${summary.sampleCount.toLocaleString('en-IN')} samples in this range`} />
      </div>
      <div className="coverage-notice" role="status"><strong>{coverageText(summary.coveragePercent)} time coverage</strong><span>{number(summary.coveredMs / 1000, 2)}s covered · {number(summary.missingMs / 1000, 2)}s unobserved. Estimates do not fill missing time.</span></div>
      {!summary.sampleCount && <p className="history-empty">No samples received inside this date range.{summary.coveredMs ? ' Nearby samples cover a boundary interval.' : ' No energy estimate is available.'}</p>}
      {summary.sampleCount > 0 && !summary.coveredMs && <p className="history-empty">Samples exist, but no valid interval connects them. Energy and average power remain unavailable.</p>}
      <div className="summary-toolbar"><h3>Generation summaries</h3><div role="group" aria-label="Summary period">{['daily', 'weekly', 'monthly'].map(value => <button aria-pressed={period === value} className={period === value ? 'chosen' : ''} key={value} onClick={() => setPeriod(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div></div>
      <GenerationChart buckets={data[period]} period={period} />
      <div className="table-scroll"><table className="history-table"><caption>{period} totals within the selected range · IST calendar · weeks start Monday</caption><thead><tr><th scope="col">Period start</th><th scope="col">Generated (mWh)</th><th scope="col">Net (mWh)</th><th scope="col">Avg (mW)</th><th scope="col">Peak (mW)</th><th scope="col">Coverage</th><th scope="col">Samples</th></tr></thead><tbody>{data[period].map(bucket => <tr key={bucket.start}><th scope="row">{label(bucket.start)}</th><td>{number(bucket.generatedEnergyMWh)}</td><td>{number(bucket.netEnergyMWh)}</td><td>{number(bucket.averagePowerMW)}</td><td>{number(bucket.peakPowerMW)}</td><td>{coverageText(bucket.coveragePercent)}</td><td>{bucket.sampleCount}</td></tr>)}</tbody></table></div>
      <details className="energy-method"><summary>How these estimates are calculated</summary><p>Power is interpolated between samples in the same boot/source with increasing sequence and uptime. Both reception and uptime gaps must be at most 15 seconds. Energy uses device uptime elapsed to reduce HTTP reception jitter. Reception time locates and clips intervals to the range and IST calendar boundaries; uptime elapsed is allocated proportionally. Negative power contributes to net energy; only the positive portion contributes to generation. 1 mWh = 3,600,000 mW·ms. Average power uses covered device uptime. Coverage measures reception-time intervals. No interval is extrapolated before the first or after the last sample. These are load measurements, not a calibrated solar yield estimate.</p></details>
      <h3 className="saved-readings-heading">Saved readings</h3><div className="table-scroll"><table className="history-table" data-testid="saved-readings"><caption>Oldest first · {rows.length} loaded · table limit 1,000 rows; CSV up to 50,000</caption><thead><tr><th scope="col">Received (IST)</th><th scope="col">Voltage (V)</th><th scope="col">Current (mA)</th><th scope="col">Power (mW)</th><th scope="col">Sequence</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{receptionLabel(row.receivedAt)}</td><td>{number(row.voltageV, 3)}</td><td>{number(row.currentMA, 3)}</td><td>{number(row.powerMW, 3)}</td><td>{row.sequence}</td></tr>)}</tbody></table></div>
      {pageError && <p role="alert">{pageError}</p>}
      {nextCursor && rows.length < 1000 && <button className="history-more" onClick={more} disabled={paging}>{paging ? 'Loading…' : 'Load 100 more'}</button>}
      {nextCursor && rows.length >= 1000 && <p className="history-empty">Table display limit reached. Use a shorter date range or export CSV for additional rows.</p>}
    </>}
  </section>;
}
