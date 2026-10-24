#pragma once

// Copy this file to config.h next to the .ino and edit the values.
// Keep config.h private. DEVICE_KEY must exactly match server/.env.
constexpr char WIFI_SSID[] = "YOUR_WIFI_NAME";
constexpr char WIFI_PASSWORD[] = "YOUR_WIFI_PASSWORD";
constexpr char DEVICE_ID[] = "solar-node-001";
constexpr char DEVICE_KEY[] = "replace-with-at-least-32-random-characters";
// Optional manual fallback when the hotspot blocks mDNS. Use your LAPTOP's Wi-Fi IPv4 address from ipconfig. Not the ESP32 IP.
constexpr char TELEMETRY_URL[] = "http://192.168.1.10:4000/api/v1/telemetry";

constexpr unsigned long SAMPLE_INTERVAL_MS = 5000;
constexpr unsigned long RETRY_INTERVAL_MS = 2000;
constexpr unsigned long WIFI_RETRY_MS = 10000;
constexpr unsigned long MAX_SAMPLE_AGE_MS = 12000;
constexpr unsigned int HTTP_TIMEOUT_MS = 2000;
constexpr unsigned int MAX_SEND_ATTEMPTS = 3;

// Day 5: discovers the backend by service/device ID, not a fixed laptop IP.
#define SOLAR_DISCOVERY_ENABLED true
#define SOLAR_DISCOVERY_INTERVAL_MS 10000UL
// Set false if you prefer waiting for discovery instead of using TELEMETRY_URL.
#define SOLAR_MANUAL_FALLBACK true
