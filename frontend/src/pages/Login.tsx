import logo from '../assets/logo.png';
import spotifyLogo from '../assets/Spotify.png';

export default function Login() {
  const handleSpotifyLogin = () => {
    // Hardcoded URL pointing to our future Spring Boot OAuth2 initialization endpoint
    window.location.href = 'http://127.0.0.1:8080/oauth2/authorization/spotify';
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-dough px-4">
      <div className="flex flex-col items-center space-y-8 p-10 bg-white rounded-3xl shadow-xl shadow-jam-purple/10 max-w-sm w-full border border-border-subtle/50">

        <div className="flex flex-col items-center space-y-5">
          <img
            src={logo}
            alt="SwipeJam Logo"
            className="w-28 h-28 object-contain drop-shadow-sm"
          />
          <h1 className="text-5xl font-black tracking-tight text-jam-purple">
            SwipeJam
          </h1>
        </div>

        <p className="text-center text-text-subtle font-medium text-sm px-2 leading-relaxed">
          Gamified collaborative music listening. Swipe to vote, build the ultimate queue, and vibe together.
        </p>

        <button
          onClick={handleSpotifyLogin}
          className="w-full flex items-center justify-center space-x-3 py-4 rounded-2xl font-bold text-white bg-[#191414] hover:bg-black transition-transform hover:scale-[1.03] active:scale-95 shadow-lg shadow-black/30"
        >
          <img src={spotifyLogo} alt="Spotify" className="w-7 h-7 object-contain" />
          <span className="text-[15px]">Login with Spotify</span>
        </button>

      </div>
    </div>
  );
}
