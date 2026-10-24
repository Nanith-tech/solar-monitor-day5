# Day 1 verification results

Verified on 2026-09-30 in Linux with Node.js 24.19.0 and npm 11.9.0. Windows setup steps are provided, but were not executed on a Windows machine here. Physical board/wiring checks require Nanith's hardware.

## Passed

- JavaScript syntax: all 21 source/test/script files passed `npm run check`.
- Clean source copy installed all 149 packages from the root lockfile using `npm ci --offline --ignore-scripts` and the already downloaded npm cache. This verifies lockfile/manifests agree; test-binary download behavior was exercised separately in the successful MongoDB tests.
- Unit and integration suite: **16 passed, 0 failed, 0 skipped** using `npm test`.
- Integration used a real disposable **MongoDB 7.0.24** process, not a mocked database.
- Actual server-process check: setup generated a random key and preserved existing config; smoke script passed; three simulator readings saved; database contained exactly four simulator rows; process restart retained the latest sample; SIGTERM exited cleanly.
- ESP32 sketch compiled using **Arduino CLI 1.3.1**, **ESP32 Arduino core 3.3.12**, board **esp32:esp32:esp32** (ESP32 Dev Module), **Adafruit INA219 1.2.3**, **Adafruit BusIO 1.17.4**.
- Firmware compile output: **960,056 bytes flash (73%)**, **50,376 bytes static RAM (15%)** for that board's default partition.

Compiler produced three deprecated-enum warnings inside Adafruit INA219's calibration implementations. Compilation succeeded; no sketch-source warnings were reported. Vendor library code was not modified. A temporary config with dummy credentials was used solely to compile; it is not included in the archive.

## Test coverage

1. Health and never-seen device states; no secret key in read responses.
2. Valid telemetry persists and the latest endpoint returns matching measurements.
3. Identical retry preserves one row, original ID and original receivedAt.
4. Eight concurrent retries produce exactly one inserted row.
5. Identity conflict returns 409 and preserves original values.
6. Simulator does not mark the real sensor online or replace its latest stream.
7. Missing/wrong key, wrong device, invalid readings, malformed JSON, wrong media type and oversized body are rejected.
8. Unknown device, invalid source/query, and unknown route have consistent errors.
9. Offline samples remain offline after duplicate replay.
10. Database disconnect returns unavailable status; reconnection preserves readings.
11. Explicit units and negative diagnostic current are preserved.
12. Unsafe identities, forged timestamps, wrong types/non-finite numbers and inconsistent power are rejected.
13. Values above nominal panel ratings are accepted within configured sensor bounds.
14. Device key is limited to configured device and simulator ingestion is opt-in.
15. Placeholder keys and invalid environment settings fail at startup.
16. Device status ages when no further readings arrive.

During development the reconnection test exposed a race from automatic Mongoose index/collection initialization. The final implementation disables automatic initialization and explicitly creates indexes after connection and before HTTP starts; the entire suite then passed. Initial restricted-environment runs could not start the disposable database; successful runs used permitted local process/network access.

## Checks requiring the user's hardware

Not performed here: upload over CP2102, INA219 readings on the actual board, real Wi-Fi/firewall reachability from the ESP32, sunlight response, sensor unplug/recovery, Wi-Fi disconnection/recovery, or prolonged hardware runtime. A successful compile and simulator run do not establish physical measurement accuracy.

Follow SETUP.md and WIRING.md; confirm serial measurements match the API and that stopping telemetry produces offline status after 20 seconds. Readings are server receipt times, not synchronized sample timestamps. Firmware uses a bounded in-memory retry slot, with visible gaps during outages; no offline flash storage exists yet.

## Reproduce

```text
npm ci
npm run check
npm test
```

For the actual-process smoke check, start your configured MongoDB and API, enable simulator ingestion, then run `npm run smoke` and `npm run simulate -- 3`. These commands intentionally write labeled simulator data to your configured database. Automated integration tests use a separate disposable database and do not read your private server/.env.
