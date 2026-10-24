# Day 3 setup

Follow the fresh-folder upgrade instructions in [README](../README.md). Copy your working server/.env, preserve the Atlas database and stop the older backend. Run npm ci, npm start, then npm run client in a second terminal. Open http://localhost:5173. Firmware and wiring are unchanged.

## Live updates and recovery

The browser subscribes to the selected device/source, then fetches latest values and recent history. Each newly stored reading is broadcast; identical retries do not broadcast. On reconnection it resubscribes and fetches recent history again. A periodic REST safety check runs every 15 seconds or the configured longer interval while connected. REST fallback defaults to five seconds after a request cycle when disconnected. Requests time out after eight seconds.

Stream connected means the browser can communicate with Socket.IO. API/database readiness and sensor freshness are displayed separately. A connected stream does not prove that your ESP32 is transmitting. Default sensor offline threshold is 20 seconds. RSSI and uptime describe sampling time. Last reception and chart time labels use IST. Cached values become stale and API failures make device status unverified.

Charts show signed V, mA and mW using reception time, a zero baseline and up to 120 samples from the last hour. Lines break across restarts and gaps longer than 15 seconds. Recovery is bounded: a long outage may leave older samples outside this window. History failure shows a separate notice and retries automatically.

## Optional simulator

Set ALLOW_SIMULATOR=true in server/.env, restart Express, run npm run simulate in a third terminal and select Simulator. Simulator data stays labeled and separate from real sensor data.

## Custom configuration

Defaults need no client/.env. For custom ports/device IDs, copy client/.env.example to client/.env:

```dotenv
VITE_API_BASE_URL=/api/v1
VITE_DEVICE_ID=solar-node-001
VITE_POLL_INTERVAL_MS=5000
SOLAR_API_TARGET=http://127.0.0.1:4000
```

Match VITE_DEVICE_ID to server DEVICE_ID. SOLAR_API_TARGET is the backend origin used by the Vite HTTP/WebSocket proxies. Both /api and /socket.io are proxied in development and preview. Express and Socket.IO share backend port 4000; your ESP32 URL remains the same.

An absolute VITE_API_BASE_URL needs matching server CORS_ORIGIN. Optional VITE_SOCKET_URL specifies the socket server origin when different from the API; otherwise the absolute API origin or page origin is used. Restart the relevant process after changing configuration. VITE values are public: no passwords, Atlas URI or DEVICE_KEY belong here.

## Build and troubleshooting

Run npm run build and npm run preview to inspect production assets; stop the development frontend first because both use strict port 5173. Keep Express running. External static hosting needs its own proxy/origin configuration.

| Symptom | Check |
| --- | --- |
| Missing script or dependency | New project root; run npm ci |
| Port occupied | Stop the previous backend/frontend |
| API unavailable | npm start, copied Atlas URI, Atlas network access for your public IP |
| Stream reconnecting, REST works | /socket.io proxy, backend origin, CORS; fallback continues |
| Stream connected but sensor offline | ESP32 Serial Monitor, Wi-Fi and laptop IPv4 telemetry URL |
| Empty charts | Selected source has no samples in the last hour |
| History unavailable | Backend/database health; automatic retries continue |
| Simulator empty | Enable ingestion, restart backend, run npm run simulate |
| PowerShell blocks npm.ps1 | Use npm.cmd or Command Prompt |

Frontend binds loopback by default. Phone access requires explicit LAN hosting/firewall configuration. Original instructions remain in SETUP_DAY1.md; prior dashboard setup remains in SETUP_DAY2.md.
