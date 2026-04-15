import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface UserDto {
  id: string;
  name: string;
  profileImg: string;
}

interface SongDto {
  spotifyId: string;
  title: string;
  artist: string;
  coverUrl: string;
}

interface JamHistoryDto {
  id: string;
  host: UserDto;
  playedSongs: SongDto[];
  createdAt: string;
}

export default function Jams() {
  const [jams, setJams] = useState<JamHistoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/jams/history");
      if (!res.ok) throw new Error("Failed to fetch history");
      const data: JamHistoryDto[] = await res.json();

      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setJams(data);
    } catch (e) {
      console.error(e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-[4px] border-jam-purple border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 font-semibold text-jam-purple animate-pulse">Loading History...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
        <h2 className="text-2xl font-bold text-red-500 mb-2">Oops, something went wrong</h2>
        <p className="text-subtle-gray">We couldn't load your jam history right now.</p>
        <button onClick={fetchHistory} className="mt-6 px-6 py-2 bg-dough text-dark-roast font-bold rounded-xl active:scale-95 transition-transform">
          Try Again
        </button>
      </div>
    );
  }

  if (jams.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500 mt-[-5vh]">
        <div className="w-32 h-32 bg-white rounded-full shadow-lg border border-silver/30 flex items-center justify-center mb-8 relative">
          <svg className="w-14 h-14 text-silver" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
          <div className="absolute top-0 right-0 bg-dough rounded-full p-1 shadow-sm transform translate-x-2 -translate-y-2">
            <svg className="w-8 h-8 text-crust" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
        </div>
        <h2 className="text-3xl lg:text-4xl font-bold text-jam-purple font-poppins mb-3">No Jams Yet</h2>
        <p className="text-subtle-gray mb-10 max-w-sm text-[16px] leading-relaxed">
          You haven't participated in any Jams. Start your collaborative musical journey by creating your first session!
        </p>
        <Link
          to="/"
          className="bg-crust hover:bg-crust-light text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-crust/20 transition-all active:scale-95 md:hover:scale-105 inline-block"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full flex flex-col p-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="mb-8 mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-dark-roast font-poppins tracking-tight">Your History</h1>
          <p className="text-subtle-gray mt-1">Look back at the tracks you curated together.</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {jams.map((jam) => {
          const isExpanded = expandedId === jam.id;
          return (
            <div
              key={jam.id}
              className={`bg-white border rounded-[1.5rem] overflow-hidden transition-all duration-300 ${isExpanded ? 'border-jam-purple/30 shadow-lg' : 'border-silver/40 shadow-sm hover:border-silver'}`}
            >
              <button
                onClick={() => toggleExpand(jam.id)}
                className="w-full flex items-center justify-between p-5 md:p-6 text-left focus:outline-none focus:bg-dough/30 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-jam-purple flex-shrink-0 bg-jam-dark flex items-center justify-center">
                    {jam.host?.profileImg ? (
                      <img src={jam.host.profileImg} alt={jam.host.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-bold">{jam.host?.name?.charAt(0) || '?'}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-dark-roast text-lg leading-tight">{jam.host?.name}'s Jam</h3>
                    <p className="text-subtle-gray text-sm mt-0.5">{formatDate(jam.createdAt)} &bull; {jam.playedSongs.length} Tracks</p>
                  </div>
                </div>

                <div className={`p-2 rounded-full bg-dough text-jam-purple transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </button>

              <div
                className={`transition-all duration-300 ease-in-out border-t overflow-hidden ${isExpanded ? 'max-h-[800px] border-silver/30 opacity-100' : 'max-h-0 border-transparent opacity-0'}`}
              >
                <div className="p-5 md:p-6 bg-dough/20">
                  {jam.playedSongs.length === 0 ? (
                    <div className="text-center py-6 text-subtle-gray text-sm_font-medium italic">
                      No songs were marked as played in this session.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                      {jam.playedSongs.map((song, idx) => (
                        <div key={`${song.spotifyId}-${idx}`} className="flex items-center space-x-3 bg-white p-3 rounded-xl shadow-sm border border-silver/20 hover:border-silver/40 transition-colors">
                          <img src={song.coverUrl} alt="Cover" className="w-12 h-12 rounded-md object-cover flex-shrink-0 bg-silver" />
                          <div className="overflow-hidden">
                            <p className="font-bold text-[15px] text-dark-roast truncate leading-tight mb-0.5">{song.title}</p>
                            <p className="text-xs text-subtle-gray truncate font-medium">{song.artist}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
