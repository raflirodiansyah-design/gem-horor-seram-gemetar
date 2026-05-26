import React, { useState, useEffect } from 'react';
import MainMenu from './components/MainMenu';
import GameCanvas from './components/GameCanvas';
import GameOver from './components/GameOver';
import Victory from './components/Victory';
import { globalAudio } from './AudioEngine';
import { Compass, Volume2, VolumeX, ShieldAlert } from 'lucide-react';

type GameState = 'MENU' | 'PLAYING' | 'GAMEOVER' | 'VICTORY';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [difficulty, setDifficulty] = useState<'mudah' | 'normal' | 'sulit'>('normal');
  const [deathReason, setDeathReason] = useState<'SUREN' | 'OXYGEN' | ''>('');
  const [timeSurvived, setTimeSurvived] = useState<number>(0);
  const [partsCollected, setPartsCollected] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Stop dynamic audio tracks on leaving play mode
  useEffect(() => {
    return () => {
      globalAudio.shutdown();
    };
  }, []);

  const handleStartGame = (selectedDifficulty: 'mudah' | 'normal' | 'sulit') => {
    setDifficulty(selectedDifficulty);
    setGameState('PLAYING');
  };

  const handleGameWon = (time: number) => {
    setTimeSurvived(time);
    setGameState('VICTORY');
  };

  const handleGameLost = (reason: 'SUREN' | 'OXYGEN' | '', time: number) => {
    setDeathReason(reason);
    setTimeSurvived(time);
    
    // Check how many items player had gathered
    const canvasDoc = document.getElementById('game-hud');
    let collectedCount = 0;
    if (canvasDoc) {
      // Pull collected count dynamically
      const checkboxText = canvasDoc.querySelector('#hud-checklist');
      if (checkboxText) {
        const matches = checkboxText.textContent?.match(/(\d)\/5/);
        if (matches) {
          collectedCount = parseInt(matches[1], 10);
        }
      }
    }
    setPartsCollected(collectedCount);
    setGameState('GAMEOVER');
  };

  const handleRestart = () => {
    setGameState('PLAYING');
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    globalAudio.setMute(nextMuted);
  };

  return (
    <div id="app-root" className="w-screen h-screen relative bg-[#020617] text-slate-200 overflow-hidden select-none">
      
      {/* Deep Ocean Cinematic Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#082f49] via-[#020617] to-black opacity-60 pointer-events-none z-0" />
      <div className="absolute inset-0 pointer-events-none z-0" style={{ background: 'radial-gradient(circle at 50% 50%, transparent 20%, rgba(0,0,0,0.8) 80%)' }} />

      {/* Cinematic Screen Scratches & CRT Scanline Overlay */}
      <div className="absolute inset-0 pointer-events-none crt-overlay z-40" />
      <div className="absolute inset-0 pointer-events-none scratches-overlay z-40" />
      
      {gameState === 'MENU' && (
        <MainMenu onStartGame={handleStartGame} />
      )}

      {gameState === 'PLAYING' && (
        <GameCanvas
          difficulty={difficulty}
          onGameWon={handleGameWon}
          onGameLost={handleGameLost}
        />
      )}

      {gameState === 'GAMEOVER' && (
        <GameOver
          reason={deathReason}
          partsCollected={partsCollected}
          totalParts={5}
          timeSurvived={timeSurvived}
          onRestart={handleRestart}
        />
      )}

      {gameState === 'VICTORY' && (
        <Victory
          timeSurvived={timeSurvived}
          onRestart={handleRestart}
          difficulty={difficulty}
        />
      )}

      {/* Persistent Tiny Mute Indicator Floating in Corner (Only in active play) */}
      {gameState === 'PLAYING' && (
        <div className="absolute top-4 left-4 z-50 flex items-center gap-1.5 bg-slate-950/75 border border-sky-900/30 rounded px-2 py-1 text-[10px] uppercase text-sky-400 font-mono pointer-events-auto backdrop-blur-md">
          <button
            onClick={toggleMute}
            className="flex items-center gap-1.5 hover:text-white transition-all cursor-pointer focus:outline-hidden"
          >
            {isMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-red-400" />
                <span>Audio Muted</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                <span>Audio Synth On</span>
              </>
            )}
          </button>
        </div>
      )}

    </div>
  );
}
