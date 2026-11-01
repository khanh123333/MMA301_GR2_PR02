import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput } from 'react-native';

import { LoadState } from '@/components/load-state';
import { ScreenHeader } from '@/components/screen-header';
import { SongRow } from '@/components/song-row';
import { TrackMenu } from '@/components/track-menu';
import { gradient, MusicColors, MusicFonts } from '@/constants/theme';
import { useFetch } from '@/hooks/use-fetch';
import { usePlayer, useTabBarSpace } from '@/hooks/use-player';
import type { Track } from '@/lib/api';

export default function SearchScreen() {
  const { open } = usePlayer();
  const paddingBottom = useTabBarSpace();
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);
  const results = useFetch<Track[]>(query ? `/api/tracks/search?q=${encodeURIComponent(query)}` : null);
  const songs = results.data ?? [];

  return (
    <ScrollView
      style={[
        styles.screen,
        gradient('linear-gradient(211.1deg, rgb(227, 78, 31) 4.81%, rgb(107, 56, 48) 92.97%)'),
      ]}
      contentContainerStyle={{ paddingBottom }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      <ScreenHeader title="Tìm kiếm" />

      <TextInput
        accessibilityLabel="Tìm bài hát hoặc nghệ sĩ"
        value={text}
        onChangeText={setText}
        onSubmitEditing={() => setQuery(text.trim())}
        placeholder="Bài hát, nghệ sĩ"
        placeholderTextColor="rgba(255, 255, 208, 0.6)"
        returnKeyType="search"
        maxLength={100}
        style={styles.input}
      />

      <LoadState loading={results.loading} error={results.error} onRetry={results.reload} />
      {!results.loading && results.data && songs.length === 0 && (
        <Text style={styles.empty}>Không tìm thấy bài hát</Text>
      )}
      {!results.loading &&
        songs.map((song) => (
          <SongRow
            key={`${song.source}/${song.id}`}
            track={song}
            onPress={() => open(song, songs)}
            onMore={() => setMenuTrack(song)}
          />
        ))}

      <TrackMenu track={menuTrack} onClose={() => setMenuTrack(null)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  input: {
    height: 44,
    marginTop: 25,
    marginBottom: 24,
    marginHorizontal: 20,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: MusicColors.cream,
    borderRadius: 40,
    fontFamily: MusicFonts.medium,
    fontSize: 15,
    color: '#ffffff',
  },
  empty: {
    marginLeft: 20,
    fontFamily: MusicFonts.medium,
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.87,
  },
});
