export const DEFAULT_WHEEL_TITLE = "Grande Sorteio da Equipe";
export const DEFAULT_WIN_MESSAGE = "Vencedor!";
export const DEFAULT_SPIN_TIME_SECONDS = 5;
export const DEFAULT_ELIMINATION_SPIN_TIME = 2;

export const DEFAULT_SLICE_COLORS = [
  "#fcd34d",
  "#ea580c",
  "#3b82f6",
  "#fef08a",
  "#f97316",
  "#60a5fa",
];

export const DEFAULT_CENTER_IMAGE =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%230f172a" stroke="%23f97316" stroke-width="4"/><polygon points="50,22 59,38 78,41 64,55 67,74 50,65 33,74 36,55 22,41 41,38" fill="%23fcd34d"/></svg>';

// Math and Geometry Constants for the Wheel
export const FULL_CIRCLE_DEG = 360;
export const WHEEL_TOP_OFFSET_DEG = 90;

// Randomness factors for wheel spin
export const SLICE_RANDOM_OFFSET_MULTIPLIER = 0.98; // Use 98% of the slice width to increase variance near the lines
export const SLICE_RANDOM_OFFSET_SUBTRACTOR = 0.49; // Offset to cleanly center the variance
export const MIN_EXTRA_SPINS = 3;

// Animation & Sound Timing Constants
export const TICK_BASE_DELAY_MS = 30;
export const TICK_DELAY_MULTIPLIER = 600;
export const SPIN_COMPLETION_SOUND_THRESHOLD_MS = 100;
export const RACE_START_DELAY_MS = 5000; // 5 seconds pre-race grid & lights countdown

// UI & Canvas Rendering Constants
export const WHEEL_CANVAS_RESOLUTION = 1200;
export const WHEEL_REFERENCE_SIZE = 550;
export const YIQ_CONTRAST_THRESHOLD = 70;
