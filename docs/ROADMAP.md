# Solar Energy Monitoring System — five-day MERN roadmap

## Delivery agreement

When Nanith requests `day 1` through `day 5`, build and deliver that day's cumulative ZIP, named `solar-monitor-day-0X.zip`. Each archive contains the complete runnable project through that milestone, including earlier days' source, dependency manifests and lockfiles, example configuration, setup instructions, verification results, and a day-specific changelog. Generate files in the workspace, verify, then package; do not paste the whole codebase into chat. No placeholder implementations for the features due that day. Future features need not have empty stub files. Days 1–5 are implemented in the current cumulative snapshot; historical sections below retain the original plan. Current verification and environment limitations are recorded in TEST_RESULTS.md.

Keep one project root `solar-monitor/` across snapshots. Extract a later archive into a fresh folder and transfer local configuration; do not merge folders or ship secrets, node_modules, build caches, or database contents. Preserve database schema compatibility across days. Every ZIP includes `docs/PROJECT_STATE.md` listing milestone, decisions, commands, known limitations, and next steps so another model/session can resume. Save each requested deliverable persistently. If days are requested out of order, reconstruct required earlier stages so the ZIP remains self-contained.

## Starting point and scope

ESP32-WROOM-32 board is programmable, Wi-Fi works, and INA219 communication and loaded readings are confirmed. INA219 has an R100 (0.1 ohm) shunt. Panel is nominally 6 V / 100 mA; actual readings vary. Current load is 100 ohms, 1 W. No new hardware is needed for the software build. Laptop runs Express, MongoDB, and React. Default is a local semester demonstration with one configured device; schemas carry deviceId so later expansion is possible.

Current path: panel positive -> INA219 VIN+ -> internal shunt -> VIN- -> 100 ohm load -> panel negative. Panel negative shares INA219/ESP32 ground. INA219 VCC goes to ESP32 3V3; SDA to GPIO21 and SCL to GPIO22. Keep ESP32 USB powered. Firmware/docs must distinguish sensor supply from measurement terminals and retain the working load.

Core finished scope: sensor telemetry, persisted readings, live dashboard, voltage/current/power charts, estimated energy, device status, history, daily/weekly/monthly generation summaries, peak and time-weighted average power, CSV export, demonstration instructions. Temperature, irradiance, forecasting, MPP control, OTA, anomaly alerts, and a multi-user account platform are future work. Deploying externally is optional and does not block Day 5.

## Token planning

Model and its limits are unspecified. The figures below are estimates of newly generated code/documentation tokens, not measured API usage, cost, context length, reasoning tokens, or a guarantee of platform limits. Reading, tools, testing, and revisions add usage; cumulative snapshots do not require regenerating unchanged files. Plan approximately 20,000–35,000 total interaction tokens per milestone where supported, with a reserve for fixes. Actual total depends strongly on the model and tool responses. If its maximum output is small, create the artifact across several bounded tool calls rather than attempting one giant response. A five-day plan cannot override service interruptions or model limits; checkpoint files before packaging and report any unverified environment-dependent checks candidly.

| Day | New source/docs estimate | Scope | Working milestone |
| --- | --- | --- | --- |
| 1 | 7,000–10,000 | Firmware + Express ingestion + MongoDB + simulator | ESP32 or clearly marked simulator sends readings saved in MongoDB |
| 2 | 7,000–10,000 | React dashboard + API integration + responsive styles | Browser shows latest actual readings with polling and useful empty/error states |
| 3 | 7,000–10,000 | Socket.IO + live charts + connectivity | Persisted measurements update cards/charts without refresh; disconnect and recovery are visible |
| 4 | 8,000–12,000 | Energy integration + history + statistics + CSV | Date-range history and generation estimates are accurate under the documented sampling rules |
| 5 | 6,000–9,000 | Integration fixes + reliability + reproducible demo + report notes | Complete semester demo with verified software, setup, and hardware acceptance checklist |

Total new source/documentation estimate: 35,000–51,000 tokens. These are workload allocations, not purchased token quotas. Recalibrate if the user supplies a model and daily allowance. Do not sacrifice a milestone's necessary validation to hit an arbitrary estimate.

## Stable telemetry contract from Day 1

POST `/api/v1/telemetry` with `Content-Type: application/json` and `X-Device-Key` header. Key stays in firmware private config/backend environment, never in browser code. One preconfigured device is authorized by the backend.

```json
{
  "deviceId": "solar-node-001",
  "bootId": "unique-id-for-this-boot",
  "sequence": 42,
  "voltageV": 1.23,
  "currentMA": 12.30,
  "powerMW": 15.129,
  "uptimeMs": 210000,
  "rssiDbm": -55,
  "source": "sensor"
}
```

Explicit units prevent the source idea's ambiguous current/power JSON. Here voltageV is INA219 bus voltage (VIN- relative to ground), currentMA is signed shunt current, and powerMW = voltageV * currentMA is signed load-side power. Store optional raw INA219 power separately only if useful; do not substitute its quantized value silently. A panel-side voltage/power calculation would need shunt drop included and must be separately named.

Backend adds receivedAt UTC; firmware need not have an accurate wall clock. Default interval is five seconds. Boot ID + sequence + deviceId provide deduplication for retries. Simulator uses source `simulator`, is visibly labeled, and does not mix with sensor energy/history. Validate finite numbers and sensible configurable ranges; never reject readings just because they differ from panel ratings. Preserve negative current for diagnosis; generation energy integrates max(powerMW, 0) with that assumption stated in the UI.

Initial endpoints: POST telemetry, GET `/api/v1/health`, GET `/api/v1/devices`, GET `/api/v1/devices/:deviceId/latest`. Later add `/readings`, `/summary`, `/generation`, and `/export.csv` under the device route, with bounded date ranges, UTC ISO parameters, source filter, pagination and chart aggregation. Status is based on last successful sensor reception; default offline threshold is 20 seconds. Keep browser-server connection status separate from ESP32 status.

## Day 1 — complete hardware-to-database path

Build Arduino sketch using existing Wire/Adafruit INA219 setup, private config example, Wi-Fi reconnect, periodic sampling, finite-value guards, HTTP timeout/status logs, and bounded retry behavior preserving sample identity. Use the laptop's LAN IP in the firmware URL, not localhost or the ESP32's old IP. Bind Express appropriately for LAN access and document firewall steps. The laptop and ESP32 must be mutually reachable on the same network.

Build Express bootstrap, MongoDB connection, Device/Reading models, validation, device-key ingestion protection, bounded JSON body, consistent errors, timestamps and duplicate-safe storage. Include a simulator and curl/API examples for laptop-only progress. Retried identical samples do not duplicate rows; reject conflicting reuse of an identity. Include dependency locks and Node version requirement after checking current official compatibility.

Acceptance: API health works; valid telemetry persists and latest endpoint returns it; invalid/keyless requests fail; retry does not duplicate. Run software tests where MongoDB is available. Firmware compilation and physical uploads must be explicitly distinguished from code review if tooling/hardware is unavailable.

## Day 2 — complete dashboard using REST

Build React with Vite, JavaScript, ordinary CSS, centralized API client, polling hook, metric cards (V/mA/mW), last received time, source badge, device panel, RSSI and uptime. Responsive desktop/mobile layout; loading, no-data, stale-data and API failure states. Simulator mode must always be obvious. Energy card waits until its actual calculation exists on Day 4.

Acceptance: frontend production build passes; cards agree with saved samples; missing/offline backend does not crash; units match the contract. Include frontend/backend environment examples, scripts and startup instructions.

## Day 3 — live updates and charting

Add Socket.IO to the existing HTTP server and React client; emit only after database commit and only for newly inserted samples. Add voltage/current/power charts with bounded live buffers and initial recent-history query. Rehydrate recent samples after browser reconnect to close missed-event gaps. Remove subscriptions/timers on unmount and deduplicate chart samples. Periodic status checks must transition the device offline even when no new telemetry arrives.

Acceptance: two browser clients see the same new reading; stopping simulator/sensor produces offline status; restart/reconnect recovers; chart data stays bounded; duplicate POST does not create duplicate plot points. Preserve a REST recovery path.

## Day 4 — energy and historical analytics

Integrate generation power using trapezoids: deltaWh = (P1MW + P2MW)/2 * deltaSeconds / 3,600,000. Use uptime-based elapsed time within a boot to avoid HTTP receipt jitter; use receivedAt to locate intervals in calendar history. Integrate only positive bounded intervals within the same device/boot/source; skip boot changes and gaps over the configured threshold (default 15 seconds) and report coverage so offline time is not claimed as measured generation. Do not bridge simulator and hardware streams or assign energy to the first sample. Ensure deduplication and restart/recomputation do not double count.

Split accepted intervals at calendar boundaries for date summaries. Store dates in UTC and group daily history using configured display timezone (default Asia/Kolkata). Document estimated interval placement because firmware lacks absolute sample time. Report time-weighted average power for covered intervals; do not substitute arithmetic sample averages where cadence varies.

Add total/today energy, energy chart, history table, date/source filters, daily/weekly/monthly summaries, peak power, CSV export, pagination and downsampled chart queries. Add indexes supporting device/source/time queries; cap export sizes. Energy represents monitored load output over observed intervals, not theoretical panel capability or battery charge.

Acceptance: known constant/varying-power samples give expected Wh; negative currents, duplicate sends, gaps, boots, server restart, out-of-order input and midnight boundaries behave correctly; CSV and chart totals agree with the documented calculation. Synthetic test fixtures are isolated from real readings.

## Day 5 — finish and demonstrate

Implemented additions requested during development: automatic laptop-IP discovery and ESP32 Wi-Fi provisioning through the dashboard, including persistent settings and recovery AP. See DISCOVERY.md and WIFI_SETUP.md.

Complete integration regression checks, firmware/API/dashboard failure handling, configured-origin CORS, graceful shutdown, bounded requests/history queries, log hygiene, and a production frontend build. Add Windows-friendly laptop setup and optional MongoDB Docker instructions without requiring Docker for everyone. Secrets remain in ignored private files; example files contain placeholders only.

Produce setup/troubleshooting guide, wiring reference, API reference, test-result record, semester report notes, a demonstration script and future improvements. Run the software flow using simulator; list physical acceptance tasks honestly for Nanith (upload firmware, inspect serial logs, test real sunlight and 100 ohm load, verify Wi-Fi recovery). External hosting, TLS infrastructure and multi-user authentication are outside this five-day local demo unless explicitly requested.

Acceptance: fresh-extraction install instructions work in supported available tooling; cumulative tests/build pass; simulator demo covers ingestion, persistence, live charts, offline recovery and analytics. Report unavailable tests and actual failures without labeling them passed. Deliver final `solar-monitor-day-05.zip`.

## Target final file structure

Files appear when implemented; this is a planned final layout, not today's existing code.

```text
solar-monitor/
  README.md
  package.json
  package-lock.json
  .gitignore
  firmware/
    solar_monitor/
      solar_monitor.ino
      config.example.h
  server/
    package.json
    .env.example
    src/
      app.js
      server.js
      config/db.js
      models/Device.js
      models/Reading.js
      routes/telemetry.routes.js
      routes/device.routes.js
      controllers/telemetry.controller.js
      controllers/device.controller.js
      middleware/deviceAuth.js
      middleware/errorHandler.js
      validators/telemetry.js
      services/telemetry.service.js
      services/energy.service.js
      services/history.service.js
      realtime/socket.js
    tests/
      telemetry.test.js
      energy.test.js
      history.test.js
  client/
    package.json
    .env.example
    index.html
    vite.config.js
    src/
      main.jsx
      App.jsx
      api/client.js
      hooks/useTelemetry.js
      hooks/useLiveTelemetry.js
      components/MetricCard.jsx
      components/DeviceStatus.jsx
      components/TelemetryChart.jsx
      components/HistoryTable.jsx
      components/DateRangeFilter.jsx
      components/GenerationSummary.jsx
      pages/Dashboard.jsx
      pages/History.jsx
      styles/global.css
  scripts/
    simulate-device.mjs
    smoke-test.mjs
  docs/
    PROJECT_STATE.md
    CHANGELOG.md
    SETUP.md
    API.md
    WIRING.md
    TEST_RESULTS.md
    DEMO.md
    REPORT_NOTES.md
```

Use root npm workspaces and a single root lockfile if selected on Day 1. Implementation may consolidate files where that makes the code simpler; preserve names/paths once established. No empty skeleton ZIPs count as completed milestones.
