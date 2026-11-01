import { Image } from 'expo-image';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MusicColors, MusicFonts } from '@/constants/theme';
import { usePlayer } from '@/hooks/use-player';
import type { Track } from '@/lib/api';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function QueueModal({ visible, onClose }: Props) {
  const { queue, index, playIndex, removeFromQueue, clearUpcomingQueue } = usePlayer();

  const currentTrack = queue[index] ?? null;
  const upcomingTracks = queue.slice(index + 1);
  const previousTracks = queue.slice(0, index);

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}>
      <Pressable accessibilityLabel="Đóng hàng đợi" onPress={onClose} style={styles.backdrop} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Hàng đợi phát</Text>
            <Text style={styles.subtitle}>{queue.length} bài hát trong danh sách</Text>
          </View>
          <View style={styles.headerActions}>
            {upcomingTracks.length > 0 && (
              <Pressable
                accessibilityRole="button"
                onPress={clearUpcomingQueue}
                style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>Dọn hàng đợi</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng"
              hitSlop={12}
              onPress={onClose}
              style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}>
          {/* Đang phát */}
          <Text style={styles.sectionHeader}>ĐANG PHÁT</Text>
          {currentTrack ? (
            <View style={styles.currentTrackCard}>
              <Image source={currentTrack.artwork} style={styles.cover} />
              <View style={styles.trackInfo}>
                <Text numberOfLines={1} style={styles.currentTrackTitle}>
                  {currentTrack.title}
                </Text>
                <Text numberOfLines={1} style={styles.trackArtist}>
                  {currentTrack.artist}
                </Text>
              </View>
              <View style={styles.playingBadge}>
                <Text style={styles.playingBadgeText}>Đang phát 🎵</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.emptyText}>Chưa có bài hát nào</Text>
          )}

          {/* Tiếp theo */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionHeader}>
              TIẾP THEO {upcomingTracks.length > 0 ? `(${upcomingTracks.length})` : ''}
            </Text>
          </View>

          {upcomingTracks.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Không có bài hát nào tiếp theo</Text>
              <Text style={styles.emptySub}>
                Bấm nút (...) trên bài hát bất kỳ để "Phát tiếp theo" hoặc "Thêm vào hàng đợi"
              </Text>
            </View>
          ) : (
            upcomingTracks.map((item, i) => {
              const actualIndex = index + 1 + i;
              return (
                <View key={`${item.source}/${item.id}-${actualIndex}`} style={styles.queueItem}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Phát ${item.title}`}
                    onPress={() => playIndex(actualIndex)}
                    style={styles.itemPressable}>
                    <Text style={styles.itemIndex}>{i + 1}</Text>
                    <Image source={item.artwork} style={styles.itemCover} />
                    <View style={styles.trackInfo}>
                      <Text numberOfLines={1} style={styles.trackTitle}>
                        {item.title}
                      </Text>
                      <Text numberOfLines={1} style={styles.trackArtist}>
                        {item.artist}
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Gỡ ${item.title} khỏi hàng đợi`}
                    hitSlop={12}
                    onPress={() => removeFromQueue(actualIndex)}
                    style={styles.removeBtn}>
                    <Text style={styles.removeBtnText}>✕</Text>
                  </Pressable>
                </View>
              );
            })
          )}

          {/* Đã phát trước đó */}
          {previousTracks.length > 0 && (
            <>
              <Text style={[styles.sectionHeader, { marginTop: 24 }]}>
                ĐÃ PHÁT TRƯỚC ĐÓ ({previousTracks.length})
              </Text>
              {previousTracks.map((item, i) => (
                <View key={`prev-${item.source}/${item.id}-${i}`} style={[styles.queueItem, styles.prevItem]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Phát lại ${item.title}`}
                    onPress={() => playIndex(i)}
                    style={styles.itemPressable}>
                    <Image source={item.artwork} style={[styles.itemCover, { opacity: 0.6 }]} />
                    <View style={styles.trackInfo}>
                      <Text numberOfLines={1} style={[styles.trackTitle, { opacity: 0.7 }]}>
                        {item.title}
                      </Text>
                      <Text numberOfLines={1} style={[styles.trackArtist, { opacity: 0.6 }]}>
                        {item.artist}
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Gỡ ${item.title}`}
                    hitSlop={12}
                    onPress={() => removeFromQueue(i)}
                    style={styles.removeBtn}>
                    <Text style={styles.removeBtnText}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  sheet: {
    height: '75%',
    backgroundColor: '#1E1210',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(221, 189, 134, 0.25)',
    paddingTop: 12,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  title: {
    fontFamily: MusicFonts.bold,
    fontSize: 20,
    color: '#ffffff',
  },
  subtitle: {
    fontFamily: MusicFonts.medium,
    fontSize: 13,
    color: MusicColors.sand,
    opacity: 0.8,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(221, 189, 134, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(221, 189, 134, 0.35)',
  },
  clearBtnText: {
    fontFamily: MusicFonts.medium,
    fontSize: 12,
    color: MusicColors.gold,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: '#ffffff',
    fontFamily: MusicFonts.bold,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  sectionHeader: {
    fontFamily: MusicFonts.bold,
    fontSize: 12,
    letterSpacing: 1,
    color: MusicColors.gold,
    marginBottom: 10,
  },
  currentTrackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(221, 189, 134, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(221, 189, 134, 0.35)',
    borderRadius: 16,
    padding: 12,
  },
  cover: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: MusicColors.brown,
  },
  trackInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  currentTrackTitle: {
    fontFamily: MusicFonts.bold,
    fontSize: 15,
    color: '#ffffff',
  },
  trackTitle: {
    fontFamily: MusicFonts.medium,
    fontSize: 15,
    color: '#ffffff',
  },
  trackArtist: {
    fontFamily: MusicFonts.medium,
    fontSize: 13,
    color: MusicColors.sand,
    opacity: 0.8,
    marginTop: 3,
  },
  playingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(227, 78, 31, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(227, 78, 31, 0.5)',
  },
  playingBadgeText: {
    fontFamily: MusicFonts.semiBold,
    fontSize: 12,
    color: '#FF6B4A',
  },
  emptyBox: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
  },
  emptyText: {
    fontFamily: MusicFonts.medium,
    fontSize: 14,
    color: MusicColors.cream,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: MusicFonts.medium,
    fontSize: 12,
    color: MusicColors.sand,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  prevItem: {
    opacity: 0.75,
  },
  itemPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIndex: {
    width: 20,
    fontFamily: MusicFonts.medium,
    fontSize: 13,
    color: MusicColors.sand,
    opacity: 0.6,
  },
  itemCover: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: MusicColors.brown,
  },
  removeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});
