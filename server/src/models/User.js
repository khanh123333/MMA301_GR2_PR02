import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    tokenVersion: { type: Number, default: 0 },
    role: { type: String, enum: ['LISTENER', 'ARTIST', 'ADMIN'], default: 'LISTENER' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const User = mongoose.model('User', userSchema);
