"use client";

import dynamic from "next/dynamic";
import { type ReactNode, useMemo, useState } from "react";
import type { AudioConfig, ColorSchemeName, FilterType, ImpactStyle, ScaleConfig, SpeedTier, WaveformType } from "../lib/types";
import { COLOR_SCHEMES, resolveColorScheme } from "../lib/config/colorSchemes";
import { CircularKnob } from "./CircularKnob";

function StyledSelect({ value, onChange, accentColor, children }: {
  value: string;
  onChange: (v: string) => void;
  accentColor: string;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ borderColor: accentColor }}
        className="w-full appearance-none bg-[#111] border px-2 py-1.5 pr-6 text-sm text-white/90 focus:outline-none cursor-pointer [&_option]:bg-[#111]"
      >
        {children}
      </select>
      <span
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs leading-none select-none"
        style={{ color: accentColor }}
      >
        ▾
      </span>
    </div>
  );
}

const FallingNoise = dynamic(
  () => import("../lib/FallingNoise").then((m) => m.FallingNoise),
  { ssr: false }
);

const COLOR_SCHEME_NAMES = Object.keys(COLOR_SCHEMES) as ColorSchemeName[];

const ROOT_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const SCALE_TYPES: ScaleConfig["type"][] = [
  "minorPentatonic",
  "majorPentatonic",
  "major",
  "naturalMinor",
  "harmonicMinor",
  "dorian",
  "chromatic",
];

const SPEED_TIERS: SpeedTier[] = ["slow", "medium", "fast"];

const IMPACT_STYLES: ImpactStyle[] = ["tendril", "inkDrop", "petalScatter", "liquidCrown", "dustCloud"];


// One-cycle SVG paths for each waveform, viewBox "0 0 32 16"
const WAVEFORM_PATHS: Record<WaveformType, string> = {
  sine:     "M 0 8 C 4 1, 12 1, 16 8 C 20 15, 28 15, 32 8",
  triangle: "M 0 8 L 8 1 L 24 15 L 32 8",
  square:   "M 0 2 L 16 2 L 16 14 L 32 14",
  sawtooth: "M 0 15 L 14 1 L 14 15 L 28 1",
  bruh:     "",
  fahh:     "",
  ahh:      "",
};

export default function Page() {
  const [colorScheme, setColorScheme] = useState<ColorSchemeName>("coolBlues");
  const [root, setRoot] = useState("E");
  const [scaleType, setScaleType] = useState<ScaleConfig["type"]>("minorPentatonic");
  const [speedIndex, setSpeedIndex] = useState(1);
  const [impactStyle, setImpactStyle] = useState<ImpactStyle>("liquidCrown");

  // Audio config state
  const [waveform, setWaveform] = useState<WaveformType>("sine");
  const [reverbWet, setReverbWet] = useState(0);
  const [reverbDecay, setReverbDecay] = useState(2);
  const [delayWet, setDelayWet] = useState(0);
  const [delayTime, setDelayTime] = useState(0.3);
  const [delayFeedback, setDelayFeedback] = useState(0.35);
  const [bitcrusherWet, setBitcrusherWet] = useState(0);
  const [bitDepth, setBitDepth] = useState(16);

  // Filter state
  const [filterType, setFilterType] = useState<FilterType>("lpf");
  const [filterCutoff, setFilterCutoff] = useState(1);
  const [filterResonance, setFilterResonance] = useState(0);
  const [filterDrive, setFilterDrive] = useState(0);
  const [filterVariance, setFilterVariance] = useState(0);

  const schemeColors = useMemo(() => resolveColorScheme(colorScheme), [colorScheme]);
  const accentColor = useMemo(
    () => schemeColors[Math.floor(Math.random() * schemeColors.length)],
    [schemeColors]
  );

  const audioConfig = useMemo<AudioConfig>(
    () => ({
      waveform, reverbWet, reverbDecay, delayTime, delayFeedback, delayWet,
      bitDepth, bitcrusherWet,
      filterType, filterCutoff, filterResonance, filterDrive, filterVariance,
      bruhSampleUrl: "/bruh.wav",
      fahhSampleUrl: "/fahh.wav",
      ahhSampleUrl: "/ahh.wav",
    }),
    [waveform, reverbWet, reverbDecay, delayTime, delayFeedback, delayWet,
     bitDepth, bitcrusherWet,
     filterType, filterCutoff, filterResonance, filterDrive, filterVariance]
  );

  const speed = SPEED_TIERS[speedIndex];
  const scale: ScaleConfig = { root, type: scaleType };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-[#111] border-r border-white/10 p-4 flex flex-col gap-6 overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
        <h1 className="text-sm font-bold tracking-widest uppercase text-white/70">
          FallingNoise
        </h1>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-white/50 uppercase tracking-wider">
            Color Scheme
          </label>
          <StyledSelect value={colorScheme} accentColor={accentColor}
            onChange={(v) => setColorScheme(v as ColorSchemeName)}>
            {COLOR_SCHEME_NAMES.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </StyledSelect>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-white/50 uppercase tracking-wider">
            Root Note
          </label>
          <StyledSelect value={root} accentColor={accentColor} onChange={setRoot}>
            {ROOT_NOTES.map((note) => (
              <option key={note} value={note}>{note}</option>
            ))}
          </StyledSelect>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-white/50 uppercase tracking-wider">
            Scale
          </label>
          <StyledSelect value={scaleType} accentColor={accentColor}
            onChange={(v) => setScaleType(v as ScaleConfig["type"])}>
            {SCALE_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </StyledSelect>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-white/50 uppercase tracking-wider">
            Impact Style
          </label>
          <StyledSelect value={impactStyle} accentColor={accentColor}
            onChange={(v) => setImpactStyle(v as ImpactStyle)}>
            {IMPACT_STYLES.map((style) => (
              <option key={style} value={style}>{style}</option>
            ))}
          </StyledSelect>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-white/50 uppercase tracking-wider">
            Speed — <span className="text-white/80">{speed}</span>
          </label>
          <input
            type="range"
            min={0}
            max={2}
            step={1}
            value={speedIndex}
            onChange={(e) => setSpeedIndex(Number(e.target.value))}
            className="accent-white/60 w-full"
          />
        </div>

        {/* ── Sound ── */}
        <div className="flex flex-col gap-5 border-t border-white/10 pt-4">
          <p className="text-xs text-white/30 uppercase tracking-widest">Sound</p>

          {/* Waveform */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-white/50 uppercase tracking-wider select-none">Waveform</label>
            <div className="flex justify-around">
              {(["sine", "triangle", "square", "sawtooth"] as WaveformType[]).map((w) => (
                <button
                  key={w}
                  onClick={() => setWaveform(w)}
                  title={w}
                  style={waveform === w ? { color: accentColor } : undefined}
                  className={`p-1.5 rounded transition-colors ${
                    waveform === w ? "bg-white/5" : "text-white/25 hover:text-white/50"
                  }`}
                >
                  <svg width="32" height="16" viewBox="0 0 32 16" fill="none">
                    <path
                      d={WAVEFORM_PATHS[w]}
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              ))}
            </div>
            <div className="flex justify-around">
              {(["bruh", "fahh", "ahh"] as WaveformType[]).map((w) => (
                <button
                  key={w}
                  onClick={() => setWaveform(w)}
                  title={w}
                  style={waveform === w ? { color: accentColor } : undefined}
                  className={`p-1.5 rounded transition-colors ${
                    waveform === w ? "bg-white/5" : "text-white/25 hover:text-white/50"
                  }`}
                >
                  <span className="text-[9px] font-bold uppercase tracking-widest leading-none" style={{ display: "block", width: 32, lineHeight: "16px", textAlign: "center" }}>
                    {w.toUpperCase()}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Reverb row */}
          <div className="flex flex-col gap-2">
            <p className="text-[10px] text-white/30 uppercase tracking-widest select-none">Reverb</p>
            <div className="flex justify-around">
              <CircularKnob label="Wet" value={reverbWet} min={0} max={1} step={0.01}
                color={accentColor} onChange={setReverbWet} />
              <CircularKnob label="Decay" value={reverbDecay} min={0.5} max={6} step={0.1}
                format={(v) => `${v.toFixed(1)}s`} color={accentColor} onChange={setReverbDecay} />
            </div>
          </div>

          {/* Delay row */}
          <div className="flex flex-col gap-2">
            <p className="text-[10px] text-white/30 uppercase tracking-widest select-none">Delay</p>
            <div className="flex justify-around">
              <CircularKnob label="Wet" value={delayWet} min={0} max={1} step={0.01}
                color={accentColor} onChange={setDelayWet} />
              <CircularKnob label="Time" value={delayTime} min={0.05} max={1} step={0.01}
                format={(v) => `${v.toFixed(2)}s`} color={accentColor} onChange={setDelayTime} />
              <CircularKnob label="Fdbk" value={delayFeedback} min={0} max={0.85} step={0.01}
                color={accentColor} onChange={setDelayFeedback} />
            </div>
          </div>

          {/* Bitcrusher row */}
          <div className="flex flex-col gap-2">
            <p className="text-[10px] text-white/30 uppercase tracking-widest select-none">Distortion</p>
            <div className="flex justify-around">
              <CircularKnob label="Wet" value={bitcrusherWet} min={0} max={1} step={0.01}
                color={accentColor} onChange={setBitcrusherWet} />
              <CircularKnob label="Depth" value={bitDepth} min={2} max={16} step={1}
                format={(v) => String(Math.round(v))} color={accentColor} onChange={(v) => setBitDepth(Math.round(v))} />
            </div>
          </div>

          {/* Filter row */}
          <div className="flex flex-col gap-2">
            <p className="text-[10px] text-white/30 uppercase tracking-widest select-none">Filter</p>

            {/* Type selector */}
            <div className="flex gap-1">
              {(["lpf", "hpf", "comb"] as FilterType[]).map((ft) => (
                <button
                  key={ft}
                  onClick={() => setFilterType(ft)}
                  style={filterType === ft ? { color: accentColor, borderColor: accentColor } : undefined}
                  className={`flex-1 py-1 rounded border text-[10px] uppercase tracking-wider transition-colors select-none ${
                    filterType === ft
                      ? "bg-white/5"
                      : "text-white/30 border-white/10 hover:text-white/50"
                  }`}
                >
                  {ft}
                </button>
              ))}
            </div>

            {/* Knobs — 2×2 grid */}
            <div className="grid grid-cols-2 gap-y-2">
              <div className="flex justify-center">
                <CircularKnob
                  label="Cutoff"
                  value={filterCutoff}
                  min={0} max={1} step={0.01}
                  format={(v) => {
                    const hz = 80 * Math.pow(200, v);
                    return hz >= 1000 ? `${(hz / 1000).toFixed(1)}k` : `${Math.round(hz)}`;
                  }}
                  color={accentColor}
                  onChange={setFilterCutoff}
                />
              </div>
              <div className="flex justify-center">
                <CircularKnob label="Reso" value={filterResonance} min={0} max={1} step={0.01}
                  color={accentColor} onChange={setFilterResonance} />
              </div>
              <div className="flex justify-center">
                <CircularKnob label="Drive" value={filterDrive} min={0} max={1} step={0.01}
                  color={accentColor} onChange={setFilterDrive} />
              </div>
              <div className="flex justify-center">
                <CircularKnob label="Var" value={filterVariance} min={0} max={1} step={0.01}
                  color={accentColor} onChange={setFilterVariance} />
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Canvas area */}
      <main className="flex-1 relative">
        <FallingNoise
          colorScheme={colorScheme}
          scale={scale}
          speed={speed}
          impactStyle={impactStyle}
          audioConfig={audioConfig}
          width="100%"
          height="100%"
        />
      </main>
    </div>
  );
}
