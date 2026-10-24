import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  deviceId: { type: String, required: true, immutable: true },
  bootId: { type: String, required: true, immutable: true },
  sequence: { type: Number, required: true, immutable: true },
  voltageV: { type: Number, required: true, immutable: true },
  currentMA: { type: Number, required: true, immutable: true },
  powerMW: { type: Number, required: true, immutable: true },
  uptimeMs: { type: Number, required: true, immutable: true },
  rssiDbm: { type: Number, required: true, immutable: true },
  source: { type: String, enum: ['sensor', 'simulator'], required: true, immutable: true },
  receivedAt: { type: Date, required: true, default: Date.now, immutable: true }
}, { versionKey: false });

schema.index({ deviceId: 1, bootId: 1, sequence: 1 }, { unique: true, name: 'sample_identity' });
schema.index({ deviceId: 1, source: 1, receivedAt: -1, _id: -1 }, { name: 'latest_by_source' });

export const Reading = mongoose.model('Reading', schema);
