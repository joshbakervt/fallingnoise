import type { Drop, ImpactStyle, PhysicsConfig } from "../types";

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
  impactStyle: ImpactStyle = "geometricShatter"
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
        case "starburst": {
          const age = drop.impactAge;
          if (age <= 25) {
            const progress = age / 25;
            const opacity = Math.pow(1 - progress, 2);
            const rayCount = 12;
            const angleStep = (Math.PI * 2) / rayCount;
            const innerRadius = 4 + age * 1.5;
            const outerRadius = innerRadius + 6 + age * 2.5;
            ctx.strokeStyle = hexToRgba(drop.color, opacity);
            ctx.lineWidth = 1.5;
            for (let i = 0; i < rayCount; i++) {
              const angle = i * angleStep;
              const cosA = Math.cos(angle);
              const sinA = Math.sin(angle) * 0.3; // perspective squash
              ctx.beginPath();
              ctx.moveTo(drop.x + cosA * innerRadius, drop.impactY + sinA * innerRadius);
              ctx.lineTo(drop.x + cosA * outerRadius, drop.impactY + sinA * outerRadius);
              ctx.stroke();
            }
          }
          break;
        }

        case "geometricShatter": {
          for (const p of drop.splash) {
            const halfLen = p.radius * 3 * 0.5;
            const rot = p.rotation ?? 0;
            const cosR = Math.cos(rot);
            const sinR = Math.sin(rot);
            ctx.beginPath();
            ctx.moveTo(p.x - cosR * halfLen, p.y - sinR * halfLen);
            ctx.lineTo(p.x + cosR * halfLen, p.y + sinR * halfLen);
            ctx.strokeStyle = hexToRgba(drop.color, p.opacity);
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
          break;
        }

        case "flashBloom": {
          const age = drop.impactAge;
          if (age <= 20) {
            const t = age / 20;
            const bloomRadius = age * 4.5;
            if (bloomRadius > 0) {
              const grad = ctx.createRadialGradient(
                drop.x, drop.impactY, 0,
                drop.x, drop.impactY, bloomRadius
              );
              grad.addColorStop(0, hexToRgba(drop.color, Math.pow(1 - t, 3) * 0.9));
              grad.addColorStop(0.4, hexToRgba(drop.color, Math.pow(1 - t, 2) * 0.7));
              grad.addColorStop(1, hexToRgba(drop.color, 0));
              ctx.beginPath();
              ctx.arc(drop.x, drop.impactY, bloomRadius, 0, Math.PI * 2);
              ctx.fillStyle = grad;
              ctx.fill();
            }
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
