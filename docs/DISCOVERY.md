# Automatic laptop IP discovery

Day 5 advertises `_solar-monitor._tcp.local` over mDNS (UDP 5353). TXT includes configured deviceId, apiVersion=1 and path=/api/v1/telemetry. No Device Key, Atlas URI or Wi-Fi credentials are advertised. Express still uses TCP 4000 by default.

The backend advertises separate IPv4 services for LAN adapters and checks for address changes every ten seconds. Firmware queries matching device ID/protocol/path and requires an IPv4 address in its current subnet. It constructs the telemetry URL using the advertised address/port. Multiple distinct matching backends cause no endpoint selection: stop old copies. Service identity is discovery metadata, not authentication; telemetry still requires X-Device-Key.

On Wi-Fi reconnect or repeated connection/404 failures, the ESP32 rediscovers the backend. A functioning discovered endpoint is retained. Manual fallback is queried periodically for replacement by discovery. Two transport failures, query delays and retries can produce a short visible measurement gap; stale pending readings are discarded.

Server defaults: DISCOVERY_ENABLED=true, DISCOVERY_HOST=solar-laptop, HOST=0.0.0.0. Older .env/config.h files use enabled defaults. Firmware macros SOLAR_DISCOVERY_ENABLED, SOLAR_DISCOVERY_INTERVAL_MS and SOLAR_MANUAL_FALLBACK can be changed in config.h. TELEMETRY_URL remains the manual fallback and uses the laptop's current Wi-Fi IP, never localhost or the ESP32 IP.

Upload the Day 5 sketch once. Keep both devices on the same phone hotspot and allow their mutual communication. Windows must permit Node TCP 4000 and multicast UDP 5353 on the trusted network. VPNs and phone hotspot client isolation/multicast filtering can block discovery. It cannot be guaranteed for every phone. If discovery is blocked, update the manual fallback URL and upload or use a network/router supporting discovery and client communication. Changing Wi-Fi from the app changes SSID/password, not the fallback URL. An IP change does not require another upload when discovery works.

The default test mocks advertisement lifecycle. `npm run test:discovery:network` attempts bounded real UDP discovery on your laptop; it could not pass in this execution environment. Test the actual phone/ESP32 flow in [ACCEPTANCE](ACCEPTANCE.md).
