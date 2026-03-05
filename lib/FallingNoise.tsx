"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FallingNoiseProps } from "./types";
import { resolveColorScheme } from "./config/colorSchemes";
import { buildScale } from "./config/musicalScales";
import { resolvePhysics } from "./engine/dropPhysics";
import { AudioEngine } from "./audio/audioEngine";
import { useAnimationLoop } from "./useAnimationLoop";

export function FallingNoise({
  colorScheme = "coolBlues",
  scale = { root: "E", type: "minorPentatonic" },
  speed = "medium",
  impactStyle = "geometricShatter",
  width = "100%",
  height = "100%",
}: FallingNoiseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const [started, setStarted] = useState(false);

  const colors = useMemo(() => resolveColorScheme(colorScheme), [colorScheme]);
  const notes = useMemo(() => {
    try {
      return buildScale(scale);
    } catch {
      return buildScale({ root: "E", type: "minorPentatonic" });
    }
  }, [scale]);
  const physics = useMemo(() => resolvePhysics(speed), [speed]);

  const dropsRef = useAnimationLoop({
    canvasRef,
    audioEngineRef,
    colors,
    notes,
    physics,
    impactStyle,
    running: started,
  });

  // ResizeObserver: keep canvas in sync with container, handle HiDPI
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.scale(dpr, dpr);
        }
        // Reset drops on resize
        dropsRef.current = [];
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [dropsRef]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      audioEngineRef.current?.dispose();
    };
  }, []);

  const handleStart = useCallback(async () => {
    const engine = new AudioEngine();
    await engine.start();
    audioEngineRef.current = engine;
    setStarted(true);
  }, []);

  const containerStyle: React.CSSProperties = {
    position: "relative",
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
    overflow: "hidden",
    background: "#0a0a0a",
  };

  return (
    <div ref={containerRef} style={containerStyle}>
      <canvas
        ref={canvasRef}
        style={{ display: "block", position: "absolute", inset: 0 }}
      />
      {!started && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <button
            onClick={handleStart}
            style={{
              padding: "12px 32px",
              fontSize: "16px",
              fontWeight: 600,
              color: "#ffffff",
              background: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "8px",
              cursor: "pointer",
              backdropFilter: "blur(8px)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Start
          </button>
        </div>
      )}
    </div>
  );
}
