import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true },
  name: { type: String, required: true, maxlength: 100 }
}, { timestamps: true, versionKey: false });

// Device keys live only in server environment; never serialize them to clients.
export const Device = mongoose.model('Device', schema);
