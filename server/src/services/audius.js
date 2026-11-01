import { HttpError } from '../middleware/error.js';

const AUDIUS_API = 'https://api.audius.co/v1';

async function request(path) {
  let res;
  try {
    res = await fetch(`${AUDIUS_API}${path}`, { signal: AbortSignal.timeout(10_000) });
  } catch (err) {
    console.error(err);
    throw new HttpError(502, 'Không kết nối được nguồn nhạc');
  }
  // Audius answers 400 for a well-formed id that decodes to no track
  if (res.status === 404 || res.status === 400) throw new HttpError(404, 'Không tìm thấy bài hát');
  if (!res.ok) {
    console.error(`Audius responded ${res.status} for ${path}`);
    throw new HttpError(502, 'Không kết nối được nguồn nhạc');
  }
  return (await res.json()).data;
}

const toTrack = (track) => ({
  source: 'AUDIUS',
  id: track.id,
  title: track.title,
  artist: track.user?.name ?? '',
  artwork: track.artwork?.['480x480'] ?? null,
  duration: track.duration,
});

// Audius returns 404 on /stream for non-streamable tracks
const toStreamableTracks = (tracks) => tracks.filter((track) => track.is_streamable).map(toTrack);

export const searchTracks = async (query) =>
  toStreamableTracks(await request(`/tracks/search?query=${encodeURIComponent(query)}&limit=20`));

export const trendingTracks = async () => toStreamableTracks(await request('/tracks/trending?limit=20'));

export async function getTrack(id) {
  const [track] = toStreamableTracks([await request(`/tracks/${id}`)]);
  if (!track) throw new HttpError(404, 'Không tìm thấy bài hát');
  return track;
}

export const streamUrl = (id) => `${AUDIUS_API}/tracks/${id}/stream`;
