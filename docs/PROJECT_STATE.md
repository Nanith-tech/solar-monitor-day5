# Project state — Day 5 / 0.5.0

Cumulative Days 1–5 complete in this snapshot. Preserve existing MongoDB schema, telemetry contract and private credentials. Day 5 firmware adds automatic endpoint discovery, web-provisioned persistent Wi-Fi and offline setup AP: one new upload is required. Older private config.h/.env remain compatible; examples show additional discovery settings.

New server discovery lives in src/discovery/advertise.js. Wi-Fi administrative relay is routes/wifi.routes.js, mounted before database readiness so recovery remains usable without Atlas. Normal startup still requires database connection; npm run wifi:setup starts a separate loopback-only API/frontend without MongoDB. Do not run both startup modes together. WifiSetup.jsx is always accessible even if telemetry API is degraded.

Normal startup npm run dev:all; diagnostics npm run doctor; separate npm start/npm run client still supported. Firmware uses Preferences NVS credentials before compiled Wi-Fi defaults, retains same sensor JSON/retry/source behavior and adds port-80 setup endpoints. No keys are sent to React or mDNS advertisements. Sensor and simulator stay separate. No production data or secrets are included.

Checks and limitations are in TEST_RESULTS.md. Physical Windows/ESP32/hotspot acceptance remains in ACCEPTANCE.md. Guides: SETUP, WIFI_SETUP, DISCOVERY, TROUBLESHOOTING, DEMO, REPORT_NOTES. Earlier setup/test-result documents are retained with DAY1–DAY4 suffixes and describe their releases, not current upload requirements.

Future changes should preserve retry identity, energy gap/coverage rules, source separation, one root npm workspace lockfile and explicit units. Do not fabricate data as a backend fallback. External deployment/security expansion/OTA are outside this local five-day release.

## Interactive UI upgrade, October 2026
React dashboard redesigned with SolarLab component, hardware inspection and a labelled local educational light/shade model. Backend and firmware unchanged. See UI_UPGRADE.md and DESIGN.md.
