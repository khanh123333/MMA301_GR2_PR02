import assert from 'node:assert/strict';
import { test } from 'node:test';
import mongoose from 'mongoose';
import { audiusTrack, createUser, Playlist, PlayHistory, setupApi, stubAudius, Track } from './helpers.js';

const api = setupApi();

const stubTrack = (id = 'abc') => stubAudius(() => Response.json({ data: audiusTrack(id) }));
const localTrack = (user, fields = {}) =>
  Track.create({ artist: user._id, artistName: 'Nghệ sĩ', title: 'Bài local', duration: 10, audioFile: 'none.mp3', fileSize: 1, ...fields });

test('library routes require login', async () => {
  for (const route of ['/api/me/favorites', '/api/me/history', '/api/playlists']) {
    assert.equal((await api(route)).status, 401);
  }
});

test('favorites add idempotently, list and remove', async () => {
  const { token } = await createUser();
  stubTrack();
  assert.deepEqual(await (await api('/api/me/favorites/audius/abc', { token })).json(), { isFavorite: false });
  assert.equal((await api('/api/me/favorites/audius/abc', { method: 'PUT', token })).status, 204);
  assert.equal((await api('/api/me/favorites/AUDIUS/abc', { method: 'PUT', token })).status, 204);
  assert.deepEqual(await (await api('/api/me/favorites/audius/abc', { token })).json(), { isFavorite: true });

  const list = await (await api('/api/me/favorites', { token })).json();
  assert.equal(list.total, 1);
  assert.deepEqual(list.items[0], {
    source: 'AUDIUS', id: 'abc', title: 'Audius abc', artist: 'Audius artist', artwork: 'https://cdn/abc.jpg', duration: 100, isAvailable: true,
  });

  assert.equal((await api('/api/me/favorites/audius/abc', { method: 'DELETE', token })).status, 204);
  assert.deepEqual(await (await api('/api/me/favorites/audius/abc', { token })).json(), { isFavorite: false });
  assert.equal((await (await api('/api/me/favorites', { token })).json()).total, 0);
});

test('favorites refuse tracks that are missing, non-streamable or hidden', async () => {
  const { user, token } = await createUser();
  stubAudius(() => new Response('', { status: 404 }));
  assert.equal((await api('/api/me/favorites/audius/gone', { method: 'PUT', token })).status, 404);

  stubAudius(() => new Response('', { status: 400 }));
  assert.equal((await api('/api/me/favorites/audius/zzzzzzzz', { method: 'PUT', token })).status, 404);

  stubAudius(() => Response.json({ data: audiusTrack('x', { is_streamable: false }) }));
  assert.equal((await api('/api/me/favorites/audius/x', { method: 'PUT', token })).status, 404);

  const hidden = await localTrack(user, { isHidden: true });
  assert.equal((await api(`/api/me/favorites/local/${hidden.id}`, { method: 'PUT', token })).status, 404);
});

test('favorites of one user are invisible to another', async () => {
  const owner = await createUser();
  const other = await createUser();
  stubTrack();
  await api('/api/me/favorites/audius/abc', { method: 'PUT', token: owner.token });
  assert.equal((await (await api('/api/me/favorites', { token: other.token })).json()).total, 0);
});

test('local tracks become unavailable when hidden or deleted, and return when unhidden', async () => {
  const { user, token } = await createUser();
  const track = await localTrack(user);
  await api(`/api/me/favorites/local/${track.id}`, { method: 'PUT', token });
  const available = async () => (await (await api('/api/me/favorites', { token })).json()).items[0].isAvailable;

  assert.equal(await available(), true);
  await Track.updateOne({ _id: track._id }, { isHidden: true });
  assert.equal(await available(), false);
  await Track.updateOne({ _id: track._id }, { isHidden: false });
  assert.equal(await available(), true);
  await Track.deleteOne({ _id: track._id });
  assert.equal(await available(), false);
});

test('history updates playedAt instead of duplicating, keeps 100 rows and can be cleared', async () => {
  const { user, token } = await createUser();
  await PlayHistory.insertMany(
    Array.from({ length: 100 }, (_, i) => ({
      user: user._id,
      playedAt: new Date(2020, 0, i + 1),
      track: { source: 'AUDIUS', sourceId: `old${i}`, title: `Old ${i}` },
    })),
  );
  stubTrack();
  const record = () => api('/api/me/history', { method: 'POST', token, json: { source: 'AUDIUS', id: 'abc' } });
  assert.equal((await record()).status, 204);
  assert.equal((await record()).status, 204);

  const rows = await (await api('/api/me/history', { token })).json();
  assert.equal(rows.length, 100);
  assert.equal(rows[0].id, 'abc');
  assert.ok(rows[0].playedAt);
  // The oldest row is the one dropped
  assert.ok(!rows.some((row) => row.id === 'old0'));

  assert.equal((await api('/api/me/history', { method: 'DELETE', token })).status, 204);
  assert.deepEqual(await (await api('/api/me/history', { token })).json(), []);
});

test('history rejects a malformed track reference', async () => {
  const { token } = await createUser();
  const res = await api('/api/me/history', { method: 'POST', token, json: { source: 'AUDIUS', id: { $ne: 1 } } });
  assert.equal(res.status, 400);
});

test('playlist create, rename, add, reject duplicates, remove, delete', async () => {
  const { token } = await createUser();
  const created = await api('/api/playlists', { method: 'POST', token, json: { name: '  Chill  ' } });
  assert.equal(created.status, 201);
  const { id, name } = await created.json();
  assert.equal(name, 'Chill');

  const renamed = await api(`/api/playlists/${id}`, { method: 'PATCH', token, json: { name: 'Sleep' } });
  assert.equal((await renamed.json()).name, 'Sleep');

  stubTrack();
  const add = () => api(`/api/playlists/${id}/tracks`, { method: 'POST', token, json: { source: 'AUDIUS', id: 'abc' } });
  assert.equal((await add()).status, 204);
  assert.equal((await add()).status, 409);

  const detail = await (await api(`/api/playlists/${id}`, { token })).json();
  assert.equal(detail.trackCount, 1);
  assert.equal(detail.tracks[0].id, 'abc');
  assert.ok(detail.tracks[0].addedAt);

  assert.equal((await api(`/api/playlists/${id}/tracks/audius/abc`, { method: 'DELETE', token })).status, 204);
  assert.equal((await (await api(`/api/playlists/${id}`, { token })).json()).trackCount, 0);

  assert.equal((await api(`/api/playlists/${id}`, { method: 'DELETE', token })).status, 204);
  assert.equal((await api(`/api/playlists/${id}`, { token })).status, 404);
});

test('playlist name is validated', async () => {
  const { token } = await createUser();
  assert.equal((await api('/api/playlists', { method: 'POST', token, json: { name: '   ' } })).status, 400);
  assert.equal((await api('/api/playlists', { method: 'POST', token, json: { name: 'x'.repeat(101) } })).status, 400);
  assert.equal((await api('/api/playlists', { method: 'POST', token })).status, 400);
});

test('playlist holds at most 200 tracks', async () => {
  const { user, token } = await createUser();
  const playlist = await Playlist.create({
    user: user._id,
    name: 'Full',
    items: Array.from({ length: 200 }, (_, i) => ({ track: { source: 'AUDIUS', sourceId: `t${i}`, title: `T${i}` } })),
  });
  stubTrack();
  const res = await api(`/api/playlists/${playlist.id}/tracks`, { method: 'POST', token, json: { source: 'AUDIUS', id: 'abc' } });
  assert.equal(res.status, 409);
});

test("another user's playlist answers 404 on every route", async () => {
  const owner = await createUser();
  const { token } = await createUser();
  const playlist = await Playlist.create({ user: owner.user._id, name: 'Private' });
  const route = `/api/playlists/${playlist.id}`;

  assert.equal((await api(route, { token })).status, 404);
  assert.equal((await api(route, { method: 'PATCH', token, json: { name: 'Hacked' } })).status, 404);
  assert.equal((await api(route, { method: 'DELETE', token })).status, 404);
  assert.equal((await api(`${route}/tracks`, { method: 'POST', token, json: { source: 'AUDIUS', id: 'abc' } })).status, 404);
  assert.equal((await api(`${route}/tracks/audius/abc`, { method: 'DELETE', token })).status, 404);
  assert.equal((await Playlist.findById(playlist.id)).name, 'Private');
});

test('a playlist id that is not an ObjectId answers 404, not 500', async () => {
  const { token } = await createUser();
  assert.equal((await api('/api/playlists/nope', { token })).status, 404);
  assert.equal((await api(`/api/playlists/${new mongoose.Types.ObjectId()}`, { token })).status, 404);
});
