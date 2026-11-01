import { BlurTargetView, BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { router, usePathname } from 'expo-router';
import { Tabs, TabList, TabSlot, TabTrigger } from 'expo-router/ui';
import { useRef, type ComponentRef, type RefObject } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { gradient, MusicColors, MusicFonts } from '@/constants/theme';
import { usePlayer } from '@/hooks/use-player';

type BlurTarget = RefObject<ComponentRef<typeof BlurTargetView> | null>;

const blurProps = { tint: 'default', blurMethod: 'dimezisBlurViewSdk31Plus' } as const;

export default function AppTabs() {
  const blurTarget = useRef<ComponentRef<typeof BlurTargetView>>(null);
  const { track } = usePlayer();

  return (
    <Tabs style={styles.fill}>
      <BlurTargetView ref={blurTarget} style={styles.fill}>
        <TabSlot style={styles.slot} />
      </BlurTargetView>
      {/* The visible nav changes shape with the mini-player, so these only declare the routes. */}
      <TabList style={styles.hidden}>
        <TabTrigger name="index" href="/" />
        <TabTrigger name="library" href="/library" />
        <TabTrigger name="search" href="/search" />
      </TabList>
      {track ? <MiniPlayer blurTarget={blurTarget} /> : <NavBar blurTarget={blurTarget} />}
    </Tabs>
  );
}

function NavBar({ blurTarget }: { blurTarget: BlurTarget }) {
  const pathname = usePathname();
  const onLibrary = pathname === '/library';
  const onDiscover = pathname === '/';
  const bottom = Math.max(useSafeAreaInsets().bottom, 34) + 12;

  return (
    <>
      <View
        pointerEvents="none"
        style={[
          styles.strip,
          { height: bottom + 65 },
          gradient('linear-gradient(180.87deg, rgb(141, 63, 44) 73%, rgba(227, 78, 31, 0) 181%)'),
        ]}
      />
      <View style={[styles.pill, { bottom }, onLibrary && styles.pillOutlined]}>
        <BlurView blurTarget={blurTarget} intensity={30} style={styles.pillBlur} {...blurProps} />
        {onDiscover && (
          <Image
            source={require('@/assets/images/music/nav-active-discover.svg')}
            contentFit="fill"
            style={styles.activeDiscover}
          />
        )}
        {onLibrary && (
          <Image
            source={require('@/assets/images/music/nav-active-library.svg')}
            contentFit="fill"
            style={styles.activeLibrary}
          />
        )}
        <Image
          source={
            onLibrary
              ? require('@/assets/images/music/nav-music.svg')
              : require('@/assets/images/music/nav-music-active.svg')
          }
          contentFit="fill"
          style={onLibrary ? styles.musicOnLibrary : styles.musicOnDiscover}
        />
        <Image
          source={require('@/assets/images/music/nav-library-sprite.svg')}
          contentFit="fill"
          style={[styles.sprite, { top: onLibrary ? 12 : 11 }]}
        />
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel="Khám phá"
          accessibilityState={{ selected: onDiscover }}
          onPress={() => router.navigate('/')}
          style={styles.discoverHit}
        />
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel="Thư viện"
          accessibilityState={{ selected: onLibrary }}
          onPress={() => router.navigate('/library')}
          style={styles.libraryHit}
        />
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel="Tìm kiếm"
          accessibilityState={{ selected: pathname === '/search' }}
          onPress={() => router.navigate('/search')}
          style={styles.searchHit}
        />
      </View>
    </>
  );
}

function MiniPlayer({ blurTarget }: { blurTarget: BlurTarget }) {
  const { track, isPlaying, toggle } = usePlayer();
  const pathname = usePathname();
  const onLibrary = pathname === '/library';
  const onDiscover = pathname === '/';
  const paddingBottom = Math.max(useSafeAreaInsets().bottom, 34) + 11;

  if (!track) return null;

  return (
    <View style={[styles.panel, { paddingBottom }]}>
      <BlurView blurTarget={blurTarget} intensity={40} style={StyleSheet.absoluteFill} {...blurProps} />
      <View
        style={[
          StyleSheet.absoluteFill,
          gradient('linear-gradient(180deg, rgba(227, 78, 31, 0.6), rgba(107, 56, 48, 0.6))'),
        ]}
      />
      <View style={styles.miniRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Mở trình phát, ${track.title} của ${track.artist}`}
          onPress={() => router.push('/player')}
          style={styles.miniTrack}>
          <Image source={track.artwork} style={styles.miniArt} />
          <View style={styles.fill}>
            <Text numberOfLines={1} style={styles.miniTitle}>
              {track.title}
            </Text>
            <Text numberOfLines={1} style={styles.miniArtist}>
              {track.artist}
            </Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Tạm dừng' : 'Phát'}
          onPress={toggle}>
          <Image
            source={
              isPlaying
                ? require('@/assets/images/music/button-pause-small.svg')
                : require('@/assets/images/music/button-play.svg')
            }
            contentFit="fill"
            style={styles.miniButton}
          />
        </Pressable>
      </View>
      <View style={styles.bigNav}>
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel="Khám phá"
          accessibilityState={{ selected: onDiscover }}
          onPress={() => router.navigate('/')}
          style={[styles.bigNavCell, onDiscover && styles.bigNavActive]}>
          <Image
            source={require('@/assets/images/music/nav-music-large.svg')}
            contentFit="fill"
            style={styles.bigMusic}
          />
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel="Thư viện"
          accessibilityState={{ selected: onLibrary }}
          onPress={() => router.navigate('/library')}
          style={[styles.bigNavCell, onLibrary && styles.bigNavActive]}>
          <Image
            source={require('@/assets/images/music/nav-library-large.svg')}
            contentFit="fill"
            style={styles.bigIcon}
          />
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel="Tìm kiếm"
          accessibilityState={{ selected: pathname === '/search' }}
          onPress={() => router.navigate('/search')}
          style={[styles.bigNavSearch, pathname === '/search' && styles.bigNavActive]}>
          <Image
            source={require('@/assets/images/music/nav-search-large.svg')}
            contentFit="fill"
            style={styles.bigIcon}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  slot: {
    height: '100%',
  },
  hidden: {
    display: 'none',
  },
  strip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  pill: {
    position: 'absolute',
    alignSelf: 'center',
    width: 205,
    height: 54,
    borderRadius: 40,
    backgroundColor: 'rgba(207, 174, 174, 0.5)',
  },
  pillBlur: {
    ...StyleSheet.absoluteFill,
    borderRadius: 40,
    overflow: 'hidden',
  },
  pillOutlined: {
    borderWidth: 1,
    borderColor: MusicColors.cream,
  },
  activeDiscover: {
    position: 'absolute',
    left: 0,
    top: -1,
    width: 55,
    height: 55,
  },
  activeLibrary: {
    position: 'absolute',
    left: 74,
    top: -2,
    width: 56,
    height: 56,
  },
  musicOnDiscover: {
    position: 'absolute',
    left: 8,
    top: 9,
    width: 31.83,
    height: 31.83,
  },
  musicOnLibrary: {
    position: 'absolute',
    left: 11,
    top: 9,
    width: 31.83,
    height: 30.7,
  },
  sprite: {
    position: 'absolute',
    left: 88,
    width: 101,
    height: 30,
  },
  discoverHit: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 70,
  },
  libraryHit: {
    position: 'absolute',
    left: 70,
    top: 0,
    bottom: 0,
    width: 66,
  },
  searchHit: {
    position: 'absolute',
    left: 136,
    top: 0,
    bottom: 0,
    width: 69,
  },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 20,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
  },
  miniRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 12,
  },
  miniTrack: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 19,
  },
  miniArt: {
    width: 62,
    height: 62,
    borderRadius: 6.2,
    backgroundColor: MusicColors.brown,
  },
  miniTitle: {
    fontFamily: MusicFonts.medium,
    fontSize: 16,
    lineHeight: 24,
    color: '#ffffff',
  },
  miniArtist: {
    fontFamily: MusicFonts.medium,
    fontSize: 16,
    lineHeight: 24,
    color: MusicColors.cream,
  },
  miniButton: {
    width: 40,
    height: 40,
  },
  bigNav: {
    flexDirection: 'row',
    padding: 8,
    borderRadius: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  bigNavCell: {
    width: 72,
    height: 72,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigNavActive: {
    backgroundColor: MusicColors.brown,
  },
  bigNavSearch: {
    width: 72,
    height: 72,
    borderRadius: 40,
    paddingLeft: 36,
    paddingTop: 21,
  },
  bigMusic: {
    width: 23.83,
    height: 23.83,
  },
  bigIcon: {
    width: 30,
    height: 30,
  },
});
