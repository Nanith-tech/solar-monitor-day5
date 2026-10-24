# Day 4 setup

Use the fresh-folder upgrade in [README](../README.md). Keep the existing Atlas database and device settings; copy server/.env, run npm ci, start Express, then start React in a second terminal. Open http://localhost:5173. No firmware reupload, wiring change, schema reset or new credentials are required.

## History & energy

Select Real sensor or Simulator using the main source switch. History follows that source and resets when you switch. Historical values load only when you select a preset or Apply range; live cards continue updating independently.

Today, This week and This month use IST dates. Weeks begin Monday. Start/end calendar dates are inclusive and limited to 31 days; future end dates are rejected. Today ends at the exact time you apply. The displayed snapshot remains fixed until you apply again, so table pages and exports refer to the same range. The date fields can be edited without changing the displayed snapshot until Apply.

Generation is positive observed load energy in mWh. Net energy retains negative power. Average is time weighted by covered device uptime; peak is the largest in-range sampled signed power. Daily/weekly/monthly totals are clipped to the selected range, including partial periods. Unavailable estimates display a dash and chart cross, not an invented zero. A real zero with covered intervals displays zero.

Coverage measures reception-time intervals that have eligible sample pairs. Missing time is displayed explicitly. RSSI, live status and historical estimates describe different things. A connected stream does not imply full historical coverage. Read [ENERGY_METHOD](ENERGY_METHOD.md) for assumptions and boundary treatment.

## Table and export limits

History API pages default to 100 rows, maximum 500. Browser loads 100 at a time and displays at most 1,000 rows, oldest first. Export includes all raw samples in the selected source/range, up to 50,000. Statistics stream at most 600,000 samples for a range of up to 31 days. Exceeding either processing cap returns a clear error; shorten the range. No partial total or CSV is returned.

CSV columns include deviceId, source, bootId, sequence, receivedAt UTC, voltageV, currentMA, powerMW, uptimeMs, rssiDbm. It is raw telemetry, not a daily totals file. Numbers remain signed, text is quoted and formula-like identifiers are guarded for spreadsheet import. An empty range exports a header-only CSV. History requests/export time out in the browser after 60 seconds.

## Live/configuration

Default browser /api/v1 and /socket.io are proxied to http://127.0.0.1:4000 by Vite, in development and production preview. Existing client/.env remains compatible. Match VITE_DEVICE_ID to server DEVICE_ID; adjust SOLAR_API_TARGET for a custom backend port. VITE_SOCKET_URL is optional for a separate direct socket origin. Absolute API origins need matching server CORS_ORIGIN. Client settings are public; no Atlas URI, password or DEVICE_KEY belongs there.

Live charts retain the latest 120 samples in the last hour; historical summaries process the chosen date range independently. Express/Socket.IO share port 4000, so the ESP32 telemetry URL remains unchanged. Simulator requires ALLOW_SIMULATOR=true, backend restart and npm run simulate. See SETUP_DAY3.md for stream recovery and earlier troubleshooting.

| Symptom | Check |
| --- | --- |
| Missing script/dependency | New solar-monitor root; npm ci |
| Port occupied | Stop previous backend/frontend |
| Atlas startup fails | Copied URI, database-user password and current-IP network access |
| Empty history | Correct source/dates, existing Atlas database, sample reception time |
| Energy unavailable but rows exist | At least two eligible nearby samples; no bridging boots or gaps |
| Low coverage | Device was off, disconnected or only recently started |
| Export too large/range too dense | Reduce selected dates; totals were not truncated |
| History/CSV error | Backend/database reachable; Apply again or retry export |
| PowerShell blocks npm.ps1 | Use npm.cmd or Command Prompt |

Frontend binds laptop loopback by default. LAN/phone access needs explicit hosting/firewall configuration. External deployment is not part of this milestone. Node 24 is the baseline.
