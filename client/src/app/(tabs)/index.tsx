import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LoadState } from '@/components/load-state';
import { ScreenHeader } from '@/components/screen-header';
import { TrackMenu } from '@/components/track-menu';
import { gradient, MusicColors, MusicFonts } from '@/constants/theme';
import { useFetch } from '@/hooks/use-fetch';
import { usePlayer, useTabBarSpace } from '@/hooks/use-player';
import type { Track } from '@/lib/api';

const CARD_STYLES = [
  { borderColor: '#EADAAD', glow: 'rgba(221,189,134,0.4)' },
  { borderColor: '#DDBD86', glow: 'rgba(241,213,95,0.4)' },
];
const HITS_PER_ROW = 6;

const keyOf = (track: Track) => `${track.source}/${track.id}`;

export default function DiscoverScreen() {
  const { open } = usePlayer();
  const paddingBottom = useTabBarSpace();
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);
  const trending = useFetch<Track[]>('/api/tracks/trending');
  const latest = useFetch<Track[]>('/api/tracks/latest');

  const tracks = trending.data ?? [];
  const recommended = tracks.slice(0, CARD_STYLES.length);
  const hits = tracks.slice(CARD_STYLES.length);
  // shortcut: the API has no artist endpoint, so the row is drawn from trending tracks and their artwork
  const artists = [...new Map(tracks.map((track) => [track.artist, track])).values()].slice(0, 4);
  const hitRows = Array.from({ length: Math.ceil(hits.length / HITS_PER_ROW) }, (_, row) =>
    hits.slice(row * HITS_PER_ROW, (row + 1) * HITS_PER_ROW),
  );

  return (
    <ScrollView
      style={[
        styles.screen,
        gradient('linear-gradient(215.27deg, rgb(227, 78, 31) 4.81%, rgb(107, 56, 48) 92.97%)'),
      ]}
      contentContainerStyle={{ paddingBottom }}
      showsVerticalScrollIndicator={false}>
      <ScreenHeader title="Khám phá" />

      <Text style={styles.recommended}>Dành cho bạn</Text>
      <LoadState loading={trending.loading} error={trending.error} onRetry={trending.reload} />
      {recommended.map((track, i) => (
        <Pressable
          key={keyOf(track)}
          accessibilityRole="button"
          accessibilityLabel={`Phát ${track.title} của ${track.artist}`}
          onPress={() => open(track, recommended)}
          style={[
            styles.card,
            { borderColor: CARD_STYLES[i].borderColor },
            gradient(`radial-gradient(ellipse 347px 431px at 3px 4px, ${CARD_STYLES[i].glow}, rgba(255, 255, 255, 0))`),
          ]}>
          <Image source={track.artwork} style={styles.cardImage} />
          <Text numberOfLines={1} style={styles.cardName}>
            {track.artist}
          </Text>
          <Text numberOfLines={1} style={styles.cardTitle}>
            {track.title}
          </Text>
          <Image source={require('@/assets/images/music/play-circle.png')} style={styles.playCircle} />
          <Image
            source={require('@/assets/images/music/play-triangle.svg')}
            contentFit="fill"
            style={styles.playTriangle}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Tùy chọn cho ${track.title}`}
            hitSlop={8}
            onPress={(e) => {
              (e as unknown as { stopPropagation?: () => void }).stopPropagation?.();
              setMenuTrack(track);
            }}
            style={styles.cardMore}>
            <Image
              source={require('@/assets/images/music/more.svg')}
              contentFit="fill"
              style={styles.cardMoreIcon}
            />
          </Pressable>
        </Pressable>
      ))}

      {artists.length > 0 && (
        <>
          <Text style={styles.artistHeading}>Nghệ sĩ</Text>
          <View style={styles.artists}>
            {artists.map((track) => (
              <View key={track.artist} style={styles.artist}>
                <Image source={track.artwork} style={styles.artistImage} />
                <Text numberOfLines={1} style={styles.artistName}>
                  {track.artist}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      {hitRows.map((songs, row) => (
        <HitRow key={row} heading="Thịnh hành hôm nay" songs={songs} onPlay={open} />
      ))}
      {!!latest.data?.length && <HitRow heading="Mới từ nghệ sĩ" songs={latest.data} onPlay={open} />}

      <TrackMenu track={menuTrack} onClose={() => setMenuTrack(null)} />
    </ScrollView>
  );
}

type HitRowProps = {
  heading: string;
  songs: Track[];
  onPlay: (track: Track, queue: Track[]) => void;
};

function HitRow({ heading, songs, onPlay }: HitRowProps) {
  return (
    <View>
      <Text style={styles.hitsHeading}>{heading}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hits}>
        {songs.map((song) => (
          <Pressable
            key={keyOf(song)}
            accessibilityRole="button"
            accessibilityLabel={`Phát ${song.title} của ${song.artist}`}
            onPress={() => onPlay(song, songs)}>
            <Image source={song.artwork} style={styles.hitImage} />
            <Text numberOfLines={1} style={styles.hitTitle}>
              {song.title}
            </Text>
            <Text numberOfLines={1} style={styles.hitArtist}>
              {song.artist}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  recommended: {
    marginTop: 26,
    marginBottom: 36,
    marginLeft: 28,
    fontFamily: MusicFonts.semiBold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.25,
    color: MusicColors.gold,
  },
  card: {
    height: 142,
    marginLeft: 21,
    marginRight: 26,
    marginBottom: 27,
    borderWidth: 1,
    borderRadius: 20,
  },
  cardImage: {
    position: 'absolute',
    top: -1,
    right: -3,
    bottom: -1,
    width: 134,
    borderRadius: 24,
    backgroundColor: MusicColors.brown,
  },
  cardName: {
    position: 'absolute',
    left: 21,
    right: 140,
    top: 11,
    fontFamily: MusicFonts.bold,
    fontSize: 17,
    lineHeight: 26,
    letterSpacing: 0.25,
    color: '#ffffff',
  },
  cardTitle: {
    position: 'absolute',
    left: 21,
    right: 140,
    top: 41,
    fontFamily: MusicFonts.semiBold,
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: 0.25,
    color: MusicColors.sand,
    opacity: 0.87,
  },
  playCircle: {
    position: 'absolute',
    left: 21,
    top: 70,
    width: 40,
    height: 40,
  },
  playTriangle: {
    position: 'absolute',
    left: 30.33,
    top: 80.6,
    width: 26.76,
    height: 26.77,
  },
  cardMore: {
    position: 'absolute',
    left: 74,
    top: 74,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 208, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardMoreIcon: {
    width: 16,
    height: 3,
  },
  artistHeading: {
    marginTop: -9,
    marginLeft: 20,
    fontFamily: MusicFonts.semiBold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.25,
    color: MusicColors.cream,
    opacity: 0.87,
  },
  artists: {
    flexDirection: 'row',
    marginTop: 15,
    marginLeft: 9.5,
  },
  artist: {
    width: 91,
    alignItems: 'center',
  },
  artistImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: MusicColors.brown,
  },
  artistName: {
    maxWidth: 84,
    marginTop: 4,
    fontFamily: MusicFonts.medium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.25,
    color: '#ffffff',
    opacity: 0.87,
  },
  hitsHeading: {
    marginTop: 34,
    marginBottom: 24,
    marginLeft: 13,
    fontFamily: MusicFonts.semiBold,
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 0.25,
    color: MusicColors.cream,
    opacity: 0.87,
  },
  hits: {
    gap: 30,
    paddingHorizontal: 8,
  },
  hitImage: {
    width: 132,
    height: 142,
    borderWidth: 1,
    borderColor: MusicColors.cream,
    borderRadius: 24,
    backgroundColor: MusicColors.brown,
  },
  hitTitle: {
    width: 127,
    marginTop: 9,
    marginLeft: 5,
    fontFamily: MusicFonts.semiBold,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0.25,
    color: '#ffffff',
  },
  hitArtist: {
    width: 127,
    marginLeft: 5,
    fontFamily: MusicFonts.semiBold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.25,
    color: MusicColors.cream,
  },
});
