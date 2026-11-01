import { Image } from 'expo-image';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { gradient, MusicColors, MusicFonts } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import { goBack } from '@/lib/go-back';
import { appendFileToFormData, formatFileSize } from '@/lib/upload-helper';

const MAX_AUDIO_SIZE = 20 * 1024 * 1024; // 20 MB
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

type AudioFile = {
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
};

type CoverFile = {
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
};

export default function ArtistUploadScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, 42) + 16;
  const paddingBottom = Math.max(insets.bottom, 24) + 30;

  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [audio, setAudio] = useState<AudioFile | null>(null);
  const [cover, setCover] = useState<CoverFile | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notifyError = (msg: string) => {
    setError(msg);
    if (Platform.OS === 'web') {
      window.alert(msg);
    } else {
      Alert.alert('Thông báo', msg);
    }
  };

  const handlePickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      if (asset.size && asset.size > MAX_AUDIO_SIZE) {
        notifyError('Tệp âm thanh quá lớn (tối đa 20MB)');
        return;
      }

      setAudio({
        uri: asset.uri,
        name: asset.name || 'track.mp3',
        size: asset.size,
        mimeType: asset.mimeType || 'audio/mpeg',
      });
      setError(null);

      // Auto-fill title from filename if empty
      if (!title) {
        const cleanName = (asset.name || '')
          .replace(/\.[^/.]+$/, '')
          .replace(/[-_]/g, ' ')
          .trim();
        if (cleanName) setTitle(cleanName);
      }
    } catch (err) {
      notifyError('Không thể mở tệp âm thanh: ' + (err as Error).message);
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

      setCover({
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

  const handleSubmit = async () => {
    if (!audio) {
      notifyError('Vui lòng chọn file âm thanh (.mp3 hoặc .m4a)');
      return;
    }

    if (!title.trim()) {
      notifyError('Vui lòng nhập tên bài hát');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      if (genre.trim()) {
        formData.append('genre', genre.trim());
      }

      await appendFileToFormData(formData, 'audio', audio);

      if (cover) {
        await appendFileToFormData(formData, 'cover', cover);
      }

      await api('/api/artist/tracks', {
        method: 'POST',
        body: formData,
        timeoutMs: 180_000, // 3 minutes timeout for large file upload
      });

      const successMsg = 'Tải bài hát lên thành công!';
      if (Platform.OS === 'web') {
        window.alert(successMsg);
      } else {
        Alert.alert('Thành công', successMsg);
      }

      router.replace('/artist');
    } catch (err) {
      const msg = (err as Error).message || 'Tải bài hát lên thất bại';
      notifyError(msg);
    } finally {
      setBusy(false);
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
          <Text style={styles.headerTitle}>Tải bài hát lên</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.deniedContainer}>
          <Text style={styles.deniedText}>Bạn cần đăng nhập bằng tài khoản Nghệ sĩ để tải nhạc lên.</Text>
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
        <Text style={styles.headerTitle}>Tải bài hát mới</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* Error Notice */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        ) : null}

        {/* Section 1: Audio File Picker */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>1. Tệp âm thanh <Text style={styles.requiredStar}>*</Text></Text>
          <Text style={styles.cardSubtitle}>Định dạng MP3 hoặc M4A, tối đa 20MB</Text>

          {audio ? (
            <View style={styles.selectedAudioBox}>
              <View style={styles.audioIcon}>
                <Text style={{ fontSize: 24 }}>🎵</Text>
              </View>
              <View style={styles.audioDetails}>
                <Text numberOfLines={1} style={styles.audioFileName}>
                  {audio.name}
                </Text>
                {audio.size ? (
                  <Text style={styles.audioFileSize}>{formatFileSize(audio.size)}</Text>
                ) : null}
              </View>
              <Pressable
                onPress={handlePickAudio}
                disabled={busy}
                style={styles.changeAudioBtn}>
                <Text style={styles.changeAudioLabel}>Đổi file</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={handlePickAudio}
              disabled={busy}
              style={styles.pickAudioBtn}>
              <Text style={styles.pickAudioIcon}>📁</Text>
              <Text style={styles.pickAudioLabel}>Chọn tệp âm thanh từ thiết bị</Text>
              <Text style={styles.pickAudioSub}>Hỗ trợ .mp3, .m4a</Text>
            </Pressable>
          )}
        </View>

        {/* Section 2: Cover Image Picker */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>2. Ảnh bìa bài hát <Text style={styles.optionalNote}>(không bắt buộc)</Text></Text>
          <Text style={styles.cardSubtitle}>Tỉ lệ vuông 1:1, tối đa 5MB</Text>

          <View style={styles.coverRow}>
            <Pressable
              onPress={handlePickCover}
              disabled={busy}
              style={styles.coverPreviewContainer}>
              {cover ? (
                <Image source={cover.uri} style={styles.coverImage} />
              ) : (
                <View style={styles.coverPlaceholder}>
                  <Text style={{ fontSize: 30 }}>🖼️</Text>
                  <Text style={styles.coverPlaceholderText}>Chọn ảnh</Text>
                </View>
              )}
            </Pressable>

            <View style={styles.coverActions}>
              <Pressable
                onPress={handlePickCover}
                disabled={busy}
                style={styles.pickCoverBtn}>
                <Text style={styles.pickCoverLabel}>{cover ? 'Đổi ảnh bìa' : 'Thêm ảnh bìa'}</Text>
              </Pressable>
              {cover ? (
                <Pressable
                  onPress={() => setCover(null)}
                  disabled={busy}
                  style={styles.removeCoverBtn}>
                  <Text style={styles.removeCoverLabel}>Gỡ ảnh</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>

        {/* Section 3: Track Metadata */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>3. Thông tin bài hát</Text>

          {/* Title */}
          <Text style={styles.inputLabel}>Tên bài hát <Text style={styles.requiredStar}>*</Text></Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            maxLength={200}
            editable={!busy}
            placeholder="Ví dụ: Hoàng Hôn (Acoustic Version)"
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={styles.textInput}
          />

          {/* Genre */}
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

          {/* Genre Quick Suggestion Chips */}
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
        </View>

        {/* Notice Info Box */}
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>
            💡 Bài hát sau khi tải lên sẽ được công khai ngay lập tức trên hệ thống và người nghe có thể tìm kiếm, nghe trực tuyến.
          </Text>
        </View>

        {/* Submit Button */}
        <Pressable
          accessibilityRole="button"
          onPress={handleSubmit}
          disabled={busy}
          style={[styles.submitButton, busy && styles.submitButtonDisabled]}>
          {busy ? (
            <View style={styles.busyRow}>
              <ActivityIndicator color={MusicColors.brown} style={{ marginRight: 8 }} />
              <Text style={styles.submitButtonLabel}>Đang xử lý tải lên...</Text>
            </View>
          ) : (
            <Text style={styles.submitButtonLabel}>Xác nhận tải bài hát</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
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
  requiredStar: {
    color: '#FF8A8A',
  },
  optionalNote: {
    fontFamily: MusicFonts.medium,
    fontSize: 12,
    color: MusicColors.sand,
    opacity: 0.6,
  },
  pickAudioBtn: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: MusicColors.gold,
    borderRadius: 14,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  pickAudioIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  pickAudioLabel: {
    fontFamily: MusicFonts.semiBold,
    fontSize: 14,
    color: MusicColors.cream,
  },
  pickAudioSub: {
    fontFamily: MusicFonts.medium,
    fontSize: 11,
    color: MusicColors.sand,
    opacity: 0.7,
    marginTop: 4,
  },
  selectedAudioBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: MusicColors.gold,
  },
  audioIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(221,189,134,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  audioDetails: {
    flex: 1,
  },
  audioFileName: {
    fontFamily: MusicFonts.semiBold,
    fontSize: 14,
    color: MusicColors.cream,
  },
  audioFileSize: {
    fontFamily: MusicFonts.medium,
    fontSize: 12,
    color: MusicColors.sand,
    opacity: 0.8,
    marginTop: 2,
  },
  changeAudioBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  changeAudioLabel: {
    fontFamily: MusicFonts.medium,
    fontSize: 12,
    color: MusicColors.sand,
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
  noticeBox: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: MusicColors.gold,
  },
  noticeText: {
    fontFamily: MusicFonts.medium,
    fontSize: 12,
    color: MusicColors.sand,
    opacity: 0.85,
    lineHeight: 18,
  },
  submitButton: {
    backgroundColor: MusicColors.gold,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitButtonLabel: {
    fontFamily: MusicFonts.bold,
    fontSize: 15,
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
  },
});
