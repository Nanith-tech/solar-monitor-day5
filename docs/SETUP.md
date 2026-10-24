# Day 5 setup

Use [README](../README.md) for upgrade/startup. Extract a fresh project and preserve your working Atlas database and private files. No schema reset is needed. Day 5 changes firmware: upload once before using discovery or web Wi-Fi settings.

## Laptop and Atlas

Install Node 24+, then run `npm ci` at the solar-monitor root. For a new configuration run `npm run setup`; it generates a private device key and leaves existing .env files alone. Edit server/.env: Atlas `mongodb+srv://…` URI including database name, database-user password (URL encode reserved characters), correct DEVICE_ID and DEVICE_KEY, HOST=0.0.0.0, PORT=4000 and CORS_ORIGIN=http://localhost:5173. Atlas Database Access credentials differ from your Atlas sign-in. Allow the laptop's current public IP in Atlas Network Access. Phone internet changes can change that public IP.

Local MongoDB is an alternative: use mongodb://127.0.0.1:27017/solar_monitor with a running local MongoDB service. Atlas does not require installing a local MongoDB service.

Start with `npm run dev:all`, open http://localhost:5173. Frontend starts only after the API successfully listens. Run `npm run doctor` in another terminal. Stop prior versions to avoid port conflicts. On PowerShell systems blocking npm.ps1, use npm.cmd or Command Prompt.

## ESP32

Use the Arduino ESP32 board package (3.x API), correct ESP32 Dev Module/serial port, Adafruit INA219 library and dependencies. Open firmware/solar_monitor/solar_monitor.ino. Copy config.example.h to private config.h if needed. Match DEVICE_ID and DEVICE_KEY to server/.env. Set initial WIFI_SSID/WIFI_PASSWORD and TELEMETRY_URL using the laptop's Wi-Fi IPv4 from ipconfig; this is the manual discovery fallback. Verify, then Upload. Serial Monitor baud: 115200.

Keep the established [wiring](WIRING.md): INA219 supply 3V3, GPIO21 SDA/GPIO22 SCL, shared ground and 100 Ω load. Keep ESP32 USB powered. Panel voltage does not go into the ESP32 power pin.

Connect laptop and ESP32 to the same mutually reachable hotspot. Firmware logs its own IP, selected backend and HTTP result. HTTP 201/200 and current Real sensor readings confirm the path. A successful Wi-Fi join alone does not confirm database reception. [DISCOVERY](DISCOVERY.md) explains automatic laptop-IP changes; [WIFI_SETUP](WIFI_SETUP.md) explains changing the ESP32's network from React.

## Dashboard and simulator

Defaults proxy /api/v1 and /socket.io to 127.0.0.1:4000. For a changed backend port copy client/.env.example to client/.env, set SOLAR_API_TARGET and restart React. VITE_DEVICE_ID must match the configured device. Client settings are public; never include a key, Atlas URI or Wi-Fi password there.

Select Real sensor for physical readings. For an optional synthetic demo set ALLOW_SIMULATOR=true, restart API and run `npm run simulate`. Simulator data is labeled and stored separately by source. Disable it after the demo if desired. Never present it as measured panel output.

History/energy behavior, table/export limits and range details are retained in [Day 4 setup](SETUP_DAY4.md) and [ENERGY_METHOD](ENERGY_METHOD.md). Day 4's no-reupload instruction applies only to that earlier release.

Production verification: `npm run build`, then `npm run preview` while the backend runs. This is a local preview, not external deployment. [TROUBLESHOOTING](TROUBLESHOOTING.md) covers earlier port/proxy/Arduino errors.
