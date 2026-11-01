import mongoose from 'mongoose';

const trackSchema = new mongoose.Schema(
  {
    artist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    artistName: { type: String, required: true },
    title: { type: String, required: true },
    genre: { type: String, default: '' },
    duration: { type: Number, required: true },
    audioFile: { type: String, required: true },
    coverFile: { type: String, default: null },
    fileSize: { type: Number, required: true },
    isHidden: { type: Boolean, default: false },
  },
  { timestamps: true },
);

trackSchema.index({ isHidden: 1, createdAt: -1 });

export const Track = mongoose.model('Track', trackSchema);
