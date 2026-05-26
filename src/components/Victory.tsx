import React from 'react';
import { Compass, Sparkles, RefreshCw, Award, Heart, CheckCircle2 } from 'lucide-react';
import { globalAudio } from '../AudioEngine';

interface VictoryProps {
  timeSurvived: number;
  onRestart: () => void;
  difficulty: 'mudah' | 'normal' | 'sulit';
}

export default function Victory({ timeSurvived, onRestart, difficulty }: VictoryProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins} menit ${secs} detik`;
  };

  const handleRestart = () => {
    globalAudio.init();
    globalAudio.resume();
    globalAudio.playDiveIn();
    onRestart();
  };

  const getDifficultyTitle = () => {
    if (difficulty === 'mudah') return 'Mudah (Safe Swim)';
    if (difficulty === 'normal') return 'Normal Deep-Sea';
    return 'EKSTRIM (Abyssal Slayer)';
  };

  return (
    <div id="game-victory" className="absolute inset-0 z-20 bg-[#020617] flex flex-col items-center justify-center p-6 text-center select-none crt-scanner">
      
      {/* Deep Ocean Ambient Light & The Presence */}
      <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center">
        <div className="w-[500px] h-[500px] opacity-20 filter blur-3xl bg-cyan-500 rounded-full mix-blend-screen animate-pulse" />
      </div>

      <div className="max-w-md w-full bg-[#020617]/95 border border-cyan-500/30 rounded-none p-6 md:p-8 shadow-[0_0_25px_rgba(6,182,212,0.15)] backdrop-blur-md relative overflow-hidden">
        
        {/* Shine highlight */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-400/10 blur-xl pointer-events-none" />

        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#020617] border border-cyan-400 text-[10px] text-cyan-400 font-mono font-bold tracking-[0.2em] px-4 py-1 rounded-none shadow-lg uppercase flex items-center gap-1.5">
          <Award className="w-3.5 h-3.5 text-cyan-400" />
          ABYSS CONQUERED
        </div>

        {/* Big Trophy / Check Circle */}
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-cyan-950/20 border border-cyan-500/20 rounded-none shadow-[0_0_35px_rgba(6,182,212,0.15)] animate-bounce" style={{ animationDuration: '3s' }}>
            <CheckCircle2 className="w-10 h-10 text-cyan-400" />
          </div>
        </div>

        <h2 className="text-2xl md:text-3xl font-serif font-light text-white tracking-[0.15em] mb-1 uppercase">
          REKAYASA <span className="text-cyan-400 font-serif italic font-bold lowercase">berhasil</span>
        </h2>
        <p className="text-[9px] font-mono text-cyan-400 tracking-widest mb-5 font-bold uppercase">KAPAL POD BERHASIL LEPAS LANDAS</p>

        {/* Victory Description */}
        <p className="text-xs text-slate-300 mb-6 font-mono leading-relaxed bg-black/40 p-4 rounded-none border border-cyan-950/20 text-left">
          Dengan seluruh suku cadang kapal selam terkumpul, Anda menyalakan mesin utama pod penyelamatan. Pod melesat tegak ke atas, menembus kubah air gelap gulita, menyisakan raungan amarah putri duyung <strong className="text-cyan-400 font-serif italic">Siren</strong> yang tertinggal di kedalaman laut tak berujung. Anda kembali menyambut sinar matahari hangat di permukaan laut!
        </p>

        {/* Stats segment */}
        <div className="border-t border-slate-900 pt-4 space-y-2 mb-8 text-left font-mono">
          <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-2 font-bold font-mono">CATATAN PERJALANAN ANDA:</div>
          
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 flex items-center gap-2">
              🚀 Kedalaman Misi:
            </span>
            <span className="text-white font-serif italic text-sm">{getDifficultyTitle()}</span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 flex items-center gap-2">
              ⏱️ Waktu Tempuh:
            </span>
            <span className="text-cyan-400 font-serif italic text-sm font-bold">{formatTime(timeSurvived)}</span>
          </div>
          
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 flex items-center gap-2">
              💎 Modul Terkumpul:
            </span>
            <span className="text-white font-mono text-xs">5 / 5 Terpasang</span>
          </div>
        </div>

        {/* Action button */}
        <button
          id="btn-restart-win"
          onClick={handleRestart}
          className="w-full py-3.5 rounded-none bg-cyan-950/20 hover:bg-cyan-900/40 text-cyan-200 border border-cyan-500/40 font-bold font-serif uppercase tracking-[0.2em] transition-all duration-300 active:scale-98 flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-[0_0_15px_rgba(6,182,212,0.25)]"
        >
          <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
          MAIN LAGI (ADRENALIN RESET)
        </button>

      </div>
    </div>
  );
}
