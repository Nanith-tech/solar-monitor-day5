import React from 'react';
import Icon from './Icon.jsx';
import { formatValue } from '../utils/telemetry.js';

export default function MetricCard({ title, value, unit, icon, note, muted, accent }) {
  return <article className={`metric-card ${accent ? 'metric-accent' : ''} ${muted ? 'is-stale' : ''}`}>
    <div className="metric-heading"><span>{title}</span><span className="metric-icon"><Icon name={icon} /></span></div>
    <div className="metric-value" data-testid={title.toLowerCase()}>{formatValue(value)} <span>{unit}</span></div>
    <p>{note}</p>
  </article>;
}
