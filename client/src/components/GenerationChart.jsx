import React, { useId } from 'react';
import { historyNumber, istDate } from '../utils/history.js';
export default function GenerationChart({ buckets, period }) {
  const id = useId();
  const width = 820, height = 220, left = 64, right = 22, top = 20, bottom = 44;
  const max = Math.max(0.001, ...buckets.map(row => row.generatedEnergyMWh ?? 0));
  const step = (width - left - right) / Math.max(1, buckets.length);
  const barWidth = Math.min(70, step * 0.65), plotHeight = height - top - bottom;
  return <div className="generation-chart" data-testid="generation-chart"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={id}><title id={id}>{period} estimated positive load energy in mWh. Missing intervals are excluded. Cross marks indicate unavailable energy estimates.</title>
    {[max, max / 2, 0].map((value, i) => <g key={i}><line x1={left} x2={width - right} y1={top + i * plotHeight / 2} y2={top + i * plotHeight / 2} stroke="#e4ebdc" /><text x={left - 9} y={top + i * plotHeight / 2 + 4} textAnchor="end">{historyNumber(value, 3)}</text></g>)}
    {buckets.map((bucket, i) => {
      const center = left + step * (i + 0.5), h = (bucket.generatedEnergyMWh ?? 0) / max * plotHeight;
      const day = istDate(Date.parse(bucket.start)).slice(5);
      return <g key={bucket.start}>
        {bucket.generatedEnergyMWh === null ? <g stroke="#a6b09a"><path d={`M ${center - 4} ${height - bottom - 6} l 8 8 m -8 0 l 8 -8`} /><title>{day}: no covered energy interval</title></g> : <rect x={center - barWidth / 2} y={height - bottom - h - (h === 0 ? 1 : 0)} width={barWidth} height={Math.max(1, h)} rx="3" fill="#709768"><title>{day} IST · {historyNumber(bucket.generatedEnergyMWh)} mWh · {historyNumber(bucket.coveragePercent, 2)}% coverage</title></rect>}
        {(i % Math.ceil(buckets.length / 6) === 0 || i === buckets.length - 1) && <text x={center} y={height - 17} textAnchor="middle">{day}</text>}
      </g>;
    })}<text x={left} y={12}>mWh</text></svg><p>Estimated generation in covered intervals · period dates in IST · × means unavailable · hover for coverage</p></div>;
}
