import type { AudioConfig } from "../types";

const NOTE_MAP: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3,
  E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8,
  Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11,
};

function noteToFreq(name: string): number | null {
  const match = name.match(/^([A-G][#b]?)(\d)$/);
  if (!match) return null;
  const semitone = NOTE_MAP[match[1]];
  if (semitone === undefined) return null;
  const octave = parseInt(match[2]);
  const midi = (octave + 1) * 12 + semitone;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Synthetic impulse response: decaying noise buffer used as convolution reverb
function buildReverbIR(ctx: AudioContext, decaySecs: number): AudioBuffer {
  const duration = decaySecs + 0.5;
  const length = Math.floor(ctx.sampleRate * duration);
  const ir = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = ir.getChannelData(c);
    for (let i = 0; i < length; i++) {
      data[i] =
        (Math.random() * 2 - 1) *
        Math.exp(-3 * i / (ctx.sampleRate * decaySecs));
    }
  }
  return ir;
}

const DEFAULTS: Required<AudioConfig> = {
  waveform: "sine",
  reverbWet: 0,
  reverbDecay: 2,
  delayTime: 0.3,
  delayFeedback: 0.35,
  delayWet: 0,
  bitDepth: 16,
  bitcrusherWet: 0,
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private cfg: Required<AudioConfig> = { ...DEFAULTS };

  // Signal buses (act as summing nodes between stages)
  private crushBus: GainNode | null = null;
  private delayBus: GainNode | null = null;
  private verbBus: GainNode | null = null;

  // Bitcrusher (ScriptProcessorNode — deprecated but universally supported)
  private crusher: ScriptProcessorNode | null = null;
  private crushDry: GainNode | null = null;
  private crushWet: GainNode | null = null;
  private currentBitDepth = 16;

  // Delay
  private delayNode: DelayNode | null = null;
  private delayFeedbackGain: GainNode | null = null;
  private delayDry: GainNode | null = null;
  private delayWet: GainNode | null = null;

  // Reverb (convolution)
  private convolver: ConvolverNode | null = null;
  private verbDry: GainNode | null = null;
  private verbWet: GainNode | null = null;

  // Master
  private master: GainNode | null = null;

  async start(): Promise<void> {
    const ctx = new AudioContext();
    this.ctx = ctx;

    // Master output
    this.master = ctx.createGain();
    this.master.gain.value = 0.7;
    this.master.connect(ctx.destination);

    // --- Reverb stage (last in chain) ---
    this.convolver = ctx.createConvolver();
    this.convolver.buffer = buildReverbIR(ctx, this.cfg.reverbDecay);
    this.verbBus = ctx.createGain();
    this.verbDry = ctx.createGain();
    this.verbWet = ctx.createGain();
    this.verbBus.connect(this.verbDry);
    this.verbBus.connect(this.convolver);
    this.verbDry.connect(this.master);
    this.convolver.connect(this.verbWet);
    this.verbWet.connect(this.master);

    // --- Delay stage ---
    this.delayNode = ctx.createDelay(1.0);
    this.delayFeedbackGain = ctx.createGain();
    this.delayNode.connect(this.delayFeedbackGain);
    this.delayFeedbackGain.connect(this.delayNode); // feedback loop
    this.delayBus = ctx.createGain();
    this.delayDry = ctx.createGain();
    this.delayWet = ctx.createGain();
    this.delayBus.connect(this.delayDry);
    this.delayBus.connect(this.delayNode);
    this.delayDry.connect(this.verbBus);
    this.delayNode.connect(this.delayWet);
    this.delayWet.connect(this.verbBus);

    // --- Bitcrusher stage (first in chain) ---
    this.currentBitDepth = this.cfg.bitDepth;
    this.crusher = ctx.createScriptProcessor(2048, 2, 2);
    this.crusher.onaudioprocess = (e) => {
      const step = Math.pow(0.5, this.currentBitDepth - 1);
      for (let c = 0; c < e.inputBuffer.numberOfChannels; c++) {
        const inp = e.inputBuffer.getChannelData(c);
        const out = e.outputBuffer.getChannelData(c);
        for (let i = 0; i < inp.length; i++) {
          out[i] = Math.floor(inp[i] / step) * step;
        }
      }
    };
    this.crushBus = ctx.createGain();
    this.crushDry = ctx.createGain();
    this.crushWet = ctx.createGain();
    this.crushBus.connect(this.crushDry);
    this.crushBus.connect(this.crusher);
    this.crushDry.connect(this.delayBus);
    this.crusher.connect(this.crushWet);
    this.crushWet.connect(this.delayBus);

    this.applyConfig();
  }

  private applyConfig(): void {
    const c = this.cfg;
    this.currentBitDepth = c.bitDepth;
    this.crushDry!.gain.value = 1 - c.bitcrusherWet;
    this.crushWet!.gain.value = c.bitcrusherWet;
    this.delayNode!.delayTime.value = c.delayTime;
    this.delayFeedbackGain!.gain.value = c.delayFeedback;
    this.delayDry!.gain.value = 1 - c.delayWet;
    this.delayWet!.gain.value = c.delayWet;
    this.verbDry!.gain.value = 1 - c.reverbWet;
    this.verbWet!.gain.value = c.reverbWet;
  }

  updateConfig(config: Partial<AudioConfig>): void {
    const prevDecay = this.cfg.reverbDecay;
    this.cfg = { ...this.cfg, ...config };
    if (!this.ctx) return;
    if (config.reverbDecay !== undefined && config.reverbDecay !== prevDecay) {
      this.convolver!.buffer = buildReverbIR(this.ctx, this.cfg.reverbDecay);
    }
    this.applyConfig();
  }

  playNote(note: string): void {
    const ctx = this.ctx;
    if (!ctx || !this.crushBus) return;
    const freq = noteToFreq(note);
    if (!freq) return;

    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.connect(env);
    env.connect(this.crushBus);

    osc.type = this.cfg.waveform as OscillatorType;
    osc.frequency.value = freq;
    env.gain.setValueAtTime(0, ctx.currentTime);
    env.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 0.02);
    env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.2);
  }

  dispose(): void {
    this.ctx?.close();
    this.ctx = null;
  }
}
