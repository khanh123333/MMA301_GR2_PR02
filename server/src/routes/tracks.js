import { Router } from 'express';
import { HttpError } from '../middleware/error.js';
import { Track } from '../models/Track.js';
import { searchTracks, streamUrl, trendingTracks } from '../services/audius.js';
import { audioDir } from '../services/storage.js';
import { localTrackDto, parseTrackRef } from '../services/tracks.js';

const router = Router();

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (typeof q !== 'string' || !q.trim() || q.length > 100) {
    throw new HttpError(400, 'Từ khóa tìm kiếm không hợp lệ');
  }

  const pattern = new RegExp(escapeRegex(q.trim()), 'i');
  const [locals, audius] = await Promise.all([
    Track.find({
      isHidden: false,
      $or: [{ title: pattern }, { artistName: pattern }, { genre: pattern }],
    })
      .sort({ createdAt: -1 })
      .limit(20),
    // Local tracks must stay searchable when Audius is down
    searchTracks(q.trim()).catch((err) => {
      console.error(err);
      return [];
    }),
  ]);

  res.json([...locals.map((track) => localTrackDto(req, track)), ...audius]);
});

router.get('/trending', async (req, res) => res.json(await trendingTracks()));

router.get('/latest', async (req, res) => {
  const tracks = await Track.find({ isHidden: false }).sort({ createdAt: -1 }).limit(20);
  res.json(tracks.map((track) => localTrackDto(req, track)));
});

router.get('/:source/:id/stream', async (req, res) => {
  const { source, id } = parseTrackRef(req.params.source, req.params.id);

  // shortcut: Audius tracks stream straight from Audius (which handles Range/seek), proxy here if traffic must pass through this server
  if (source === 'AUDIUS') return res.redirect(streamUrl(id));

  const track = await Track.findOne({ _id: id, isHidden: false });
  if (!track) throw new HttpError(404, 'Không tìm thấy bài hát');
  // sendFile handles Range, so local tracks can be seeked too
  res.sendFile(track.audioFile, { root: audioDir });
});

export default router;
