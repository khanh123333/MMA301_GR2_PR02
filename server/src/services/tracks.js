import { isObjectId } from '../lib/validate.js';
import { HttpError } from '../middleware/error.js';
import { Track } from '../models/Track.js';
import { getTrack } from './audius.js';

export function parseTrackRef(source, id) {
  const upper = typeof source === 'string' ? source.toUpperCase() : '';
  const valid =
    typeof id === 'string' && ((upper === 'AUDIUS' && /^[A-Za-z0-9]+$/.test(id)) || (upper === 'LOCAL' && isObjectId(id)));
  if (!valid) throw new HttpError(400, 'Mã bài hát không hợp lệ');
  return { source: upper, id };
}

export const coverUrl = (req, coverFile) =>
  coverFile ? `${req.protocol}://${req.get('host')}/uploads/covers/${coverFile}` : null;

export const localTrackDto = (req, track) => ({
  source: 'LOCAL',
  id: track.id,
  title: track.title,
  artist: track.artistName,
  genre: track.genre,
  artwork: coverUrl(req, track.coverFile),
  duration: track.duration,
});

// Track details come from the server's own lookup, never from the client.
export async function resolveSnapshot({ source, id }) {
  if (source === 'AUDIUS') {
    const { id: sourceId, ...details } = await getTrack(id);
    return { ...details, sourceId };
  }

  const track = await Track.findOne({ _id: id, isHidden: false });
  if (!track) throw new HttpError(404, 'Không tìm thấy bài hát');
  // artwork stays empty so the database never stores a server address
  return { source, sourceId: id, title: track.title, artist: track.artistName, artwork: null, duration: track.duration };
}

export async function presentSnapshots(req, snapshots) {
  const localIds = snapshots.filter((track) => track.source === 'LOCAL').map((track) => track.sourceId);
  const locals = new Map(
    localIds.length ? (await Track.find({ _id: { $in: localIds } })).map((track) => [track.id, track]) : [],
  );

  return snapshots.map(({ source, sourceId, title, artist, artwork, duration }) => {
    if (source === 'AUDIUS') return { source, id: sourceId, title, artist, artwork, duration, isAvailable: true };

    const track = locals.get(sourceId);
    if (track) return { ...localTrackDto(req, track), isAvailable: !track.isHidden };
    return { source, id: sourceId, title, artist, artwork: null, duration, isAvailable: false };
  });
}
