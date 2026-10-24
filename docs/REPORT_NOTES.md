# Semester report notes

## Abstract

A small solar-monitoring system measures load-side voltage and signed current with an INA219 connected to an ESP32. The ESP32 sends authenticated telemetry over Wi-Fi to an Express API, which stores readings in MongoDB. A React dashboard shows live measurements, connection status, charts, historical generation estimates and CSV export. Local discovery adapts the backend endpoint to laptop-IP changes on supporting networks. The dashboard can provision Wi-Fi credentials on the ESP32, with a recovery hotspot for unavailable networks.

## Implementation

MERN: MongoDB/Mongoose storage, Express/Node API, React/Vite browser interface. Socket.IO broadcasts newly persisted samples and REST provides reconnect recovery. Firmware uses Arduino ESP32, Adafruit INA219, ESPmDNS, WebServer and Preferences. A boot ID/sequence/device identity deduplicates identical retries. Device keys stay out of browser code. Wi-Fi settings are sent by the local backend to the authenticated board and stored together in NVS.

Hardware: ESP32 WROOM32, INA219 R100 shunt, nominal 6 V / 100 mA panel and 100 Ω / 1 W load. State actual lighting/measurement conditions; panel ratings are not measured results. Voltage is VIN− to ground; load power in mW = voltageV × currentMA. Negative readings are retained for diagnosis.

Energy integrates eligible within-boot uptime intervals. Positive generation and signed net are separate; long gaps/restarts are excluded and coverage reported. IST calendar grouping is used. Energy represents observed load output, not panel maximum capability, battery charge or a complete day's output when coverage is low. See ENERGY_METHOD.md for zero crossings, receipt-time placement and bounds.

## Results to cite accurately

Software verification passed 31 backend tests and 9 frontend tests, production build/syntax, host-stub execution of the actual sketch, and browser checks over actual HTTP/WebSocket proxies with fixture storage. One multicast test is skipped in the default suite; explicit multicast execution was blocked here. Twelve MongoDB integration cases could not run because disposable mongod failed with exit 100. ESP32 SDK compile/upload and physical acceptance remain local. Attach your own real sensor screenshots, exported CSV and acceptance results; do not describe fixtures as measured output.

## Limitations / future work

Trusted local single-device demonstration. No external hosting/TLS or multi-user account platform. Read APIs are unauthenticated. Wi-Fi administration is laptop-local; provisioned credentials are not encrypted in board NVS. mDNS depends on hotspot multicast/client communication; fallback may need manual IP updates. Wi-Fi SSID/password administration is supported, not enterprise Wi-Fi, OTA or network scanning. Add measured calibration, secure provisioning/TLS/encrypted flash, authenticated user access, durable offline buffering with explicit sample timestamps, multi-device support and external deployment as separately designed future work. Irradiance/temperature, forecasting and MPP control require additional scope/hardware.
