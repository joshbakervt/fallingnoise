import type { Drop, ImpactStyle, PhysicsConfig } from "../types";

// Park-Miller LCG — deterministic per drop.id so the same impact always looks identical
function seededRand(seed: number) {
  let n = ((seed + 1) * 16807) % 2147483647;
  return () => {
    n = (n * 16807) % 2147483647;
    return n / 2147483647;
  };
}

export function hexToRgba(hex: string, alpha: number): string {
  const cleaned = hex.replace("#", "");
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  drops: Drop[],
  width: number,
  height: number,
  physics: PhysicsConfig,
  impactStyle: ImpactStyle = "liquidCrown"
): void {
  ctx.clearRect(0, 0, width, height);

  for (const drop of drops) {
    // Draw trail — grows as drop falls, tapers toward tail
    for (const point of drop.trail) {
      const t = point.age / physics.trailLength; // 0=newest(head), 1=oldest(tail)
      if (t >= 1) continue;

      // Size: full near head, tapers to zero at tail
      const r = drop.radiusX * Math.pow(1 - t, 1.2);
      // Opacity: bright near head, fades out at tail with slight grow curve
      const opacity = Math.pow(1 - t, 0.6);
      if (r <= 0.3 || opacity <= 0.01) continue;

      ctx.beginPath();
      ctx.arc(point.x, point.y, r, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(drop.color, opacity);
      ctx.fill();
    }

    if (drop.impacted) {
      switch (impactStyle) {
        case "tendril": {
          const age = drop.impactAge;
          if (age <= 45) {
            const rand = seededRand(drop.id);
            const branchCount = 5 + Math.floor(rand() * 3); // 5–7
            const ySquash = 0.38;
            for (let i = 0; i < branchCount; i++) {
              const baseAngle = (i / branchCount) * Math.PI * 2 + rand() * 0.6;
              const length = (25 + rand() * 20) * Math.min(1, age / 12);
              const curl = (rand() - 0.5) * 1.2;
              const progress = age / 45;
              const opacity = Math.pow(1 - progress, 1.4) * 0.85;
              // Midpoint of bezier — curled sideways
              const midAngle = baseAngle + curl;
              const midLen = length * 0.55;
              const x1 = drop.x + Math.cos(midAngle) * midLen;
              const y1 = drop.impactY + Math.sin(midAngle) * midLen * ySquash;
              const x2 = drop.x + Math.cos(baseAngle) * length;
              const y2 = drop.impactY + Math.sin(baseAngle) * length * ySquash;
              ctx.beginPath();
              ctx.moveTo(drop.x, drop.impactY);
              ctx.quadraticCurveTo(x1, y1, x2, y2);
              ctx.strokeStyle = hexToRgba(drop.color, opacity);
              ctx.lineWidth = 1 + (1 - progress) * 0.8;
              ctx.stroke();
              // Optional sub-branch on ~40% of tendrils
              if (rand() < 0.4) {
                const subT = 0.55 + rand() * 0.25;
                // Point along main bezier at subT
                const bx = (1-subT)*(1-subT)*drop.x + 2*(1-subT)*subT*x1 + subT*subT*x2;
                const by = (1-subT)*(1-subT)*drop.impactY + 2*(1-subT)*subT*y1 + subT*subT*y2;
                const subAngle = baseAngle + (rand() - 0.5) * 1.4;
                const subLen = length * (0.28 + rand() * 0.18);
                const ex = bx + Math.cos(subAngle) * subLen;
                const ey = by + Math.sin(subAngle) * subLen * ySquash;
                ctx.beginPath();
                ctx.moveTo(bx, by);
                ctx.lineTo(ex, ey);
                ctx.strokeStyle = hexToRgba(drop.color, opacity * 0.6);
                ctx.lineWidth = 0.7;
                ctx.stroke();
              }
            }
          }
          break;
        }

        case "inkDrop": {
          const age = drop.impactAge;
          if (age <= 35) {
            const rand = seededRand(drop.id);
            const progress = age / 35;
            const opacity = Math.pow(1 - progress, 1.2) * 0.9;
            const vertexCount = 12;
            const baseR = (8 + rand() * 4) * Math.min(1, age / 8);
            const ySquash = 0.42;
            // Build perturbed polygon vertices
            const pts: [number, number][] = [];
            for (let i = 0; i < vertexCount; i++) {
              const angle = (i / vertexCount) * Math.PI * 2;
              const jitter = 0.72 + rand() * 0.56;
              pts.push([
                drop.x + Math.cos(angle) * baseR * jitter,
                drop.impactY + Math.sin(angle) * baseR * jitter * ySquash,
              ]);
            }
            // Smooth with midpoint quadratic beziers
            ctx.beginPath();
            const first = pts[0];
            ctx.moveTo((first[0] + pts[vertexCount - 1][0]) / 2, (first[1] + pts[vertexCount - 1][1]) / 2);
            for (let i = 0; i < vertexCount; i++) {
              const curr = pts[i];
              const next = pts[(i + 1) % vertexCount];
              ctx.quadraticCurveTo(curr[0], curr[1], (curr[0] + next[0]) / 2, (curr[1] + next[1]) / 2);
            }
            ctx.closePath();
            ctx.fillStyle = hexToRgba(drop.color, opacity * 0.18);
            ctx.fill();
            ctx.strokeStyle = hexToRgba(drop.color, opacity);
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
          break;
        }

        case "petalScatter": {
          for (const p of drop.splash) {
            const rot = p.rotation ?? 0;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(rot);
            // Elongated petal: 4:1 ratio
            ctx.beginPath();
            ctx.ellipse(0, 0, p.radius, p.radius * 4, 0, 0, Math.PI * 2);
            ctx.fillStyle = hexToRgba(drop.color, p.opacity * 0.55);
            ctx.fill();
            ctx.strokeStyle = hexToRgba(drop.color, p.opacity);
            ctx.lineWidth = 0.8;
            ctx.stroke();
            ctx.restore();
          }
          break;
        }

        case "liquidCrown": {
          const age = drop.impactAge;
          if (age <= 40) {
            const rand = seededRand(drop.id);
            const progress = age / 40;
            const opacity = Math.pow(1 - progress, 1.1) * 0.9;
            // Expanding ring
            const ringRX = (10 + age * 1.8);
            const ringRY = ringRX * 0.32;
            ctx.beginPath();
            ctx.ellipse(drop.x, drop.impactY, ringRX, ringRY, 0, 0, Math.PI * 2);
            ctx.strokeStyle = hexToRgba(drop.color, opacity * 0.7);
            ctx.lineWidth = 1.2;
            ctx.stroke();
            // Spikes (crown points) — grow up then arc down
            const spikeCount = 6 + Math.floor(rand() * 3);
            for (let i = 0; i < spikeCount; i++) {
              const angle = (i / spikeCount) * Math.PI * 2 + rand() * 0.4;
              const spikeLen = (16 + rand() * 12) * Math.min(1, age / 10);
              // Parabolic: rises first, then falls
              const spikePhase = Math.min(1, age / 25);
              const fallPhase = Math.max(0, (age - 20) / 20);
              const tipX = drop.x + Math.cos(angle) * ringRX * 0.85;
              const tipY = drop.impactY - spikeLen * (1 - fallPhase * 0.6) + fallPhase * 8;
              ctx.beginPath();
              ctx.moveTo(tipX, drop.impactY);
              ctx.lineTo(tipX + Math.cos(angle) * 2, tipY);
              ctx.strokeStyle = hexToRgba(drop.color, opacity);
              ctx.lineWidth = 1.4 * (1 - spikePhase * 0.5);
              ctx.stroke();
              // Droplet at tip
              if (age > 8 && age < 35) {
                ctx.beginPath();
                ctx.arc(tipX + Math.cos(angle) * 2, tipY, 1.5 * (1 - fallPhase * 0.7), 0, Math.PI * 2);
                ctx.fillStyle = hexToRgba(drop.color, opacity * 0.8);
                ctx.fill();
              }
            }
          }
          break;
        }

        case "dustCloud": {
          for (const p of drop.splash) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = hexToRgba(drop.color, p.opacity);
            ctx.fill();
          }
          break;
        }
      }

      continue; // no head drawn after impact
    }

    // Draw head — thin imperfect ellipse
    ctx.beginPath();
    ctx.ellipse(drop.x, drop.y, drop.radiusX, drop.radiusY, drop.rotation, 0, Math.PI * 2);
    ctx.fillStyle = drop.color;
    ctx.fill();

    // Soft glow around head
    const gradient = ctx.createRadialGradient(
      drop.x, drop.y, 0,
      drop.x, drop.y, drop.radiusY * 2.5
    );
    gradient.addColorStop(0, hexToRgba(drop.color, 0.3));
    gradient.addColorStop(1, hexToRgba(drop.color, 0));
    ctx.beginPath();
    ctx.ellipse(drop.x, drop.y, drop.radiusX * 2.5, drop.radiusY * 2.5, drop.rotation, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }
}
