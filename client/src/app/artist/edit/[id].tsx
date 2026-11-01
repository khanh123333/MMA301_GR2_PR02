import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
import { api, type ArtistTrack } from '@/lib/api';
import { goBack } from '@/lib/go-back';
import { appendFileToFormData, formatDuration } from '@/lib/upload-helper';

const MAX_COVER_SIZE = 5 * 1024 * 1024; // 5 MB

const GENRE_SUGGESTIONS = [
  'Pop',
  'Ballad',
  'R&B',
  'EDM',
  'Lofi',
  'Acoustic',
  'Hip-Hop',
  'Indie',
  'Rock',
];

type NewCover = {
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
};

export default function ArtistEditTrackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, 42) + 16;
  const paddingBottom = Math.max(insets.bottom, 24) + 30;

  const trackFetch = useFetch<ArtistTrack>(id ? `/api/artist/tracks/${id}` : null);
  const track = trackFetch.data;

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
          <Text style={styles.headerTitle}>Chỉnh sửa bài hát</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.deniedContainer}>
          <Text style={styles.deniedText}>Bạn không có quyền chỉnh sửa bài hát này.</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[
        styles.screen,
        gradient('linear-gradient(211.1deg, rgb(227, 78, 31) 4.81%, rgb(107, 56, 48) 92.97%)'),
      ]}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop }]}>
        <Pressable accessibilityRole="button" onPress={goBack} style={styles.back}>
          <Image source={require('@/assets/images/music/dropdown.svg')} contentFit="fill" style={styles.backIcon} />
        </Pressable>
        <Text style={styles.headerTitle}>Chỉnh sửa bài hát</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <LoadState
          loading={trackFetch.loading && !track}
          error={trackFetch.error}
          onRetry={trackFetch.reload}
        />

        {track && <EditForm key={track.id} track={track} id={id as string} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function EditForm({ track, id }: { track: ArtistTrack; id: string }) {
  const [title, setTitle] = useState(track.title || '');
  const [genre, setGenre] = useState(track.genre || '');
  const [newCover, setNewCover] = useState<NewCover | null>(null);

  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notifyError = (msg: string) => {
    setError(msg);
    if (Platform.OS === 'web') {
      window.alert(msg);
    } else {
      Alert.alert('Thông báo', msg);
    }
  };

  const handlePickCover = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > MAX_COVER_SIZE) {
        notifyError('Ảnh bìa quá lớn (tối đa 5MB)');
        return;
      }

      setNewCover({
        uri: asset.uri,
        name: asset.fileName || 'cover.jpg',
        size: asset.fileSize,
        mimeType: asset.mimeType || 'image/jpeg',
      });
      setError(null);
    } catch (err) {
      notifyError('Không thể chọn ảnh: ' + (err as Error).message);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      notifyError('Vui lòng nhập tên bài hát');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      if (newCover) {
        const formData = new FormData();
        formData.append('title', title.trim());
        formData.append('genre', genre.trim());
        await appendFileToFormData(formData, 'cover', newCover);

        await api(`/api/artist/tracks/${id}`, {
          method: 'PATCH',
          body: formData,
        });
      } else {
        await api(`/api/artist/tracks/${id}`, {
          method: 'PATCH',
          body: {
            title: title.trim(),
            genre: genre.trim(),
          },
        });
      }

      const successMsg = 'Cập nhật thông tin bài hát thành công!';
      if (Platform.OS === 'web') {
        window.alert(successMsg);
      } else {
        Alert.alert('Thành công', successMsg);
      }

      router.replace('/artist');
    } catch (err) {
      const msg = (err as Error).message || 'Không thể lưu thay đổi';
      notifyError(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api(`/api/artist/tracks/${id}`, { method: 'DELETE' });
      setShowDeleteModal(false);
      router.replace('/artist');
    } catch (err) {
      const msg = (err as Error).message || 'Không thể xoá bài hát';
      notifyError(msg);
    } finally {
      setDeleting(false);
    }
  };

  const confirmDelete = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(`Bạn có chắc chắn muốn xoá bài hát "${track.title}" không?`)) {
        handleDelete();
      }
    } else {
      setShowDeleteModal(true);
    }
  };

  return (
    <>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      ) : null}

      {/* Cover Image Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ảnh bìa</Text>
        <Text style={styles.cardSubtitle}>Ảnh vuông 1:1, dung lượng tối đa 5MB</Text>

        <View style={styles.coverRow}>
          <Pressable
            onPress={handlePickCover}
            disabled={busy}
            style={styles.coverPreviewContainer}>
            {newCover ? (
              <Image source={newCover.uri} style={styles.coverImage} />
            ) : track.artwork ? (
              <Image source={track.artwork} style={styles.coverImage} />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Text style={{ fontSize: 28 }}>🖼️</Text>
                <Text style={styles.coverPlaceholderText}>Chưa có ảnh</Text>
              </View>
            )}
          </Pressable>

          <View style={styles.coverActions}>
            <Pressable
              onPress={handlePickCover}
              disabled={busy}
              style={styles.pickCoverBtn}>
              <Text style={styles.pickCoverLabel}>
                {newCover || track.artwork ? 'Thay đổi ảnh' : 'Thêm ảnh mới'}
              </Text>
            </Pressable>
            {newCover ? (
              <Pressable
                onPress={() => setNewCover(null)}
                disabled={busy}
                style={styles.removeCoverBtn}>
                <Text style={styles.removeCoverLabel}>Huỷ chọn ảnh mới</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      {/* Track Info Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Thông tin bài hát</Text>

        {/* Title Input */}
        <Text style={styles.inputLabel}>Tên bài hát <Text style={styles.requiredStar}>*</Text></Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          maxLength={200}
          editable={!busy}
          placeholder="Nhập tên bài hát"
          placeholderTextColor="rgba(255,255,255,0.35)"
          style={styles.textInput}
        />

        {/* Genre Input */}
        <Text style={[styles.inputLabel, { marginTop: 14 }]}>Thể loại</Text>
        <TextInput
          value={genre}
          onChangeText={setGenre}
          maxLength={50}
          editable={!busy}
          placeholder="Ví dụ: Pop, Ballad, Lofi..."
          placeholderTextColor="rgba(255,255,255,0.35)"
          style={styles.textInput}
        />

        {/* Quick tags */}
        <Text style={styles.chipsHeading}>Gợi ý thể loại nhanh:</Text>
        <View style={styles.chipsRow}>
          {GENRE_SUGGESTIONS.map((tag) => (
            <Pressable
              key={tag}
              onPress={() => setGenre(tag)}
              style={[
                styles.chip,
                genre.toLowerCase() === tag.toLowerCase() && styles.chipActive,
              ]}>
              <Text
                style={[
                  styles.chipText,
                  genre.toLowerCase() === tag.toLowerCase() && styles.chipTextActive,
                ]}>
                {tag}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Duration and Status info */}
        <View style={styles.metaInfoBox}>
          <Text style={styles.metaInfoText}>
            ⏱ Thời lượng: {formatDuration(track.duration)}
          </Text>
          <Text style={styles.metaInfoText}>
            🛡 Trạng thái:{' '}
            {track.isHidden ? (
              <Text style={{ color: '#FF8A8A' }}>Đang bị Quản trị viên ẩn</Text>
            ) : (
              <Text style={{ color: '#88D49E' }}>Công khai</Text>
            )}
          </Text>
        </View>
      </View>

      {/* Save Button */}
      <Pressable
        accessibilityRole="button"
        onPress={handleSave}
        disabled={busy}
        style={[styles.saveBtn, busy && { opacity: 0.6 }]}>
        {busy ? (
          <View style={styles.busyRow}>
            <ActivityIndicator color={MusicColors.brown} style={{ marginRight: 8 }} />
            <Text style={styles.saveBtnLabel}>Đang lưu...</Text>
          </View>
        ) : (
          <Text style={styles.saveBtnLabel}>Lưu thay đổi</Text>
        )}
      </Pressable>

      {/* Delete Track Section */}
      <View style={styles.dangerZone}>
        <Text style={styles.dangerTitle}>Vùng nguy hiểm</Text>
        <Text style={styles.dangerSubtitle}>
          Khi xoá, bài hát và toàn bộ tệp âm thanh liên quan sẽ bị xoá vĩnh viễn khỏi máy chủ.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={confirmDelete}
          disabled={deleting}
          style={styles.deleteTrackBtn}>
          {deleting ? (
            <ActivityIndicator color="#FF8A8A" />
          ) : (
            <Text style={styles.deleteTrackLabel}>Xoá bài hát này</Text>
          )}
        </Pressable>
      </View>

      {/* Delete Confirmation Modal for Mobile Native */}
      {showDeleteModal && (
        <Modal
          transparent
          animationType="fade"
          visible={showDeleteModal}
          onRequestClose={() => setShowDeleteModal(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Xác nhận xoá bài hát</Text>
              <Text style={styles.modalMessage}>
                Bạn có chắc chắn muốn xoá bài hát &quot;{track.title}&quot;? Hành động này không thể hoàn tác.
              </Text>
              <View style={styles.modalButtons}>
                <Pressable
                  onPress={() => setShowDeleteModal(false)}
                  style={styles.modalCancelBtn}>
                  <Text style={styles.modalCancelText}>Huỷ</Text>
                </Pressable>
                <Pressable
                  onPress={handleDelete}
                  style={styles.modalConfirmBtn}>
                  <Text style={styles.modalConfirmText}>Xoá vĩnh viễn</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </>
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
    fontSize: 18,
    color: MusicColors.cream,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  errorBox: {
    backgroundColor: 'rgba(255, 80, 80, 0.2)',
    borderWidth: 1,
    borderColor: '#FF8A8A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: MusicFonts.medium,
    fontSize: 13,
    color: '#FF8A8A',
    lineHeight: 18,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(221,189,134,0.2)',
  },
  cardTitle: {
    fontFamily: MusicFonts.bold,
    fontSize: 16,
    color: MusicColors.cream,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontFamily: MusicFonts.medium,
    fontSize: 12,
    color: MusicColors.sand,
    opacity: 0.75,
    marginBottom: 14,
  },
  coverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  coverPreviewContainer: {
    width: 90,
    height: 90,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPlaceholderText: {
    fontFamily: MusicFonts.medium,
    fontSize: 11,
    color: MusicColors.sand,
    opacity: 0.8,
    marginTop: 4,
  },
  coverActions: {
    flex: 1,
    gap: 8,
  },
  pickCoverBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignSelf: 'flex-start',
  },
  pickCoverLabel: {
    fontFamily: MusicFonts.medium,
    fontSize: 13,
    color: MusicColors.cream,
  },
  removeCoverBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  removeCoverLabel: {
    fontFamily: MusicFonts.medium,
    fontSize: 12,
    color: '#FF8A8A',
  },
  inputLabel: {
    fontFamily: MusicFonts.semiBold,
    fontSize: 13,
    color: MusicColors.sand,
    marginBottom: 6,
  },
  requiredStar: {
    color: '#FF8A8A',
  },
  textInput: {
    height: 46,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 12,
    paddingHorizontal: 14,
    color: '#FFFFFF',
    fontFamily: MusicFonts.medium,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipsHeading: {
    fontFamily: MusicFonts.medium,
    fontSize: 11,
    color: MusicColors.sand,
    opacity: 0.7,
    marginTop: 12,
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipActive: {
    backgroundColor: MusicColors.gold,
    borderColor: MusicColors.gold,
  },
  chipText: {
    fontFamily: MusicFonts.medium,
    fontSize: 11,
    color: MusicColors.sand,
  },
  chipTextActive: {
    color: MusicColors.brown,
    fontFamily: MusicFonts.bold,
  },
  metaInfoBox: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    gap: 6,
  },
  metaInfoText: {
    fontFamily: MusicFonts.medium,
    fontSize: 12,
    color: MusicColors.sand,
    opacity: 0.8,
  },
  saveBtn: {
    backgroundColor: MusicColors.gold,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveBtnLabel: {
    fontFamily: MusicFonts.bold,
    fontSize: 15,
    color: MusicColors.brown,
  },
  dangerZone: {
    backgroundColor: 'rgba(255, 60, 60, 0.08)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 80, 80, 0.3)',
    marginBottom: 20,
  },
  dangerTitle: {
    fontFamily: MusicFonts.bold,
    fontSize: 15,
    color: '#FF8A8A',
    marginBottom: 4,
  },
  dangerSubtitle: {
    fontFamily: MusicFonts.medium,
    fontSize: 12,
    color: MusicColors.sand,
    opacity: 0.75,
    lineHeight: 18,
    marginBottom: 14,
  },
  deleteTrackBtn: {
    backgroundColor: 'rgba(255, 60, 60, 0.2)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 80, 80, 0.4)',
  },
  deleteTrackLabel: {
    fontFamily: MusicFonts.bold,
    fontSize: 14,
    color: '#FF8A8A',
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
