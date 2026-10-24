import { createApp } from '../server/src/app.js';
import { loadEnv, readConfig } from '../server/src/config/env.js';
loadEnv();
try {
  const config=readConfig();
  const server=createApp(config).listen(config.port,'127.0.0.1',()=>console.log(`Solar API listening on 127.0.0.1:${config.port} (Wi-Fi setup only; telemetry/database disabled).`));
  server.on('error',error=>{console.error(`Wi-Fi setup startup failed (${error.code}). Stop the regular backend first.`);process.exitCode=1;});
  const close=()=>server.close(()=>process.exit()); process.on('SIGINT',close);process.on('SIGTERM',close);
} catch { console.error('Invalid configuration. Run npm run setup and check server/.env.');process.exitCode=1; }
