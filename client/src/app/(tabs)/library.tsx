import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { LoadState } from '@/components/load-state';
import { ScreenHeader } from '@/components/screen-header';
import { SongRow } from '@/components/song-row';
import { TrackMenu } from '@/components/track-menu';
import { gradient, MusicColors, MusicFonts } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useFetch } from '@/hooks/use-fetch';
import { usePlayer, useTabBarSpace } from '@/hooks/use-player';
import { api, type Page, type PlaylistSummary, type Track } from '@/lib/api';

const TABS = ['Yêu thích', 'Lịch sử', 'Playlist'] as const;
// shortcut: first 100 only, add paging once a list can realistically outgrow it
const FAVORITES = '/api/me/favorites?limit=100';
const PLAYLISTS = '/api/playlists?limit=100';
const HISTORY = '/api/me/history';

export default function LibraryScreen() {
  const { user, ready } = useAuth();
  const { open, notify } = usePlayer();
  const paddingBottom = useTabBarSpace();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Yêu thích');
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);

  const favorites = useFetch<Page<Track>>(user && tab === 'Yêu thích' ? FAVORITES : null);
  const playlists = useFetch<Page<PlaylistSummary>>(user && tab === 'Playlist' ? PLAYLISTS : null);
  const history = useFetch<(Track & { playedAt: string })[]>(user && tab === 'Lịch sử' ? HISTORY : null);
  const reloadFavorites = favorites.reload;
  const reloadPlaylists = playlists.reload;
  const reloadHistory = history.reload;

  // A song may have been liked or added to a playlist on another screen
  useFocusEffect(
    useCallback(() => {
      reloadFavorites();
      reloadPlaylists();
      reloadHistory();
    }, [reloadFavorites, reloadPlaylists, reloadHistory]),
  );

  const songs = favorites.data?.items ?? [];
  const historySongs = history.data ?? [];

  const clearHistory = async () => {
    try {
      await api('/api/me/history', { method: 'DELETE' });
      notify('Đã xoá toàn bộ lịch sử nghe');
      reloadHistory();
    } catch (err) {
      notify((err as Error).message);
    }
  };

  return (
    <ScrollView
      style={[
        styles.screen,
        gradient('linear-gradient(211.1deg, rgb(227, 78, 31) 4.81%, rgb(107, 56, 48) 92.97%)'),
      ]}
      contentContainerStyle={{ paddingBottom }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      <ScreenHeader title="Thư viện" />

      <View style={styles.tabs}>
        {TABS.map((name) => (
          <Pressable
            key={name}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === name }}
            onPress={() => setTab(name)}
            style={[styles.tab, tab === name ? styles.tabSelected : styles.tabIdle]}>
            <Text style={styles.tabLabel}>{name}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.heading}>{tab}</Text>

      {!ready ? null : !user ? (
        <View style={styles.guest}>
          <Text style={styles.empty}>Đăng nhập để xem thư viện của bạn</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/account')} style={styles.button}>
            <Text style={styles.buttonLabel}>Đăng nhập</Text>
          </Pressable>
        </View>
      ) : tab === 'Yêu thích' ? (
        <>
          <LoadState loading={favorites.loading && !favorites.data} error={favorites.error} onRetry={favorites.reload} />
          {favorites.data && songs.length === 0 && <Text style={styles.empty}>Chưa có bài hát yêu thích</Text>}
          {songs.map((song) => (
            <SongRow
              key={`${song.source}/${song.id}`}
              track={song}
              onPress={() => open(song, songs)}
              onMore={() => setMenuTrack(song)}
            />
          ))}
        </>
      ) : tab === 'Lịch sử' ? (
        <>
          <LoadState loading={history.loading && !history.data} error={history.error} onRetry={history.reload} />
          {history.data && historySongs.length === 0 && (
            <Text style={styles.empty}>Chưa có bài hát trong lịch sử nghe</Text>
          )}
          {historySongs.length > 0 && (
            <View style={styles.historyActionRow}>
              <Text style={styles.historyCount}>{historySongs.length} bài hát đã nghe</Text>
              <Pressable
                accessibilityRole="button"
                onPress={clearHistory}
                style={styles.clearHistoryBtn}>
                <Text style={styles.clearHistoryBtnText}>Xoá lịch sử</Text>
              </Pressable>
            </View>
          )}
          {historySongs.map((song) => (
            <SongRow
              key={`history-${song.source}/${song.id}`}
              track={song}
              onPress={() => open(song, historySongs)}
              onMore={() => setMenuTrack(song)}
            />
          ))}
        </>
      ) : (
        <Playlists
          items={playlists.data?.items}
          loading={playlists.loading && !playlists.data}
          error={playlists.error}
          onChanged={playlists.reload}
        />
      )}

      <TrackMenu
        track={menuTrack}
        isFavorite={tab === 'Yêu thích'}
        onClose={() => setMenuTrack(null)}
        onChanged={() => {
          reloadFavorites();
          reloadHistory();
        }}
      />
    </ScrollView>
  );
}

type PlaylistsProps = {
  items?: PlaylistSummary[];
  loading: boolean;
  error: string | null;
  onChanged: () => void;
};

function Playlists({ items, loading, error, onChanged }: PlaylistsProps) {
  const { notify } = usePlayer();
  const [name, setName] = useState('');

  const create = async () => {
    try {
      await api('/api/playlists', { method: 'POST', body: { name } });
      setName('');
      onChanged();
    } catch (err) {
      notify((err as Error).message);
    }
  };

  return (
    <>
      <View style={styles.create}>
        <TextInput
          accessibilityLabel="Tên playlist mới"
          value={name}
          onChangeText={setName}
          onSubmitEditing={create}
          placeholder="Tên playlist mới"
          placeholderTextColor="rgba(255, 255, 208, 0.6)"
          returnKeyType="done"
          style={styles.input}
        />
        <Pressable accessibilityRole="button" onPress={create} style={styles.button}>
          <Text style={styles.buttonLabel}>Tạo</Text>
        </Pressable>
      </View>
      <LoadState loading={loading} error={error} onRetry={onChanged} />
      {items?.length === 0 && <Text style={styles.empty}>Chưa có playlist</Text>}
      {items?.map((playlist) => (
        <Pressable
          key={playlist.id}
          accessibilityRole="button"
          accessibilityLabel={`Mở playlist ${playlist.name}`}
          onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: playlist.id } })}
          style={styles.playlist}>
          <Text numberOfLines={1} style={styles.playlistName}>
            {playlist.name}
          </Text>
          <Text style={styles.playlistCount}>{playlist.trackCount} bài hát</Text>
        </Pressable>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 25,
    marginLeft: 18,
  },
  tab: {
    width: 104,
    height: 35,
    borderWidth: 1,
    borderColor: '#ffffff',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabSelected: {
    backgroundColor: 'rgba(115, 65, 57, 0.92)',
  },
  tabIdle: gradient(
    'radial-gradient(ellipse 106px 123px at 1px 1px, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0))',
  ),
  tabLabel: {
    fontFamily: MusicFonts.semiBold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.25,
    color: '#ffffff',
  },
  heading: {
    marginTop: 23,
    marginBottom: 16,
    marginLeft: 20,
    fontFamily: MusicFonts.semiBold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.25,
    color: MusicColors.cream,
  },
  empty: {
    marginLeft: 20,
    fontFamily: MusicFonts.medium,
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.87,
  },
  guest: {
    alignItems: 'flex-start',
    gap: 16,
  },
  button: {
    marginLeft: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ffffff',
    borderRadius: 40,
  },
  buttonLabel: {
    fontFamily: MusicFonts.semiBold,
    fontSize: 14,
    lineHeight: 20,
    color: '#ffffff',
  },
  create: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginRight: 20,
  },
  input: {
    flex: 1,
    marginLeft: 20,
    paddingHorizontal: 16,
    height: 38,
    borderWidth: 1,
    borderColor: MusicColors.cream,
    borderRadius: 40,
    fontFamily: MusicFonts.medium,
    fontSize: 14,
    color: '#ffffff',
  },
  playlist: {
    marginHorizontal: 20,
    paddingVertical: 12,
  },
  playlistName: {
    fontFamily: MusicFonts.bold,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: 0.25,
    color: '#ffffff',
  },
  playlistCount: {
    marginTop: 4,
    fontFamily: MusicFonts.semiBold,
    fontSize: 15,
    lineHeight: 20,
    color: MusicColors.cream,
  },
  historyActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 21,
    marginBottom: 16,
  },
  historyCount: {
    fontFamily: MusicFonts.medium,
    fontSize: 13,
    color: MusicColors.sand,
    opacity: 0.8,
  },
  clearHistoryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 208, 0.25)',
  },
  clearHistoryBtnText: {
    fontFamily: MusicFonts.medium,
    fontSize: 12,
    color: MusicColors.cream,
  },
});
