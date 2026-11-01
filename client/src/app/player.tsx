import { Image } from 'expo-image';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { QueueModal } from '@/components/queue-modal';
import { TrackMenu } from '@/components/track-menu';
import { gradient, MusicColors, MusicFonts } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useFetch } from '@/hooks/use-fetch';
import { usePlayer } from '@/hooks/use-player';
import { api } from '@/lib/api';
import { goBack } from '@/lib/go-back';

const THUMB_SIZE = 16;

const clock = (seconds: number) => {
  const total = Math.max(Math.floor(seconds), 0);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

export default function PlayerScreen() {
  const { user } = useAuth();
  const { track, isPlaying, position, duration, loop, toggle, next, previous, seek, toggleLoop, notify } = usePlayer();
  const paddingTop = Math.max(useSafeAreaInsets().top, 42) + 22;
  const [menuOpen, setMenuOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [barWidth, setBarWidth] = useState(0);
  const [barLeft, setBarLeft] = useState(0);

  const trackKey = track ? `${track.source}/${track.id}` : '';
  const favPath = user && track ? `/api/me/favorites/${track.source.toLowerCase()}/${track.id}` : null;
  const favFetch = useFetch<{ isFavorite: boolean }>(favPath);
  const [override, setOverride] = useState<{ key: string; value: boolean } | null>(null);
  const [favBusy, setFavBusy] = useState(false);

  // A reload or deep link lands here with no track selected.
  if (!track) return <Redirect href="/" />;

  const isFavorite = override?.key === trackKey ? override.value : Boolean(favFetch.data?.isFavorite);

  const toggleFavorite = async () => {
    if (!user) {
      notify('Đăng nhập để lưu bài hát');
      router.push('/account');
      return;
    }
    if (favBusy) return;
    setFavBusy(true);
    const nextState = !isFavorite;
    setOverride({ key: trackKey, value: nextState });
    const path = `/api/me/favorites/${track.source.toLowerCase()}/${track.id}`;
    try {
      if (nextState) {
        await api(path, { method: 'PUT' });
        notify('Đã thêm vào yêu thích');
      } else {
        await api(path, { method: 'DELETE' });
        notify('Đã bỏ thích');
      }
      favFetch.reload();
    } catch (err) {
      setOverride({ key: trackKey, value: !nextState });
      notify((err as Error).message);
    } finally {
      setFavBusy(false);
    }
  };

  const progress = duration > 0 ? Math.min(position / duration, 1) : 0;

  return (
    <View
      style={[
        styles.screen,
        gradient('linear-gradient(179deg, rgb(227, 78, 31) 1.99%, rgb(107, 56, 48) 136.42%)'),
      ]}>
      {track.artwork && <Image source={track.artwork} blurRadius={10} style={styles.backdrop} />}
      <View
        style={[
          styles.tint,
          gradient('linear-gradient(201.53deg, rgb(227, 78, 31) 4.83%, rgb(141, 63, 44) 82.96%)'),
        ]}
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop }]} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng trình phát"
            onPress={goBack}
            style={styles.close}>
            <Image source={require('@/assets/images/music/dropdown.svg')} contentFit="fill" style={styles.icon} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tùy chọn bài hát"
            onPress={() => setMenuOpen(true)}
            style={styles.icon}>
            <Image source={require('@/assets/images/music/more.svg')} contentFit="fill" style={styles.more} />
          </Pressable>
        </View>

        <Image source={track.artwork} style={styles.art} />

        <View style={styles.titleRow}>
          <View style={styles.titleInfo}>
            <Text numberOfLines={1} style={styles.title}>
              {track.title}
            </Text>
            <Text numberOfLines={1} style={styles.artist}>
              {track.artist}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? 'Bỏ thích bài hát' : 'Thích bài hát'}
            hitSlop={12}
            onPress={toggleFavorite}
            style={styles.heartButton}>
            <Image
              source={
                isFavorite
                  ? require('@/assets/images/music/heart-filled.svg')
                  : require('@/assets/images/music/heart-outline.svg')
              }
              contentFit="contain"
              style={styles.heartIcon}
            />
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="adjustable"
          accessibilityLabel="Tiến độ bài hát"
          accessibilityValue={{ text: `${clock(position)} / ${clock(duration)}` }}
          onLayout={(event) => {
            setBarWidth(event.nativeEvent.layout.width);
            setBarLeft(event.nativeEvent.layout.x);
          }}
          onPress={(event) => {
            // pageX, since locationX is relative to whichever child was touched and missing on web
            const ratio = (event.nativeEvent.pageX - barLeft) / barWidth;
            if (duration > 0 && barWidth > 0) seek(Math.min(Math.max(ratio, 0), 1) * duration);
          }}
          style={styles.bar}>
          <Image source={require('@/assets/images/music/progress.svg')} contentFit="fill" style={styles.line} />
          <Image
            source={require('@/assets/images/music/progress-thumb.svg')}
            contentFit="fill"
            style={[styles.thumb, { left: progress * (barWidth - THUMB_SIZE) }]}
          />
        </Pressable>
        <View style={styles.times}>
          <Text style={styles.time}>{clock(position)}</Text>
          <Text style={styles.time}>-{clock(duration - position)}</Text>
        </View>

        <View style={styles.controls}>
          <Pressable accessibilityRole="button" accessibilityLabel="Bài trước" hitSlop={12} onPress={previous} style={styles.icon}>
            <Image source={require('@/assets/images/music/previous.svg')} contentFit="fill" style={styles.previous} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Tạm dừng' : 'Phát'}
            onPress={toggle}
            style={styles.playHalo}>
            <Image
              source={
                isPlaying
                  ? require('@/assets/images/music/button-pause-base.svg')
                  : require('@/assets/images/music/button-play.svg')
              }
              contentFit="fill"
              style={styles.playButton}
            />
            {isPlaying && (
              <>
                <Image source={require('@/assets/images/music/pause-bar.svg')} contentFit="fill" style={[styles.pauseBar, styles.pauseBarLeft]} />
                <Image source={require('@/assets/images/music/pause-bar.svg')} contentFit="fill" style={[styles.pauseBar, styles.pauseBarRight]} />
              </>
            )}
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Bài tiếp theo" hitSlop={12} onPress={next}>
            <Image source={require('@/assets/images/music/next.svg')} contentFit="fill" style={styles.icon} />
          </Pressable>
        </View>

        <View style={styles.modes}>
          <Image source={require('@/assets/images/music/shuffle.svg')} contentFit="fill" style={styles.shuffle} />
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel="Lặp lại bài hát"
            accessibilityState={{ checked: loop }}
            hitSlop={12}
            onPress={toggleLoop}
            style={[styles.loop, loop && styles.loopOn]}>
            <Image source={require('@/assets/images/music/loop.svg')} contentFit="fill" style={styles.icon} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hàng đợi phát"
            hitSlop={12}
            onPress={() => setQueueOpen(true)}
            style={styles.queueBtn}>
            <Image source={require('@/assets/images/music/queue.svg')} contentFit="fill" style={styles.icon} />
          </Pressable>
        </View>
      </ScrollView>

      <TrackMenu
        track={menuOpen ? track : null}
        isFavorite={isFavorite}
        onClose={() => setMenuOpen(false)}
        onChanged={() => {
          setOverride({ key: trackKey, value: !isFavorite });
          favFetch.reload();
        }}
      />

      <QueueModal visible={queueOpen} onClose={() => setQueueOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: 'hidden',
    isolation: 'isolate',
  },
  backdrop: {
    position: 'absolute',
    top: -32,
    left: -88,
    right: -88,
    height: 868,
    borderRadius: 24,
    mixBlendMode: 'overlay',
  },
  tint: {
    ...StyleSheet.absoluteFill,
    opacity: 0.7,
    mixBlendMode: 'color',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 63,
  },
  topBar: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  close: {
    width: 32,
    height: 32,
    padding: 4,
  },
  icon: {
    width: 24,
    height: 24,
  },
  more: {
    position: 'absolute',
    left: 2,
    top: 10,
    width: 19,
    height: 3,
  },
  art: {
    width: 210,
    height: 210,
    marginTop: 26,
    borderRadius: 42,
    backgroundColor: MusicColors.brown,
  },
  titleRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 36,
  },
  titleInfo: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontFamily: MusicFonts.medium,
    fontSize: 28,
    lineHeight: 38,
    color: '#ffffff',
  },
  artist: {
    marginTop: 2,
    fontFamily: MusicFonts.medium,
    fontSize: 16,
    lineHeight: 24,
    color: MusicColors.cream,
  },
  heartButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartIcon: {
    width: 24,
    height: 24,
  },
  bar: {
    alignSelf: 'stretch',
    height: 24,
    marginTop: 36,
  },
  line: {
    position: 'absolute',
    top: 6.5,
    left: 0,
    right: 0,
    height: 3,
  },
  thumb: {
    position: 'absolute',
    top: 0,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
  },
  times: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  time: {
    fontFamily: MusicFonts.medium,
    fontSize: 16,
    lineHeight: 24,
    color: MusicColors.cream,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 40,
    marginTop: 13,
  },
  previous: {
    position: 'absolute',
    left: 2,
    top: -1,
    width: 19.53,
    height: 26.12,
    transform: [{ scaleX: -1 }],
  },
  playHalo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  playButton: {
    width: 64,
    height: 64,
  },
  pauseBar: {
    position: 'absolute',
    top: 51,
    width: 3.31,
    height: 18.76,
  },
  pauseBarLeft: {
    left: 52,
  },
  pauseBarRight: {
    left: 63,
  },
  modes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 40,
    marginTop: 58,
  },
  shuffle: {
    width: 24,
    height: 17.23,
  },
  loop: {
    borderRadius: 8,
  },
  loopOn: {
    backgroundColor: MusicColors.brown,
  },
  queueBtn: {
    padding: 4,
    borderRadius: 8,
  },
});
