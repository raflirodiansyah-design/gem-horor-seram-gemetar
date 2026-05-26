import React from 'react';
import { Shield, Sparkles, Battery, Heart, Compass, Eye, Activity, Anchor, Radio, Cpu, Award } from 'lucide-react';

interface HUDProps {
  oxygen: number;
  battery: number;
  itemsCollected: string[];
  totalParts: number;
  stressLevel: number; // 0 to 1
  sirenDistance: number; // For sonar visualization
  sonarPings: Array<{ x: number; y: number; radius: number; maxRadius: number; alpha: number }>;
  escapeReady: boolean;
  gameTime: number;
  difficulty: 'mudah' | 'normal' | 'sulit';
  sonarActive: boolean;
  distanceToEscapePod: number;
}

export default function HUD({
  oxygen,
  battery,
  itemsCollected,
  totalParts,
  stressLevel,
  sirenDistance,
  sonarPings,
  escapeReady,
  gameTime,
  difficulty,
  sonarActive,
  distanceToEscapePod,
}: HUDProps) {
  // Translate time to clock string (00:00)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getBpm = () => {
    return Math.floor(60 + stressLevel * 115);
  };

  // Check which modules have been collected
  const hasPart = (part: string) => itemsCollected.includes(part);

  const partsList = [
    { key: 'propeller', name: 'Baling-Baling Mesin', desc: 'Propeller' },
    { key: 'fuel', name: 'Aliran Sel Bahan Bakar', desc: 'Fuel Cell' },
    { key: 'transmitter', name: 'Antena Transmiter', desc: 'Transmitter' },
    { key: 'chip', name: 'Modul Navigasi GPS', desc: 'Navigation Key' },
    { key: 'core', name: 'Inti Baterai Utama', desc: 'Engine Core' },
  ];

  return (
    <div id="game-hud" className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-4 md:p-6 font-mono text-xs select-none bg-transparent">
      
      {/* 1. Vignettes & Danger overlays */}
      {/* Heavy Red pulse vignette when Stress is extremely high or near Siren */}
      <div 
        className="absolute inset-0 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(circle, transparent 40%, rgba(6, 182, 212, ${0.05 + stressLevel * 0.15}) 30%, rgba(220, 38, 38, ${0.1 + stressLevel * 0.45}) 100%)`,
          opacity: stressLevel > 0.1 ? 1 : 0,
        }}
      />

      {/* Extreme Low Oxygen red vignette blinking */}
      {oxygen <= 30 && (
        <div 
          className="absolute inset-0 bg-red-950/20 mix-blend-multiply animate-pulse border-2 border-red-500/30"
          style={{ animationDuration: '0.8s' }}
        />
      )}

      {/* HUD HEADER: Clock, Status Alerts, Difficulty */}
      <div className="w-full flex items-start justify-between gap-4">
        
        {/* Left Stats Header: Submarine Telemetry */}
        <div id="hud-telemetry" className="flex flex-col gap-2 p-3 bg-[#020617]/95 border border-cyan-500/30 rounded-none pointer-events-auto backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.1)] max-w-xs transition-all">
          <div className="flex items-center gap-1.5 text-cyan-400 font-bold border-b border-cyan-500/20 pb-1.5">
            <Activity className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            <span className="tracking-widest text-[9px]">SUB TELEMETRI [X9]</span>
          </div>
          
          <div className="space-y-1.5 text-[10px] text-slate-300 font-mono">
            <div className="flex justify-between gap-6">
              <span>TINGKAT BAHAYA:</span>
              <span className={`font-bold uppercase ${difficulty === 'sulit' ? 'text-red-400' : difficulty === 'normal' ? 'text-cyan-400' : 'text-emerald-400'}`}>
                {difficulty === 'mudah' ? 'Rendah (Easy)' : difficulty === 'normal' ? 'Standard' : 'Ekstrim (Hard)'}
              </span>
            </div>
            
            <div className="flex justify-between gap-6">
              <span>TEKANAN AIR:</span>
              <span className="text-cyan-400 font-semibold">1,240 kPa [OK]</span>
            </div>

            <div className="flex justify-between items-center gap-6 font-mono">
              <span>RETENSI WAKTU:</span>
              <span className="text-white font-serif italic text-sm font-bold tracking-wider">{formatTime(gameTime)}</span>
            </div>

            <div className="flex justify-between items-center gap-6">
              <span>JARAK KELUAR:</span>
              <span className={`font-bold ${distanceToEscapePod < 150 ? 'text-emerald-400 animate-pulse' : 'text-cyan-400'}`}>
                {Math.floor(distanceToEscapePod)} m
              </span>
            </div>
          </div>
        </div>

        {/* Center Alert Messages */}
        <div className="flex flex-col items-center gap-2 max-w-md w-fit text-center">
          {escapeReady ? (
            <div className="px-5 py-3 border border-emerald-500 bg-emerald-950/80 text-emerald-400 rounded-none shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse font-serif italic text-sm text-center flex items-center gap-2.5 flex-row pointer-events-auto select-none">
              <Compass className="w-5 h-5 animate-spin text-emerald-400" />
              <div>
                <p className="tracking-wider uppercase font-bold text-xs not-italic">⚠️ DAYA ESCAPE POD AKTIF ⚠️</p>
                <p className="text-[10px] text-emerald-300/80 mt-0.5 font-sans not-italic">Kembalilah segera ke Pusat Peta (Lampu Kuning) untuk memulihkan kapal selam dan melarikan diri!</p>
              </div>
            </div>
          ) : (
            stressLevel > 0.6 && (
              <div className="px-4 py-2 border border-red-500/60 bg-red-950/80 text-red-400 rounded-none shadow-lg font-serif italic text-xs tracking-wide animate-pulse">
                PERINGATAN: RADIASI GELOMBANG INTENSOR SIREN MENDEKAT - MATIKAN PING
              </div>
            )
          )}
        </div>

        {/* Right Stats Header: Survival Diagnostics */}
        <div id="hud-diagnostics" className="flex flex-col gap-3 p-3.5 bg-[#020617]/95 border border-cyan-500/30 rounded-none pointer-events-auto backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.1)] w-60 font-mono">
          
          {/* Oxygen Gauge */}
          <div>
            <div className="flex justify-between text-[10px] mb-1">
              <span className="flex items-center gap-1 font-bold text-cyan-400 uppercase tracking-wider">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                DIVER OXYGEN (O₂)
              </span>
              <span className={`font-bold ${oxygen <= 30 ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`}>{Math.floor(oxygen)}%</span>
            </div>
            
            {/* O2 Bar */}
            <div className="w-full bg-slate-950 border border-slate-800 h-2 p-0.5 rounded-none overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${oxygen <= 30 ? 'bg-red-500' : 'bg-cyan-500'}`} 
                style={{ width: `${oxygen}%` }} 
              />
            </div>
          </div>

          {/* Flashlight Battery */}
          <div>
            <div className="flex justify-between text-[10px] mb-1">
              <span className="flex items-center gap-1 font-bold text-cyan-400 uppercase tracking-wider">
                <Battery className="w-3.5 h-3.5 text-cyan-400" />
                SENTIL BATTERI
              </span>
              <span className={`font-bold ${battery <= 20 ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`}>{Math.floor(battery)}%</span>
            </div>

            {/* Battery Bar */}
            <div className="w-full bg-slate-950 border border-slate-800 h-2 p-0.5 rounded-none overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${battery <= 20 ? 'bg-red-500' : 'bg-cyan-400'}`} 
                style={{ width: `${battery}%` }} 
              />
            </div>
          </div>

          {/* Heart Rate & Stress */}
          <div className="border-t border-cyan-500/20 pt-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className={`w-5 h-5 text-red-500 heart-pulse`} style={{ animationDuration: `${60 / getBpm()}s` }} />
              <div>
                <p className="text-[9px] text-slate-500 tracking-wider">DENYUT JANTUNG</p>
                <p className="text-lg font-bold font-serif text-red-500 leading-none">{getBpm()} <span className="text-[9px] text-red-500/65 font-sans font-normal">BPM</span></p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-slate-500 tracking-wider">STRES INDEKS</p>
              <p className="text-xs font-bold text-cyan-400">{(stressLevel * 100).toFixed(0)}%</p>
            </div>
          </div>

        </div>
      </div>

      {/* BOTTOM HUD LAYER: Items list on left & Tactical Circular radar on right */}
      <div className="w-full flex items-end justify-between mt-auto">
        
        {/* Submarine Escape Pod Modules Checklist */}
        <div id="hud-checklist" className="flex flex-col gap-2 p-3.5 bg-[#020617]/95 border border-cyan-500/30 rounded-none pointer-events-auto backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.1)] max-w-xs w-full">
          <div className="flex items-center gap-1.5 text-cyan-400 font-bold border-b border-cyan-500/20 pb-1.5">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="tracking-widest text-[9px]">SUKU CADANG MODUL ({itemsCollected.length}/{totalParts})</span>
          </div>

          <div className="space-y-1.5 mt-2">
            {partsList.map((part) => {
              const collected = hasPart(part.key);
              return (
                <div key={part.key} className="flex items-center gap-2.5">
                  <div className={`w-3.5 h-3.5 rounded-none border flex items-center justify-center font-bold text-[8px] ${
                    collected ? 'bg-cyan-950 border-cyan-400 text-cyan-300' : 'bg-slate-950 border-slate-800 text-slate-600'
                  }`}>
                    {collected ? '✓' : ''}
                  </div>
                  <div>
                    <span className={`text-[10px] block leading-tight ${collected ? 'text-slate-500 line-through select-none opacity-50' : 'text-slate-300'}`}>
                      {part.name}
                    </span>
                    <span className="text-[8px] text-cyan-600/70 block -mt-0.5 font-mono">{part.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Immersive circular tactical sonar simulation */}
        <div id="hud-sonar" className="relative p-3 bg-[#020617]/95 border border-cyan-500/30 rounded-none pointer-events-auto backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.1)] flex gap-3.5 items-center">
          
          <div className="flex flex-col items-start justify-center max-w-[124px]">
            <p className="text-[10px] font-bold text-cyan-400 mb-1 flex items-center gap-1 tracking-wider uppercase">
              <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
              SISTEM SONAR
            </p>
            <p className="text-[9px] text-slate-400 leading-tight">
              Tekan <strong className="text-white bg-slate-950 px-1 py-0.5 border border-slate-800 rounded-none">SPASI</strong> untuk deteksi siren & letak bagian perahu, namun ia bisa mendengar suaramu!
            </p>
            {sonarActive && (
              <span className="text-[8px] text-emerald-400 font-bold tracking-widest uppercase mt-1.5 block animate-pulse">ACTIVE SCAN...</span>
            )}
          </div>

          {/* Glowing Cyan Interactive Sonar Circle */}
          <div className="relative w-24 h-24 rounded-full border border-cyan-500/30 flex items-center justify-center bg-cyan-950/20 overflow-hidden shadow-[inset_0_0_15px_rgba(6,182,212,0.15)]">
            
            {/* Compass Concentric Lines */}
            <div className="absolute inset-2 rounded-full border border-cyan-500/15" />
            <div className="absolute inset-6 rounded-full border border-cyan-500/10" />
            <div className="absolute inset-10 rounded-full border border-cyan-500/5" />
            
            {/* Center Crosshairs */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-[1px] bg-cyan-500/10 absolute top-1/2 left-0" />
              <div className="h-full w-[1px] bg-cyan-500/10 absolute top-0 left-1/2" />
            </div>

            {/* Central Submarine dot */}
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 z-10" />

            {/* Glowing sweep hand */}
            <div className="absolute inset-0 radar-hand bg-gradient-to-tr from-transparent via-transparent to-cyan-500/20 rounded-full pointer-events-none" />

            {/* Siren red blip on radar if she is close */}
            {sirenDistance < 600 && (
              <div 
                className="absolute w-2 h-2 rounded-full bg-red-500 animate-ping z-10"
                style={{
                  top: `${40 - (sirenDistance / 600) * 20}%`,
                  left: `${45 + Math.sin(gameTime / 2) * (sirenDistance / 600) * 30}%`,
                  opacity: stressLevel > 0.3 || sonarActive ? 1 : 0,
                  transition: 'opacity 0.5s ease',
                  animationDuration: '1.2s'
                }}
              />
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
