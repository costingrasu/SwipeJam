import React, { useState, useEffect, useRef, useCallback } from 'react';
import SwipeCard, { type SongDto } from './SwipeCard';

interface SwipeViewProps {
  jamId: string;
}

export default function SwipeView({ jamId }: SwipeViewProps) {
  const [songs, setSongs] = useState<SongDto[]>([]);
  const [usedSuperlike, setUsedSuperlike] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMsg(null), 3000);
  }, []);

  const fetchSwipeQueue = useCallback(() => {
    fetch(`/api/jams/${jamId}/swipe/queue`, { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(data => {
        setSongs(data.songs.map((qi: { song: SongDto }) => qi.song));
        setUsedSuperlike(data.usedSuperlike);
      })
      .catch(() => { })
      .finally(() => setIsLoading(false));
  }, [jamId]);

  useEffect(() => {
    fetchSwipeQueue();
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [fetchSwipeQueue]);

  const handleSwipe = useCallback(
    async (dir: 'like' | 'dislike' | 'superlike') => {
      if (songs.length === 0) return;
      const song = songs[0];
      const voteMap = { like: 'LIKE', dislike: 'DISLIKE', superlike: 'SUPERLIKE' };

      setSongs(prev => prev.slice(1));

      try {
        const res = await fetch(`/api/jams/${jamId}/swipe`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ songId: song.spotifyId, vote: voteMap[dir] }),
        });

        if (!res.ok) {
          const text = await res.text();
          if (res.status === 409) showToast(text || 'Superlike already used');
          else setSongs(prev => [song, ...prev]);
          return;
        }

        const data = await res.json();
        setUsedSuperlike(data.usedSuperlike);
      } catch {
        setSongs(prev => [song, ...prev]);
      }
    },
    [songs, jamId, showToast]
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center w-full">
        <div
          className="relative mx-auto animate-pulse"
          style={{ width: 270, height: 370 }}
        >
          <div className="absolute inset-0 bg-silver/30 rounded-[2rem]" />
          <div className="absolute inset-0 bg-silver/20 rounded-[2rem] translate-x-2 translate-y-2 -z-10" />
        </div>
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
        <span className="text-5xl">🎉</span>
        <h3 className="font-poppins font-bold text-2xl text-dark-roast">You're all caught up!</h3>
        <p className="text-subtle-gray text-base leading-relaxed">
          You've voted on every song in the queue. Your votes are being counted!
        </p>
      </div>
    );
  }

  const CARD_W = 270;
  const CARD_H = 370;

  return (
    <div className="flex-1 flex flex-col items-center justify-center w-full relative animate-in fade-in duration-300">
      {toastMsg && (
        <div className="absolute top-4 left-0 w-full z-[200] flex justify-center pointer-events-none">
          <div className="bg-dark-roast text-white px-5 py-2 rounded-full font-bold text-sm shadow-xl animate-in fade-in slide-in-from-top-2 duration-300">
            {toastMsg}
          </div>
        </div>
      )}

      <div
        className="relative"
        style={{ width: CARD_W, height: CARD_H }}
      >
        {songs.slice(0, 3).map((song, i) => (
          <SwipeCard
            key={song.spotifyId}
            song={song}
            isTop={i === 0}
            zIndex={songs.length - i}
            onSwipe={i === 0 ? handleSwipe : () => { }}
            usedSuperlike={usedSuperlike}
            onShowToast={showToast}
          />
        ))}
      </div>

      <p className="mt-8 text-subtle-gray text-xs font-semibold tracking-wide uppercase opacity-60 select-none">
        Swipe to vote · Tap cover to preview
      </p>
    </div>
  );
}
