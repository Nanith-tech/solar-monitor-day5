import mongoose from 'mongoose';
import { Device } from '../models/Device.js';
import { Reading } from '../models/Reading.js';

mongoose.set('bufferCommands', false);
// Manage indexes explicitly after connecting; avoid automatic model init racing
// a disconnect/reconnect during startup or tests.
mongoose.set('autoCreate', false);
mongoose.set('autoIndex', false);

export async function connectDatabase(config) {
  await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    socketTimeoutMS: 10000,
    maxPoolSize: 10
  });
  // Await unique index creation BEFORE accepting traffic: retries must be safe.
  await Promise.all([Device.createIndexes(), Reading.createIndexes()]);
  await Device.findOneAndUpdate(
    { deviceId: config.deviceId },
    { $set: { name: config.deviceName } },
    { upsert: true, runValidators: true }
  );
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}

export function databaseReady() {
  return mongoose.connection.readyState === 1;
}
