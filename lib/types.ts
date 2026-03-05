export interface TrailPoint {
  x: number;
  y: number;
  age: number;
}

export type ImpactStyle = "starburst" | "geometricShatter" | "flashBloom";

export interface SplashParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  opacity: number;
  radius: number;
  rotation?: number;
  rotVelocity?: number;
}

export interface Drop {
  id: number;
  x: number;
  y: number;
  radius: number;
  radiusX: number;
  radiusY: number;
  rotation: number;
  velocity: number;
  color: string;
  note: string;
  trail: TrailPoint[];
  impactY: number;
  impacted: boolean;
  impactAge: number;
  splash: SplashParticle[];
  hasPlayedNote: boolean;
}

export interface PhysicsConfig {
  velocityMin: number;
  velocityMax: number;
  spawnIntervalMs: number;
  maxDrops: number;
  trailLength: number;
  trailDecayRate: number;
}

export type SpeedTier = "slow" | "medium" | "fast";

export type WaveformType = "sine" | "triangle" | "square" | "sawtooth";

export interface AudioConfig {
  waveform?: WaveformType;
  reverbWet?: number;     // 0–1
  reverbDecay?: number;   // 0.5–6 seconds
  delayTime?: number;     // 0–1 seconds
  delayFeedback?: number; // 0–0.85
  delayWet?: number;      // 0–1
  bitDepth?: number;      // 2–16 (16 = clean)
  bitcrusherWet?: number; // 0–1
}

export type ColorSchemeName =
  | "coolBlues"
  | "forestGreens"
  | "mutedTones"
  | "grays"
  | "warmSunset"
  | "neonCyber"
  | "earthen";

export type ColorSchemeValue = ColorSchemeName | string[];

export interface ScaleConfig {
  root: string;
  type:
    | "majorPentatonic"
    | "minorPentatonic"
    | "major"
    | "naturalMinor"
    | "harmonicMinor"
    | "dorian"
    | "chromatic";
}

export interface FallingNoiseProps {
  colorScheme?: ColorSchemeValue;
  scale?: ScaleConfig;
  speed?: SpeedTier;
  impactStyle?: ImpactStyle;
  audioConfig?: AudioConfig;
  width?: string | number;
  height?: string | number;
}
