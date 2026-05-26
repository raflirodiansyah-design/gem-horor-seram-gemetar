import React from 'react';
import { Skull, RefreshCw, Eye, Timer, AlertTriangle } from 'lucide-react';
import { globalAudio } from '../AudioEngine';

interface GameOverProps {
  reason: 'SUREN' | 'OXYGEN' | '';
  partsCollected: number;
  totalParts: number;
  timeSurvived: number;
  onRestart: () => void;
}

export default function GameOver({
  reason,
  partsCollected,
  totalParts,
  timeSurvived,
  onRestart,
}: GameOverProps) {
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

  const causeTitle = reason === 'SUREN' ? 'DIKONSUMSI OLEH SIREN' : 'SISTEM OKSIGEN HABIS';
  const causeDesc = reason === 'SUREN' 
    ? 'Putri duyung predator (Siren) mendeteksi keberadaan kapal selam Anda dan mencabik-cabik lambung kapal dalam kegelapan pekat laut dalam.'
    : 'Tangki suplai oksigen Anda kosong sepenuhnya. Kapal selam Anda terombang-ambing mati di dasar gua laut.';

  return (
    <div id="game-over" className="absolute inset-0 z-20 bg-[#020617]/95 flex flex-col items-center justify-center p-6 text-center select-none crt-scanner">
      
      {/* Red light horror ambience */}
      <div className="absolute inset-0 bg-radial-at-c from-red-950/25 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-md w-full bg-[#020617]/95 border border-red-500/30 rounded-none p-6 md:p-8 shadow-[0_0_25px_rgba(239,68,68,0.15)] backdrop-blur-md relative">
        
        {/* Absolute top warning sticker */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#020617] border border-red-500/40 text-[9px] text-red-400 font-mono font-bold tracking-[0.2em] px-4 py-1 rounded-none shadow-lg uppercase flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
          SYSTEM FAILURE
        </div>

        {/* Big Skull Icon with red glow */}
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-red-950/20 border border-red-500/20 rounded-none">
            <Skull className="w-10 h-10 text-red-500 animate-pulse" />
          </div>
        </div>

        <h2 className="text-2xl md:text-3xl font-serif font-light text-white tracking-[0.15em] uppercase mb-1 drop-shadow-[0_0_20px_rgba(239,68,68,0.2)]">
          KAPAL SELAM <span className="text-red-500 font-serif italic font-bold lowercase">hancur</span>
        </h2>
        <p className="text-[9px] font-mono text-red-400 tracking-widest mb-4 font-bold uppercase">REASON: {causeTitle}</p>

        {/* Narrative */}
        <p className="text-xs text-slate-400 mb-6 font-mono leading-relaxed bg-black/40 p-4 rounded-none border border-red-950/10">
          {causeDesc}
        </p>

        {/* Stats segment */}
        <div className="border-t border-slate-900 pt-5 space-y-3 mb-8 text-left font-mono">
          <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-2 font-bold font-mono">DIAGNOSTIK KAPAL SELAM SEBELUM HANCUR:</div>
          
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 flex items-center gap-2">
              <Timer className="w-3.5 h-3.5 text-slate-400" />
              Waktu Bertahan:
            </span>
            <span className="text-white font-serif italic text-sm">{formatTime(timeSurvived)}</span>
          </div>

          <div className="flex justify-between items-center text-xs border-b border-slate-950 pb-3">
            <span className="text-slate-400 flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              Suku Cadang Terkumpul:
            </span>
            <span className="text-cyan-400 font-bold">{partsCollected} / {totalParts} bagian</span>
          </div>
        </div>

        {/* Action button */}
        <button
          id="btn-restart"
          onClick={handleRestart}
          className="w-full py-3.5 rounded-none bg-red-950/20 hover:bg-red-900/40 text-red-200 border border-red-500/40 font-bold font-serif uppercase tracking-[0.2em] transition-all duration-300 active:scale-98 flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-[0_0_15px_rgba(239,68,68,0.25)]"
        >
          <RefreshCw className="w-3.5 h-3.5 text-red-400 animate-spin" style={{ animationDuration: '4s' }} />
          KEMBALI MENYELAM (RETRY)
        </button>

      </div>
    </div>
  );
}
