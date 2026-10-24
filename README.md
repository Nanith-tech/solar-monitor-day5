# Interactive Solar Lab UI upgrade

See [docs/UI_UPGRADE.md](docs/UI_UPGRADE.md) for setup, new controls and verification. This ZIP includes the full Day 5 project with the upgraded dashboard.

# Solar Energy Monitor — Day 5

Complete cumulative Days 1–5 MERN project, version 0.5.0. ESP32/INA219 → Express/Socket.IO → MongoDB Atlas → React: live readings/charts, historical generation estimates, date filters and CSV export. Day 5 adds laptop discovery, Wi-Fi changes from the dashboard, ESP32 recovery hotspot, connection diagnostics and final demo/report instructions.

## Upgrade from Day 4

1. Extract into a fresh folder. Stop the old backend and frontend.
2. Copy your working `server/.env` and optional `client/.env` into this project. Keep your Atlas URI, DEVICE_ID and DEVICE_KEY. Do not copy node_modules or the old lockfile.
3. Copy your private `firmware/solar_monitor/config.h` beside the new sketch. Existing configuration remains compatible; new features default on. **Upload the NEW Day 5 sketch once.** Earlier firmware cannot receive Wi-Fi settings from the app.
4. In the new solar-monitor root, using Node 24 or newer:

```powershell
npm ci
npm run dev:all
```

Open http://localhost:5173. Ctrl+C stops both apps. Alternatively use `npm start` and `npm run client` in separate terminals; choose one startup method. `npm start` starts only the backend.

For a fresh setup, run `npm run setup`, edit `server/.env` for Atlas, then copy `config.example.h` to `config.h` and set initial Wi-Fi, matching DEVICE_ID/DEVICE_KEY and the fallback laptop URL. See [SETUP](docs/SETUP.md).

## Change ESP32 Wi-Fi without another upload

In **Connect ESP32 to Wi-Fi**, enter its current IPv4 address from Serial Monitor, the target network name and password, then Save. Settings persist on the ESP32. Accepted means saved, not yet successfully connected. Connect the laptop to the same target network and check sensor updates.

If ESP32 cannot join Wi-Fi for 30 seconds, join its `Solar-Setup-…` hotspot on the laptop. Password: first 12 characters of your private DEVICE_KEY. Use ESP32 IP `192.168.4.1`. If Atlas is unreachable there, stop the normal app and run `npm run wifi:setup` to use the same form without MongoDB. After saving, join the target network, stop setup mode and run `npm run dev:all`. See [WIFI_SETUP](docs/WIFI_SETUP.md).

## Guides and checks

- [File structure](docs/FILE_STRUCTURE.md), [API](docs/API.md), [wiring](docs/WIRING.md), [energy method](docs/ENERGY_METHOD.md).
- [Automatic IP discovery](docs/DISCOVERY.md), [troubleshooting](docs/TROUBLESHOOTING.md), [demo](docs/DEMO.md), [report notes](docs/REPORT_NOTES.md).
- [Verification results](docs/TEST_RESULTS.md), [local acceptance](docs/ACCEPTANCE.md), [project state](docs/PROJECT_STATE.md), [changelog](docs/CHANGELOG.md).

```powershell
npm run doctor
npm run check
npm run test:server:unit
npm run test:client
npm run test:firmware
npm run build
```

Firmware host tests require g++/CXX; Arduino Verify is still required for the actual ESP32 board. Database integration (`npm test`) and multicast (`npm run test:discovery:network`) need a suitable local environment. Their execution here was blocked; physical board/hotspot acceptance remains local. Software tests use isolated fixtures, never fabricated production measurements.
