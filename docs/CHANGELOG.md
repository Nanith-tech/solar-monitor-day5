# Changelog

## 0.5.0 — Day 5

- Added per-interface mDNS backend advertisement and ESP32 rediscovery with manual fallback.
- Added dashboard Wi-Fi form, local authenticated relay, board NVS settings and recovery AP.
- Added database-independent Wi-Fi setup mode, combined startup and doctor diagnostics.
- Added discovery/Wi-Fi/doctor tests and host-stub firmware execution; retained prior telemetry/analytics contracts.
- Added final setup, troubleshooting, demo, report and physical acceptance guides.
- Requires one new ESP32 sketch upload; earlier private config files remain compatible.

## 0.4.0 — Day 4

- Added date-range keyset history, bounded streamed statistics and complete CSV export.
- Added uptime-based energy integration, exact positive zero crossings, coverage and IST calendar summaries.
- Added date presets/filters, energy chart, paginated table and exports in React.
- Added range, energy, CSV, service/HTTP and date tests; retained existing live stream.
- Reused database index and preserved firmware/configuration/telemetry compatibility.

## 0.3.0 — Day 3

- Added Socket.IO subscriptions, post-save broadcasts and database heartbeat.
- Added bounded recent-history API, reconnect snapshots and REST fallback.
- Added three live charts with deduplication, source isolation and gap/restart breaks.
- Added realtime/history tests, proxy configuration and upgrade documentation.
- Preserved firmware and telemetry ingestion contract.

## 0.2.0 — Day 2

- Added React/Vite dashboard, responsive cards and explicit units.
- Added polling, timeout/cancellation, refresh, source separation and recovery.
- Added empty/offline/stale/API-error states and connection help.
- Added client workspace, configuration, frontend tests and build/preview scripts.
- Updated setup for the working Atlas pipeline; firmware is unchanged.

## 0.1.0 — Day 1

- Added hardware-to-MongoDB telemetry path using explicit units.
- Added retry-safe sample identity, auth, validation, latest readings and independent stream status.
- Added ESP32 firmware with Wi-Fi/I2C recovery and bounded transmission retries.
- Added labeled simulator, smoke check, syntax check and isolated MongoDB integration tests.
- Added Windows/Arduino setup, API, wiring, state and delivery documentation.
