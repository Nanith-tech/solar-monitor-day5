import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { fetchDashboard, fetchRecentReadings, configuredDevice, socketOrigin } from '../api/client.js';
import { mergeReadings, validReading } from '../utils/live.js';

const interval = Number(import.meta.env.VITE_POLL_INTERVAL_MS || 5000);
export const POLL_INTERVAL_MS = Number.isFinite(interval) && interval >= 1000 && interval <= 60000 ? interval : 5000;

export function useLiveTelemetry(source) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [live, setLive] = useState('connecting');
  const [state, setState] = useState({ source, data: null, readings: [], error: null, historyError: null, loading: true, fetching: true });
  useEffect(() => {
    let active = true, running = false, queued = false, ready = false, databaseDown = false;
    let timer, controller;
    const socket = io(socketOrigin(), { autoConnect: false, auth: { deviceId: configuredDevice, source }, reconnection: true, timeout: 5000 });
    const cleanRows = rows => rows.filter(row => validReading(row, source, configuredDevice));
    const recent = (rows, offset = 0) => rows.filter(row => Date.parse(row.receivedAt) >= Date.now() + offset - 3600000);
    setLive('connecting');
    setState(previous => ({ source, data: previous.source === source ? previous.data : null, readings: previous.source === source ? previous.readings : [], error: previous.source === source ? previous.error : null, historyError: null, loading: previous.source !== source || !previous.data, fetching: true }));

    function requestSync() {
      if (!active) return;
      clearTimeout(timer);
      if (running) { queued = true; return; }
      sync();
    }
    async function sync() {
      if (!active) return;
      running = true; queued = false;
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      setState(previous => ({ ...previous, fetching: true }));
      try {
        const snapshot = await fetchDashboard(source, controller.signal);
        let history = [], historyError = null;
        try { history = cleanRows(await fetchRecentReadings(configuredDevice, source, controller.signal)); }
        catch (error) { historyError = controller.signal.aborted ? 'Chart history refresh timed out.' : error.message; }
        if (active) setState(previous => {
          const latestCandidates = cleanRows([previous.data?.latest?.reading, snapshot.latest.reading].filter(Boolean));
          const latest = mergeReadings([], latestCandidates).at(-1) || null;
          return { source, data: { ...snapshot, latest: { ...snapshot.latest, reading: latest } }, readings: recent(mergeReadings(previous.readings, [...history, ...latestCandidates]), snapshot.clockOffsetMs), error: null, historyError, loading: false, fetching: false };
        });
      } catch (error) {
        if (active) setState(previous => ({ ...previous, source, error: controller.signal.aborted ? 'The API request timed out. Check the backend and database connection.' : error.message, loading: false, fetching: false }));
      } finally {
        clearTimeout(timeout); running = false;
        if (active) timer = setTimeout(sync, queued ? 0 : ready ? Math.max(15000, POLL_INTERVAL_MS) : POLL_INTERVAL_MS);
      }
    }
    socket.on('stream:ready', message => {
      if (!active || message.deviceId !== configuredDevice || message.source !== source) return;
      ready = true; setLive('connected'); requestSync();
    });
    socket.on('telemetry:new', message => {
      if (!active || !validReading(message?.reading, source, configuredDevice)) return;
      const offset = Number.isFinite(Date.parse(message.serverTime)) ? Date.parse(message.serverTime) - Date.now() : 0;
      setState(previous => {
        const readings = recent(mergeReadings(previous.readings, [message.reading]), offset);
        const latest = mergeReadings([], cleanRows([previous.data?.latest?.reading, message.reading].filter(Boolean))).at(-1);
        const data = previous.data || { source, device: { deviceId: configuredDevice, name: 'Solar panel 1', offlineAfterMs: 20000 }, health: { database: 'connected' }, latest: { deviceId: configuredDevice, source } };
        return { ...previous, source, readings, data: { ...data, clockOffsetMs: offset, checkedAt: Date.now(), latest: { ...data.latest, reading: latest } }, loading: false, error: null };
      });
    });
    socket.on('server:status', message => {
      if (!active) return;
      const wasDown = databaseDown; databaseDown = message.database !== 'connected';
      if (databaseDown) setState(previous => ({ ...previous, error: 'The server is connected, but its database is unavailable. Retained values are stale.' }));
      else if (wasDown) requestSync();
    });
    const disconnected = () => { if (active) { ready = false; setLive('reconnecting'); requestSync(); } };
    socket.on('disconnect', disconnected);
    socket.on('connect_error', () => { if (active) { ready = false; setLive('fallback'); } });
    socket.connect(); requestSync();
    return () => { active = false; clearTimeout(timer); controller?.abort(); socket.removeAllListeners(); socket.disconnect(); };
  }, [source, refreshKey]);
  return { ...(state.source === source ? state : { source, data: null, readings: [], error: null, historyError: null, loading: true, fetching: true }), live, refresh: () => setRefreshKey(key => key + 1) };
}
