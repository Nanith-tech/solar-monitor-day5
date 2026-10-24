# Day 4 verification — 2026-10-03

## Passed

- Production React build: 58 modules; JavaScript 296.13 KB (92.58 KB gzip), CSS 16.49 KB (4.40 KB gzip).
- JavaScript syntax: 40 source/test/script files. JSX is checked by the production build.
- Backend unit/service/HTTP/realtime tests: 23 passed. Covers range/cursor validation, keyset equal-time ordering, CSV headers/quoting/negative values/formula guards, export and statistics cap rejection, cursor cleanup, known constant-power energy, exact positive zero-crossing integration, gaps/restarts/order, null versus zero, clipping, millisecond Date precision, IST midnight, Monday weeks/month rollover and HTTP timing jitter. Existing actual Socket.IO delivery tests remain passing.
- Frontend tests: 9 passed, including IST inclusive dates, presets, frozen today bound, invalid ranges and retained live/status tests.
- Production browser over actual HTTP/WebSocket proxies using fixture-backed historical routes: energy result and three period views, 205 readings over three pages, actual complete CSV download, empty simulator/source reset, server/export failure, cancelled late responses, invalid range, and responsive widths 1440/768/390 passed. No uncaught browser errors or page overflow. Historical tables scroll within their container. Screenshots visually inspected.

The browser fixtures and mocked data-access tests verify application behavior and calculations; they are not claims of actual MongoDB storage or physical solar output. They are not shipped as fallback data.

## Database integration limitation

The full disposable MongoDB suite was not rerun for Day 4 because the earlier execution environment blocked mongod with exit 100 and open: Operation not permitted. The suite remains included, with a new history/statistics/CSV integration case; those MongoDB-dependent checks are not marked passed here. Prior Day 1 success is recorded separately in TEST_RESULTS_DAY1.md. Earlier Day 2/3 results are preserved. No production Atlas database was contacted or changed for verification.

## Reproduce

```powershell
npm ci
npm run build
npm run check
npm run test:client
npm run test:server:unit
npm test
```

The final command requires a runnable disposable mongod (first run may download it); see SETUP_DAY1.md for MONGOMS_SYSTEM_BINARY. Windows/hardware/Atlas integration still requires local acceptance with your copied working configuration.

For local acceptance, start backend/frontend, select Real sensor, load Today and compare the latest measurements to saved readings. Export CSV and verify source/units/count. Stop ESP32 telemetry, then resume: the missed interval should reduce coverage rather than increase estimated energy. Apply the range again after new readings. Switch Simulator and confirm independent empty or synthetic history.

## Packaging checks

Fresh source installation with npm ci installed all 192 packages from the included lockfile (lifecycle scripts disabled for the installation check). ZIP CRC/source-byte verification passed. Firmware matches all earlier archives exactly. Private config, node_modules, build output and database files are excluded. Relative documentation links resolve.
