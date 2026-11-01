import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { LoadState } from '@/components/load-state';
import { ScreenHeader } from '@/components/screen-header';
import { SongRow } from '@/components/song-row';
import { TrackMenu } from '@/components/track-menu';
import { gradient, MusicColors, MusicFonts } from '@/constants/theme';
import { useFetch } from '@/hooks/use-fetch';
import { usePlayer, useTabBarSpace } from '@/hooks/use-player';
import type { Track } from '@/lib/api';

const GENRES = ['Pop', 'Rock', 'Ballad', 'EDM', 'Acoustic', 'Lofi', 'R&B'] as const;

export default function SearchScreen() {
  const { open } = usePlayer();
  const paddingBottom = useTabBarSpace();
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);
  const results = useFetch<Track[]>(query ? `/api/tracks/search?q=${encodeURIComponent(query)}` : null);
  const songs = results.data ?? [];

  const handleSelectGenre = (genre: string) => {
    if (selectedGenre === genre) {
      setSelectedGenre(null);
      setText('');
      setQuery('');
    } else {
      setSelectedGenre(genre);
      setText(genre);
      setQuery(genre);
    }
  };

  const handleChangeText = (val: string) => {
    setText(val);
    if (selectedGenre && val.trim().toLowerCase() !== selectedGenre.toLowerCase()) {
      setSelectedGenre(null);
    }
  };

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
        onChangeText={handleChangeText}
        onSubmitEditing={() => setQuery(text.trim())}
        placeholder="Bài hát, nghệ sĩ hoặc thể loại"
        placeholderTextColor="rgba(255, 255, 208, 0.6)"
        returnKeyType="search"
        maxLength={100}
        style={styles.input}
      />

      <View style={styles.genreSection}>
        <Text style={styles.genreSectionTitle}>Thể loại phổ biến</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.genreScroll}>
          {GENRES.map((genre) => {
            const isSelected = selectedGenre === genre;
            return (
              <Pressable
                key={genre}
                accessibilityRole="button"
                onPress={() => handleSelectGenre(genre)}
                style={[styles.genreChip, isSelected && styles.genreChipSelected]}>
                <Text style={[styles.genreText, isSelected && styles.genreTextSelected]}>
                  {genre}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

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
    marginBottom: 16,
    marginHorizontal: 20,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: MusicColors.cream,
    borderRadius: 40,
    fontFamily: MusicFonts.medium,
    fontSize: 15,
    color: '#ffffff',
  },
  genreSection: {
    marginBottom: 20,
  },
  genreSectionTitle: {
    marginLeft: 22,
    marginBottom: 10,
    fontFamily: MusicFonts.semiBold,
    fontSize: 13,
    letterSpacing: 0.5,
    color: MusicColors.sand,
    opacity: 0.85,
    textTransform: 'uppercase',
  },
  genreScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  genreChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  genreChipSelected: {
    backgroundColor: MusicColors.cream,
    borderColor: MusicColors.cream,
  },
  genreText: {
    fontFamily: MusicFonts.medium,
    fontSize: 13,
    color: '#ffffff',
  },
  genreTextSelected: {
    fontFamily: MusicFonts.bold,
    color: MusicColors.brown,
  },
  empty: {
    marginLeft: 20,
    fontFamily: MusicFonts.medium,
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.87,
  },
});
