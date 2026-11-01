import { useEventListener } from 'expo';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { router } from 'expo-router';
import { createContext, use, useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MusicColors, MusicFonts } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { api, streamUrl, type Track } from '@/lib/api';

const HISTORY_AFTER_SECONDS = 30;
const NOTICE_MS = 3000;

type Player = {
  track: Track | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  loop: boolean;
  queue: Track[];
  index: number;
  /** Starts `track` with `queue` as the up-next list and opens the player. */
  open: (track: Track, queue?: Track[]) => void;
  playIndex: (index: number) => void;
  addToQueue: (track: Track, playNext?: boolean) => void;
  removeFromQueue: (index: number) => void;
  clearUpcomingQueue: () => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  toggleLoop: () => void;
  stop: () => void;
  notify: (message: string) => void;
};

const PlayerContext = createContext<Player | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [loop, setLoop] = useState(false);
  const historySaved = useRef(false);
  const ended = useRef(false);

  const track = queue[index] ?? null;
  const source = track && streamUrl(track);
  const duration = status.duration || track?.duration || 0;

  const notify = (message: string) => setNotice(message);

  const next = () => {
    if (queue.length > 1) setIndex((index + 1) % queue.length);
    else player.seekTo(0);
  };

  const playIndex = (targetIndex: number) => {
    if (targetIndex >= 0 && targetIndex < queue.length) {
      setIndex(targetIndex);
    }
  };

  const addToQueue = (newTrack: Track, playNext = false) => {
    if (newTrack.isAvailable === false) return;
    if (queue.length === 0) {
      setQueue([newTrack]);
      setIndex(0);
      notify(`Đang phát: ${newTrack.title}`);
      return;
    }
    if (playNext) {
      const nextQueue = [...queue];
      nextQueue.splice(index + 1, 0, newTrack);
      setQueue(nextQueue);
      notify(`Sẽ phát tiếp theo: ${newTrack.title}`);
    } else {
      setQueue((prev) => [...prev, newTrack]);
      notify(`Đã thêm vào hàng đợi: ${newTrack.title}`);
    }
  };

  const removeFromQueue = (removeIndex: number) => {
    if (removeIndex < 0 || removeIndex >= queue.length) return;
    if (removeIndex === index) {
      if (queue.length > 1) {
        const nextQueue = queue.filter((_, i) => i !== removeIndex);
        setQueue(nextQueue);
        if (removeIndex >= nextQueue.length) setIndex(0);
      } else {
        player.pause();
        player.clearLockScreenControls?.();
        setQueue([]);
        setIndex(0);
      }
    } else {
      setQueue((prev) => prev.filter((_, i) => i !== removeIndex));
      if (removeIndex < index) setIndex((prev) => prev - 1);
    }
  };

  const clearUpcomingQueue = () => {
    if (queue.length <= 1) return;
    setQueue((prev) => prev.slice(0, index + 1));
    notify('Đã dọn danh sách chờ tiếp theo');
  };

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' });
  }, []);

  useEffect(() => {
    if (!source) return;
    historySaved.current = false;
    ended.current = false;
    player.replace({ uri: source });
    player.play();
  }, [player, source]);

  const title = track?.title;
  const artist = track?.artist;
  const artwork = track?.artwork;
  useEffect(() => {
    if (!title) return;
    // Android stops background audio after about 3 minutes without lock screen controls
    player.setActiveForLockScreen?.(true, { title, artist, artworkUrl: artwork ?? undefined });
  }, [player, title, artist, artwork]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  useEventListener(player, 'playbackStatusUpdate', (update) => {
    // Listening 30 seconds counts as a play, or finishing a shorter track
    if (track && user && !historySaved.current && (update.currentTime >= HISTORY_AFTER_SECONDS || update.didJustFinish)) {
      historySaved.current = true;
      api('/api/me/history', { method: 'POST', body: { source: track.source, id: track.id } }).catch(console.warn);
    }

    if (ended.current || !(update.didJustFinish || update.error)) return;
    if (update.error) notify('Không phát được bài này');
    else if (loop) {
      player.seekTo(0);
      player.play();
      return;
    }

    ended.current = true;
    // No wrap-around here: a queue of broken tracks must not retry forever
    if (index < queue.length - 1) setIndex(index + 1);
    else player.seekTo(0);
  });

  return (
    <PlayerContext
      value={{
        track,
        isPlaying: status.playing,
        position: status.currentTime,
        duration,
        loop,
        queue,
        index,
        open: (song, list = [song]) => {
          const playable = list.filter((item) => item.isAvailable !== false);
          setQueue(playable);
          setIndex(Math.max(playable.findIndex((item) => item.source === song.source && item.id === song.id), 0));
          router.push('/player');
        },
        playIndex,
        addToQueue,
        removeFromQueue,
        clearUpcomingQueue,
        toggle: () => (status.playing ? player.pause() : player.play()),
        next,
        previous: () => {
          // Like most players: restart the track unless it has only just begun
          if (status.currentTime > 3 || queue.length < 2) player.seekTo(0);
          else setIndex((index - 1 + queue.length) % queue.length);
        },
        seek: (seconds) => player.seekTo(seconds),
        toggleLoop: () => setLoop(!loop),
        stop: () => {
          player.pause();
          player.clearLockScreenControls?.();
          setQueue([]);
          setIndex(0);
        },
        notify,
      }}>
      {children}
      {notice && (
        <View pointerEvents="none" style={styles.notice}>
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      )}
    </PlayerContext>
  );
}

export function usePlayer() {
  const player = use(PlayerContext);
  if (!player) throw new Error('usePlayer must be used inside PlayerProvider');
  return player;
}

/** Space a scrolling tab screen must leave for the nav bar or mini-player. */
export function useTabBarSpace() {
  return usePlayer().track ? 260 : 120;
}

const styles = StyleSheet.create({
  notice: {
    position: 'absolute',
    top: 56,
    alignSelf: 'center',
    maxWidth: '90%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: MusicColors.brown,
  },
  noticeText: {
    fontFamily: MusicFonts.semiBold,
    fontSize: 14,
    color: MusicColors.cream,
  },
});
