"use client";

import { useCallback, useRef } from "react";

interface CircularKnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
  color?: string;
}

const SIZE = 52;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 18;
const SW = 3.5;

// 270° arc: from 7 o'clock (225°) clockwise to 5 o'clock (135° = 495° cumulative)
// Convention: 0° = 12 o'clock, clockwise positive
const START_DEG = 225;
const SWEEP_DEG = 270;
const END_DEG = START_DEG + SWEEP_DEG;

function toXY(deg: number): [number, number] {
  const rad = (deg - 90) * (Math.PI / 180);
  return [CX + R * Math.cos(rad), CY + R * Math.sin(rad)];
}

function arcPath(fromDeg: number, toDeg: number): string {
  const [x1, y1] = toXY(fromDeg);
  const [x2, y2] = toXY(toDeg);
  const sweep = ((toDeg - fromDeg) + 360) % 360;
  const large = sweep > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

export function CircularKnob({
  label,
  value,
  min,
  max,
  step = 0.01,
  format,
  onChange,
  color = "rgba(255,255,255,0.8)",
}: CircularKnobProps) {
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const valueDeg = START_DEG + t * SWEEP_DEG;
  const display = format ? format(value) : `${Math.round(t * 100)}%`;

  const dragY = useRef<number | null>(null);
  const dragVal = useRef(value);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragY.current = e.clientY;
      dragVal.current = value;
    },
    [value]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (dragY.current === null) return;
      const delta = (dragY.current - e.clientY) / 120;
      const raw = dragVal.current + delta * (max - min);
      const snapped = Math.round(raw / step) * step;
      onChange(Math.max(min, Math.min(max, snapped)));
    },
    [min, max, step, onChange]
  );

  const onPointerUp = useCallback(() => {
    dragY.current = null;
  }, []);

  const trackD = arcPath(START_DEG, END_DEG);
  const fillD = t > 0.004 ? arcPath(START_DEG, valueDeg) : null;

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="cursor-ns-resize"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Knob face */}
        <circle cx={CX} cy={CY} r={R - SW / 2 - 0.5} fill="rgba(255,255,255,0.04)" />

        {/* Background track */}
        <path
          d={trackD}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={SW}
          strokeLinecap="round"
        />

        {/* Active fill */}
        {fillD && (
          <path
            d={fillD}
            fill="none"
            stroke={color}
            strokeWidth={SW}
            strokeLinecap="round"
          />
        )}

        {/* Center value */}
        <text
          x={CX}
          y={CY + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="rgba(255,255,255,0.85)"
          fontSize={display.length > 4 ? "7" : "8.5"}
          fontFamily="ui-monospace, monospace"
          style={{ userSelect: "none", pointerEvents: "none" }}
        >
          {display}
        </text>
      </svg>

      <span className="text-[9px] text-white/40 uppercase tracking-wider leading-none">
        {label}
      </span>
    </div>
  );
}
