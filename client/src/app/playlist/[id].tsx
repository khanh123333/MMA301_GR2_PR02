import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoadState } from '@/components/load-state';
import { SongRow } from '@/components/song-row';
import { TrackMenu } from '@/components/track-menu';
import { gradient, MusicColors, MusicFonts } from '@/constants/theme';
import { useFetch } from '@/hooks/use-fetch';
import { usePlayer, useTabBarSpace } from '@/hooks/use-player';
import { api, trackPath, type PlaylistSummary, type Track } from '@/lib/api';
import { goBack } from '@/lib/go-back';

export default function PlaylistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { open, notify } = usePlayer();
  const paddingBottom = useTabBarSpace();
  const paddingTop = Math.max(useSafeAreaInsets().top, 42) + 22;
  const playlist = useFetch<PlaylistSummary & { tracks: Track[] }>(`/api/playlists/${id}`);
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);
  const [confirming, setConfirming] = useState(false);

  const songs = playlist.data?.tracks ?? [];

  const removeTrack = async (track: Track) => {
    try {
      await api(`/api/playlists/${id}/tracks/${trackPath(track)}`, { method: 'DELETE' });
      notify(`Đã xoá "${track.title}" khỏi playlist`);
      playlist.reload();
    } catch (err) {
      notify((err as Error).message);
    }
  };

  const remove = async () => {
    try {
      await api(`/api/playlists/${id}`, { method: 'DELETE' });
      goBack();
    } catch (err) {
      notify((err as Error).message);
      setConfirming(false);
    }
  };

  return (
    <ScrollView
      style={[
        styles.screen,
        gradient('linear-gradient(211.1deg, rgb(227, 78, 31) 4.81%, rgb(107, 56, 48) 92.97%)'),
      ]}
      contentContainerStyle={{ paddingTop, paddingBottom }}
      showsVerticalScrollIndicator={false}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quay lại"
        onPress={goBack}
        style={styles.back}>
        <Image source={require('@/assets/images/music/dropdown.svg')} contentFit="fill" style={styles.backIcon} />
      </Pressable>

      <LoadState loading={playlist.loading && !playlist.data} error={playlist.error} onRetry={playlist.reload} />

      {playlist.data && (
        <>
          <Text accessibilityRole="header" numberOfLines={2} style={styles.title}>
            {playlist.data.name}
          </Text>
          <View style={styles.actions}>
            <Text style={styles.count}>{songs.length} bài hát</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => (confirming ? remove() : setConfirming(true))}
              style={styles.delete}>
              <Text style={styles.deleteLabel}>{confirming ? 'Xác nhận xoá' : 'Xoá playlist'}</Text>
            </Pressable>
          </View>
          {songs.length === 0 && (
            <Text style={styles.empty}>Chưa có bài hát. Chọn “…” trên trình phát để thêm bài.</Text>
          )}
          {songs.map((song) => (
            <SongRow
              key={`${song.source}/${song.id}`}
              track={song}
              onPress={() => open(song, songs)}
              onRemove={() => removeTrack(song)}
              onMore={() => setMenuTrack(song)}
            />
          ))}
        </>
      )}

      <TrackMenu
        track={menuTrack}
        playlistId={id}
        onClose={() => setMenuTrack(null)}
        onChanged={playlist.reload}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  back: {
    width: 32,
    height: 32,
    padding: 4,
    marginLeft: 20,
    marginBottom: 24,
  },
  backIcon: {
    width: 24,
    height: 24,
  },
  title: {
    marginHorizontal: 28,
    fontFamily: MusicFonts.semiBold,
    fontSize: 36,
    lineHeight: 44,
    color: '#ffffff',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 24,
    marginHorizontal: 28,
  },
  count: {
    fontFamily: MusicFonts.semiBold,
    fontSize: 14,
    color: MusicColors.cream,
  },
  delete: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#ffffff',
    borderRadius: 40,
  },
  deleteLabel: {
    fontFamily: MusicFonts.semiBold,
    fontSize: 13,
    color: '#ffffff',
  },
  empty: {
    marginHorizontal: 28,
    fontFamily: MusicFonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: '#ffffff',
    opacity: 0.87,
  },
});
