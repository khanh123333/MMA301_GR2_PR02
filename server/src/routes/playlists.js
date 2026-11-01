import { Router } from 'express';
import { isObjectId, parsePage, parseText } from '../lib/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { Playlist } from '../models/library.js';
import { parseTrackRef, presentSnapshots, resolveSnapshot } from '../services/tracks.js';

const router = Router();

const MAX_ITEMS = 200;

const summary = (playlist) => ({
  id: playlist.id,
  name: playlist.name,
  trackCount: playlist.items.length,
  updatedAt: playlist.updatedAt,
});

// Other users' playlists answer 404, so ids cannot be probed
async function findOwned(req) {
  const playlist = isObjectId(req.params.id) ? await Playlist.findOne({ _id: req.params.id, user: req.user._id }) : null;
  if (!playlist) throw new HttpError(404, 'Không tìm thấy playlist');
  return playlist;
}

router.use(requireAuth);

router.get('/', async (req, res) => {
  const { page, limit, skip } = parsePage(req.query);
  const filter = { user: req.user._id };
  const [playlists, total] = await Promise.all([
    Playlist.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit),
    Playlist.countDocuments(filter),
  ]);
  res.json({ items: playlists.map(summary), total, page, limit });
});

router.post('/', async (req, res) => {
  const playlist = await Playlist.create({
    user: req.user._id,
    name: parseText(req.body?.name, 'Tên playlist', { max: 100 }),
  });
  res.status(201).json(summary(playlist));
});

router.get('/:id', async (req, res) => {
  const playlist = await findOwned(req);
  const tracks = await presentSnapshots(req, playlist.items.map((item) => item.track));
  res.json({
    ...summary(playlist),
    tracks: tracks.map((track, i) => ({ ...track, addedAt: playlist.items[i].addedAt })),
  });
});

router.patch('/:id', async (req, res) => {
  const playlist = await findOwned(req);
  playlist.name = parseText(req.body?.name, 'Tên playlist', { max: 100 });
  await playlist.save();
  res.json(summary(playlist));
});

router.delete('/:id', async (req, res) => {
  await (await findOwned(req)).deleteOne();
  res.status(204).end();
});

router.post('/:id/tracks', async (req, res) => {
  const playlist = await findOwned(req);
  const ref = parseTrackRef(req.body?.source, req.body?.id);
  const track = await resolveSnapshot(ref);

  // Duplicate and size checks live in the update itself so concurrent adds cannot break them
  const { modifiedCount } = await Playlist.updateOne(
    {
      _id: playlist._id,
      items: { $not: { $elemMatch: { 'track.source': ref.source, 'track.sourceId': ref.id } } },
      [`items.${MAX_ITEMS - 1}`]: { $exists: false },
    },
    { $push: { items: { track } } },
  );
  if (!modifiedCount) throw new HttpError(409, `Bài hát đã có trong playlist hoặc playlist đã đủ ${MAX_ITEMS} bài`);
  res.status(204).end();
});

router.delete('/:id/tracks/:source/:trackId', async (req, res) => {
  const playlist = await findOwned(req);
  const { source, id } = parseTrackRef(req.params.source, req.params.trackId);
  await Playlist.updateOne(
    { _id: playlist._id },
    { $pull: { items: { 'track.source': source, 'track.sourceId': id } } },
  );
  res.status(204).end();
});

export default router;
