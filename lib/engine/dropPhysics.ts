import type { Drop, ImpactStyle, PhysicsConfig, SpeedTier, TrailPoint, SplashParticle } from "../types";

const PHYSICS_CONFIGS: Record<SpeedTier, PhysicsConfig> = {
  slow: {
    velocityMin: 1.5,
    velocityMax: 3.0,
    spawnIntervalMs: 600,
    maxDrops: 40,
    trailLength: 55,
    trailDecayRate: 0.025,
  },
  medium: {
    velocityMin: 3.0,
    velocityMax: 6.0,
    spawnIntervalMs: 350,
    maxDrops: 60,
    trailLength: 40,
    trailDecayRate: 0.04,
  },
  fast: {
    velocityMin: 6.0,
    velocityMax: 12.0,
    spawnIntervalMs: 150,
    maxDrops: 80,
    trailLength: 28,
    trailDecayRate: 0.06,
  },
};

let nextId = 0;

export function resolvePhysics(speed: SpeedTier): PhysicsConfig {
  return PHYSICS_CONFIGS[speed];
}

export function spawnDrop(
  width: number,
  height: number,
  colors: string[],
  notes: string[],
  physics: PhysicsConfig
): Drop {
  const velocity =
    physics.velocityMin +
    Math.random() * (physics.velocityMax - physics.velocityMin);
  const radius = 3 + Math.random() * 4;
  // Thin imperfect ellipse: narrow X, taller Y, slight random tilt
  const radiusX = radius * (0.38 + Math.random() * 0.18);
  const radiusY = radius;
  const rotation = (Math.random() - 0.5) * 0.5;
  const color = colors[Math.floor(Math.random() * colors.length)];
  const note = notes[Math.floor(Math.random() * notes.length)];
  const impactY = height * (0.28 + Math.random() * 0.57);

  return {
    id: nextId++,
    x: radius + Math.random() * (width - radius * 2),
    y: -radius,
    radius,
    radiusX,
    radiusY,
    rotation,
    velocity,
    color,
    note,
    trail: [],
    impactY,
    impacted: false,
    impactAge: 0,
    splash: [],
    hasPlayedNote: false,
  };
}

function createSplash(drop: Drop, impactStyle: ImpactStyle): SplashParticle[] {
  switch (impactStyle) {
    // These styles are rendered purely from impactAge + seeded PRNG — no particles needed
    case "tendril":
    case "inkDrop":
    case "liquidCrown":
      return [];

    case "petalScatter": {
      const count = 6 + Math.floor(Math.random() * 5);
      return Array.from({ length: count }, () => {
        const angle = (Math.random() - 0.5) * Math.PI * 1.8;
        const speed = 0.8 + Math.random() * 1.8;
        return {
          x: drop.x,
          y: drop.impactY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.2,
          opacity: 0.65 + Math.random() * 0.35,
          radius: 1.5 + Math.random() * 2.5,
          rotation: Math.random() * Math.PI * 2,
          rotVelocity: (Math.random() - 0.5) * 0.07,
        };
      });
    }

    case "dustCloud": {
      const count = 20 + Math.floor(Math.random() * 10);
      return Array.from({ length: count }, () => {
        const angle = (Math.random() - 0.5) * Math.PI * 1.7;
        const speed = 0.3 + Math.random() * 1.1;
        return {
          x: drop.x + (Math.random() - 0.5) * drop.radius * 2,
          y: drop.impactY,
          vx: Math.cos(angle) * speed,
          vy: -(0.4 + Math.random() * 0.9), // initial upward drift
          opacity: 0.2 + Math.random() * 0.45,
          radius: 0.6 + Math.random() * 1.8,
        };
      });
    }
  }
}

export function updateDrops(
  drops: Drop[],
  canvasHeight: number,
  physics: PhysicsConfig,
  impactStyle: ImpactStyle = "liquidCrown"
): Drop[] {
  return drops
    .map((drop) => {
      if (drop.impacted) {
        // Per-style particle physics
        const pp: Record<ImpactStyle, { g: number; drag: number; fade: number }> = {
          petalScatter: { g: 0.038, drag: 0.976, fade: 0.011 },
          dustCloud:    { g: 0.010, drag: 0.988, fade: 0.007 },
          tendril:      { g: 0, drag: 1, fade: 0 },
          inkDrop:      { g: 0, drag: 1, fade: 0 },
          liquidCrown:  { g: 0, drag: 1, fade: 0 },
        };
        const { g, drag, fade } = pp[impactStyle];

        const updatedSplash: SplashParticle[] = drop.splash
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + g,
            vx: p.vx * drag,
            opacity: p.opacity - fade,
            rotation: p.rotation !== undefined ? p.rotation + (p.rotVelocity ?? 0) : undefined,
          }))
          .filter((p) => p.opacity > 0);

        // Age the trail faster after impact so it fades out quickly
        const updatedTrail: TrailPoint[] = drop.trail
          .map((pt) => ({ ...pt, age: pt.age + 3 }))
          .filter((pt) => pt.age < physics.trailLength);

        return {
          ...drop,
          impactAge: drop.impactAge + 1,
          splash: updatedSplash,
          trail: updatedTrail,
        };
      }

      // Pre-impact: build trail
      const newTrail: TrailPoint[] = [
        { x: drop.x, y: drop.y, age: 0 },
        ...drop.trail.map((pt) => ({ ...pt, age: pt.age + 1 })),
      ].filter((pt) => pt.age < physics.trailLength);

      const newY = drop.y + drop.velocity;

      if (newY >= drop.impactY) {
        return {
          ...drop,
          y: drop.impactY,
          trail: newTrail,
          impacted: true,
          impactAge: 0,
          splash: createSplash({ ...drop, y: drop.impactY }, impactStyle),
        };
      }

      return { ...drop, y: newY, trail: newTrail };
    })
    .filter((drop) => {
      if (drop.impacted) {
        // Keep until splash and trail are both done
        // dustCloud particles can live ~120 frames so use 130 as the hard cap
        return drop.impactAge < 130;
      }
      return drop.y < canvasHeight + drop.radius * 2;
    });
}

export function getJustImpacted(drops: Drop[]): Drop[] {
  return drops.filter((drop) => drop.impacted && !drop.hasPlayedNote);
}
