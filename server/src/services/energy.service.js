// Estimates load-side energy only between nearby, ordered samples. Never extrapolate.
export const MAX_GAP_MS = 15000;
export const IST_OFFSET_MS = 19800000;
const HOUR_MS = 3600000;
const DAY_MS = 86400000;
export function bucketStart(time, period) {
  const d = new Date(time + IST_OFFSET_MS);
  if (period === 'month') return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - IST_OFFSET_MS;
  const day = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - IST_OFFSET_MS;
  return period === 'week' ? day - ((d.getUTCDay() + 6) % 7) * DAY_MS : day;
}
export function nextBucket(start, period) {
  if (period === 'month') { const d = new Date(start + IST_OFFSET_MS); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) - IST_OFFSET_MS; }
  return start + (period === 'week' ? 7 : 1) * DAY_MS;
}
function blank(start, end) { return { start, end, sampleCount: 0, peakPowerMW: null, coveredMs: 0, coveredUptimeMs: 0, netEnergyMWh: 0, generatedEnergyMWh: 0 }; }
export function intervalEnergy(p, q, ms) {
  const net = (p + q) * ms / (2 * HOUR_MS);
  let positive;
  if (p >= 0 && q >= 0) positive = net;
  else if (p <= 0 && q <= 0) positive = 0;
  else positive = Math.max(p, q) * ms * Math.max(p, q) / (2 * Math.abs(q - p) * HOUR_MS);
  return { net, positive };
}
export function eligiblePair(a, b) {
  const gap = new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
  const uptimeGap = b.uptimeMs - a.uptimeMs;
  return a.deviceId === b.deviceId && a.source === b.source && a.bootId === b.bootId && b.sequence > a.sequence && gap > 0 && gap <= MAX_GAP_MS && uptimeGap > 0 && uptimeGap <= MAX_GAP_MS;
}
export function createEnergyAccumulator(from, to) {
  const total = blank(from, to);
  const groups = Object.fromEntries(['day', 'week', 'month'].map(period => {
    const buckets = new Map();
    for (let start = bucketStart(from, period); start < to; start = nextBucket(start, period)) buckets.set(start, blank(Math.max(start, from), Math.min(nextBucket(start, period), to)));
    return [period, buckets];
  }));
  let previous = null;
  const recordSample = (bucket, row) => { bucket.sampleCount++; bucket.peakPowerMW = bucket.peakPowerMW === null ? row.powerMW : Math.max(bucket.peakPowerMW, row.powerMW); };
  const recordInterval = (bucket, p, q, ms, uptimeMs) => { const energy = intervalEnergy(p, q, uptimeMs); bucket.coveredMs += ms; bucket.coveredUptimeMs += uptimeMs; bucket.netEnergyMWh += energy.net; bucket.generatedEnergyMWh += energy.positive; };
  return {
    add(row) {
      const t = new Date(row.receivedAt).getTime();
      if (t >= from && t < to) {
        recordSample(total, row);
        for (const [period, buckets] of Object.entries(groups)) recordSample(buckets.get(bucketStart(t, period)), row);
      }
      if (previous && eligiblePair(previous, row)) {
        const a = new Date(previous.receivedAt).getTime(), b = t;
        const start = Math.max(a, from), end = Math.min(b, to);
        if (end > start) {
          const uptimeRatio = (row.uptimeMs - previous.uptimeMs) / (b - a);
          const power = time => previous.powerMW + (row.powerMW - previous.powerMW) * (time - a) / (b - a);
          recordInterval(total, power(start), power(end), end - start, (end - start) * uptimeRatio);
          for (let s = start; s < end;) {
            const e = Math.min(end, nextBucket(bucketStart(s, 'day'), 'day'));
            for (const [period, buckets] of Object.entries(groups)) recordInterval(buckets.get(bucketStart(s, period)), power(s), power(e), e - s, (e - s) * uptimeRatio);
            s = e;
          }
        }
      }
      previous = row;
    },
    result() {
      const finish = bucket => ({ ...bucket, start: new Date(bucket.start).toISOString(), end: new Date(bucket.end).toISOString(), durationMs: bucket.end - bucket.start, missingMs: bucket.end - bucket.start - bucket.coveredMs, coveragePercent: 100 * bucket.coveredMs / (bucket.end - bucket.start), netEnergyMWh: bucket.coveredMs ? bucket.netEnergyMWh : null, generatedEnergyMWh: bucket.coveredMs ? bucket.generatedEnergyMWh : null, averagePowerMW: bucket.coveredMs ? bucket.netEnergyMWh * HOUR_MS / bucket.coveredUptimeMs : null });
      return { summary: finish(total), daily: [...groups.day.values()].map(finish), weekly: [...groups.week.values()].map(finish), monthly: [...groups.month.values()].map(finish), method: { timeBasis: 'device uptime elapsed; reception time locates/clips calendar intervals', timezone: 'Asia/Kolkata', maxGapMs: MAX_GAP_MS, integration: 'linear trapezoidal; positive portion integrated across zero crossings', boundary: 'half-open [from,to); nearby outside samples only interpolate boundary intervals', average: 'signed energy divided by covered device uptime', generation: 'positive load-side power only; not panel efficiency or guaranteed daily yield' } };
    }
  };
}
