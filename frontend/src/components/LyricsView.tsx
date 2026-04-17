import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useLyrics } from '../hooks/useLyrics';

interface LyricsViewProps {
  trackName: string | null;
  artistName: string | null;
  positionMs: number;
  isPlaying: boolean;
  isHost: boolean;
  onTogglePlay: () => void;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSeekStart: () => void;
  onSeekEnd: () => void;
  durationMs: number;
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getOpacity(distance: number): number {
  if (distance === 0) return 1;
  const abs = Math.abs(distance);
  if (abs === 1) return 0.6;
  if (abs === 2) return 0.4;
  return 0.22;
}

export default function LyricsView({
  trackName,
  artistName,
  positionMs,
  isPlaying,
  isHost,
  onTogglePlay,
  onSeek,
  onSeekStart,
  onSeekEnd,
  durationMs,
}: LyricsViewProps) {
  const { lines, isSynced, isInstrumental, isLoading, error } = useLyrics(trackName, artistName);

  const [isAutoTracking, setIsAutoTracking] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLElement | null>(null);
  const isProgramScrollRef = useRef(false);
  const scrollClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const activeIndex = isSynced
    ? lines.reduce((best, line, i) => (line.timeMs <= positionMs ? i : best), -1)
    : -1;

  const scrollToActive = useCallback(() => {
    const container = scrollContainerRef.current;
    const el = activeLineRef.current;
    if (!container || !el) return;
    const targetTop = el.offsetTop - container.clientHeight / 2 + el.offsetHeight / 2;
    container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!isAutoTracking || activeIndex < 0 || !isSynced || !activeLineRef.current) return;

    isProgramScrollRef.current = true;
    scrollToActive();

    if (scrollClearRef.current) clearTimeout(scrollClearRef.current);
    scrollClearRef.current = setTimeout(() => {
      isProgramScrollRef.current = false;
    }, 800);
  }, [activeIndex, isAutoTracking, isSynced, scrollToActive]);

  useEffect(() => {
    observerRef.current?.disconnect();
    if (!activeLineRef.current || !scrollContainerRef.current || isAutoTracking || !isSynced) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsAutoTracking(true);
      },
      { root: scrollContainerRef.current, threshold: 0.6 }
    );
    observerRef.current.observe(activeLineRef.current);

    return () => observerRef.current?.disconnect();
  }, [activeIndex, isAutoTracking, isSynced]);

  useEffect(() => {
    setIsAutoTracking(true);
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
  }, [trackName, artistName]);

  useEffect(() => {
    return () => {
      if (scrollClearRef.current) clearTimeout(scrollClearRef.current);
      observerRef.current?.disconnect();
    };
  }, []);

  const handleScroll = useCallback(() => {
    if (isProgramScrollRef.current) return;
    setIsAutoTracking(false);
  }, []);

  const handleBackToCurrent = useCallback(() => {
    if (!activeLineRef.current) return;
    setIsAutoTracking(true);
    isProgramScrollRef.current = true;
    scrollToActive();
    if (scrollClearRef.current) clearTimeout(scrollClearRef.current);
    scrollClearRef.current = setTimeout(() => {
      isProgramScrollRef.current = false;
    }, 800);
  }, [scrollToActive]);

  const noSong = !trackName;
  const noLyrics = !isLoading && !isInstrumental && lines.length === 0 && (error !== null || (!error && !isLoading));

  return (
    <div className="flex flex-col h-full w-full max-w-sm mx-auto animate-in fade-in duration-300">

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto relative"
      >
        {!isAutoTracking && isSynced && lines.length > 0 && (
          <div className="sticky top-3 z-10 flex justify-center pointer-events-none">
            <button
              onClick={handleBackToCurrent}
              className="pointer-events-auto bg-jam-purple text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg shadow-jam-purple/30 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200 active:scale-95 transition-transform"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
              Back to current
            </button>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center gap-5 px-8 pt-24 pb-8">
            {[0.85, 0.65, 1, 0.75, 0.55, 0.9, 0.7].map((w, i) => (
              <div
                key={i}
                className="h-4 bg-silver/40 rounded-full animate-pulse"
                style={{ width: `${w * 100}%`, animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
        )}

        {!isLoading && noSong && (
          <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-subtle-gray gap-3">
            <svg className="w-12 h-12 opacity-30" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
            <p className="font-semibold text-base">No song playing</p>
          </div>
        )}

        {!isLoading && !noSong && isInstrumental && (
          <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-subtle-gray gap-3">
            <span className="text-4xl">🎸</span>
            <p className="font-semibold text-base text-dark-roast">Instrumental</p>
            <p className="text-sm">No lyrics for this track</p>
          </div>
        )}

        {!isLoading && !noSong && !isInstrumental && noLyrics && (
          <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-subtle-gray gap-3">
            <svg className="w-12 h-12 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-semibold text-base text-dark-roast">No lyrics available</p>
            <p className="text-sm">Couldn't find lyrics for this track</p>
          </div>
        )}

        {!isLoading && !isInstrumental && lines.length > 0 && !isSynced && (
          <div className="py-10 px-8 space-y-5 text-center">
            {lines.map((line, i) => (
              <p key={i} className="font-poppins text-base text-dark-roast leading-relaxed">
                {line.text}
              </p>
            ))}
          </div>
        )}

        {!isLoading && !isInstrumental && lines.length > 0 && isSynced && (
          <div
            className="flex flex-col items-center gap-5 sm:gap-7 text-center px-6"
            style={{
              paddingTop: 'max(calc(50vh - 170px), 1.5rem)',
              paddingBottom: 'max(calc(50vh - 170px), 1.5rem)',
            }}
          >
            {lines.map((line, i) => {
              const distance = i - activeIndex;
              const isActive = distance === 0;
              const opacity = getOpacity(distance);

              return (
                <p
                  key={i}
                  ref={isActive ? (el) => { activeLineRef.current = el; } : undefined}
                  className="font-poppins max-w-xs select-none"
                  style={{
                    opacity,
                    fontSize: isActive ? '1.2rem' : '0.95rem',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#2A1D2D' : '#6B636E',
                    lineHeight: 1.45,
                    transition: 'opacity 400ms ease, font-size 350ms ease, font-weight 350ms ease, color 350ms ease',
                    transform: isActive ? 'scale(1.04)' : 'scale(1)',
                    transformOrigin: 'center center',
                    transitionProperty: 'opacity, font-size, color, transform',
                  }}
                >
                  {line.text}
                </p>
              );
            })}
          </div>
        )}
      </div>

      <div className="shrink-0 px-6 pt-4 pb-28 bg-dough">

        <div className="w-full mb-4">
          <input
            type="range"
            min="0"
            max={durationMs || 100}
            value={positionMs}
            onChange={onSeek}
            onMouseDown={onSeekStart}
            onMouseUp={onSeekEnd}
            onTouchStart={onSeekStart}
            onTouchEnd={onSeekEnd}
            disabled={!isHost}
            className={`w-full accent-jam-purple h-2 rounded-full cursor-pointer ${!isHost ? 'pointer-events-none' : ''}`}
          />
          <div className="flex justify-between text-xs text-subtle-gray font-semibold mt-2">
            <span>{formatTime(positionMs)}</span>
            <span>{formatTime(durationMs)}</span>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={onTogglePlay}
            className="w-14 h-14 bg-jam-purple rounded-full flex items-center justify-center text-white shadow-xl shadow-jam-purple/30 transition-transform active:scale-95"
          >
            {isPlaying ? (
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="w-7 h-7 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
