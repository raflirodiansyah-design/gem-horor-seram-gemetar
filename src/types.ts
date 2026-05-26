export interface Position {
  x: number;
  y: number;
}

export type SirenState = 'PATROL' | 'INVESTIGATE' | 'CHASE';

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number; // For facing direction
  oxygen: number;
  battery: number;
  itemsCollected: string[];
  isDead: boolean;
  deathReason: 'SUREN' | 'OXYGEN' | '';
}

export interface Siren {
  x: number;
  y: number;
  angle: number;
  state: SirenState;
  targetX: number;
  targetY: number;
  speed: number;
  screechPlayed: boolean;
  wiggleTime: number;
}

export interface GameItem {
  id: string;
  name: string;
  type: 'PART' | 'OXYGEN' | 'BATTERY';
  partName?: string;
  iconName: string;
  x: number;
  y: number;
  collected: boolean;
  pulseTime: number;
}

export interface SonarPing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  speed: number;
  active: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface Obstacle {
  x: number;
  y: number;
  radius: number;
  type: 'ROCK' | 'WRECKAGE' | 'VENT';
}
