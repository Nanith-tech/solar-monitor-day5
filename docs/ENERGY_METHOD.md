# Energy estimates and coverage

These values describe energy at the monitored load. They do not establish panel efficiency, battery charge or complete daily solar yield. Negative current/power remains diagnostic data.

## Eligible intervals

Readings are sorted by receivedAt then database ID within one device/source. Adjacent readings are eligible only when they share device/source/boot, sequence increases, and both reception elapsed and uptime elapsed are positive and no more than 15,000 ms. Duplicate ingestion does not create another database row. Equal timestamps, decreasing sequence/uptime, restarts and long gaps do not contribute an interval. No time before the first sample or after the last is extrapolated.

For each eligible pair, device uptime difference supplies elapsed time and reduces HTTP timing jitter. Server reception UTC locates the pair on the calendar. Power is linear between endpoints; when clipping to the selected range or an IST calendar boundary, allocate elapsed uptime proportionally to reception elapsed time. This is an approximation because the device has no trusted absolute sampling clock.

Signed net energy in mWh = (P1_mW + P2_mW) / 2 × elapsedUptime_ms / 3,600,000.

Positive generation integrates max(linearly interpolated power, 0). If a pair crosses zero, integrate only its positive triangular portion, rather than clamping both endpoints before the trapezoid. Wh = mWh / 1,000. The UI uses mWh to retain resolution for this small panel.

## Range and calendar rules

API ranges are half-open [from,to) in UTC; dates in the UI are inclusive IST calendar dates. One nearby preceding and following sample may interpolate clipped boundary intervals; those context samples are excluded from in-range sample counts and peak sampled power. CSV contains in-range samples only, so exact boundary recomputation may additionally need those context samples.

Daily buckets use IST midnight, weeks start Monday, months use calendar boundaries. The same interval is clipped into these buckets, and their energy sums agree with the overall selected-range total. First/last periods can be partial. Samples at to belong to the next range and may serve only as boundary context.

Coverage = eligible reception-time duration / selected reception-time duration. coveredMs, missingMs and coveragePercent describe wall-clock coverage. coveredUptimeMs describes the device sampling duration assigned to eligible intervals. Average power = signed net energy / covered device uptime. Peak power is the largest in-range sampled signed power, independent of whether it has an eligible neighbour. Peak is not an interpolated or theoretical panel maximum.

No eligible interval means null energy and average, displayed as a dash. An eligible interval with zero positive power means zero generation. An empty date bucket remains unavailable. A bucket can have boundary-interpolated energy with zero in-range sample count; that is distinguished in the UI.

## Reliability and limits

Statistics are computed from immutable persisted readings each time; no cumulative counter or cache needs resetting after a server/device restart. Sensor and simulator never mix. Late/out-of-order sequences fail eligible-pair checks; reception order alone does not guarantee sampling order. Statistics are bounded to 31 days/600,000 in-range samples and exports to 50,000. A cap violation rejects the request rather than hiding omitted data.

Calendar allocation is based on reception time. Device/server uptime or clock anomalies reduce accuracy; this is an explicit estimate, not a calibrated energy meter. The response method metadata documents these rules for callers.
