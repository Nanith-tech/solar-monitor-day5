# Change ESP32 Wi-Fi from the dashboard

Upload the Day 5 sketch once with the correct DEVICE_ID/DEVICE_KEY. Future Wi-Fi name/password changes use the React form and do not require firmware uploads. The backend laptop must have a network path to the ESP32; a web page cannot send settings to a board it cannot reach.

## Board currently connected

1. Keep the normal API/dashboard running on the laptop. Open http://localhost:5173.
2. Find the **ESP32's** IPv4 in its 115200-baud Serial Monitor. This is different from the laptop's IPv4 used by the telemetry fallback.
3. In Connect ESP32 to Wi-Fi enter that IP, the exact target SSID and password. Leave password empty only for an open network. Use a network compatible with your ESP32 (the WROOM32 setup uses 2.4 GHz Wi-Fi).
4. Click Save Wi-Fi on ESP32. The form clears the password after acceptance. The firmware saves the SSID/password together in NVS, acknowledges, then starts the new connection after one second.
5. Move the laptop onto the same target network. Keep/restart the API as needed. Check Serial Monitor, doctor and fresh sensor readings. Accepted means settings were saved, not that the target password was correct.

## Board offline / old network unavailable / wrong password

1. Keep ESP32 powered. After 30 seconds disconnected it starts **Solar-Setup-…**. Its WPA password is the **first 12 characters of your private DEVICE_KEY**. The AP name is truncated to the Wi-Fi SSID limit.
2. Connect the backend laptop to that AP. Choose to remain connected even if Windows says no internet. The ESP32's setup address is **192.168.4.1**.
3. If the normal backend is already running, its Wi-Fi route remains usable when Atlas disconnects. If it cannot start without internet, stop it and React, run `npm run wifi:setup`, and open http://localhost:5173. This starts a loopback-only API and dashboard without connecting to MongoDB. Telemetry/analytics are unavailable in this mode; that is expected.
4. Submit the target Wi-Fi settings using ESP32 IP 192.168.4.1.
5. Join the target network on the laptop. Stop setup mode and start `npm run dev:all`. A successfully connected board shuts down its setup AP after 60 seconds. If the new credentials fail, the recovery AP remains available so you can correct them.

Settings persist across resets and ordinary firmware uploads. Saved NVS settings take priority over WIFI_SSID/WIFI_PASSWORD in config.h. Use the form to change them again. To deliberately return to compile-time defaults, use the Arduino board's erase-all-flash upload option and then upload again; this erases board NVS and is optional, not a routine update step. Device key still comes from config.h, not the web form.

## Boundaries and privacy

The dashboard is intended for the backend laptop on a trusted LAN. Wi-Fi changes require a loopback backend connection and the configured browser Origin (or Referer when the local proxy strips Origin) and X-Solar-Setup intent header. Keep Vite's default local binding; do not expose setup mode externally. No browser Device Key is required: backend verifies /solar-info device ID and Wi-Fi setup version, then sends the key to the board's authenticated /wifi endpoint. Wrong devices/key mismatch/timeouts are explicit errors. Redirects, URLs, public/loopback/link-local targets are rejected; the destination is a private IPv4 address, port 80 and fixed paths. Changes are serialized and limited to one attempt per five seconds.

Credentials are not logged, returned by status endpoints or stored in MongoDB/localStorage. The board uses a single NVS value for the pair. NVS is not encrypted by this sketch. This local demo uses HTTP between laptop and ESP32; use only a trusted network. The recovery AP is password protected. It is not a remote internet provisioning service, Wi-Fi scanner, captive portal or OTA uploader.

Both password-protected (8–63 printable ASCII characters) and open Wi-Fi are supported. SSID is 1–32 UTF-8 bytes without control characters. Enterprise Wi-Fi and 64-character hexadecimal PSKs are outside this implementation. Timeout after submission can mean the board saved the settings before the reply was lost: check Serial Monitor/recovery AP before retrying.

Host-stub firmware tests and actual browser/backend fixture tests pass; ESP32 SDK compilation, real flash persistence and actual radio switching require [local acceptance](ACCEPTANCE.md).
