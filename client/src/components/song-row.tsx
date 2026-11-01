import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MusicColors, MusicFonts } from '@/constants/theme';
import type { Track } from '@/lib/api';

type Props = {
  track: Track;
  onPress: () => void;
  onMore: () => void;
  onRemove?: () => void;
};

export function SongRow({ track, onPress, onMore, onRemove }: Props) {
  const unavailable = track.isAvailable === false;

  return (
    <View style={[styles.row, unavailable && styles.unavailable]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Phát ${track.title} của ${track.artist}`}
        accessibilityState={{ disabled: unavailable }}
        disabled={unavailable}
        onPress={onPress}
        style={styles.main}>
        <Image source={track.artwork} style={styles.cover} />
        <View style={styles.text}>
          <Text numberOfLines={1} style={styles.title}>
            {track.title}
          </Text>
          <Text numberOfLines={1} style={styles.artist}>
            {unavailable ? 'Không khả dụng' : track.artist}
          </Text>
        </View>
      </Pressable>
      {onRemove && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Xóa ${track.title} khỏi playlist`}
          hitSlop={12}
          onPress={onRemove}
          style={styles.removeHit}>
          <Text style={styles.removeText}>✕</Text>
        </Pressable>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Tùy chọn cho ${track.title}`}
        hitSlop={12}
        onPress={onMore}
        style={styles.moreHit}>
        <Image source={require('@/assets/images/music/more.svg')} contentFit="fill" style={styles.more} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    height: 80,
    marginBottom: 16,
    marginLeft: 21,
    marginRight: 30,
  },
  unavailable: {
    opacity: 0.5,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
  },
  cover: {
    width: 80,
    height: 80,
    borderWidth: 1,
    borderColor: MusicColors.cream,
    borderRadius: 20,
    backgroundColor: MusicColors.brown,
  },
  text: {
    flex: 1,
    paddingTop: 13,
    marginLeft: 13,
    marginRight: 12,
  },
  title: {
    fontFamily: MusicFonts.bold,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: 0.25,
    color: '#ffffff',
  },
  artist: {
    marginTop: 8,
    marginLeft: 3,
    fontFamily: MusicFonts.semiBold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.25,
    color: MusicColors.cream,
  },
  moreHit: {
    marginTop: 32,
    height: 3,
  },
  more: {
    width: 19,
    height: 3,
  },
  removeHit: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginRight: 8,
  },
  removeText: {
    fontFamily: MusicFonts.bold,
    fontSize: 16,
    color: '#ff7b72',
  },
});
