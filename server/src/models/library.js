import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const trackSnapshotSchema = new mongoose.Schema(
  {
    source: { type: String, enum: ['AUDIUS', 'LOCAL'], required: true },
    sourceId: { type: String, required: true },
    title: { type: String, required: true },
    artist: { type: String, default: '' },
    artwork: { type: String, default: null },
    duration: { type: Number, default: 0 },
  },
  { _id: false },
);

const uniquePerUser = { user: 1, 'track.source': 1, 'track.sourceId': 1 };

const favoriteSchema = new mongoose.Schema(
  {
    user: { type: ObjectId, ref: 'User', required: true },
    track: { type: trackSnapshotSchema, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
favoriteSchema.index(uniquePerUser, { unique: true });
favoriteSchema.index({ user: 1, createdAt: -1 });

const playlistSchema = new mongoose.Schema(
  {
    user: { type: ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    items: [
      new mongoose.Schema(
        {
          track: { type: trackSnapshotSchema, required: true },
          addedAt: { type: Date, default: Date.now },
        },
        { _id: false },
      ),
    ],
  },
  { timestamps: true },
);

const playHistorySchema = new mongoose.Schema({
  user: { type: ObjectId, ref: 'User', required: true },
  track: { type: trackSnapshotSchema, required: true },
  playedAt: { type: Date, required: true },
});
playHistorySchema.index(uniquePerUser, { unique: true });
playHistorySchema.index({ user: 1, playedAt: -1 });

export const Favorite = mongoose.model('Favorite', favoriteSchema);
export const Playlist = mongoose.model('Playlist', playlistSchema);
export const PlayHistory = mongoose.model('PlayHistory', playHistorySchema);
