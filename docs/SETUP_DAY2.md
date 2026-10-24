# Day 2 setup

Your ESP32-to-Atlas pipeline already works. This archive includes it and adds the React dashboard.

## Upgrade

Extract into a fresh folder. Copy the old server/.env into the new server/.env, preserving Atlas URI, device key and DEVICE_ID. Keep the same Atlas database. Do not copy node_modules or the old lockfile. Stop the old backend before starting the new one.

The Arduino sketch is unchanged. Your uploaded firmware keeps sending to port 4000. Copy your private config.h into the new sketch folder if you want to retain the editable settings; no upload is needed for Day 2.

In the NEW root solar-monitor folder:

```powershell
npm ci
npm start
```

In a second terminal in the SAME root folder:

```powershell
npm run client
```

Open http://localhost:5173. Leave both terminals running and the ESP32 powered/on the same reachable Wi-Fi. Select Real sensor. PowerShell blocking npm.ps1? Use npm.cmd or Command Prompt.

## Reading the dashboard

Voltage is V, signed current is mA, signed load power is mW. Last reception uses IST. RSSI and uptime are values at sampling, not extrapolated live values. Offline threshold defaults to 20 seconds. Cached offline values are labeled stale. API failure shows API unavailable and Status unverified; the last successful same-source values are retained. It retries automatically. Refresh starts a new snapshot when idle. Request-cycle timeout is eight seconds.

Loading, never-seen, zero, offline and failed-API states are distinct. A negative tiny current remains visible for diagnosis. Real readings and simulator data remain separate.

## Optional simulator

Set ALLOW_SIMULATOR=true in SERVER .env and restart Express. Run npm run simulate in a third terminal. Select Simulator in the browser; an amber notice identifies synthetic readings. The browser does not start the simulator for you. Stop it with Ctrl+C when finished.

## Custom configuration

Defaults require no client .env. For custom backend port or device ID, copy client/.env.example to client/.env:

```dotenv
VITE_API_BASE_URL=/api/v1
VITE_DEVICE_ID=solar-node-001
VITE_POLL_INTERVAL_MS=5000
SOLAR_API_TARGET=http://127.0.0.1:4000
```

Align VITE_DEVICE_ID with server DEVICE_ID. Change SOLAR_API_TARGET when Express PORT changes. Restart frontend after client config edits and backend after server config edits. Poll interval accepts 1000–60000 ms and otherwise falls back to 5000.

Never put DEVICE_KEY, an Atlas URI or passwords in client config; its VITE variables are public. Keep the working server config instead of rerunning setup and changing the key.

The frontend uses port 5173 with strictPort; close a prior frontend instance if the port is occupied. The default relative URL/proxy avoids browser CORS issues. An optional absolute VITE_API_BASE_URL such as http://localhost:4000/api/v1 needs server CORS_ORIGIN to exactly match the frontend origin (default http://localhost:5173).

## Build and preview

```powershell
npm run build
npm run preview
```

Stop the development frontend first because preview also uses 5173. Keep Express running. Preview proxies /api too. External static hosting does not automatically inherit this proxy; external deployment is outside today's scope.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Missing script: client | Are you in the new root, not server or the old Day 1 folder? |
| Missing vite/react | Run npm ci in the new root |
| Port 4000/5173 occupied | Stop the prior backend/frontend process |
| API unavailable | Is npm start running? Does localhost:4000/api/v1/health work? |
| Atlas fails | Copied URI/password and Atlas network access for current public IP |
| Wrong device | Align client VITE_DEVICE_ID and server DEVICE_ID |
| Sensor has no readings | ESP32 Serial Monitor, Wi-Fi and laptop IPv4 telemetry URL |
| Simulator has no readings | Enable ingestion, restart backend and run npm run simulate |
| Stale values | Restore device/Wi-Fi/backend connection |
| Direct URL/CORS fails | Return to relative URL/proxy or configure exact CORS_ORIGIN |

Frontend is bound to laptop loopback by default. Phone viewing requires explicit LAN hosting/firewall setup. Hardware wiring, Atlas and firmware instructions remain in SETUP_DAY1.md and WIRING.md. Keep the 100 ohm load and your existing USB/power-bank arrangement.
