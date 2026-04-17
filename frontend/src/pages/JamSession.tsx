import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LyricsView from '../components/LyricsView';
import lyricsIcon from '../assets/lyrics.png';
import playerIcon from '../assets/player.png';
import swipeIcon from '../assets/swipe.png';
import infoIcon from '../assets/info.png';
import nocoverIcon from '../assets/nocover.png';
import queueIcon from '../assets/queue.png';
import plusIcon from '../assets/plus.png';

export default function JamSession() {
  const { id } = useParams();
  const { user } = useAuth();
  const userRef = useRef(user);
  const playerRef = useRef<any>(null);
  useEffect(() => { userRef.current = user; }, [user]);

  const [jam, setJam] = useState<any>(null);
  const [queueItems, setQueueItems] = useState<any[]>([]);

  const [showHostModal, setShowHostModal] = useState(false);
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [showQueuePopup, setShowQueuePopup] = useState(false);
  const [showRefPopup, setShowRefPopup] = useState(false);

  const [refMode, setRefMode] = useState<'menu' | 'search' | 'playlists'>('menu');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [userPlaylists, setUserPlaylists] = useState<any[]>([]);
  const [isRefLoading, setIsRefLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [tab, setTab] = useState<'lyrics' | 'player' | 'swipe'>('player');
  const [isPlaying, setIsPlaying] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [positionMs, setPositionMs] = useState<number>(0);
  const [isScrubbing, setIsScrubbing] = useState(false);

  useEffect(() => {
    fetch(`/api/jams/${id}`)
      .then(res => {
        if (!res.ok) throw new Error("Jam not found");
        return res.json();
      })
      .then(data => {
        setJam(data);
        if (data.isPlaying !== undefined && data.isPlaying !== null) setIsPlaying(data.isPlaying);
        if (data.positionMs !== undefined && data.positionMs !== null) setPositionMs(data.positionMs);
        if (data.host.id === user?.id && !sessionStorage.getItem(`audio_prompt_${id}`)) {
          setShowHostModal(true);
        }
      })
      .catch(console.error);
  }, [id, user]);

  const setAudioSync = (isSameRoom: boolean) => {
    const syncedAudio = !isSameRoom;
    fetch(`/api/jams/${id}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ syncedAudio })
    }).then(res => {
      if (!res.ok) return;
      setJam({ ...jam, syncedAudio });
      sessionStorage.setItem(`audio_prompt_${id}`, 'true');
      setShowHostModal(false);
    });
  };

  useEffect(() => {
    if (!user?.accessToken) return;

    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.body.appendChild(script);

    (window as any).onSpotifyWebPlaybackSDKReady = () => {
      const player = new (window as any).Spotify.Player({
        name: 'SwipeJam Web Player',
        getOAuthToken: (cb: any) => { cb(userRef.current?.accessToken || ''); },
        volume: 0.5
      });

      player.addListener('ready', ({ device_id }: any) => {
        console.log('Web Playback SDK Ready with Device ID', device_id);
        setDeviceId(device_id);

        fetch(`/api/jams/spotify/transfer?deviceId=${device_id}`, { method: 'PUT' })
          .catch(console.error);
      });

      playerRef.current = player;
      player.connect();
    };

    return () => {
      if (playerRef.current) { playerRef.current.disconnect(); playerRef.current = null; }
      document.body.removeChild(script);
    };
  }, [user]);

  useEffect(() => {
    if (!id) return;
    const client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(`/topic/jam/${id}/state`, (msg) => {
          const updatedJam = JSON.parse(msg.body);
          setJam(updatedJam);
          if (updatedJam.isPlaying !== undefined && updatedJam.isPlaying !== null) setIsPlaying(updatedJam.isPlaying);
          if (updatedJam.positionMs !== undefined && updatedJam.positionMs !== null) setPositionMs(updatedJam.positionMs);
        });
        client.subscribe(`/topic/jam/${id}/queue`, (msg) => {
          setQueueItems(JSON.parse(msg.body));
        });
      }
    });
    client.activate();
    return () => { client.deactivate(); };
  }, [id]);

  useEffect(() => {
    if (!isPlaying || isScrubbing) return;
    const duration = jam?.currentSong?.durationMs || 0;
    if (duration === 0) return;

    const interval = setInterval(() => {
      setPositionMs(prev => prev + 1000 > duration ? duration : prev + 1000);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, isScrubbing, jam]);

  useEffect(() => {
    if (showQueuePopup && id) {
      fetch(`/api/jams/${id}/queue`)
        .then(res => res.json())
        .then(data => setQueueItems(data))
        .catch(console.error);
    }
  }, [showQueuePopup, id]);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSearchSpotify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsRefLoading(true);
    try {
      const res = await fetch(`/api/jams/spotify/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefLoading(false);
    }
  };

  const loadPlaylists = async () => {
    setRefMode('playlists');
    setIsRefLoading(true);
    try {
      const res = await fetch(`/api/jams/spotify/playlists`);
      if (res.ok) {
        const data = await res.json();
        setUserPlaylists(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefLoading(false);
    }
  };

  const addSongToQueue = async (songId: string) => {
    try {
      const res = await fetch(`/api/jams/${id}/queue/song?spotifyId=${songId}`, { method: 'POST' });
      if (res.ok) {
        setShowRefPopup(false);
        setRefMode('menu');
        setSearchQuery('');
        triggerToast("Song added to Queue!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addPlaylistToQueue = async (playlistId: string) => {
    try {
      const res = await fetch(`/api/jams/${id}/queue/playlist?playlistId=${playlistId}`, { method: 'POST' });
      if (res.ok) {
        setShowRefPopup(false);
        setRefMode('menu');
        triggerToast("Playlist randomized & added!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const togglePlayback = async () => {
    try {
      const endpoint = isPlaying ? `/api/jams/${id}/player/pause` : `/api/jams/${id}/player/play`;
      const res = await fetch(endpoint, { method: 'POST' });
      if (res.ok) setIsPlaying(!isPlaying);
    } catch (err) {
      console.error(err);
    }
  };

  const skipNext = async () => {
    if (jam?.host?.id !== user?.id) return;
    try {
      const res = await fetch(`/api/jams/${id}/player/skip`, { method: 'POST' });
      if (res.ok) setIsPlaying(true);
    } catch (err) {
      console.error(err);
    }
  };

  const skipPrev = async () => {
    if (jam?.host?.id !== user?.id) return;
    try {
      const res = await fetch(`/api/jams/${id}/player/previous`, { method: 'POST' });
      if (res.ok) setPositionMs(0);
    } catch (err) { console.error(err); }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPositionMs(parseInt(e.target.value, 10));
  };

  const commitSeek = async () => {
    setIsScrubbing(false);
    if (jam?.host?.id !== user?.id) return;
    try {
      await fetch(`/api/jams/${id}/player/seek?positionMs=${positionMs}`, { method: 'PUT' });
    } catch (err) { console.error(err); }
  };

  if (!jam) {
    return (
      <div className="flex-1 flex items-center justify-center bg-dough h-[calc(100vh-80px)]">
        <div className="animate-spin w-8 h-8 rounded-full border-4 border-jam-purple border-t-transparent"></div>
      </div>
    );
  }

  const mockCoverUrl = jam.currentSong?.coverUrl || nocoverIcon;
  const mockTitle = jam.currentSong?.title || "No Song Playing";
  const mockArtist = jam.currentSong?.artist || "Add songs to queue!";

  return (
    <div className="flex-1 w-full flex flex-col bg-dough relative h-[calc(100vh-80px)] overflow-hidden">
      {toastMsg && (
        <div className="absolute top-4 left-0 w-full z-[200] flex justify-center animate-in slide-in-from-top-2 fade-in duration-300 pointer-events-none">
          <div className="bg-[#1DB954] text-white px-6 py-2 rounded-full font-bold tracking-wide shadow-lg shadow-[#1DB954]/30 text-sm flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            {toastMsg}
          </div>
        </div>
      )}
      <div className={`flex-1 w-full flex flex-col relative ${tab !== 'lyrics' ? 'overflow-y-auto pb-32 px-6' : 'overflow-hidden'}`}>
        {tab === 'lyrics' && (
          <LyricsView
            trackName={jam.currentSong?.title ?? null}
            artistName={jam.currentSong?.artist ?? null}
            positionMs={positionMs}
            isPlaying={isPlaying}
            isHost={jam.host?.id === user?.id}
            onTogglePlay={togglePlayback}
            onSeek={handleSeek}
            onSeekStart={() => setIsScrubbing(true)}
            onSeekEnd={commitSeek}
            durationMs={jam.currentSong?.durationMs ?? 0}
          />
        )}

        {tab === 'player' && (
          <div className="flex flex-col items-center justify-center w-full max-w-sm mx-auto animate-in fade-in duration-300 relative z-10 pt-16 pb-4 min-h-[calc(100vh-220px)]">

            <div className="absolute top-4 right-0 z-10">
              <button
                onClick={() => setShowInfoPopup(true)}
                className="w-11 h-11 bg-white shadow-lg border border-silver/40 rounded-full flex items-center justify-center transition-transform active:scale-95"
              >
                <img src={infoIcon} className="w-5 h-5 object-contain" alt="Info" />
              </button>
            </div>

            <div className="relative w-56 h-56 sm:w-64 sm:h-64 mx-auto mb-6">
              <img src={mockCoverUrl} alt="Aura" className="absolute inset-0 w-full h-full object-cover rounded-3xl blur-[30px] opacity-50 scale-105 pointer-events-none transition-all duration-700" />
              <img src={mockCoverUrl} alt="Album Cover" className="absolute inset-0 w-full h-full object-cover rounded-3xl shadow-[0_20px_50px_rgb(0,0,0,0.3)] z-10 border border-white/10 transition-all duration-700" />
            </div>
            <div className="w-full text-center mb-5 px-2 shrink-0">
              <h2 className="text-2xl sm:text-3xl font-poppins font-bold text-dark-roast truncate drop-shadow-sm">{mockTitle}</h2>
              <p className="text-md sm:text-lg text-subtle-gray mt-1 truncate font-medium">{mockArtist}</p>
            </div>

            <div className="w-full mb-6 px-2 shrink-0">
              <input
                type="range"
                min="0"
                max={jam?.currentSong?.durationMs || 100}
                value={positionMs}
                onChange={handleSeek}
                onMouseDown={() => setIsScrubbing(true)}
                onMouseUp={commitSeek}
                onTouchStart={() => setIsScrubbing(true)}
                onTouchEnd={commitSeek}
                disabled={jam?.host?.id !== user?.id}
                className={`w-full accent-jam-purple h-2 rounded-full cursor-pointer ${(jam?.host?.id !== user?.id) ? 'pointer-events-none' : ''}`}
              />
              <div className="w-full flex justify-between text-xs text-subtle-gray font-semibold mt-2 px-1">
                <span>{Math.floor(positionMs / 60000)}:{(Math.floor((positionMs % 60000) / 1000)).toString().padStart(2, '0')}</span>
                <span>{jam?.currentSong?.durationMs ? `${Math.floor(jam.currentSong.durationMs / 60000)}:${(Math.floor((jam.currentSong.durationMs % 60000) / 1000)).toString().padStart(2, '0')}` : '0:00'}</span>
              </div>
            </div>

            <div className="w-full flex items-center justify-between px-8 sm:px-10 mb-4 shrink-0">
              <button
                onClick={skipPrev}
                className={`transition-colors active:scale-90 ${jam?.host?.id === user?.id ? 'text-subtle-gray hover:text-jam-purple' : 'opacity-0 cursor-default pointer-events-none'}`}>
                <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
              </button>
              <button
                onClick={togglePlayback}
                className="w-16 h-16 sm:w-20 sm:h-20 bg-jam-purple rounded-full flex items-center justify-center text-white shadow-xl shadow-jam-purple/30 transition-transform active:scale-95"
              >
                {isPlaying ? (
                  <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                ) : (
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                )}
              </button>
              <button
                onClick={skipNext}
                className={`transition-colors active:scale-90 ${jam?.host?.id === user?.id ? 'text-subtle-gray hover:text-jam-purple' : 'opacity-0 cursor-default pointer-events-none'}`}
              >
                <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
              </button>
            </div>

            <div className="w-full flex items-center justify-between px-8 sm:px-10 mt-2 shrink-0">
              <button
                onClick={() => setShowRefPopup(true)}
                className="w-11 h-11 bg-white shadow-md shadow-silver/20 border border-silver/40 rounded-full flex items-center justify-center transition-transform active:scale-95 hover:bg-dough"
              >
                <img src={plusIcon} className="w-[22px] h-[22px] object-contain text-dark-roast" alt="Add Reference" />
              </button>

              <button
                onClick={() => setShowQueuePopup(true)}
                className="w-11 h-11 bg-white shadow-md shadow-silver/20 border border-silver/40 rounded-full flex items-center justify-center transition-transform active:scale-95 hover:bg-dough"
              >
                <img src={queueIcon} className="w-[22px] h-[22px] object-contain" alt="Queue" />
              </button>
            </div>
          </div>
        )}

        {tab === 'swipe' && (
          <div className="flex flex-col items-center justify-center h-full animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-bold text-jam-purple">Swipe The Jam</h2>
            <p className="text-subtle-gray mt-2">(Placeholder for Swiper Mechanics)</p>
          </div>
        )}
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[85%] max-w-[320px] bg-silver/20 backdrop-blur-md rounded-full p-1.5 flex shadow-lg border border-silver/40 z-50">
        <div
          className="absolute top-1.5 bottom-1.5 w-[calc(33.33%-4px)] bg-white rounded-full shadow-md transition-transform duration-300 cubic-bezier(0.65, 0, 0.35, 1)"
          style={{
            transform: `translateX(${tab === 'lyrics' ? '0%' : tab === 'player' ? '102%' : '204%'})`
          }}
        ></div>

        <button
          onClick={() => setTab('lyrics')}
          className="flex-1 flex justify-center items-center py-3 relative z-10 transition-transform active:scale-95"
          aria-label="Lyrics"
        >
          <img src={lyricsIcon} className="w-6 h-6 object-contain drop-shadow-sm" style={{ filter: tab === 'lyrics' ? 'none' : 'grayscale(100%) opacity(60%)' }} />
        </button>

        <button
          onClick={() => setTab('player')}
          className="flex-1 flex justify-center items-center py-3 relative z-10 transition-transform active:scale-95"
          aria-label="Player"
        >
          <img src={playerIcon} className="w-6 h-6 object-contain drop-shadow-sm" style={{ filter: tab === 'player' ? 'none' : 'grayscale(100%) opacity(60%)' }} />
        </button>

        <button
          onClick={() => setTab('swipe')}
          className="flex-1 flex justify-center items-center py-3 relative z-10 transition-transform active:scale-95"
          aria-label="Swipe"
        >
          <img src={swipeIcon} className="w-6 h-6 object-contain drop-shadow-sm" style={{ filter: tab === 'swipe' ? 'none' : 'grayscale(100%) opacity(60%)' }} />
        </button>
      </div>

      {showHostModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-poppins font-bold text-2xl text-dark-roast tracking-tight mb-3">Sound Setup</h3>
            <p className="text-subtle-gray mb-8 leading-relaxed">Are all your friends playing in the same room with you?</p>

            <div className="space-y-3">
              <button
                onClick={() => setAudioSync(true)}
                className="w-full bg-jam-purple hover:bg-jam-hover active:bg-jam-dark text-white font-bold py-4 rounded-xl transition-all shadow-md shadow-jam-purple/20 flex flex-col items-center"
              >
                <span className="text-lg">Yes, Same Room</span>
                <span className="text-sm font-medium opacity-80 mt-1">Sound plays only from my device</span>
              </button>

              <button
                onClick={() => setAudioSync(false)}
                className="w-full bg-white hover:bg-dough text-jam-purple font-bold py-4 rounded-xl transition-all border-2 border-jam-purple/20 flex flex-col items-center active:bg-silver/20"
              >
                <span className="text-lg">No, Remote</span>
                <span className="text-sm font-medium opacity-80 mt-1">Sound plays on everyone's device</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {showInfoPopup && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl relative flex flex-col items-center text-center">
            <button onClick={() => setShowInfoPopup(false)} className="absolute top-4 right-4 w-8 h-8 bg-dough text-dark-roast rounded-full flex items-center justify-center active:scale-90 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h3 className="font-poppins font-bold text-2xl text-jam-purple tracking-tight mb-6">Jam Info</h3>

            <div className="w-full text-left mb-6">
              <h4 className="text-sm font-bold text-dark-roast uppercase tracking-wider mb-2 text-center">Jam QR</h4>
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-silver/30 flex justify-center">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${jam.accessCode}`} alt="Jam QR" className="w-40 h-40 pointer-events-none rounded-xl" />
              </div>
            </div>

            <div className="w-full text-left mb-4">
              <h4 className="text-sm font-bold text-dark-roast uppercase tracking-wider mb-2 text-center">Jam Code</h4>
              <div className="w-full bg-dough rounded-2xl py-3 px-4 border border-silver/50 flex flex-col items-center">
                <span className="text-3xl font-poppins font-black text-dark-roast tracking-[0.2em]">{jam.accessCode}</span>
              </div>
            </div>

            {jam.host.id === user?.id && (
              <div className="w-full text-left mt-4 border-t border-silver/30 pt-6">
                <h4 className="text-sm font-bold text-dark-roast uppercase tracking-wider mb-3 text-center">Sound Output</h4>
                <div className="flex bg-dough p-1.5 rounded-full relative w-full border border-silver/40">
                  <div
                    className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-full shadow-md transition-transform duration-300"
                    style={{ transform: jam.syncedAudio ? 'translateX(100%)' : 'translateX(0%)' }}
                  ></div>
                  <button
                    onClick={() => setAudioSync(true)}
                    className={`flex-1 text-[11px] font-bold py-3.5 relative z-10 transition-colors ${!jam.syncedAudio ? 'text-jam-purple' : 'text-subtle-gray'}`}
                  >
                    Use this device
                  </button>
                  <button
                    onClick={() => setAudioSync(false)}
                    className={`flex-1 text-[11px] font-bold py-3.5 relative z-10 transition-colors ${jam.syncedAudio ? 'text-jam-purple' : 'text-subtle-gray'}`}
                  >
                    Sync on all devices
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {showQueuePopup && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] p-6 max-w-md w-full h-[75vh] shadow-2xl relative flex flex-col">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="font-poppins font-bold text-2xl text-dark-roast tracking-tight">Up Next</h3>
              <button onClick={() => setShowQueuePopup(false)} className="w-8 h-8 bg-dough rounded-full flex items-center justify-center active:scale-90 transition-transform"><svg className="w-5 h-5 text-dark-roast" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 snap-y pb-4">
              {queueItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-subtle-gray opacity-80">
                  <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                  <p className="font-medium text-lg">The queue is empty!</p>
                  <p className="text-sm">Swipe or add references</p>
                </div>
              ) : (
                queueItems.map((item, index) => (
                  <div key={item.id} className="w-full flex items-center gap-3 bg-dough rounded-2xl p-2.5 border border-silver/30 shadow-sm snap-start relative overflow-hidden group">
                    {item.superliked && <div className="absolute inset-0 border-[3px] border-crust/80 rounded-2xl pointer-events-none"></div>}

                    <img src={item.song.coverUrl} alt={item.song.title} className="w-14 h-14 object-cover rounded-xl shadow-sm bg-silver/20 shrink-0" />

                    <div className="flex-1 min-w-0 pr-2">
                      <h4 className="font-bold text-dark-roast truncate text-[15px] leading-tight mb-0.5">{item.song.title}</h4>
                      <p className="text-xs font-semibold text-subtle-gray truncate">{item.song.artist}</p>
                    </div>

                    <div className="flex flex-col items-end justify-center min-w-[3rem] shrink-0">
                      {item.superliked ? (
                        <div className="bg-crust/15 text-crust p-2 rounded-[10px] flex items-center justify-center shadow-sm">
                          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center bg-white border border-silver/60 w-10 py-1.5 rounded-[10px] shadow-sm">
                          <svg className="w-3.5 h-3.5 text-jam-purple mb-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                          <span className="text-[11px] font-bold text-dark-roast leading-none block">{item.score}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 mt-auto border-t border-silver/30 shrink-0">
              <button onClick={() => setShowQueuePopup(false)} className="w-full bg-jam-purple hover:bg-jam-hover text-white font-bold py-3.5 rounded-xl shadow-md transition-transform active:scale-95">
                Close Queue
              </button>
            </div>
          </div>
        </div>
      )}

      {showRefPopup && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 animate-in fade-in duration-200">
          <div className={`bg-white rounded-[2rem] p-6 max-w-md w-full shadow-2xl relative flex flex-col transition-all duration-300 ${refMode === 'menu' ? 'h-auto' : 'h-[75vh]'}`}>

            <div className="flex justify-between items-center mb-6 shrink-0">
              {refMode === 'menu' ? (
                <h3 className="font-poppins font-bold text-2xl text-dark-roast tracking-tight">Add to Queue</h3>
              ) : (
                <form onSubmit={handleSearchSpotify} className="flex-1 mr-4">
                  {refMode === 'search' ? (
                    <div className="relative w-full">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search a song..."
                        autoFocus
                        className="w-full bg-dough border border-silver/40 px-4 py-2.5 rounded-xl text-dark-roast font-medium outline-none focus:border-jam-purple/50 focus:ring-2 focus:ring-jam-purple/20 transition-all placeholder:text-subtle-gray"
                      />
                      <button type="submit" className="absolute right-3 top-2.5 text-jam-purple hover:scale-110 transition-transform">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      </button>
                    </div>
                  ) : (
                    <h3 className="font-poppins font-bold text-xl text-dark-roast tracking-tight truncate">Your Playlists</h3>
                  )}
                </form>
              )}

              <button onClick={() => {
                if (refMode !== 'menu') {
                  setRefMode('menu');
                  setSearchResults([]);
                } else {
                  setShowRefPopup(false);
                }
              }} className="w-8 h-8 bg-dough rounded-full flex items-center justify-center active:scale-90 transition-transform shrink-0">
                {refMode === 'menu' ? (
                  <svg className="w-5 h-5 text-dark-roast" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                  <svg className="w-5 h-5 text-dark-roast" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                )}
              </button>
            </div>

            {refMode === 'menu' && (
              <div className="flex flex-col gap-4">
                <button onClick={() => setRefMode('search')} className="w-full bg-dough hover:bg-silver/20 border border-silver/40 rounded-2xl p-4 flex items-center gap-4 transition-all active:scale-95 text-left group">
                  <div className="w-12 h-12 bg-jam-purple/10 rounded-full flex items-center justify-center group-hover:bg-jam-purple/20 transition-colors">
                    <svg className="w-6 h-6 text-jam-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-dark-roast text-lg leading-tight">Add a Song</h4>
                    <p className="text-sm font-medium text-subtle-gray">Search the Spotify catalog</p>
                  </div>
                </button>

                <button onClick={loadPlaylists} className="w-full bg-dough hover:bg-silver/20 border border-silver/40 rounded-2xl p-4 flex items-center gap-4 transition-all active:scale-95 text-left group">
                  <div className="w-12 h-12 bg-[#1DB954]/10 rounded-full flex items-center justify-center group-hover:bg-[#1DB954]/20 transition-colors">
                    <svg className="w-6 h-6 text-[#1DB954]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-dark-roast text-lg leading-tight">Add Playlist</h4>
                    <p className="text-sm font-medium text-subtle-gray">Import all tracks instantly</p>
                  </div>
                </button>
              </div>
            )}

            {refMode !== 'menu' && (
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 animate-in fade-in pb-4 custom-scrollbar">
                {isRefLoading ? (
                  <div className="w-full h-32 flex flex-col items-center justify-center">
                    <div className="w-8 h-8 border-4 border-jam-purple/20 border-t-jam-purple rounded-full animate-spin"></div>
                  </div>
                ) : refMode === 'search' ? (
                  searchResults.length === 0 ? (
                    <div className="w-full text-center text-subtle-gray py-8 italic font-medium">Search for your favorite tracks...</div>
                  ) : (
                    searchResults.map((song) => (
                      <button key={song.spotifyId} onClick={() => addSongToQueue(song.spotifyId)} className="w-full flex items-center gap-3 bg-dough hover:bg-silver/20 rounded-xl p-2 border border-silver/30 transition-colors text-left group">
                        <img src={song.coverUrl} className="w-12 h-12 rounded-lg object-cover shadow-sm bg-silver/30 shrink-0" />
                        <div className="flex-1 min-w-0 pr-2">
                          <h4 className="font-bold text-dark-roast truncate text-sm leading-tight mb-0.5">{song.title}</h4>
                          <p className="text-xs font-semibold text-subtle-gray truncate">{song.artist}</p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-jam-purple/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-4 h-4 text-jam-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                        </div>
                      </button>
                    ))
                  )
                ) : (
                  userPlaylists.length === 0 ? (
                    <div className="w-full text-center text-subtle-gray py-8 italic font-medium">No public playlists found.</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 pb-4">
                      {userPlaylists.map((pl) => (
                        <button key={pl.id} onClick={() => addPlaylistToQueue(pl.id)} className="w-full flex flex-col bg-dough hover:bg-silver/20 rounded-xl border border-silver/30 transition-all text-left group overflow-hidden active:scale-95 shadow-sm">
                          <div className="w-full aspect-square bg-silver/20 relative">
                            {pl.coverUrl ? (
                              <img src={pl.coverUrl} className="absolute inset-0 w-full h-full object-cover" />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <svg className="w-8 h-8 text-silver" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-jam-purple/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <div className="bg-jam-purple rounded-full p-2 shadow-lg"><svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg></div>
                            </div>
                          </div>
                          <div className="p-3">
                            <h4 className="font-bold text-dark-roast truncate text-[13px] leading-tight mb-0.5">{pl.name}</h4>
                            <p className="text-[10px] font-bold text-subtle-gray tracking-wide uppercase">{pl.totalTracks} TRACKS</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
