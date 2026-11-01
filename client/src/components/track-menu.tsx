import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { LoadState } from '@/components/load-state';
import { MusicColors, MusicFonts } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useFetch } from '@/hooks/use-fetch';
import { usePlayer } from '@/hooks/use-player';
import { api, trackPath, type Page, type PlaylistSummary, type Track } from '@/lib/api';

type Props = {
  track: Track | null;
  onClose: () => void;
  /** Shown from the Liked Songs list, where the action is removal. */
  isFavorite?: boolean;
  /** Shown from a playlist, which adds a remove-from-playlist action. */
  playlistId?: string;
  /** Called after a change the opening list must reflect. */
  onChanged?: () => void;
};

export function TrackMenu({ track, onClose, isFavorite, playlistId, onChanged }: Props) {
  const { user } = useAuth();
  const { notify, addToQueue } = usePlayer();
  const [picking, setPicking] = useState(false);
  const playlists = useFetch<Page<PlaylistSummary>>(track && picking ? '/api/playlists?limit=100' : null);

  if (!track) return null;

  const close = () => {
    setPicking(false);
    onClose();
  };

  const run = async (request: Promise<void>, done: string, changed = false) => {
    close();
    try {
      await request;
      notify(done);
      if (changed) onChanged?.();
    } catch (err) {
      notify((err as Error).message);
    }
  };

  const favoritePath = `/api/me/favorites/${trackPath(track)}`;
  const body = { source: track.source, id: track.id };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={close}>
      <Pressable accessibilityLabel="Đóng" onPress={close} style={styles.backdrop} />
      <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent}>
        <Text numberOfLines={1} style={styles.title}>
          {track.title}
        </Text>

        {!user && (
          <Action
            label="Đăng nhập để lưu bài hát"
            onPress={() => {
              close();
              router.push('/account');
            }}
          />
        )}

        {track.isAvailable !== false && !picking && (
          <>
            <Action
              label="Phát tiếp theo"
              onPress={() => {
                addToQueue(track, true);
                close();
              }}
            />
            <Action
              label="Thêm vào hàng đợi"
              onPress={() => {
                addToQueue(track, false);
                close();
              }}
            />
          </>
        )}

        {user && picking && (
          <>
            <LoadState loading={playlists.loading} error={playlists.error} onRetry={playlists.reload} />
            {playlists.data?.items.length === 0 && (
              <Text style={styles.hint}>Chưa có playlist, hãy tạo ở tab Playlist trong thư viện</Text>
            )}
            {playlists.data?.items.map((playlist) => (
              <Action
                key={playlist.id}
                label={playlist.name}
                onPress={() =>
                  run(
                    api(`/api/playlists/${playlist.id}/tracks`, { method: 'POST', body }),
                    `Đã thêm vào ${playlist.name}`,
                  )
                }
              />
            ))}
          </>
        )}

        {user && !picking && (
          <>
            {isFavorite ? (
              <Action
                label="Bỏ thích"
                onPress={() => run(api(favoritePath, { method: 'DELETE' }), 'Đã bỏ thích', true)}
              />
            ) : (
              track.isAvailable !== false && (
                <Action
                  label="Thích"
                  onPress={() => run(api(favoritePath, { method: 'PUT' }), 'Đã thêm vào yêu thích')}
                />
              )
            )}
            {track.isAvailable !== false && <Action label="Thêm vào playlist" onPress={() => setPicking(true)} />}
            {playlistId && (
              <Action
                label="Xoá khỏi playlist"
                danger
                onPress={() =>
                  run(
                    api(`/api/playlists/${playlistId}/tracks/${trackPath(track)}`, { method: 'DELETE' }),
                    'Đã xoá khỏi playlist',
                    true,
                  )
                }
              />
            )}
          </>
        )}
      </ScrollView>
    </Modal>
  );
}

function Action({ label, danger, onPress }: { label: string; danger?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.action}>
      <Text numberOfLines={1} style={[styles.actionLabel, danger && styles.actionDanger]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    flexGrow: 0,
    maxHeight: '60%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: MusicColors.brown,
  },
  sheetContent: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    marginBottom: 8,
    fontFamily: MusicFonts.bold,
    fontSize: 18,
    color: '#ffffff',
  },
  hint: {
    paddingVertical: 12,
    fontFamily: MusicFonts.medium,
    fontSize: 14,
    color: MusicColors.cream,
  },
  action: {
    paddingVertical: 14,
  },
  actionLabel: {
    fontFamily: MusicFonts.semiBold,
    fontSize: 16,
    color: MusicColors.cream,
  },
  actionDanger: {
    color: '#ff7b72',
  },
});
