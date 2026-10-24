# Day 2 verification — 2026-10-03

## Passed

- React production build with React/React DOM 19.3.0, Vite 8.3.2 and Node 24.19.0. JSX/build transformation succeeded; final bundle is approximately 235 KB (74 KB gzip), CSS 10.5 KB (3.2 KB gzip).
- JavaScript syntax check: 27 files passed. JSX is validated by the production build.
- Fresh source copy installed all 170 packages with npm ci from the supplied root lockfile. Lifecycle scripts were disabled for this installation check; MongoDB-binary execution is covered by the separate limitation below.
- Frontend data/status tests: 3 passed, 0 failed.
- Backend validation/status unit tests: 6 passed, 0 failed.
- Production build loaded in a headless Chromium browser, with controlled API fixtures: actual metric values and units, negative small readings, RSSI and uptime, source switching and simulator notice, empty state, offline/stale values, failed API and retention of last values, recovery, and connection help all passed.
- Browser layout checked at widths 1440, 768 and 390 px: no horizontal overflow. Desktop and mobile screenshots were visually inspected. No uncaught browser exceptions.
- Firmware and telemetry contracts are unchanged from the Day 1 archive. The health milestone field alone changes from 1 to 2.

The browser fixtures were only used for verification, are not included as a demo fallback in the application, and are not a claim of new physical measurements. The actual frontend requires the user's running API. Previous user confirmation establishes that their ESP32-to-Atlas readings update; it does not establish a new hardware test performed here.

## Current environment limitation

The original disposable MongoDB integration suite was attempted but could not start mongod in this execution environment: MongoDB exited with code 100 and `open: Operation not permitted`. Ten integration cases therefore did not run successfully in this Day 2 environment. They are NOT labeled passed. The server source and tests are retained, and the earlier 16-case Day 1 successful run is documented separately in TEST_RESULTS_DAY1.md. No production database was contacted or altered for these checks.

## Reproduce locally

```powershell
npm ci
npm run build
npm run check
npm run test:client
npm test
```

The final command requires a runnable disposable MongoDB binary; its first run may download one. If local policies prevent that, use the documented MONGOMS_SYSTEM_BINARY setting from SETUP_DAY1.md.

For the actual dashboard: start Express using your copied working Atlas configuration, run npm run client and select Real sensor. Confirm cards match the latest endpoint, then stop ESP32 telemetry for more than 20 seconds and observe Offline/stale values. Restart telemetry and check recovery. Stop Express to check API unavailable/Status unverified, and restart to check automatic recovery. Simulator mode requires explicit backend enablement and npm run simulate.

Physical sensor accuracy, wireless reachability from the real ESP32 and Windows execution were not newly tested here. Firmware requires no reupload for Day 2.
