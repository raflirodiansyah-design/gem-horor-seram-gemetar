/**
 * Web Audio API Sound Synthesizer Engine for Siren Abyss Horror
 * Synthesizes immersive under-water ambient drone, engine hums, sonar pings, clicks,
 * heartbeats, and terrifying Siren screams directly in the browser!
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  // Sound sources & nodes
  private droneNode: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private engineNode: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private threatLFO: OscillatorNode | null = null;

  // Tracking heartbeat scheduling
  private lastHeartbeatTime: number = 0;
  private heartbeatInterval: number = 1000; // ms
  private targetBpm: number = 60;
  private heartbeatTimer: number | null = null;

  constructor() {
    // Lazy load or construct as needed
  }

  public init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.startAmbientDrone();
      this.startEngineHum();
      this.startHeartbeatLoop();
    } catch (e) {
      console.error('Failed to initialize AudioContext:', e);
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.ctx) {
      if (muted) {
        this.ctx.suspend();
      } else {
        this.ctx.resume();
      }
    }
  }

  public getMuted() {
    return this.isMuted;
  }

  /**
   * Continuous low-frequency deep sea ambient rumble
   */
  private startAmbientDrone() {
    if (!this.ctx || this.isMuted) return;

    try {
      // Create sub bass oscillator
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(32, this.ctx.currentTime); // C1 sub-bass

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(32.4, this.ctx.currentTime); // subtle beating

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(65, this.ctx.currentTime);
      filter.Q.setValueAtTime(5, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.4, this.ctx.currentTime);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start();
      osc2.start();

      this.droneNode = osc1; // Track one of them for general reference
      this.droneGain = gain;
    } catch (_) {}
  }

  /**
   * Continuous engine rumble hum for the submarine
   */
  private startEngineHum() {
    if (!this.ctx || this.isMuted) return;

    try {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(45, this.ctx.currentTime); // Low engine growl

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(75, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime); // quiet hum

      // Low frequency LFO to simulate cavitation/bubbles
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(4.5, this.ctx.currentTime); // 4.5Hz wobble
      lfoGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.start();

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();

      this.engineNode = osc;
      this.engineGain = gain;
      this.threatLFO = lfo;
    } catch (_) {}
  }

  /**
   * Dynamically adjust the engine pitch/gain based on player velocity
   */
  public updateEngineActivity(speed: number) {
    if (!this.ctx || this.isMuted || !this.engineNode || !this.engineGain) return;
    
    // Speed ranges from 0 to 1
    const targetFreq = 45 + speed * 25; // 45Hz to 70Hz engine hum
    const targetVol = 0.08 + speed * 0.12; // Louder when moving

    this.engineNode.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.2);
    this.engineGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.2);
  }

  /**
   * Heartbeat schedule loop
   */
  private startHeartbeatLoop() {
    const playTick = () => {
      this.playHeartbeatSound();
      this.heartbeatInterval = 60000 / this.targetBpm;
      this.heartbeatTimer = window.setTimeout(playTick, this.heartbeatInterval);
    };
    playTick();
  }

  /**
   * Synthesizes a realistic double-pulse heartbeat (lub-dub)
   */
  private playHeartbeatSound() {
    if (!this.ctx || this.isMuted || this.ctx.state === 'suspended') return;

    try {
      const now = this.ctx.currentTime;

      // FIRST THUMP ('lub')
      this.triggerThump(now, 55, 0.4);

      // SECOND THUMP ('dub') shortly after
      const delay = 0.15; // 150ms delay
      this.triggerThump(now + delay, 48, 0.3);
    } catch (_) {}
  }

  private triggerThump(time: number, startFreq: number, intensity: number) {
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, time);
    // Exponential frequency drop
    osc.frequency.exponentialRampToValueAtTime(10, time + 0.12);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(80, time);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(intensity, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + 0.16);
  }

  /**
   * Dynamically alters stress heartbeat rate based on proximity of Siren
   */
  public setThreatLevel(distancePercent: number) {
    // distancePercent: 0 (safe, distant) to 1 (extremely close / chasing)
    this.targetBpm = Math.floor(60 + distancePercent * 115); // 60 to 175 BPM
  }

  /**
   * Play Sonar Ping sound - high pitched resonant wave decaying gracefully
   */
  public playSonarPing() {
    if (!this.ctx || this.isMuted || this.ctx.state === 'suspended') return;

    try {
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      // Retro submarine ping starts high and drops slightly
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(850, now + 1.2);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(950, now);
      filter.Q.setValueAtTime(1, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.03); // rapid attack
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8); // long submarine resonance echo

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 2.0);
    } catch (_) {}
  }

  /**
   * Sound when picking up sub parts or refills
   */
  public playPickup(type: 'PART' | 'REFILL') {
    if (!this.ctx || this.isMuted || this.ctx.state === 'suspended') return;

    try {
      const now = this.ctx.currentTime;

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';

      if (type === 'PART') {
        // Grand futuristic mechanical chime
        osc1.frequency.setValueAtTime(330, now); // E4
        osc1.frequency.setValueAtTime(392, now + 0.1); // G4
        osc1.frequency.setValueAtTime(523.25, now + 0.2); // C5
        osc1.frequency.setValueAtTime(659.25, now + 0.3); // E5

        osc2.frequency.setValueAtTime(659.25, now);
        osc2.frequency.setValueAtTime(880, now + 0.1);
        osc2.frequency.setValueAtTime(1046.5, now + 0.2);
      } else {
        // Quick bubbly recharge sound
        osc1.frequency.setValueAtTime(440, now);
        osc1.frequency.setValueAtTime(660, now + 0.08);
        osc1.frequency.setValueAtTime(990, now + 0.16);
        
        osc2.frequency.setValueAtTime(220, now);
        osc2.frequency.exponentialRampToValueAtTime(1100, now + 0.3);
      }

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.7);
      osc2.stop(now + 0.7);
    } catch (_) {}
  }

  /**
   * Tremendous creepy screech from the Siren mermaid when she discovers the player
   */
  public playSirenScreech() {
    if (!this.ctx || this.isMuted || this.ctx.state === 'suspended') return;

    try {
      const now = this.ctx.currentTime;

      // 1. Terrifying high-pitched sweeping oscillator
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const noise = this.createNoiseNode();
      
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(550, now);
      osc1.frequency.linearRampToValueAtTime(1400, now + 0.3);
      osc1.frequency.exponentialRampToValueAtTime(350, now + 1.2);

      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(530, now);
      osc2.frequency.linearRampToValueAtTime(1440, now + 0.3);
      osc2.frequency.exponentialRampToValueAtTime(330, now + 1.2);

      // Low frequency modulation for creepy warbling effect
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.type = 'sawtooth';
      lfo.frequency.setValueAtTime(35, now); // 35Hz vibration
      lfoGain.gain.setValueAtTime(120, now);

      lfo.connect(lfoGain);
      lfoGain.connect(osc1.frequency);
      lfoGain.connect(osc2.frequency);

      // Distorted high-pass filtered scream noise
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(400, now);
      filter.Q.setValueAtTime(8, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

      lfo.start(now);
      osc1.connect(filter);
      osc2.connect(filter);
      
      if (noise) {
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(1000, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(300, now + 1.0);
        
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.12, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(gain);
        noise.start(now);
        noise.stop(now + 1.1);
      }

      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      lfo.start(now);

      osc1.stop(now + 1.5);
      osc2.stop(now + 1.5);
      lfo.stop(now + 1.5);
    } catch (_) {}
  }

  /**
   * Sound played during random flashlight flickers or high stress static interference
   */
  public playStaticCrackle() {
    if (!this.ctx || this.isMuted || this.ctx.state === 'suspended') return;

    try {
      const now = this.ctx.currentTime;
      const noise = this.createNoiseNode();
      if (!noise) return;

      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3000, now);
      filter.Q.setValueAtTime(4, now);

      // Sudden crackle envelope
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.04, now + 0.01);
      gain.gain.linearRampToValueAtTime(0, now + 0.05);
      gain.gain.linearRampToValueAtTime(0.03, now + 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + 0.2);
    } catch (_) {}
  }

  /**
   * Screaming white-noise burst and bass drop when Siren jumpscares the player
   */
  public playJumpscare() {
    if (!this.ctx || this.isMuted || this.ctx.state === 'suspended') return;

    try {
      const now = this.ctx.currentTime;
      const noise = this.createNoiseNode();
      const subOsc = this.ctx.createOscillator();
      const midOsc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      subOsc.type = 'sawtooth';
      subOsc.frequency.setValueAtTime(80, now);
      subOsc.frequency.linearRampToValueAtTime(30, now + 1.5);

      midOsc.type = 'triangle';
      midOsc.frequency.setValueAtTime(180, now);
      midOsc.frequency.exponentialRampToValueAtTime(40, now + 1.8);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.02); // INSTANT LOUD ATTACK
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

      subOsc.connect(gain);
      midOsc.connect(gain);

      if (noise) {
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(6000, now);
        
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.25, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(gain);
        noise.start(now);
        noise.stop(now + 2.5);
      }

      gain.connect(this.ctx.destination);

      subOsc.start(now);
      midOsc.start(now);

      subOsc.stop(now + 3.0);
      midOsc.stop(now + 3.0);
    } catch (_) {}
  }

  /**
   * Sound for game start / enter water
   */
  public playDiveIn() {
    if (!this.ctx || this.isMuted || this.ctx.state === 'suspended') return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 1.0);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, now);
      filter.frequency.exponentialRampToValueAtTime(50, now + 1.0);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 1.5);
    } catch (_) {}
  }

  /**
   * Helper to build a buffer of white noise
   */
  private createNoiseNode(): AudioBufferSourceNode | null {
    if (!this.ctx) return null;
    try {
      const bufferSize = this.ctx.sampleRate * 3; // 3 seconds
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      return noise;
    } catch (_) {
      return null;
    }
  }

  public shutdown() {
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    // Shut down context
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

// Global single instance to prevent recreation glitches
export const globalAudio = new AudioEngine();
