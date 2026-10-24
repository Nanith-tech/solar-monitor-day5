# Day 3 verification — 2026-10-03

## Passed

- Production React build: 55 modules; JavaScript 282.95 KB (88 KB gzip), CSS 11.97 KB (3.47 KB gzip).
- JavaScript syntax: 35 files. JSX validated by the production build.
- Frontend tests: 6 passed, including status, deduplication, ordering, bounded history and gaps/restarts.
- Backend unit/realtime tests: 9 passed. Real Socket.IO transport tests cover two sensor subscribers, separate simulator rooms, invalid subscription rejection, emission only after successful persistence, and no emission on duplicates or failed writes.
- Production browser through actual HTTP/WebSocket proxies: initial history, immediate events, duplicate suppression, API restart/reconnect, missed-reading recovery, source isolation and the 120-point bound passed.
- Desktop/tablet/mobile widths 1440/768/390: no horizontal overflow or uncaught browser exceptions. Desktop/mobile screenshots visually inspected.
- Fresh source installation: npm ci installed all 192 packages from the included lockfile (lifecycle scripts disabled for this installation check).
- ZIP CRC and source-byte checks passed; firmware matches both earlier archives exactly; relative documentation links resolve.

Browser verification used controlled in-memory API fixtures and actual Socket.IO; it does not establish a MongoDB write or physical sensor accuracy. These fixtures are not application fallback data. The user's previously working Atlas/ESP32 configuration remains required.

## Database integration limitation

The disposable mongod was blocked in this environment with exit 100 and `open: Operation not permitted` during Day 2. Database integration cases are not marked passed for Day 3. The complete suite remains included, with an added recent-history integration case. Earlier successful Day 1 evidence is preserved in TEST_RESULTS_DAY1.md; Day 2 results are in TEST_RESULTS_DAY2.md. No production database was used for verification.

## Reproduce

```powershell
npm ci
npm run build
npm run check
npm run test:client
npm run test:server:unit
npm test
```

The final command additionally requires a runnable disposable MongoDB binary (first run may download it). See Day 1 setup for MONGOMS_SYSTEM_BINARY.

With your running Atlas backend, check that Real sensor cards/charts update, stop ESP32 telemetry for more than 20 seconds, then restart it. Stop/restart Express to check fallback and recovery. Physical hardware, Windows execution and new Atlas integration were not tested here.
