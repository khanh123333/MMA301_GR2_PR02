import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoadState } from '@/components/load-state';
import { gradient, MusicColors, MusicFonts } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useFetch } from '@/hooks/use-fetch';
import { usePlayer } from '@/hooks/use-player';
import { api, type ArtistTrack, type Page } from '@/lib/api';
import { goBack } from '@/lib/go-back';
import { formatDuration } from '@/lib/upload-helper';

const MAX_TRACKS = 50;

export default function ArtistStudioScreen() {
  const { user } = useAuth();
  const { open } = usePlayer();
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, 42) + 16;
  const paddingBottom = Math.max(insets.bottom, 24) + 20;

  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmTrack, setDeleteConfirmTrack] = useState<ArtistTrack | null>(null);

  const tracksFetch = useFetch<Page<ArtistTrack>>(
    user?.role === 'ARTIST' ? '/api/artist/tracks?limit=100' : null,
  );
  const reload = tracksFetch.reload;

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const tracks = tracksFetch.data?.items ?? [];
  const total = tracksFetch.data?.total ?? tracks.length;
  const hiddenCount = tracks.filter((t) => t.isHidden).length;
  const activeCount = tracks.length - hiddenCount;

  const filteredTracks = search.trim()
    ? tracks.filter(
        (t) =>
          t.title.toLowerCase().includes(search.toLowerCase()) ||
          (t.genre && t.genre.toLowerCase().includes(search.toLowerCase())),
      )
    : tracks;

  const handleDelete = async (track: ArtistTrack) => {
    setDeletingId(track.id);
    try {
      await api(`/api/artist/tracks/${track.id}`, { method: 'DELETE' });
      setDeleteConfirmTrack(null);
      reload();
    } catch (err) {
      const msg = (err as Error).message || 'Không thể xoá bài hát';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Lỗi', msg);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDelete = (track: ArtistTrack) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`Bạn có chắc muốn xoá bài hát "${track.title}" không? Hành động này không thể hoàn tác.`)) {
        handleDelete(track);
      }
    } else {
      setDeleteConfirmTrack(track);
    }
  };

  if (!user || user.role !== 'ARTIST') {
    return (
      <View
        style={[
          styles.screen,
          gradient('linear-gradient(211.1deg, rgb(227, 78, 31) 4.81%, rgb(107, 56, 48) 92.97%)'),
          { paddingTop, paddingBottom },
        ]}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" onPress={goBack} style={styles.back}>
            <Image source={require('@/assets/images/music/dropdown.svg')} contentFit="fill" style={styles.backIcon} />
          </Pressable>
          <Text style={styles.headerTitle}>Studio Nghệ sĩ</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.deniedContainer}>
          <Text style={styles.deniedText}>Bạn cần đăng nhập bằng tài khoản Nghệ sĩ để sử dụng chức năng này.</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/account')} style={styles.primaryButton}>
            <Text style={styles.primaryButtonLabel}>Đăng nhập</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.screen,
        gradient('linear-gradient(211.1deg, rgb(227, 78, 31) 4.81%, rgb(107, 56, 48) 92.97%)'),
      ]}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop }]}>
        <Pressable accessibilityRole="button" onPress={goBack} style={styles.back}>
          <Image source={require('@/assets/images/music/dropdown.svg')} contentFit="fill" style={styles.backIcon} />
        </Pressable>
        <Text style={styles.headerTitle}>Studio Nghệ sĩ</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/artist/upload')}
          style={styles.uploadNavButton}>
          <Text style={styles.uploadNavLabel}>+ Đăng bài</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* Artist Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarLetter}>{user.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text numberOfLines={1} style={styles.artistName}>
                  {user.name}
                </Text>
                <View style={styles.artistBadge}>
                  <Text style={styles.artistBadgeLabel}>Nghệ sĩ 🌟</Text>
                </View>
              </View>
              <Text style={styles.artistEmail}>{user.email}</Text>
            </View>
          </View>

          {/* Stats Bar */}
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{total}/{MAX_TRACKS}</Text>
              <Text style={styles.statLabel}>Bài đã đăng</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: '#88D49E' }]}>{activeCount}</Text>
              <Text style={styles.statLabel}>Công khai</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: hiddenCount > 0 ? '#FF8A8A' : MusicColors.sand }]}>
                {hiddenCount}
              </Text>
              <Text style={styles.statLabel}>Bị ẩn</Text>
            </View>
          </View>
        </View>

        {/* Section Heading & Search */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Bài hát của bạn ({tracks.length})</Text>
          <Pressable onPress={() => router.push('/artist/upload')} style={styles.addTrackButton}>
            <Text style={styles.addTrackText}>+ Tải nhạc mới</Text>
          </Pressable>
        </View>

        {tracks.length > 5 && (
          <View style={styles.searchBox}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Tìm theo tên bài hoặc thể loại..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              style={styles.searchInput}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')} style={styles.clearSearch}>
                <Text style={styles.clearSearchText}>✕</Text>
              </Pressable>
            )}
          </View>
        )}

        <LoadState
          loading={tracksFetch.loading && !tracksFetch.data}
          error={tracksFetch.error}
          onRetry={reload}
        />

        {/* Track List or Empty */}
        {tracksFetch.data && tracks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Text style={{ fontSize: 32 }}>🎵</Text>
            </View>
            <Text style={styles.emptyTitle}>Chưa có bài hát nào</Text>
            <Text style={styles.emptySubtitle}>
              Hãy chia sẻ âm nhạc của bạn với mọi người bằng cách tải lên bài hát đầu tiên!
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/artist/upload')}
              style={styles.primaryButton}>
              <Text style={styles.primaryButtonLabel}>Tải bài hát ngay</Text>
            </Pressable>
          </View>
        ) : (
          filteredTracks.map((track) => {
            const isDeleting = deletingId === track.id;
            return (
              <View
                key={track.id}
                style={[
                  styles.trackCard,
                  track.isHidden && styles.trackCardHidden,
                ]}>
                {/* Artwork */}
                <Pressable
                  onPress={() => open(track, tracks)}
                  style={styles.artworkContainer}>
                  {track.artwork ? (
                    <Image source={track.artwork} style={styles.artwork} />
                  ) : (
                    <View style={styles.artworkFallback}>
                      <Text style={{ fontSize: 20 }}>🎶</Text>
                    </View>
                  )}
                  <View style={styles.playOverlay}>
                    <Text style={styles.playIconText}>▶</Text>
                  </View>
                </Pressable>

                {/* Track Details */}
                <View style={styles.trackDetails}>
                  <Text numberOfLines={1} style={styles.trackTitle}>
                    {track.title}
                  </Text>
                  <View style={styles.metaRow}>
                    {track.genre ? (
                      <View style={styles.genreTag}>
                        <Text style={styles.genreText}>{track.genre}</Text>
                      </View>
                    ) : null}
                    <Text style={styles.metaText}>{formatDuration(track.duration)}</Text>
                  </View>
                  {track.isHidden ? (
                    <View style={styles.hiddenNotice}>
                      <Text style={styles.hiddenNoticeText}>⚠️ Quản trị viên đang ẩn bài này</Text>
                    </View>
                  ) : null}
                </View>

                {/* Actions */}
                <View style={styles.actionsColumn}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Sửa bài hát"
                    onPress={() => router.push(`/artist/edit/${track.id}`)}
                    style={styles.actionBtn}>
                    <Text style={styles.actionEditText}>Sửa</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Xoá bài hát"
                    disabled={isDeleting}
                    onPress={() => confirmDelete(track)}
                    style={[styles.actionBtn, styles.deleteBtn]}>
                    {isDeleting ? (
                      <ActivityIndicator size="small" color="#FF8A8A" />
                    ) : (
                      <Text style={styles.actionDeleteText}>Xoá</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Delete Confirmation Modal for Mobile Native */}
      {deleteConfirmTrack && (
        <Modal
          transparent
          animationType="fade"
          visible={!!deleteConfirmTrack}
          onRequestClose={() => setDeleteConfirmTrack(null)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Xác nhận xoá</Text>
              <Text style={styles.modalMessage}>
                Bạn có chắc chắn muốn xoá bài hát &quot;{deleteConfirmTrack.title}&quot;? File âm thanh sẽ bị gỡ vĩnh viễn khỏi hệ thống.
              </Text>
              <View style={styles.modalButtons}>
                <Pressable
                  onPress={() => setDeleteConfirmTrack(null)}
                  style={styles.modalCancelBtn}>
                  <Text style={styles.modalCancelText}>Huỷ</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleDelete(deleteConfirmTrack)}
                  style={styles.modalConfirmBtn}>
                  <Text style={styles.modalConfirmText}>Xoá vĩnh viễn</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  back: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  backIcon: {
    width: 20,
    height: 20,
    transform: [{ rotate: '90deg' }],
  },
  headerTitle: {
    fontFamily: MusicFonts.bold,
    fontSize: 20,
    color: MusicColors.cream,
  },
  uploadNavButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: MusicColors.gold,
  },
  uploadNavLabel: {
    fontFamily: MusicFonts.semiBold,
    fontSize: 13,
    color: MusicColors.brown,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  profileCard: {
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(221,189,134,0.3)',
    padding: 18,
    marginBottom: 24,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: MusicColors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarLetter: {
    fontFamily: MusicFonts.bold,
    fontSize: 24,
    color: MusicColors.brown,
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  artistName: {
    fontFamily: MusicFonts.bold,
    fontSize: 18,
    color: MusicColors.cream,
  },
  artistBadge: {
    backgroundColor: 'rgba(221,189,134,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: MusicColors.gold,
  },
  artistBadgeLabel: {
    fontFamily: MusicFonts.medium,
    fontSize: 11,
    color: MusicColors.gold,
  },
  artistEmail: {
    fontFamily: MusicFonts.medium,
    fontSize: 13,
    color: MusicColors.sand,
    marginTop: 2,
    opacity: 0.8,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: MusicFonts.bold,
    fontSize: 18,
    color: MusicColors.cream,
  },
  statLabel: {
    fontFamily: MusicFonts.medium,
    fontSize: 11,
    color: MusicColors.sand,
    marginTop: 2,
    opacity: 0.75,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: MusicFonts.bold,
    fontSize: 17,
    color: MusicColors.cream,
  },
  addTrackButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  addTrackText: {
    fontFamily: MusicFonts.semiBold,
    fontSize: 13,
    color: MusicColors.gold,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 42,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: MusicFonts.medium,
    fontSize: 14,
  },
  clearSearch: {
    padding: 6,
  },
  clearSearchText: {
    color: MusicColors.sand,
    fontSize: 14,
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  trackCardHidden: {
    borderColor: 'rgba(255, 138, 138, 0.4)',
    backgroundColor: 'rgba(255, 138, 138, 0.05)',
  },
  artworkContainer: {
    position: 'relative',
    width: 54,
    height: 54,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#301815',
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  artworkFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIconText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 2,
  },
  trackDetails: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  trackTitle: {
    fontFamily: MusicFonts.semiBold,
    fontSize: 15,
    color: MusicColors.cream,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  genreTag: {
    backgroundColor: 'rgba(221,189,134,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  genreText: {
    fontFamily: MusicFonts.medium,
    fontSize: 11,
    color: MusicColors.sand,
  },
  metaText: {
    fontFamily: MusicFonts.medium,
    fontSize: 12,
    color: MusicColors.sand,
    opacity: 0.7,
  },
  hiddenNotice: {
    marginTop: 4,
  },
  hiddenNoticeText: {
    fontFamily: MusicFonts.medium,
    fontSize: 11,
    color: '#FF8A8A',
  },
  actionsColumn: {
    flexDirection: 'column',
    gap: 6,
    alignItems: 'flex-end',
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  actionEditText: {
    fontFamily: MusicFonts.medium,
    fontSize: 12,
    color: MusicColors.sand,
  },
  deleteBtn: {
    backgroundColor: 'rgba(255,80,80,0.15)',
  },
  actionDeleteText: {
    fontFamily: MusicFonts.medium,
    fontSize: 12,
    color: '#FF8A8A',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: MusicFonts.bold,
    fontSize: 18,
    color: MusicColors.cream,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: MusicFonts.medium,
    fontSize: 13,
    color: MusicColors.sand,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 20,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: MusicColors.gold,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  primaryButtonLabel: {
    fontFamily: MusicFonts.bold,
    fontSize: 14,
    color: MusicColors.brown,
  },
  deniedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  deniedText: {
    fontFamily: MusicFonts.medium,
    fontSize: 15,
    color: MusicColors.sand,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#2A1815',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  modalTitle: {
    fontFamily: MusicFonts.bold,
    fontSize: 18,
    color: MusicColors.cream,
    marginBottom: 10,
  },
  modalMessage: {
    fontFamily: MusicFonts.medium,
    fontSize: 14,
    color: MusicColors.sand,
    opacity: 0.85,
    lineHeight: 20,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  modalCancelText: {
    fontFamily: MusicFonts.medium,
    fontSize: 14,
    color: MusicColors.sand,
  },
  modalConfirmBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#C53030',
  },
  modalConfirmText: {
    fontFamily: MusicFonts.semiBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
