import Constants from 'expo-constants';

export type Track = {
  source: 'AUDIUS' | 'LOCAL';
  id: string;
  title: string;
  artist: string;
  artwork: string | null;
  duration: number;
  genre?: string;
  /** Library responses only; false for hidden or deleted LOCAL tracks. */
  isAvailable?: boolean;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'LISTENER' | 'ARTIST' | 'ADMIN';
};

export type ArtistTrack = Track & {
  genre?: string;
  isHidden: boolean;
  createdAt: string;
};

export type Page<T> = { items: T[]; total: number; page: number; limit: number };

export type PlaylistSummary = { id: string; name: string; trackCount: number };

// `localhost` is the phone itself, so default to the machine serving the Expo bundle.
const devHost = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? `http://${devHost}:3000`;

const DEFAULT_TIMEOUT_MS = 15_000;

let token: string | null = null;
let onSessionExpired: (() => void) | null = null;

export const setToken = (value: string | null) => {
  token = value;
};

export const setOnSessionExpired = (handler: (() => void) | null) => {
  onSessionExpired = handler;
};

export const trackPath = (track: Track) => `${track.source.toLowerCase()}/${track.id}`;

export const streamUrl = (track: Track) => `${API_URL}/api/tracks/${trackPath(track)}/stream`;

export async function api<T = void>(
  path: string,
  options: { method?: string; body?: unknown; timeoutMs?: number } = {},
): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const timeoutMs = options.timeoutMs ?? (isFormData ? 120_000 : DEFAULT_TIMEOUT_MS);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      signal: controller.signal,
      headers: {
        ...(!isFormData && options.body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: isFormData
        ? (options.body as FormData)
        : options.body !== undefined
        ? JSON.stringify(options.body)
        : undefined,
    });
  } catch {
    throw new Error('Không kết nối được máy chủ');
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // Without a token this is a wrong password, not an expired session
    if (res.status === 401 && token) onSessionExpired?.();
    throw new Error(data?.error ?? 'Lỗi máy chủ');
  }
  return data;
}
