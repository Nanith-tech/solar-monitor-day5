# Local acceptance checklist

Software verified here: installation, syntax/build, 31 backend unit/service/HTTP tests, 9 frontend tests, actual sketch under host stubs and production browser/Socket.IO/proxy tests using isolated fixtures. These are not physical acceptance results.

Complete these on your Windows laptop / ESP32:

- [ ] Arduino Verify compiles Day 5 for the installed ESP32 board package; Upload succeeds.
- [ ] Atlas connects with your copied private configuration; npm run doctor confirms the new backend.
- [ ] Sensor HTTP 201/200 arrives; cards/CSV agree with Serial Monitor units and source.
- [ ] Browser reconnect recovers and device power loss causes offline/stale status without fake energy.
- [ ] Restart phone hotspot and confirm discovery reaches the laptop even if IPv4 changes. Verify multicast/client isolation or document manual fallback.
- [ ] Web Wi-Fi form accepts the correct ESP32 IP/key, saves settings and joins the target 2.4 GHz network.
- [ ] Restart ESP32 and confirm it uses the saved network without another upload.
- [ ] Submit an incorrect password, wait 30 seconds, join Solar-Setup and recover using localhost dashboard/setup-only mode.
- [ ] After a successful join, setup AP disappears after 60 seconds and sensor readings resume.
- [ ] Disposable MongoDB integration suite passes locally (npm test); do not point it at production.
- [ ] Real UDP discovery check passes on your network (npm run test:discovery:network).
- [ ] Complete DEMO.md with real observations and label any simulator segments.

Actual ESP32 radio behavior, flash persistence, Windows firewall, phone hotspot and Atlas access could not be physically exercised here. Record your observed outcomes rather than pre-marking boxes.
