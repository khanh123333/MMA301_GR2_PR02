import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MusicFonts } from '@/constants/theme';

export function ScreenHeader({ title }: { title: string }) {
  const paddingTop = Math.max(useSafeAreaInsets().top, 42) + 55;

  return (
    <View style={[styles.header, { paddingTop }]}>
      <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>
        {title}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tài khoản"
        hitSlop={10}
        onPress={() => router.push('/account')}>
        <Image
          source={require('@/assets/images/music/profile.svg')}
          contentFit="fill"
          style={styles.profile}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
  },
  title: {
    flexShrink: 1,
    fontFamily: MusicFonts.semiBold,
    fontSize: 45,
    lineHeight: 52,
    color: '#ffffff',
  },
  profile: {
    width: 25.5,
    height: 25.5,
  },
});
