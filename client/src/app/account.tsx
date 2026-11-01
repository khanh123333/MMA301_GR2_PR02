import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { gradient, MusicColors, MusicFonts } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { usePlayer } from '@/hooks/use-player';
import { goBack } from '@/lib/go-back';

const ROLE_LABELS = { LISTENER: 'Người nghe', ARTIST: 'Nghệ sĩ', ADMIN: 'Admin' } as const;

export default function AccountScreen() {
  const { user, logout } = useAuth();
  const { stop } = usePlayer();
  const paddingTop = Math.max(useSafeAreaInsets().top, 42) + 22;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[
        styles.screen,
        gradient('linear-gradient(211.1deg, rgb(227, 78, 31) 4.81%, rgb(107, 56, 48) 92.97%)'),
      ]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop }]} keyboardShouldPersistTaps="handled">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          onPress={goBack}
          style={styles.back}>
          <Image source={require('@/assets/images/music/dropdown.svg')} contentFit="fill" style={styles.backIcon} />
        </Pressable>

        {user ? (
          <>
            <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>
              {user.name}
            </Text>
            <Text style={styles.detail}>{user.email}</Text>
            <View style={styles.roleBadgeContainer}>
              <Text style={styles.roleBadgeText}>{ROLE_LABELS[user.role]}</Text>
            </View>

            {user.role === 'ARTIST' && (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/artist')}
                style={styles.featureCardBtn}>
                <View style={styles.featureIconBox}>
                  <Text style={{ fontSize: 22 }}>🎙️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.featureCardTitle}>Studio Nghệ sĩ</Text>
                  <Text style={styles.featureCardSub}>Quản lý bài hát & tải bài mới lên</Text>
                </View>
                <Text style={styles.featureCardArrow}>›</Text>
              </Pressable>
            )}

            <Pressable
              accessibilityRole="button"
              onPress={async () => {
                stop();
                await logout();
                goBack();
              }}
              style={styles.submit}>
              <Text style={styles.submitLabel}>Đăng xuất</Text>
            </Pressable>
          </>
        ) : (
          <AuthForm />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function AuthForm() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'LISTENER' | 'ARTIST'>('LISTENER');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const registering = mode === 'register';

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await (registering ? register({ name, email, password, role }) : login({ email, password }));
      goBack();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <>
      <Text accessibilityRole="header" style={styles.title}>
        {registering ? 'Đăng ký' : 'Đăng nhập'}
      </Text>

      {registering && (
        <TextInput
          accessibilityLabel="Tên hiển thị"
          value={name}
          onChangeText={setName}
          placeholder="Tên hiển thị"
          placeholderTextColor="rgba(255, 255, 208, 0.6)"
          autoComplete="name"
          style={styles.input}
        />
      )}
      <TextInput
        accessibilityLabel="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor="rgba(255, 255, 208, 0.6)"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        style={styles.input}
      />
      <TextInput
        accessibilityLabel="Mật khẩu"
        value={password}
        onChangeText={setPassword}
        placeholder="Mật khẩu"
        placeholderTextColor="rgba(255, 255, 208, 0.6)"
        secureTextEntry
        autoComplete={registering ? 'new-password' : 'current-password'}
        style={styles.input}
      />

      {registering && (
        <View style={styles.roles}>
          {(['LISTENER', 'ARTIST'] as const).map((value) => (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ checked: role === value }}
              onPress={() => setRole(value)}
              style={[styles.role, role === value && styles.roleSelected]}>
              <Text style={styles.roleLabel}>{ROLE_LABELS[value]}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {error && (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        onPress={submit}
        style={[styles.submit, busy && styles.busy]}>
        <Text style={styles.submitLabel}>{registering ? 'Đăng ký' : 'Đăng nhập'}</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setMode(registering ? 'login' : 'register');
          setError(null);
        }}
        style={styles.switch}>
        <Text style={styles.switchLabel}>
          {registering ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}
        </Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  back: {
    width: 32,
    height: 32,
    padding: 4,
    marginLeft: -8,
    marginBottom: 24,
  },
  backIcon: {
    width: 24,
    height: 24,
  },
  title: {
    marginBottom: 24,
    fontFamily: MusicFonts.semiBold,
    fontSize: 36,
    lineHeight: 44,
    color: '#ffffff',
  },
  detail: {
    marginBottom: 8,
    fontFamily: MusicFonts.medium,
    fontSize: 16,
    lineHeight: 22,
    color: MusicColors.cream,
  },
  roleBadgeContainer: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(221,189,134,0.25)',
    borderWidth: 1,
    borderColor: MusicColors.gold,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    marginBottom: 20,
  },
  roleBadgeText: {
    fontFamily: MusicFonts.bold,
    fontSize: 13,
    color: MusicColors.gold,
  },
  featureCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(221,189,134,0.3)',
  },
  featureIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(221,189,134,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureCardTitle: {
    fontFamily: MusicFonts.bold,
    fontSize: 16,
    color: MusicColors.cream,
  },
  featureCardSub: {
    fontFamily: MusicFonts.medium,
    fontSize: 12,
    color: MusicColors.sand,
    opacity: 0.8,
    marginTop: 2,
  },
  featureCardArrow: {
    fontSize: 24,
    color: MusicColors.gold,
    marginLeft: 8,
  },
  input: {
    height: 48,
    marginBottom: 14,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: MusicColors.cream,
    borderRadius: 40,
    fontFamily: MusicFonts.medium,
    fontSize: 15,
    color: '#ffffff',
  },
  roles: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  role: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffffff',
    borderRadius: 40,
  },
  roleSelected: {
    backgroundColor: 'rgba(115, 65, 57, 0.92)',
  },
  roleLabel: {
    fontFamily: MusicFonts.semiBold,
    fontSize: 14,
    color: '#ffffff',
  },
  error: {
    marginBottom: 14,
    fontFamily: MusicFonts.semiBold,
    fontSize: 14,
    lineHeight: 20,
    color: MusicColors.cream,
  },
  submit: {
    height: 48,
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 40,
    backgroundColor: MusicColors.cream,
  },
  busy: {
    opacity: 0.6,
  },
  submitLabel: {
    fontFamily: MusicFonts.bold,
    fontSize: 16,
    color: MusicColors.brown,
  },
  switch: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  switchLabel: {
    fontFamily: MusicFonts.semiBold,
    fontSize: 14,
    color: '#ffffff',
  },
});
