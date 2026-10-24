# Day 5 API

Base URL: `http://localhost:4000/api/v1` on the laptop; replace localhost with laptop LAN IP for ESP32. All responses are JSON. Reads use no key in this local demo. Ingestion requires a key; do not put it into React code.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/health` | HTTP/database readiness (200 connected; 503 disconnected) |
| POST | `/telemetry` | Save one authenticated sample (201 new, 200 identical retry) |
| GET | `/devices` | Configured device, sensor status and separate simulator status |
| GET | `/devices/:deviceId/latest` | Latest received sensor sample; null if never seen |
| GET | `/devices/:deviceId/latest?source=simulator` | Latest labeled simulator sample |

## Telemetry fields

All fields below are required. Additional fields, including client timestamps, are rejected. Values must be JSON numbers, not numeric strings.

| Field | Meaning / constraints |
| --- | --- |
| deviceId | Configured DEVICE_ID, 1–64 letters/digits/underscore/hyphen |
| bootId | 8–80 letters/digits/underscore/hyphen; new random ID at each device boot |
| sequence | Nonnegative safe integer, increasing within each boot |
| voltageV | Bus voltage in V, default allowed 0–26 |
| currentMA | Signed shunt current in mA, default allowed -3200 to 3200 |
| powerMW | Signed load power in mW, voltageV * currentMA; default allowed -83200 to 83200 |
| uptimeMs | Nonnegative safe integer, device uptime at sampling |
| rssiDbm | Integer -127 to 0; -127 is also used for unknown/disconnected at sampling |
| source | sensor or simulator (simulator requires ALLOW_SIMULATOR=true) |

Voltage/current/power bounds are configurable sensor validation limits, not promised panel ratings and not instructions to apply those values electrically. A rounding tolerance of max(0.05 mW, 0.1% of calculated power) is allowed. This API intentionally uses calculated signed load-side power; the INA219 raw power-register output (such as the earlier 16 mW reading) is not the telemetry power field.

Request headers: `Content-Type: application/json`, `X-Device-Key: your private generated key`. Body limit: 4 KB.

```json
{
  "deviceId": "solar-node-001",
  "bootId": "example-boot-001",
  "sequence": 0,
  "voltageV": 1.23,
  "currentMA": 12.3,
  "powerMW": 15.129,
  "uptimeMs": 5000,
  "rssiDbm": -55,
  "source": "sensor"
}
```

New-sample response:

```json
{
  "duplicate": false,
  "reading": {
    "id": "mongodb-object-id",
    "deviceId": "solar-node-001",
    "bootId": "example-boot-001",
    "sequence": 0,
    "voltageV": 1.23,
    "currentMA": 12.3,
    "powerMW": 15.129,
    "uptimeMs": 5000,
    "rssiDbm": -55,
    "source": "sensor",
    "receivedAt": "2026-09-30T03:00:00.000Z"
  }
}
```

Identity is `(deviceId, bootId, sequence)`. An identical replay returns 200, `duplicate:true`, and the same ID and original receivedAt. Reusing that identity with any changed telemetry value, including source/RSSI/uptime, returns 409 and does not overwrite the row. A MongoDB unique index enforces this even for simultaneous retries.

Latest response carries `deviceId`, `source`, `status` (`never-seen`, `online`, `offline`), `lastReceivedAt`, `ageMs`, and `reading` (object or null). Status is recalculated at request time using OFFLINE_AFTER_MS; identical replays do not refresh it. Latest means latest server reception, not necessarily latest sensor sampling if another client uploads old data. Day 1 firmware avoids large delayed backlogs.

GET `/devices` reports real sensor status at top level, and `simulator` status separately. It never exposes the device key. Default deviceName comes from server configuration.

## Error response

```json
{ "error": { "code": "INVALID_TELEMETRY", "message": "Telemetry validation failed.", "details": ["powerMW must equal voltageV * currentMA (0.05 mW or 0.1% rounding tolerance)."] } }
```

| HTTP | Meaning |
| --- | --- |
| 400 | Invalid JSON, telemetry or query |
| 401 | Missing/wrong device key |
| 403 | Unauthorized device or simulator disabled |
| 404 | Unknown device/route |
| 409 | Sample identity conflict |
| 413 | Body exceeds 4 KB |
| 415 | Content-Type must be application/json |
| 503 | Database disconnected at request entry |
| 500 | Unexpected operation failure; internal details are not exposed |

## Manual request without faking sensor history

For software testing, use source `simulator` and enable it in server config. PowerShell example reads the private key without printing it:

```powershell
$keyLine = Get-Content server/.env | Where-Object { $_ -match '^DEVICE_KEY=' }
$key = $keyLine.Substring('DEVICE_KEY='.Length)
$headers = @{ 'X-Device-Key' = $key }
$body = @{
  deviceId='solar-node-001'; bootId=[guid]::NewGuid().ToString(); sequence=0
  voltageV=1.23; currentMA=12.3; powerMW=15.129
  uptimeMs=5000; rssiDbm=-55; source='simulator'
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri 'http://localhost:4000/api/v1/telemetry' -ContentType 'application/json' -Headers $headers -Body $body
```

Equivalent POSIX curl, after assigning your key to a shell variable privately:

```bash
curl -X POST http://localhost:4000/api/v1/telemetry \
  -H 'Content-Type: application/json' \
  -H "X-Device-Key: $DEVICE_KEY" \
  --data '{"deviceId":"solar-node-001","bootId":"curl-demo-001","sequence":0,"voltageV":1.23,"currentMA":12.3,"powerMW":15.129,"uptimeMs":5000,"rssiDbm":-55,"source":"simulator"}'
```

Use a new bootId for a new manual demonstration; reuse exactly the same JSON only when intentionally testing retries.

## Recent history

GET `/devices/:deviceId/readings?source=sensor&limit=120`

Only source, limit and since query fields are accepted. source defaults to sensor; simulator is separate. limit is an integer 1–300, default 120. since defaults to one hour ago; an explicit UTC ISO timestamp must be within the last 24 hours and not in the future. Unknown device returns 404; invalid query returns 400. Database readiness middleware applies.

Response: `{ deviceId, source, since, limit, serverTime, readings }`. Readings use the public schema above, are the most recent qualifying rows, and are ordered by receivedAt then ID ascending. Empty history is an empty array. The browser requests 120 rows and retains only the last hour.

## Socket.IO stream

Socket.IO uses the same backend HTTP port, default path `/socket.io`. Client handshake auth: `{ deviceId: "solar-node-001", source: "sensor" }`. Only the configured device and valid source are accepted; invalid subscriptions produce connect_error. No device ingestion key is needed for reads.

| Event | Direction | Payload / meaning |
| --- | --- | --- |
| stream:ready | Server to subscriber | Room joined; client should recover via REST |
| telemetry:new | Server to matching source/device room | `{ reading, serverTime }`, newly saved sample only |
| server:status | Server to connected clients | Database readiness and serverTime, every five seconds |

Identical POST retries return their original response without broadcasting. Failed persistence broadcasts nothing. Reconnecting clients resubscribe and reload bounded history; this is not an unlimited durable event replay. Device online/offline is computed from reception age, independently of socket connectivity.

## Historical analytics (Day 4)

All routes below are GET under `/devices/:deviceId`. Only the configured device is accepted. Reads remain public in the local demo; normal database-readiness middleware applies.

| Route | Query | Response |
| --- | --- | --- |
| /history | source, from, to, optional limit/cursor | Ascending readings, nextCursor or null |
| /statistics | source, from, to | Summary, daily/weekly/monthly buckets and method metadata |
| /export.csv | source, from, to | CSV attachment with every in-range sample up to cap |

source defaults sensor. from/to are required valid UTC ISO strings, e.g. `2026-10-01T00:00:00.000Z`. They define [from,to), must satisfy from < to <= server now and duration <=31 days. Unknown/array/object query fields are rejected. The browser translates inclusive IST dates into these bounds and freezes today at Apply time.

History limit defaults 100, range 1–500. Cursor is an opaque base64url token from nextCursor and bound to the original source/from/to. Repeat the same query with that token for the next page; changing source/dates requires a fresh search. Sort is receivedAt then _id ascending, so equal timestamps paginate consistently. Response includes deviceId/source/from/to/limit/readings/nextCursor/serverTime. No total count or offset scan is required.

Statistics includes deviceId/source/from/to/serverTime, summary, daily, weekly, monthly, method. Each bucket exposes start/end UTC, sampleCount, peakPowerMW, coveredMs, coveredUptimeMs, durationMs, missingMs, coveragePercent, netEnergyMWh, generatedEnergyMWh and averagePowerMW. Energy/average are null when coverage is zero; peak is null without in-range samples. Bucket intervals are clipped to the selected range; IST calendar weeks start Monday. Calendar buckets are bounded aggregated chart data, not raw-point truncation. See ENERGY_METHOD.md for uptime integration and reception-time coverage/boundaries.

Statistics reads up to 600,000 in-range rows using a cursor plus at most two nearby boundary context samples. A denser range returns 422 RANGE_TOO_DENSE and no partial totals. Export reads up to 50,000 raw rows; exceeding the cap returns 422 EXPORT_TOO_LARGE and no partial CSV. Shorten the range. Existing database errors use the common JSON error format.

CSV response: text/csv UTF-8, attachment filename includes device/source/range; UTF-8 BOM and CRLF rows. Columns: deviceId,source,bootId,sequence,receivedAt,voltageV,currentMA,powerMW,uptimeMs,rssiDbm. receivedAt is UTC ISO, numeric fields retain sign and precision. Text quoting/formula guards support spreadsheet import. Empty range returns a header-only CSV. It does not include estimated daily totals or out-of-range boundary context samples.


## Day 5 Wi-Fi administration

POST `/api/v1/devices/:deviceId/wifi` JSON `{ "espIp": "192.168.4.1", "ssid": "Your network", "password": "Your password" }` from the laptop dashboard. Requires loopback connection and configured browser Origin (or Referer when the local proxy strips Origin) and X-Solar-Setup intent header, not a browser Device Key. See WIFI_SETUP.md for validation/recovery/security. Returns 202 accepted (saved, connection pending), 400 invalid values, 401 board key mismatch, 403 nonlocal/origin denied, 404 unknown configured device, 409 wrong board, 429 setup busy, or 502 unreachable/rejected board. It remains mounted when database connectivity is lost. Secrets never appear in its response.

Board port 80: GET `/solar-info` exposes only deviceId and wifiSetup=1. POST `/wifi` accepts URL-encoded ssid/password and X-Device-Key, persists NVS then returns 202 before switching network. Backend sends those board requests; React never receives DEVICE_KEY. Reads/telemetry remain unchanged. HTTP health milestone is 5. mDNS is service discovery, not an additional HTTP ingestion endpoint.
