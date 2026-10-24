# Day 5 verification — 2026-10-06

## Passed software checks

- Fresh source installation: npm ci with lifecycle scripts disabled installed 198 packages from the lockfile; all workspace versions are 0.5.0.
- JavaScript syntax: 50 source/test/script files. JSX is checked by the production build.
- Backend unit/service/HTTP/realtime tests: 31 passed, 0 failed, 1 skipped. Adds discovery metadata/address-change/socket lifecycle, doctor, Wi-Fi destination/credential validation, origin or referrer plus intent-header authorization, device identity before secret relay, URL encoding, key mismatch, unreachable board, rate limit and route availability without MongoDB. Existing telemetry, live delivery, history, CSV and energy tests remain passing.
- Frontend tests: 9 passed. Date ranges/IST, live deduplication, source isolation, gap rendering and status/units retained.
- Production React build: 59 modules. JavaScript 298.83 KB (93.59 KB gzip), CSS 17.01 KB (4.51 KB gzip).
- Actual firmware sketch compiled/executed using C++17 host hardware-library stubs: discovery filtering/fallback, endpoint-IP/port changes, exact retry identity, rejection/stale samples, ambiguous servers, Wi-Fi recovery, sensor disconnect; authenticated Wi-Fi save, failed storage, deferred reconnect, NVS reload and setup AP startup/shutdown assertions pass. These stubs do not verify the ESP32 SDK, flash or radio.
- Production Chromium browser over actual HTTP/WebSocket proxies with fixture storage: initial/live charts, actual Socket.IO event/reconnect, five-row history, CSV download, daily/weekly/monthly views, empty simulator separation, updated help, Wi-Fi validation error and accepted save through the actual relay, password clearing and no browser exceptions. Responsive 1440/768/390 widths have no page overflow. Desktop/mobile screenshots visually inspected. The check exposed the local proxy stripping Origin; a validated Referer fallback with explicit intent header was implemented and retested.
- Combined normal startup failure path: MongoDB startup failure exits without starting React.
- Combined Wi-Fi setup mode: starts without MongoDB, serves React and Wi-Fi administration while health and telemetry report database unavailable. Ctrl+C/SIGTERM stops both processes. Uses explicit loopback Vite binding and strict port.

## Environment-dependent checks not passed

Full disposable MongoDB suite was attempted during Day 5; mongod exited with code 100, blocking twelve database integration cases. The doctor test failed initially because this runtime cannot enumerate network interfaces; that was corrected and its final unit test passes. Database cases are not marked passed. No production Atlas database was contacted or changed. Earlier release results are preserved in TEST_RESULTS_DAY1–DAY4.md.

Default unit execution skips one real multicast test. Explicit npm run test:discovery:network was attempted and timed out under this runtime's restricted multicast/network-interface support. Advertisement lifecycle unit tests pass, but actual phone-hotspot/UDP/ESP32 discovery is not claimed verified.

Arduino ESP32 SDK compile/Verify, actual Upload, Windows firewall, physical NVS persistence/radio switching, Atlas credentials and sensor hardware acceptance remain local. Follow ACCEPTANCE.md. No sample fixtures are seeded into production or shipped as a telemetry fallback.

## Reproduce

```powershell
npm ci
npm run check
npm run test:server:unit
npm run test:client
npm run test:firmware
npm run build
npm test
npm run test:discovery:network
```

Firmware host tests need g++ or CXX; use Arduino Verify for the real board. The last two commands require a suitable disposable MongoDB/network environment. Browser checks used an external Playwright harness and isolated fake storage/ESP32 HTTP responses; browser tooling is not a runtime dependency. Repeat physical acceptance on your own hardware rather than treating software fixtures as measurements.

## Packaging

ZIP CRC and complete source-byte comparison passed; private .env/config.h, dependencies, dist, logs and database files excluded. Relative documentation links and package/lock versions validated. Day 5 firmware intentionally differs from earlier archives and requires one upload. Existing telemetry route/model remain byte-compatible with Day 4. Full actual file structure is included in FILE_STRUCTURE.md.
