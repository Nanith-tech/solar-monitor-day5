# Day 1 setup — Windows laptop and ESP32

## 1. Prepare Node and MongoDB

Install Node.js 24 from https://nodejs.org/en/download and MongoDB Community Server from https://www.mongodb.com/docs/manual/installation/. Reopen your terminal after installation. Check:

```powershell
node --version
npm --version
```

Use Node 24.x. Express 5 requires Node 18+, and Mongoose 9 requires Node 20.19+; this project standardizes on Node 24 so the root scripts and later frontend share one baseline.

On Windows, install MongoDB as a service if convenient. Confirm it is running in Services (`services.msc`). MongoDB Compass is optional; it is a database viewer and does not replace MongoDB Server. The default URL is `mongodb://127.0.0.1:27017/solar_monitor`.

Optional, only if Docker is already installed:

```powershell
docker run -d --name solar-monitor-mongo -p 127.0.0.1:27017:27017 -v solar-monitor-data:/data/db mongo:8.0
```

This keeps MongoDB on the laptop loopback interface; only Express needs to be reachable by the ESP32. Existing container: `docker start solar-monitor-mongo`. The named volume preserves data. Do not remove it to upgrade the ZIP.

An existing MongoDB Atlas database also works: put its connection URI in `.env`, configure database credentials/network access, and percent-encode special password characters in the URI. The ESP32 still sends to the laptop Express API, not directly to Atlas.

## 2. Extract and configure the application

Extract the ZIP. Open PowerShell in the folder containing the root `package.json`:

```powershell
cd path\to\solar-monitor
npm ci
npm run setup
```

`setup` creates `server/.env` with a random 64-character key, and does not overwrite an existing file. Edit it in your editor:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/solar_monitor
DEVICE_ID=solar-node-001
PORT=4000
HOST=0.0.0.0
ALLOW_SIMULATOR=true
```

Retain the generated `DEVICE_KEY`. To disable simulator ingestion for hardware-only use, set `ALLOW_SIMULATOR=false`. Restart the backend after every `.env` change. Do not include quotation marks in the Arduino key value itself; use C++ quotes around the string.

If PowerShell blocks `npm.ps1`, run the same commands using `npm.cmd` or use Command Prompt. No global execution-policy change is required.

## 3. Run laptop-only demonstration first

Terminal 1:

```powershell
npm start
```

Expected: `Solar API listening on 0.0.0.0:4000; device solar-node-001.` Open:

```text
http://localhost:4000/api/v1/health
```

Expected JSON includes `"status":"ok"` and `"database":"connected"`. Express refuses to start if the initial database connection or configuration is invalid.

Terminal 2, same project folder:

```powershell
npm run smoke
npm run simulate -- 3
```

The smoke test writes one simulator reading and checks a retry. The simulator sends three more, roughly five seconds apart. To run continuously use `npm run simulate`; Ctrl+C stops it.

Open:

```text
http://localhost:4000/api/v1/devices/solar-node-001/latest?source=simulator
http://localhost:4000/api/v1/devices
```

Simulator data does not make the sensor online. The default latest route without `?source=simulator` returns sensor data only, and initially has `reading:null` and `status:"never-seen"`. After 20 seconds without new samples, stream status becomes offline when queried.

MongoDB Compass: connect to `mongodb://127.0.0.1:27017`, then inspect `solar_monitor.readings` and `solar_monitor.devices`. No Compass installation is needed to run the project.

## 4. Find the laptop's LAN address

Run `ipconfig` and locate your active Wi-Fi adapter's IPv4 address, for example `192.168.1.10`. Do not use `0.0.0.0`, `127.0.0.1`, `localhost`, a disconnected adapter, or the ESP32's old `10.68.207.96` address in firmware. DHCP can change the laptop address, so recheck when changing networks.

Both the laptop and ESP32 must be on mutually reachable Wi-Fi. ESP32-WROOM-32 uses 2.4 GHz Wi-Fi. Campus/guest Wi-Fi may isolate devices, use captive portals, or block inbound requests; a personal 2.4 GHz hotspot/router can be easier. Your phone should be able to open `http://LAPTOP_IP:4000/api/v1/health` while connected to the same Wi-Fi.

If the laptop browser works but the phone cannot connect, check Windows Firewall. Allow Node on the trusted Private network profile. If necessary create an inbound TCP rule for port 4000, scoped to your private subnet. Keep the firewall enabled. Do not expose MongoDB port 27017 to the LAN.

## 5. Configure and upload firmware

Keep the already tested wiring from [WIRING.md](WIRING.md), including the external 100 ohm load and USB power for ESP32.

1. In Arduino IDE, keep your working ESP32 board/COM-port settings. `ESP32 Dev Module` is a common choice for this board.
2. Install/update **Adafruit INA219** using Library Manager; accept **Adafruit BusIO** dependencies. The sketch uses `ina219.success()` from the current library.
3. Open `firmware/solar_monitor/solar_monitor.ino`.
4. Copy `config.example.h` to `config.h` in that SAME sketch folder. Only edit `config.h`.
5. Fill Wi-Fi SSID/password; copy `DEVICE_ID` and generated `DEVICE_KEY` from `server/.env`.
6. Set the URL to `http://YOUR_LAPTOP_IPV4:4000/api/v1/telemetry`.
7. Keep server running, then Verify and Upload in Arduino IDE. If necessary use the board's BOOT button as in your earlier uploads.
8. Open Serial Monitor at **115200 baud**.

Do not leave the example key unchanged. An illustrative config (replace every placeholder):

```cpp
constexpr char WIFI_SSID[] = "your-2.4GHz-network";
constexpr char WIFI_PASSWORD[] = "your-wifi-password";
constexpr char DEVICE_ID[] = "solar-node-001";
constexpr char DEVICE_KEY[] = "paste-the-generated-server-key-here";
constexpr char TELEMETRY_URL[] = "http://192.168.1.10:4000/api/v1/telemetry";
```

Expected serial flow: INA219 ready -> Wi-Fi connected -> sample with V/mA/mW -> `HTTP attempt 1 -> 201`. A retry of a saved sample returns 200. Do not expect the ESP32's previous HTTP web page: this firmware is an HTTP client sending measurements to the laptop.

Now open `http://localhost:4000/api/v1/devices/solar-node-001/latest` to view real sensor readings.

The delivered sketch compiled with ESP32 core 3.3.12, Adafruit INA219 1.2.3 and BusIO 1.17.4. If your older installed library lacks `success()`, install the tested INA219 version. Vendor deprecated-enum warnings can appear with this compiler; see TEST_RESULTS.md.

## 6. Troubleshoot one change at a time

| Symptom | First check |
| --- | --- |
| `config.h: No such file` | Copy the example next to the `.ino`, named exactly `config.h` |
| Key/config error at startup | Run setup, retain its generated key, and restart after edits |
| MongoDB startup fails | MongoDB service running? Correct URI? For Atlas, credentials and allowed IP? |
| `EADDRINUSE` | Another process uses 4000. Stop it or change PORT and firmware URL together |
| HTTP -1 / connection timeout | Laptop LAN IP, server running, private firewall rule, client isolation |
| HTTP 401 | Firmware key differs from server/.env; reupload after changes |
| HTTP 403 | Device ID mismatch, or simulator ingestion disabled |
| HTTP 400 | Contract/units/ranges invalid; review JSON and API documentation |
| HTTP 409 | A boot/sequence identity was reused with changed data; retain identical retry JSON |
| INA219 not found | Check 3V3/GND/GPIO21/GPIO22, soldering, and module I2C address 0x40 |
| Tiny/negative readings | Inspect load/current path and lighting; retain numbers before diagnosing failure |
| Test binary download fails | Internet/proxy restrictions; see TEST_RESULTS and optional local binary setting |

Firmware uses a single pending sample and at most three transmissions; stale samples are dropped after 12 seconds. No flash-backed outage buffer is included on Day 1. HTTP has bounded connect/read timeouts and can briefly block the sampling loop. Actual cadence and gaps must be used for later energy calculation.

## 7. Verification on your laptop

```powershell
npm run check
npm test
```

Tests run against a disposable real MongoDB process, not `server/.env`'s database. First run may download a MongoDB test binary. To use an existing compatible binary instead:

```powershell
$env:MONGOMS_SYSTEM_BINARY = "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe"
npm test
```

For Linux/macOS: `MONGOMS_SYSTEM_BINARY=/path/to/mongod npm test`.

Physical acceptance: check actual Serial Monitor readings, confirm they appear unchanged in the API, change illumination in real sunlight, stop the device and wait 20 seconds for offline status, then reconnect Wi-Fi. Those checks require your hardware and are not substituted by simulator tests.

References: https://expressjs.com/en/guide/migrating-5/ ; https://mongoosejs.com/docs/migrating_to_9.html ; https://docs.espressif.com/projects/arduino-esp32/en/latest/api/wifi.html ; https://github.com/adafruit/Adafruit_INA219 .
