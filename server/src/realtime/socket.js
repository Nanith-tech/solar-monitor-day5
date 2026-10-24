import { Server } from 'socket.io';
import { databaseReady } from '../config/db.js';

export const streamRoom = (deviceId, source) => `device:${deviceId}:source:${source}`;

export function publishTelemetry(io, result) {
  if (io && !result.duplicate) io.to(streamRoom(result.reading.deviceId, result.reading.source)).emit('telemetry:new', { reading: result.reading, serverTime: new Date().toISOString() });
}

export function createRealtimeServer(httpServer, config) {
  const io = new Server(httpServer, { cors: { origin: config.corsOrigin, methods: ['GET', 'POST'] }, maxHttpBufferSize: 4096 });
  io.use((socket, next) => {
    const { deviceId, source } = socket.handshake.auth || {};
    if (deviceId !== config.deviceId || !['sensor', 'simulator'].includes(source)) return next(new Error('Unknown device or reading source.'));
    socket.data.deviceId = deviceId; socket.data.source = source; next();
  });
  io.on('connection', async socket => {
    await socket.join(streamRoom(socket.data.deviceId, socket.data.source));
    // Snapshot recovery starts AFTER room subscription, closing the join/query gap.
    socket.emit('stream:ready', { deviceId: socket.data.deviceId, source: socket.data.source, serverTime: new Date().toISOString() });
  });
  const heartbeat = setInterval(() => io.emit('server:status', { database: databaseReady() ? 'connected' : 'disconnected', serverTime: new Date().toISOString() }), 5000);
  heartbeat.unref();
  httpServer.once('close', () => clearInterval(heartbeat));
  return io;
}
