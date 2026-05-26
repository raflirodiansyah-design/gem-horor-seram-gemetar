import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, Volume2, VolumeX, Eye, Compass, Anchor, Disc, Play } from 'lucide-react';
import { globalAudio } from '../AudioEngine';

interface MainMenuProps {
  onStartGame: (difficulty: 'mudah' | 'normal' | 'sulit') => void;
}

export default function MainMenu({ onStartGame }: MainMenuProps) {
  const [difficulty, setDifficulty] = useState<'mudah' | 'normal' | 'sulit'>('normal');
  const [muted, setMuted] = useState(false);
  const [bubbles, setBubbles] = useState<Array<{ id: number; left: string; size: number; delay: string; duration: string }>>([]);

  // Generate background rising ambient bubbles
  useEffect(() => {
    const list: typeof bubbles = [];
    for (let i = 0; i < 20; i++) {
      list.push({
        id: i,
        left: `${Math.random() * 100}%`,
        size: Math.random() * 12 + 4,
        delay: `${Math.random() * 8}s`,
        duration: `${Math.random() * 15 + 10}s`,
      });
    }
    setBubbles(list);
  }, []);

  const handleMuteToggle = () => {
    const m = !muted;
    setMuted(m);
    globalAudio.setMute(m);
  };

  const playTestPing = () => {
    // Initialise and play a test ping
    globalAudio.init();
    globalAudio.resume();
    globalAudio.playSonarPing();
  };

  const handleStart = () => {
    globalAudio.init();
    globalAudio.resume();
    globalAudio.playDiveIn();
    onStartGame(difficulty);
  };

  return (
    <div id="main-menu" className="relative w-full h-screen bg-[#020617] flex flex-col items-center justify-center p-6 overflow-hidden select-none crt-scanner">
      
      {/* Dynamic Rising Bubbles Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {bubbles.map(b => (
          <div
            key={b.id}
            className="bubble-bg"
            style={{
              left: b.left,
              width: `${b.size}px`,
              height: `${b.size}px`,
              animationDelay: b.delay,
              animationDuration: b.duration,
              animationName: 'float-bubble',
              animationIterationCount: 'infinite',
              animationTimingFunction: 'linear',
            }}
          />
        ))}
      </div>

      {/* Deep Ocean Ambient Light & The Presence */}
      <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center">
        <div className="w-[450px] h-[450px] opacity-15 filter blur-3xl bg-cyan-500 rounded-full mix-blend-screen animate-pulse" style={{ animationDuration: '6s' }}></div>
      </div>

      {/* Sound Muted Quick Control */}
      <div className="absolute top-6 right-6 z-30 flex items-center gap-3">
        <button
          id="btn-test-sound"
          onClick={playTestPing}
          className="flex items-center gap-2 text-xs text-cyan-300 border border-cyan-500/30 rounded-none py-1.5 px-3.5 bg-cyan-950/30 hover:bg-cyan-900/40 transition duration-300 active:scale-95"
          title="Tes suara sonar"
        >
          <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="font-mono tracking-widest text-[10px]">ECHO-TEST</span>
        </button>
        <button
          id="btn-mute"
          onClick={handleMuteToggle}
          className="p-2 text-cyan-300 border border-cyan-500/30 rounded-none bg-cyan-950/20 hover:bg-cyan-900/30 transition duration-300"
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Header / Title */}
      <div className="relative text-center max-w-2xl z-20 flex flex-col items-center select-none">
        <div className="flex items-center gap-2 text-cyan-400 tracking-[0.4em] uppercase text-[10px] font-mono font-bold mb-5 bg-cyan-950/30 border border-cyan-500/20 px-4 py-1.5 rounded-none shadow-[0_0_15px_rgba(6,182,212,0.1)]">
          <Anchor className="w-3.5 h-3.5 animate-bounce text-cyan-400" />
          Marseillaise Deep Sea Expedition
        </div>

        <h1 className="font-serif tracking-[0.2em] uppercase text-5xl md:text-7xl font-light text-white mb-1 drop-shadow-[0_0_30px_rgba(34,211,238,0.15)]">
          SIREN
        </h1>
        <div className="font-serif italic font-bold tracking-widest text-cyan-400 text-4xl md:text-5xl mb-7 relative">
          abyss
          <span className="absolute -bottom-2 left-1/4 w-1/2 h-[1px] bg-cyan-500/50" />
        </div>
        
        <p className="text-slate-400 text-xs md:text-sm mb-9 max-w-lg leading-relaxed font-sans px-4">
          Arungi kedalaman laut sunyi yang gelap pekat. Kumpulkan suku cadang kapal selam yang berserakan, kelola tangki oksigen, dan waspadalah... putri duyung pelacak <span className="text-cyan-300 font-serif italic">Siren</span> mengintaimu dari kegelapan.
        </p>

        {/* Dashboard Box */}
        <div className="w-full max-w-md bg-slate-950/90 border border-cyan-500/30 rounded-none p-6 md:p-7 backdrop-blur-md shadow-[0_0_25px_rgba(6,182,212,0.15)] relative">
          <div className="absolute top-0 left-6 -translate-y-1/2 bg-[#020617] border border-cyan-500/30 px-3 py-0.5 rounded-none text-[9px] font-mono text-cyan-400 tracking-widest">
            SUBMARIN TELEMETRY
          </div>

          {/* Difficulty selector */}
          <div className="mb-6">
            <label className="block text-left text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-3">
              KEDALAMAN PENYELAMAN:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                id="difficulty-easy"
                onClick={() => setDifficulty('mudah')}
                className={`py-2 px-1 rounded-none border text-[10px] font-mono tracking-widest transition-all duration-300 cursor-pointer ${
                  difficulty === 'mudah'
                    ? 'bg-cyan-950/70 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                    : 'bg-black/40 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                }`}
              >
                MUDAH
                <span className="block text-[8px] text-slate-500 tracking-normal mt-0.5 lowercase italic">O₂ hemat</span>
              </button>
              
              <button
                id="difficulty-normal"
                onClick={() => setDifficulty('normal')}
                className={`py-2 px-1 rounded-none border text-[10px] font-mono tracking-widest transition-all duration-300 cursor-pointer ${
                  difficulty === 'normal'
                    ? 'bg-cyan-950/70 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                    : 'bg-black/40 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                }`}
              >
                NORMAL
                <span className="block text-[8px] text-slate-500 tracking-normal mt-0.5 lowercase italic">survival</span>
              </button>

              <button
                id="difficulty-hard"
                onClick={() => setDifficulty('sulit')}
                className={`py-2 px-1 rounded-none border text-[10px] font-mono tracking-widest transition-all duration-300 cursor-pointer ${
                  difficulty === 'sulit'
                    ? 'bg-red-950/40 border-red-500/80 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.25)]'
                    : 'bg-black/40 border-slate-800 text-slate-500 hover:text-red-400/60 hover:border-slate-700'
                }`}
              >
                SULIT
                <span className="block text-[8px] text-slate-500 tracking-normal mt-0.5 lowercase italic">agressif</span>
              </button>
            </div>
          </div>

          {/* Instructions checklist */}
          <div className="text-left bg-black/50 border border-slate-900 rounded-none p-4 mb-6 text-xs text-slate-400 space-y-3 font-mono">
            <div className="text-[9px] text-cyan-400 uppercase border-b border-slate-900 pb-2 mb-2 flex items-center justify-between tracking-widest">
              <span>PETUNJUK KELANGSUNGAN HIDUP</span>
              <span>MAP: 2400M × 2400M</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-cyan-500 text-[10px]">🎮</span>
              <span className="text-[11px] leading-relaxed">Gunakan <strong className="text-white">WASD / Tombol Arah</strong> untuk kemudi kapal selam.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-cyan-500 text-[10px]">🔦</span>
              <span className="text-[11px] leading-relaxed">Gerakkan kursor mouse untuk <strong className="text-white">mengarahkan Senter</strong> bawah laut.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-cyan-500 text-[10px]">🔊</span>
              <span className="text-[11px] leading-relaxed">Tekan <strong className="text-white">SPASI</strong> atau <strong className="text-white">KLIK KIRI</strong> untuk pemicu <strong className="text-cyan-400">Sonar Radar Scan</strong>. Sonar mendeteksi suku cadang, namun Siren dapat mendengar denyut suaranya!</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-red-500 text-[10px]">⚠️</span>
              <span className="text-[11px] leading-relaxed">Kumpulkan <strong className="text-white">5 Suku Cadang Pod</strong> yang hilang guna keluar dari laut dalam.</span>
            </div>
          </div>

          {/* Action button */}
          <button
            id="btn-dive-in"
            onClick={handleStart}
            className="w-full py-4 rounded-none font-bold tracking-[0.25em] font-serif uppercase bg-gradient-to-r from-cyan-950 via-cyan-900 to-black text-cyan-200 hover:text-white border border-cyan-500/40 shadow-lg hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all duration-300 relative group overflow-hidden active:scale-98 text-center flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current text-cyan-400" />
            MENYELAM KE ABYSS
            <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-[shimmer_1.5s_ease-in-out_infinite]" />
          </button>
        </div>
      </div>

      {/* Cyberpunk Margin Decoration and details */}
      <footer className="absolute bottom-4 text-center text-[9px] font-mono text-cyan-800 tracking-[0.3em] z-20">
        SUB_X9 RESILIENT CAPTAIN SHELL // EST. TIME RECOVERY CODE // SYSTEM ACTIVE
      </footer>
    </div>
  );
}
