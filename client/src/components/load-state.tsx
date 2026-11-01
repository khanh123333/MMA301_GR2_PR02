import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { MusicColors, MusicFonts } from '@/constants/theme';

type Props = {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

/** Spinner or error-with-retry; renders nothing once loaded. */
export function LoadState({ loading, error, onRetry }: Props) {
  if (error) {
    return (
      <View style={styles.box}>
        <Text style={styles.message}>{error}</Text>
        <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retry}>
          <Text style={styles.retryLabel}>Thử lại</Text>
        </Pressable>
      </View>
    );
  }
  if (loading) {
    return (
      <View style={styles.box}>
        <ActivityIndicator accessibilityLabel="Đang tải" color={MusicColors.cream} />
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  message: {
    fontFamily: MusicFonts.medium,
    fontSize: 14,
    textAlign: 'center',
    color: '#ffffff',
  },
  retry: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ffffff',
    borderRadius: 40,
  },
  retryLabel: {
    fontFamily: MusicFonts.semiBold,
    fontSize: 14,
    color: '#ffffff',
  },
});
