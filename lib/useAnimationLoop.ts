"use client";

import { useEffect, useRef } from "react";
import type { Drop, ImpactStyle, PhysicsConfig } from "./types";
import type { AudioEngine } from "./audio/audioEngine";
import {
  spawnDrop,
  updateDrops,
  getJustImpacted,
} from "./engine/dropPhysics";
import { renderFrame } from "./engine/renderer";

interface AnimationLoopOptions {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  audioEngineRef: React.RefObject<AudioEngine | null>;
  colors: string[];
  notes: string[];
  physics: PhysicsConfig;
  impactStyle: ImpactStyle;
  running: boolean;
}

export function useAnimationLoop({
  canvasRef,
  audioEngineRef,
  colors,
  notes,
  physics,
  impactStyle,
  running,
}: AnimationLoopOptions): React.MutableRefObject<Drop[]> {
  const dropsRef = useRef<Drop[]>([]);
  const lastSpawnTimeRef = useRef<number>(0);
  const rafIdRef = useRef<number>(0);

  useEffect(() => {
    if (!running) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const loop = (timestamp: number) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        rafIdRef.current = requestAnimationFrame(loop);
        return;
      }

      // Use logical CSS pixel dimensions so physics and rendering are in the same space
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      // Spawn new drop if interval elapsed and under cap
      if (
        timestamp - lastSpawnTimeRef.current >= physics.spawnIntervalMs &&
        dropsRef.current.length < physics.maxDrops
      ) {
        dropsRef.current.push(spawnDrop(width, height, colors, notes, physics));
        lastSpawnTimeRef.current = timestamp;
      }

      // Update physics
      dropsRef.current = updateDrops(dropsRef.current, height, physics, impactStyle);

      // Trigger audio for drops that just impacted
      const justImpacted = getJustImpacted(dropsRef.current);
      for (const drop of justImpacted) {
        audioEngineRef.current?.playNote(drop.note);
        drop.hasPlayedNote = true;
      }

      // Render
      renderFrame(ctx, dropsRef.current, width, height, physics, impactStyle);

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafIdRef.current);
    };
  }, [canvasRef, audioEngineRef, colors, notes, physics, impactStyle, running]);

  return dropsRef;
}
