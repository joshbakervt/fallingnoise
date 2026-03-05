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

export class AudioEngine {
  private audioCtx: AudioContext | null = null;

  async start(): Promise<void> {
    this.audioCtx = new AudioContext();
  }

  playNote(note: string): void {
    const ctx = this.audioCtx;
    if (!ctx) return;
    const freq = noteToFreq(note);
    if (!freq) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.2);
  }

  dispose(): void {
    this.audioCtx?.close();
    this.audioCtx = null;
  }
}
