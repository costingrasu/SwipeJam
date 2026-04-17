import { useState, useEffect, useRef } from 'react';

export interface LyricLine {
  timeMs: number;
  text: string;
}

interface CachedResult {
  lines: LyricLine[];
  isSynced: boolean;
  isInstrumental: boolean;
}

export interface UseLyricsResult {
  lines: LyricLine[];
  isSynced: boolean;
  isInstrumental: boolean;
  isLoading: boolean;
  error: string | null;
}

const lyricsCache = new Map<string, CachedResult>();

function parseLRC(raw: string): LyricLine[] {
  const regex = /\[(\d{2}):(\d{2}\.\d{2})\]\s?(.*)/;
  return raw
    .split('\n')
    .map(line => {
      const match = line.match(regex);
      if (!match) return null;
      const minutes = parseInt(match[1], 10);
      const seconds = parseFloat(match[2]);
      const timeMs = Math.round((minutes * 60 + seconds) * 1000);
      const text = match[3].trim();
      return { timeMs, text };
    })
    .filter((line): line is LyricLine => line !== null && line.text.length > 0)
    .sort((a, b) => a.timeMs - b.timeMs);
}

function parsePlain(raw: string): LyricLine[] {
  return raw
    .split('\n')
    .map((text, i) => ({ timeMs: i * 3000, text: text.trim() }))
    .filter(line => line.text.length > 0);
}

export function useLyrics(
  trackName: string | null,
  artistName: string | null
): UseLyricsResult {
  const [lines, setLines] = useState<LyricLine[]>([]);
  const [isSynced, setIsSynced] = useState(false);
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!trackName || !artistName) {
      setLines([]);
      setIsSynced(false);
      setIsInstrumental(false);
      setIsLoading(false);
      setError(null);
      return;
    }

    const cacheKey = `${trackName}::${artistName}`;
    const cached = lyricsCache.get(cacheKey);
    if (cached) {
      setLines(cached.lines);
      setIsSynced(cached.isSynced);
      setIsInstrumental(cached.isInstrumental);
      setIsLoading(false);
      setError(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);
    setLines([]);

    const url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(trackName)}&artist_name=${encodeURIComponent(artistName)}`;

    fetch(url, { signal: controller.signal })
      .then(res => {
        if (res.status === 404) throw new Error('not_found');
        if (!res.ok) throw new Error('fetch_failed');
        return res.json();
      })
      .then(data => {
        if (data.instrumental) {
          const result: CachedResult = { lines: [], isSynced: false, isInstrumental: true };
          lyricsCache.set(cacheKey, result);
          setLines([]);
          setIsSynced(false);
          setIsInstrumental(true);
          return;
        }

        let parsedLines: LyricLine[];
        let synced = false;

        if (data.syncedLyrics) {
          parsedLines = parseLRC(data.syncedLyrics);
          synced = parsedLines.length > 0;
        } else if (data.plainLyrics) {
          parsedLines = parsePlain(data.plainLyrics);
        } else {
          throw new Error('not_found');
        }

        const result: CachedResult = { lines: parsedLines, isSynced: synced, isInstrumental: false };
        lyricsCache.set(cacheKey, result);
        setLines(parsedLines);
        setIsSynced(synced);
        setIsInstrumental(false);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        setError(err.message === 'not_found' ? 'not_found' : 'fetch_failed');
        setLines([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => { controller.abort(); };
  }, [trackName, artistName]);

  return { lines, isSynced, isInstrumental, isLoading, error };
}
