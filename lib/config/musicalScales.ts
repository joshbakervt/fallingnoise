import type { ScaleConfig } from "../types";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const SCALE_INTERVALS: Record<string, number[]> = {
  majorPentatonic: [0, 2, 4, 7, 9],
  minorPentatonic: [0, 3, 5, 7, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  naturalMinor: [0, 2, 3, 5, 7, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

export function buildScale(
  config: ScaleConfig,
  octaveRange: [number, number] = [3, 5]
): string[] {
  const rootIndex = NOTE_NAMES.indexOf(config.root);
  if (rootIndex === -1) {
    throw new Error(`Invalid root note: ${config.root}`);
  }

  const intervals = SCALE_INTERVALS[config.type];
  if (!intervals) {
    throw new Error(`Unknown scale type: ${config.type}`);
  }

  const notes: string[] = [];
  const [minOctave, maxOctave] = octaveRange;

  for (let octave = minOctave; octave <= maxOctave; octave++) {
    for (const interval of intervals) {
      const noteIndex = (rootIndex + interval) % 12;
      const noteOctave = octave + Math.floor((rootIndex + interval) / 12);
      if (noteOctave <= maxOctave) {
        notes.push(`${NOTE_NAMES[noteIndex]}${noteOctave}`);
      }
    }
  }

  return notes;
}
