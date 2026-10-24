# Windows / Atlas / ESP32 troubleshooting

## EADDRINUSE / port 4000 occupied

Stop the old backend with Ctrl+C. Run only one version and one startup method. `npm start` remains backend-only; use `npm run dev:all` for both apps. Do not append `client` to npm start. On Windows identify the process before stopping it:

```powershell
netstat -ano | findstr :4000
tasklist /FI "PID eq YOUR_PID"
```

Use that application's normal shutdown. If necessary, terminate only the verified old Solar Monitor PID. Do not kill every Node process. Alternatively change server PORT and client SOLAR_API_TARGET together; discovery advertises the new port.

## Vite ECONNREFUSED 127.0.0.1:4000

The frontend proxy cannot reach Express. It is not an ESP32 compilation error. Check the backend terminal and `npm run doctor`. Verify Atlas connection and port. `npm run dev:all` waits for backend startup before opening React; `npm run client` alone does not start Express.

## MongoDB startup failed

Copy the working server/.env. Check Atlas Database Access user password and connection URI/database name; reset that database-user password if unknown. URL encode reserved characters in the password. Update Network Access for the laptop's current public IP after changing internet. Never paste the private URI/key into chat or client files. Atlas does not require local MongoDB running. Keep the existing database to retain history.

## Backend connected, ESP32 offline

Run doctor, select Real sensor, inspect Serial Monitor for new HTTP 201/200. Wi-Fi joined does not imply telemetry succeeded. Both laptop and ESP32 need the same mutually reachable hotspot. Day 5 discovery can adapt to laptop IP changes when multicast is allowed. Check NODE firewall permissions for TCP 4000/UDP 5353 on your trusted hotspot; keep firewall enabled. If discovery is blocked, manual TELEMETRY_URL must contain the laptop's current Wi-Fi IPv4. Stop old duplicate APIs. HTTP 401 means matching DEVICE_KEY/device ID, not an IP-discovery problem.

To change the ESP32 network use [WIFI_SETUP](WIFI_SETUP.md). Enter ESP32 IP in that form, not laptop IP. For an offline board use Solar-Setup after 30 seconds and setup-only mode if Atlas cannot be reached. Saved NVS settings override initial config.h Wi-Fi values.

## Arduino linker / upload errors

Missing core symbols such as setup/loop or framework routines are compilation/linker failures; Wi-Fi passwords and npm cannot fix the toolchain. Verify correct sketch/ESP32 board package and all tabs. Close Arduino, remove only its temporary arduino_build_/arduino_cache_ folders under %TEMP%, reopen and Verify. If needed reinstall the ESP32 board package and verify a bundled basic example before this sketch. Preserve your sketch/config.h. Verify must pass before Upload. BOOT/serial-port actions address actual upload connection failures, not linker errors. Adafruit INA219 library/dependencies must be installed; WebServer, Preferences and ESPmDNS come with Arduino ESP32.

## Dashboard/history

No history: correct source/date/device/database and Apply range. Simulator is separate and opt-in. One sample has no energy interval. Offline time reduces coverage instead of increasing energy. CSV too large: shorten range; exports are not silently truncated. Setup mode intentionally reports API/database unavailable for telemetry while allowing the Wi-Fi form. Stop setup mode and restart normal mode after joining the target network.
