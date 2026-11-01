import * as SecureStore from 'expo-secure-store';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import { api, setOnSessionExpired, setToken, type User } from '@/lib/api';

const TOKEN_KEY = 'auth-token';

type Credentials = { email: string; password: string };
type Registration = Credentials & { name: string; role: 'LISTENER' | 'ARTIST' };

type Auth = {
  user: User | null;
  /** False until the stored session has been checked. */
  ready: boolean;
  login: (credentials: Credentials) => Promise<void>;
  register: (registration: Registration) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<Auth | null>(null);

// A failed write only costs staying signed in after a restart, so it must not fail the login
const saveToken = (value: string | null) =>
  (value ? SecureStore.setItemAsync(TOKEN_KEY, value) : SecureStore.deleteItemAsync(TOKEN_KEY)).catch(console.warn);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const clearSession = () => {
    setToken(null);
    setUser(null);
    saveToken(null);
  };

  const startSession = async (path: string, body: unknown) => {
    const session = await api<{ token: string; user: User }>(path, { method: 'POST', body });
    setToken(session.token);
    setUser(session.user);
    await saveToken(session.token);
  };

  useEffect(() => {
    setOnSessionExpired(clearSession);

    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(TOKEN_KEY);
        if (stored) {
          setToken(stored);
          setUser(await api<User>('/api/me'));
        }
      } catch (err) {
        // Offline at launch: the token stays stored and the app runs as a guest for now
        console.warn(err);
      } finally {
        setReady(true);
      }
    })();

    return () => setOnSessionExpired(null);
  }, []);

  return (
    <AuthContext
      value={{
        user,
        ready,
        login: (credentials) => startSession('/api/auth/login', credentials),
        register: (registration) => startSession('/api/auth/register', registration),
        logout: async () => {
          await api('/api/auth/logout', { method: 'POST' }).catch(console.warn);
          clearSession();
        },
      }}>
      {children}
    </AuthContext>
  );
}

export function useAuth() {
  const auth = use(AuthContext);
  if (!auth) throw new Error('useAuth must be used inside AuthProvider');
  return auth;
}
