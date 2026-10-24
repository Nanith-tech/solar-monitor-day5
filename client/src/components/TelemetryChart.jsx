import React, { useId } from 'react';
import { chartSegments } from '../utils/live.js';
import { formatValue } from '../utils/telemetry.js';

const time = value => new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }).format(new Date(value));

export default function TelemetryChart({ title, field, unit, rows, color }) {
  const id = useId().replace(/:/g, '');
  const width = 430, height = 210, left = 62, right = 18, top = 20, bottom = 36;
  const values = rows.map(row => row[field]);
  let min = Math.min(0, ...values), max = Math.max(0, ...values);
  if (max === min) { min = min - 1; max = max + 1; }
  const start = rows.length ? Date.parse(rows[0].receivedAt) : 0;
  const end = rows.length ? Date.parse(rows.at(-1).receivedAt) : 0;
  const x = row => end === start ? (left + width - right) / 2 : left + (Date.parse(row.receivedAt) - start) / (end - start) * (width - left - right);
  const y = row => top + (max - row[field]) / (max - min) * (height - top - bottom);
  return <article className="panel chart-card" data-testid={`chart-${field}`}>
    <div className="chart-heading"><h3>{title} <span>{unit}</span></h3><strong>{rows.length ? formatValue(rows.at(-1)[field]) : '—'}</strong></div>
    {!rows.length ? <div className="chart-empty">Waiting for {title.toLowerCase()} measurements</div> : <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={id}>
      <title id={id}>{title} over reception time. {rows.length} samples, in {unit}. Gaps over 15 seconds and device restarts break the line.</title>
      {[max, (max + min) / 2, min].map((value, index) => { const yy = top + index * (height - top - bottom) / 2; return <g key={index}><line x1={left} x2={width - right} y1={yy} y2={yy} stroke="#e5ebdf" /><text x={left - 10} y={yy + 4} textAnchor="end">{formatValue(value)}</text></g>; })}
      {chartSegments(rows).map((segment, index) => <polyline key={index} points={segment.map(row => `${x(row)},${y(row)}`).join(' ')} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />)}
      {rows.map(row => <circle key={`${row.bootId}:${row.sequence}`} cx={x(row)} cy={y(row)} r="3" fill={color}><title>{time(row.receivedAt)} IST · {formatValue(row[field])} {unit}</title></circle>)}
      <text x={left} y={height - 10}>{time(start)}</text><text x={width - right} y={height - 10} textAnchor="end">{time(end)}</text>
    </svg>}
    <p>{rows.length} / 120 retained samples · reception time (IST)</p>
  </article>;
}
