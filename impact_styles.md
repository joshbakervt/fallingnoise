# Adding a New Impact Style to FallingNoise

## How impact styles work

Every `Drop` object has an `impacted: boolean` flag and an `impactAge: number` counter. Once a drop hits its `impactY` target, `impacted` flips to `true` and `impactAge` increments by 1 every animation frame (~60fps). The animation loop keeps the drop alive until it's cleaned up, then removes it. The renderer draws nothing for the drop's "head" after impact — only the impact effect.

There are two implementation approaches. Which one you use depends on whether your effect needs physics simulation between frames.

---

## Approach A — Procedural (draw purely from `impactAge`)

Best for: effects that are mathematically defined — expanding rings, radiating lines, growing shapes.

The entire animation is computed fresh each frame from `drop.impactAge` and `drop.id`. No particles are spawned.

**What you control per frame:**
- `age` — how many frames have elapsed since impact
- `progress` — `age / totalDuration`, from 0 to 1
- `drop.x`, `drop.impactY` — the impact point in canvas pixels
- `drop.color` — the hex color string for this drop
- `drop.id` — a unique integer, usable as a PRNG seed for consistent randomness

**The `seededRand` helper** gives you deterministic randomness keyed to `drop.id`. Because the same seed produces the same sequence every frame, you can generate random-looking geometry (angles, lengths, offsets) that stays consistent across the entire animation without storing anything:

```ts
const rand = seededRand(drop.id);
const branchCount = 5 + Math.floor(rand() * 3); // same every frame for this drop
const angle = rand() * Math.PI * 2;              // same every frame
```

Call `rand()` in the same order every frame and the values will always match.

**Template:**

```ts
case "myStyle": {
  const age = drop.impactAge;
  const DURATION = 40; // frames the effect lasts
  if (age <= DURATION) {
    const rand = seededRand(drop.id);
    const progress = age / DURATION;
    const opacity = Math.pow(1 - progress, 1.2); // fade curve — adjust exponent

    // ... draw with ctx ...
  }
  break;
}
```

**Cleanup:** set `DURATION` to match the `impactAge < 130` hard cap in `dropPhysics.ts`. If your effect is short (under 50 frames), you can also lower the cap there for that style.

**Perspective squash:** the impact point sits on a flat surface viewed at an angle. Squash Y-axis movement by ~0.35–0.45 to make it look right:

```ts
const ySquash = 0.4;
// instead of: drop.impactY + Math.sin(angle) * radius
// use:        drop.impactY + Math.sin(angle) * radius * ySquash
```

---

## Approach B — Particle-based (physics simulated between frames)

Best for: effects where elements move independently after impact — scattered pieces, drifting clouds.

Particles are created once at impact in `dropPhysics.ts` and then updated each frame by the physics loop. The renderer just draws whatever position they're currently at.

### Step 1 — Define particle physics in `dropPhysics.ts`

**In `createSplash`**, add a case that returns an array of `SplashParticle` objects:

```ts
case "myStyle": {
  const count = 10 + Math.floor(Math.random() * 6);
  return Array.from({ length: count }, () => {
    const angle = (Math.random() - 0.5) * Math.PI * 1.8; // spread cone
    const speed = 0.5 + Math.random() * 2.0;
    return {
      x: drop.x,
      y: drop.impactY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.0, // negative vy = upward
      opacity: 0.7 + Math.random() * 0.3,
      radius: 1.5 + Math.random() * 3,
      rotation: Math.random() * Math.PI * 2,    // optional
      rotVelocity: (Math.random() - 0.5) * 0.1, // optional
    };
  });
}
```

**In the `pp` lookup table** inside `updateDrops`, set the per-frame physics for your style:

```ts
const pp: Record<ImpactStyle, { g: number; drag: number; fade: number }> = {
  // ... existing styles ...
  myStyle: { g: 0.04, drag: 0.97, fade: 0.012 },
  //         ^ gravity  ^ air resistance  ^ opacity lost per frame
};
```

- `g` — gravity added to `vy` each frame. 0 = floats, 0.1 = falls fast.
- `drag` — `vx` is multiplied by this each frame. 1 = no drag, 0.95 = heavy drag.
- `fade` — subtracted from `opacity` each frame. Particles disappear when `opacity <= 0`.

### Step 2 — Draw particles in `renderer.ts`

```ts
case "myStyle": {
  for (const p of drop.splash) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation ?? 0);
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(drop.color, p.opacity);
    ctx.fill();
    ctx.restore();
  }
  break;
}
```

---

## Step 3 — Register the style name (do this for both approaches)

**`lib/types.ts`** — add your name to the union:

```ts
export type ImpactStyle = "tendril" | "inkDrop" | "petalScatter" | "liquidCrown" | "dustCloud" | "myStyle";
```

**`lib/engine/dropPhysics.ts`** — add an entry to the `pp` table even if you use Approach A (set g/drag/fade all to 0 since there are no particles):

```ts
myStyle: { g: 0, drag: 1, fade: 0 },
```

And add a case to `createSplash` returning `[]` if you don't need particles:

```ts
case "myStyle":
  return [];
```

**`app/page.tsx`** — add to the `IMPACT_STYLES` array so it appears in the UI:

```ts
const IMPACT_STYLES: ImpactStyle[] = [
  "tendril", "inkDrop", "petalScatter", "liquidCrown", "dustCloud", "myStyle"
];
```

---

## Quick reference — Canvas 2D API primitives

```ts
// Circle
ctx.beginPath();
ctx.arc(x, y, radius, 0, Math.PI * 2);
ctx.fillStyle = hexToRgba(drop.color, opacity);
ctx.fill();

// Ellipse (perspective-correct impact rings use this)
ctx.beginPath();
ctx.ellipse(cx, cy, radiusX, radiusY, rotation, 0, Math.PI * 2);
ctx.stroke();

// Radial gradient (bloom / glow effects)
const grad = ctx.createRadialGradient(x, y, 0, x, y, outerRadius);
grad.addColorStop(0, hexToRgba(drop.color, 0.9));
grad.addColorStop(1, hexToRgba(drop.color, 0));
ctx.fillStyle = grad;

// Curved line (quadratic bezier)
ctx.beginPath();
ctx.moveTo(x0, y0);
ctx.quadraticCurveTo(cpX, cpY, x1, y1); // cp = control point
ctx.strokeStyle = hexToRgba(drop.color, opacity);
ctx.lineWidth = 1.5;
ctx.stroke();

// Rotated shape (saves/restores transform)
ctx.save();
ctx.translate(p.x, p.y);
ctx.rotate(angle);
// ... draw centered at 0,0 ...
ctx.restore();
```

`hexToRgba(drop.color, alpha)` is exported from `renderer.ts` and is the correct way to apply opacity to the drop's color.

---

## Checklist

- [ ] Add name to `ImpactStyle` union in `lib/types.ts`
- [ ] Add case to `createSplash` in `dropPhysics.ts` (return `[]` if no particles)
- [ ] Add entry to `pp` table in `updateDrops` in `dropPhysics.ts`
- [ ] Add `case "myStyle":` block in `renderFrame` switch in `renderer.ts`
- [ ] Add name to `IMPACT_STYLES` array in `app/page.tsx`
