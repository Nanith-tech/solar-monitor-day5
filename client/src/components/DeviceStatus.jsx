import React from 'react';
export const STATUS_LABELS = { online: 'Online', offline: 'Offline', 'never-seen': 'Waiting for readings', unverified: 'Status unverified' };

export default function DeviceStatus({ status, source }) {
  return <span className={`status-badge status-${status}`} data-testid="device-status"><span className="status-dot" />{source === 'simulator' && status === 'online' ? 'Simulator active' : STATUS_LABELS[status]}</span>;
}
