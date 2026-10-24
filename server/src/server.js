import { loadEnv, readConfig } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { createApp } from './app.js';
import { createServer } from 'node:http';
import { startDiscovery } from './discovery/advertise.js';
import { createRealtimeServer } from './realtime/socket.js';

let server;
let io;
let discovery;
let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  const deadline = setTimeout(() => process.exit(1), 10000);
  deadline.unref();
  await discovery?.close();
  if (io) await new Promise(resolve => io.close(resolve));
  else if (server) await new Promise(resolve => server.close(resolve));
  await disconnectDatabase();
  clearTimeout(deadline);
}

try {
  loadEnv();
  const config = readConfig();
  await connectDatabase(config);
  const app = createApp(config);
  server = createServer(app);
  io = createRealtimeServer(server, config);
  app.set('io', io);
  server.listen(config.port, config.host, () => {
    console.log(`Solar API listening on ${config.host}:${config.port}; device ${config.deviceId}.`);
    discovery = startDiscovery(config);
    console.log(`Local health: http://127.0.0.1:${config.port}/api/v1/health`);
  });
  server.on('error', async error => {
    console.error(`HTTP startup failed (${error.code || 'unknown'}). Check PORT and HOST.`);
    if (error.code === 'EADDRINUSE') console.error(`Port ${config.port} is occupied. Stop the previous backend (Ctrl+C). Windows: netstat -ano | findstr :${config.port}. Run npm run doctor for connection checks.`);
    await shutdown(); process.exitCode = 1;
  });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => shutdown().catch(() => { process.exitCode = 1; }));
  }
} catch (error) {
  // Config errors are safe to show; driver errors may contain connection secrets.
  console.error(error.name.startsWith('Mongo') || error.name === 'MongooseError'
    ? 'MongoDB startup failed. Check that MongoDB is running and MONGODB_URI is correct.'
    : error.message);
  await disconnectDatabase();
  process.exitCode = 1;
}
