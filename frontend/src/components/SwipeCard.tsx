import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

export interface SongDto {
  spotifyId: string;
  title: string;
  artist: string;
  coverUrl: string;
  previewUrl: string | null;
  durationMs: number;
}

interface SwipeCardProps {
  song: SongDto;
  isTop: boolean;
  zIndex: number;
  onSwipe: (dir: 'like' | 'dislike' | 'superlike') => void;
  usedSuperlike: boolean;
  onShowToast: (msg: string) => void;
}

const SWIPE_THRESHOLD_X = 100;
const SWIPE_THRESHOLD_Y = -100;
const SWIPE_VEL = 600;

export default function SwipeCard({
  song,
  isTop,
  zIndex,
  onSwipe,
  usedSuperlike,
  onShowToast,
}: SwipeCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-160, 160], [-20, 20]);

  const rightOpacity = useTransform(x, [20, 120], [0, 1]);
  const leftOpacity = useTransform(x, [-120, -20], [1, 0]);
  const topOpacity = useTransform(y, [-120, -20], [1, 0]);

  const indicatorOpacity = useTransform(
    [x, y],
    ([xV, yV]) => Math.max(0, 1 - Math.sqrt((xV as number) ** 2 + (yV as number) ** 2) / 45)
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, [song.spotifyId]);

  const handleCoverTap = useCallback(async () => {
    if (isFetchingPreview) return;

    if (isPreviewPlaying) {
      audioRef.current?.pause();
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      setIsPreviewPlaying(false);
      return;
    }

    let urlToPlay: string | null = null;

    setIsFetchingPreview(true);
    try {
      const cleanTitle = song.title.split(/[\(\-]/)[0].trim();
      const query = encodeURIComponent(`${cleanTitle} ${song.artist}`);
      const res = await fetch(`https://itunes.apple.com/search?term=${query}&entity=song&limit=5`);
      const data = await res.json();

      if (data.results && data.results.length > 0) {
        const exactMatch = data.results.find(
          (r: any) => r.artistName.toLowerCase() === song.artist.toLowerCase()
        );
        urlToPlay = exactMatch ? exactMatch.previewUrl : data.results[0].previewUrl;
      }
    } catch (err) {
      console.error("iTunes preview fetch failed", err);
    } finally {
      setIsFetchingPreview(false);
    }

    if (!urlToPlay) {
      onShowToast('No preview available');
      return;
    }

    const audio = new Audio(urlToPlay);
    audioRef.current = audio;
    audio.play().catch(() => onShowToast('Preview failed to load'));
    setIsPreviewPlaying(true);
    previewTimerRef.current = setTimeout(() => {
      audio.pause();
      setIsPreviewPlaying(false);
    }, 30000);
    audio.onended = () => setIsPreviewPlaying(false);
  }, [song.previewUrl, song.title, song.artist, isPreviewPlaying, isFetchingPreview, onShowToast]);

  const triggerFlyOff = useCallback(
    (dir: 'like' | 'dislike' | 'superlike') => {
      const w = window.innerWidth + 300;
      const h = window.innerHeight + 300;
      if (dir === 'like') {
        animate(x, w, { duration: 0.28, ease: 'easeOut' });
        animate(y, y.get() * 0.5, { duration: 0.28 });
      } else if (dir === 'dislike') {
        animate(x, -w, { duration: 0.28, ease: 'easeOut' });
        animate(y, y.get() * 0.5, { duration: 0.28 });
      } else {
        animate(y, -h, { duration: 0.28, ease: 'easeOut' });
        animate(x, 0, { duration: 0.2 });
      }
      setTimeout(() => onSwipe(dir), 260);
    },
    [x, y, onSwipe]
  );

  const springBack = useCallback(() => {
    animate(x, 0, { type: 'spring', stiffness: 320, damping: 28 });
    animate(y, 0, { type: 'spring', stiffness: 320, damping: 28 });
  }, [x, y]);

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }) => {
      const ox = info.offset.x;
      const oy = info.offset.y;
      const vx = info.velocity.x;
      const vy = info.velocity.y;

      if (oy < SWIPE_THRESHOLD_Y || vy < -SWIPE_VEL) {
        if (usedSuperlike) {
          springBack();
          onShowToast('Superlike already used');
          return;
        }
        triggerFlyOff('superlike');
      } else if (ox > SWIPE_THRESHOLD_X || vx > SWIPE_VEL) {
        triggerFlyOff('like');
      } else if (ox < -SWIPE_THRESHOLD_X || vx < -SWIPE_VEL) {
        triggerFlyOff('dislike');
      } else {
        springBack();
      }
    },
    [usedSuperlike, triggerFlyOff, springBack, onShowToast]
  );

  return (
    <motion.div
      drag={isTop}
      dragElastic={0.12}
      onDragEnd={handleDragEnd}
      style={{ x, y, rotate, zIndex, position: 'absolute', inset: 0 }}
      className="touch-none"
    >
      {isTop && (
        <>
          <motion.div
            style={{ opacity: indicatorOpacity }}
            className="absolute -top-12 left-0 right-0 flex justify-center pointer-events-none z-10"
          >
            <div className={`w-11 h-11 rounded-full flex items-center justify-center border-2 shadow-md
              ${usedSuperlike
                ? 'bg-slate-100 border-slate-200 opacity-30'
                : 'bg-amber-50 border-amber-300/60'}`}
            >
              <svg className={`w-5 h-5 ${usedSuperlike ? 'text-slate-400' : 'text-amber-400'}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            </div>
          </motion.div>

          <motion.div
            style={{ opacity: indicatorOpacity }}
            className="absolute top-1/2 -translate-y-1/2 -right-12 pointer-events-none z-10"
          >
            <div className="w-11 h-11 bg-purple-50 rounded-full flex items-center justify-center border-2 border-jam-purple/40 shadow-md">
              <svg className="w-5 h-5 text-jam-purple" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
          </motion.div>

          <motion.div
            style={{ opacity: indicatorOpacity }}
            className="absolute top-1/2 -translate-y-1/2 -left-12 pointer-events-none z-10"
          >
            <div className="w-11 h-11 bg-red-50 rounded-full flex items-center justify-center border-2 border-red-400/40 shadow-md">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </motion.div>
        </>
      )}

      <div className="absolute inset-0 bg-white rounded-[2rem] shadow-2xl shadow-dark-roast/10 flex flex-col overflow-hidden">

        <motion.div
          className="relative flex-1 cursor-pointer"
          onTap={isTop ? handleCoverTap : undefined}
        >
          <img
            src={song.coverUrl}
            alt={song.title}
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />

          {isTop && (
            <>
              <motion.div
                style={{ opacity: rightOpacity }}
                className="absolute inset-0 bg-gradient-to-l from-jam-purple/75 via-jam-purple/30 to-transparent pointer-events-none"
              />
              <motion.div
                style={{ opacity: leftOpacity }}
                className="absolute inset-0 bg-gradient-to-r from-red-500/75 via-red-500/30 to-transparent pointer-events-none"
              />
              <motion.div
                style={{ opacity: topOpacity }}
                className="absolute inset-0 bg-gradient-to-b from-amber-400/75 via-amber-400/30 to-transparent pointer-events-none"
              />
            </>
          )}

          {isPreviewPlaying && (
            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-[#1DB954] rounded-full animate-pulse" />
              PREVIEW
            </div>
          )}

          {isTop && !isPreviewPlaying && (
            <div className="absolute bottom-3 right-3 opacity-40 pointer-events-none">
              <svg className="w-4 h-4 text-white drop-shadow" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
              </svg>
            </div>
          )}
        </motion.div>

        <div className="shrink-0 px-5 py-4 bg-white">
          <h3 className="font-poppins font-bold text-lg text-dark-roast truncate leading-tight">
            {song.title}
          </h3>
          <p className="font-inter text-subtle-gray text-sm mt-0.5 truncate">
            {song.artist}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
