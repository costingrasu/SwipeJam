import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import scanIcon from '../assets/scan.png';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isCreating, setIsCreating] = useState(false);

  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleCreateJam = async () => {
    try {
      setIsCreating(true);
      const res = await fetch("/api/jams/create", { method: "POST" });
      if (!res.ok) throw new Error("Failed to create jam");
      const data = await res.json();
      navigate(`/jam/${data.id}`);
    } catch (e) {
      console.error(e);
      setIsCreating(false);
    }
  };

  const handleJoinJam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode || joinCode.length !== 6) {
      triggerError();
      return;
    }

    try {
      setIsJoining(true);
      const res = await fetch("/api/jams/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCode.toUpperCase() }),
      });

      if (res.status === 404 || res.status === 400) {
        triggerError();
      } else if (res.ok) {
        const data = await res.json();
        navigate(`/jam/${data.id}`);
      } else {
        triggerError();
      }
    } catch (e) {
      triggerError();
    } finally {
      setIsJoining(false);
    }
  };

  const triggerError = () => {
    setHasError(true);
    setJoinCode("");
    setTimeout(() => setHasError(false), 500);
  };

  const startCamera = async () => {
    setShowScanner(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      alert("Could not access camera. Please check permissions or verify you are using HTTPS / localhost.");
      setShowScanner(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    setShowScanner(false);
  };

  return (
    <div className="w-full flex-1 flex flex-col p-6 animate-in fade-in duration-500">
      <div className="mb-8 mt-2">
        <h1 className="text-3xl font-bold text-dark-roast tracking-tight">
          Welcome back, {user?.name.split(" ")[0]}!
        </h1>
        <p className="text-subtle-gray mt-1">Ready to sync up the music?</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 w-full flex-1 mb-6">

        <div className="flex-1 rounded-[2.5rem] bg-jam-purple p-8 shadow-xl shadow-jam-purple/20 flex flex-col items-center justify-center text-center relative overflow-hidden group">
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/10 to-transparent opacity-0 md:group-hover:opacity-100 transition-opacity duration-300"></div>

          <h2 className="text-4xl font-bold text-white font-poppins mb-4 relative z-10">Create a Jam</h2>
          <p className="text-white/85 max-w-sm mb-10 text-[16px] leading-relaxed relative z-10">
            Take the responsability into your own hands and become the Jam host
          </p>

          <button
            onClick={handleCreateJam}
            disabled={isCreating}
            className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.12)] transform transition-transform active:scale-90 md:hover:scale-105 relative z-10"
          >
            {isCreating ? (
              <div className="w-10 h-10 border-[4px] border-jam-purple border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-12 h-12 text-jam-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
            )}
          </button>
        </div>

        <div className="flex-1 rounded-[2.5rem] bg-white p-8 shadow-xl border border-silver/40 flex flex-col relative">
          <h2 className="text-4xl font-bold text-jam-purple font-poppins mb-4">Join Jam</h2>
          <p className="text-subtle-gray mb-10 text-[16px] leading-relaxed">
            Join an existing Jam by either typing the 6 digit code or by scanning the QR
          </p>

          <div className="flex flex-col gap-8 w-full max-w-md mx-auto mt-auto">

            <form onSubmit={handleJoinJam} className="flex flex-col space-y-2">
              <label className="text-[15px] font-semibold text-dark-roast mb-1">Enter Code</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="XXXXXX"
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className={`flex-1 bg-dough border-2 ${hasError ? 'border-red-500 animate-shake' : 'border-silver focus:border-crust focus:ring-4 focus:ring-crust/20'} rounded-2xl px-4 py-4 text-center text-2xl font-bold tracking-[0.25em] sm:tracking-[0.35em] text-dark-roast outline-none transition-all uppercase placeholder:text-silver placeholder:font-medium placeholder:tracking-normal w-full`}
                />
                <button
                  type="submit"
                  disabled={isJoining}
                  className="bg-crust hover:bg-[#b06a2a] text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-md transition-all active:scale-95 flex items-center justify-center min-w-[100px] w-full sm:w-auto"
                >
                  {isJoining ? (
                    <div className="w-6 h-6 border-[3px] border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : "Join"}
                </button>
              </div>
            </form>

            <div className="relative flex py-1 items-center opacity-70">
              <div className="flex-grow border-t border-silver"></div>
              <span className="flex-shrink-0 mx-4 text-subtle-gray text-xs font-bold uppercase tracking-wider">Or</span>
              <div className="flex-grow border-t border-silver"></div>
            </div>

            <div className="flex flex-col pb-2">
              <label className="text-[15px] font-semibold text-dark-roast mb-3">Enter by QR</label>
              <button
                type="button"
                onClick={startCamera}
                className="w-full bg-dark-roast hover:bg-black text-white py-4 rounded-2xl font-bold text-lg shadow-md transition-all active:scale-95 flex items-center justify-center space-x-3 relative z-10"
              >
                <img src={scanIcon} alt="Scan QR" className="w-6 h-6 pointer-events-none" style={{ filter: 'invert(1)' }} />
                <span className="pointer-events-none">Scan</span>
              </button>
            </div>

          </div>
        </div>

      </div>

      {showScanner && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center animate-in fade-in duration-200 backdrop-blur-sm">
          <div className="w-full max-w-sm flex justify-between items-center px-6 mb-4">
            <h3 className="text-white text-lg font-bold font-poppins">Scan Jam QR Code</h3>
            <button onClick={stopCamera} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="relative w-full max-w-sm aspect-[3/4] bg-jam-dark/20 rounded-[2rem] overflow-hidden border-2 border-white/10 shadow-2xl">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>

            <div className="absolute inset-10 border-2 border-crust/50 rounded-3xl z-10 flex">
              <div className="w-8 h-8 border-t-4 border-l-4 border-crust absolute top-0 left-0 rounded-tl-2xl"></div>
              <div className="w-8 h-8 border-t-4 border-r-4 border-crust absolute top-0 right-0 rounded-tr-2xl"></div>
              <div className="w-8 h-8 border-b-4 border-l-4 border-crust absolute bottom-0 left-0 rounded-bl-2xl"></div>
              <div className="w-8 h-8 border-b-4 border-r-4 border-crust absolute bottom-0 right-0 rounded-br-2xl"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
