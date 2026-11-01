import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createUser, setupApi, stubAudius, Track } from './helpers.js';

const api = setupApi();

const newTrack = (user, fields = {}) =>
  Track.create({ artist: user._id, artistName: 'A', title: 'zzhidden', duration: 1, audioFile: 'none.mp3', fileSize: 1, ...fields });

test('admin routes are closed to everyone else', async () => {
  const { token } = await createUser({ role: 'ARTIST' });
  for (const route of ['/api/admin/users', '/api/admin/tracks', '/api/admin/stats']) {
    assert.equal((await api(route)).status, 401);
    assert.equal((await api(route, { token })).status, 403);
  }
});

test('user list paginates and never exposes credentials', async () => {
  const admin = await createUser({ role: 'ADMIN' });
  await createUser();
  const list = await (await api('/api/admin/users?limit=1', { token: admin.token })).json();
  assert.equal(list.items.length, 1);
  assert.ok(list.total >= 2);
  assert.ok(!('passwordHash' in list.items[0]));
  assert.ok(!('tokenVersion' in list.items[0]));
});

test('locking a user cuts their session, unlocking restores it, admins cannot be locked', async () => {
  const admin = await createUser({ role: 'ADMIN' });
  const target = await createUser();
  const route = `/api/admin/users/${target.user.id}`;

  const lock = await api(route, { method: 'PATCH', token: admin.token, json: { isActive: false } });
  assert.equal((await lock.json()).isActive, false);
  assert.equal((await api('/api/me', { token: target.token })).status, 401);

  await api(route, { method: 'PATCH', token: admin.token, json: { isActive: true } });
  assert.equal((await api('/api/me', { token: target.token })).status, 200);

  const otherAdmin = await createUser({ role: 'ADMIN' });
  const refused = await api(`/api/admin/users/${otherAdmin.user.id}`, { method: 'PATCH', token: admin.token, json: { isActive: false } });
  assert.equal(refused.status, 403);

  assert.equal((await api(route, { method: 'PATCH', token: admin.token, json: { isActive: 'no' } })).status, 400);
  assert.equal((await api('/api/admin/users/nope', { method: 'PATCH', token: admin.token, json: { isActive: true } })).status, 404);
});

test('hiding a track removes it from search, latest and stream', async () => {
  const admin = await createUser({ role: 'ADMIN' });
  const { user } = await createUser({ role: 'ARTIST' });
  const track = await newTrack(user);
  stubAudius(() => Response.json({ data: [] }));
  const search = async () => (await (await api('/api/tracks/search?q=zzhidden')).json()).map((row) => row.id);
  const latest = async () => (await (await api('/api/tracks/latest')).json()).map((row) => row.id);

  assert.deepEqual(await search(), [track.id]);
  assert.ok((await latest()).includes(track.id));

  const res = await api(`/api/admin/tracks/${track.id}`, { method: 'PATCH', token: admin.token, json: { isHidden: true } });
  assert.equal((await res.json()).isHidden, true);
  assert.deepEqual(await search(), []);
  assert.ok(!(await latest()).includes(track.id));
  assert.equal((await api(`/api/tracks/local/${track.id}/stream`)).status, 404);

  const list = await (await api('/api/admin/tracks', { token: admin.token })).json();
  assert.ok(list.items.some((row) => row.id === track.id && row.isHidden));
});

test('stats count users by role and tracks', async () => {
  const admin = await createUser({ role: 'ADMIN' });
  const { user } = await createUser({ role: 'ARTIST' });
  await newTrack(user, { isHidden: true });
  const stats = await (await api('/api/admin/stats', { token: admin.token })).json();
  assert.ok(stats.users.ADMIN >= 1);
  assert.ok(stats.users.ARTIST >= 1);
  assert.equal(typeof stats.users.LISTENER, 'number');
  assert.ok(stats.hiddenTracks >= 1);
  assert.ok(stats.tracks >= stats.hiddenTracks);
});
