import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

export default function Header() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const inJam = location.pathname.startsWith('/jam/');

  const handleLeaveJam = async () => {
    try {
      const response = await fetch("/api/jams/leave", { method: "POST" });
      if (!response.ok) {
        console.error("Failed to leave jam:", response.status);
        return;
      }
      setMenuOpen(false);
      navigate('/', { replace: true });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="w-full flex items-center justify-between px-6 py-4 bg-dough">
      <div
        className="flex items-center space-x-3 cursor-pointer group"
        onClick={() => navigate('/')}
      >
        <img src={logo} alt="SwipeJam Logo" className="w-9 h-9 object-contain group-hover:scale-105 transition-transform" />
        <span className="font-poppins font-bold text-2xl tracking-tight text-jam-purple">SwipeJam</span>
      </div>

      {user && (
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-11 h-11 rounded-full border-[3px] border-jam-purple overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-jam-hover transition-all shadow-md active:scale-95"
          >
            {user.profileImg ? (
              <img src={user.profileImg} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-jam-dark flex items-center justify-center text-white font-bold text-lg">
                {user.name?.charAt(0).toUpperCase()}
              </div>
            )}
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/5 md:bg-transparent"
                onClick={() => setMenuOpen(false)}
              ></div>

              <div className="absolute right-0 top-14 w-56 bg-white rounded-2xl shadow-xl shadow-jam-purple/10 z-50 border border-silver/50 overflow-hidden transform origin-top-right transition-all">
                <div className="px-4 py-3 border-b border-silver/30 bg-dough/30">
                  <p className="text-sm font-semibold text-dark-roast truncate">{user.name}</p>
                </div>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/jams');
                  }}
                  className="w-full text-left px-4 py-3.5 text-dark-roast hover:bg-dough transition-colors font-medium text-[15px] flex items-center space-x-3 active:bg-silver/20"
                >
                  <svg className="w-5 h-5 text-jam-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span>Jam History</span>
                </button>
                {inJam && (
                  <button
                    onClick={handleLeaveJam}
                    className="w-full text-left px-4 py-3.5 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors font-bold text-[15px] flex items-center space-x-3 active:bg-red-100 border-t border-silver/30"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    <span>Leave Jam</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
}
