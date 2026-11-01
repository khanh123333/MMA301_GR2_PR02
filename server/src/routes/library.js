import { Router } from 'express';
import { parsePage } from '../lib/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { Favorite, PlayHistory } from '../models/library.js';
import { parseTrackRef, presentSnapshots, resolveSnapshot } from '../services/tracks.js';

const router = Router();

const MAX_HISTORY = 100;

const trackFilter = (user, { source, id }) => ({ user: user._id, 'track.source': source, 'track.sourceId': id });

router.use(requireAuth);

router.get('/favorites', async (req, res) => {
  const { page, limit, skip } = parsePage(req.query);
  const filter = { user: req.user._id };
  const [rows, total] = await Promise.all([
    Favorite.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Favorite.countDocuments(filter),
  ]);
  res.json({ items: await presentSnapshots(req, rows.map((row) => row.track)), total, page, limit });
});

router.get('/favorites/:source/:id', async (req, res) => {
  const ref = parseTrackRef(req.params.source, req.params.id);
  const exists = await Favorite.exists(trackFilter(req.user, ref));
  res.json({ isFavorite: Boolean(exists) });
});

router.put('/favorites/:source/:id', async (req, res) => {
  const ref = parseTrackRef(req.params.source, req.params.id);
  const track = await resolveSnapshot(ref);
  await Favorite.updateOne(trackFilter(req.user, ref), { $setOnInsert: { track } }, { upsert: true });
  res.status(204).end();
});

router.delete('/favorites/:source/:id', async (req, res) => {
  await Favorite.deleteOne(trackFilter(req.user, parseTrackRef(req.params.source, req.params.id)));
  res.status(204).end();
});

router.get('/history', async (req, res) => {
  const rows = await PlayHistory.find({ user: req.user._id }).sort({ playedAt: -1 }).limit(MAX_HISTORY);
  const tracks = await presentSnapshots(req, rows.map((row) => row.track));
  res.json(tracks.map((track, i) => ({ ...track, playedAt: rows[i].playedAt })));
});

router.post('/history', async (req, res) => {
  const ref = parseTrackRef(req.body?.source, req.body?.id);
  const track = await resolveSnapshot(ref);
  await PlayHistory.updateOne(
    trackFilter(req.user, ref),
    { $set: { playedAt: new Date() }, $setOnInsert: { track } },
    { upsert: true },
  );

  const expired = await PlayHistory.find({ user: req.user._id })
    .sort({ playedAt: -1 })
    .skip(MAX_HISTORY)
    .select('_id');
  if (expired.length) await PlayHistory.deleteMany({ _id: { $in: expired.map((row) => row._id) } });

  res.status(204).end();
});

router.delete('/history', async (req, res) => {
  await PlayHistory.deleteMany({ user: req.user._id });
  res.status(204).end();
});

export default router;
