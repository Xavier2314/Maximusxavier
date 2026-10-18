/** Brain gym catalogue (server- and client-safe). Games are brain training for fun, not clinically validated tests. */
export type GameInfo = { slug: string; name: string; skill: string; desc: string; emoji: string; higherIsBetter: boolean; unit: string };

export const GAMES: GameInfo[] = [
  { slug: "chess", name: "Chess", skill: "Strategy", desc: "Play against the computer.", emoji: "♟️", higherIsBetter: true, unit: "pts" },
  { slug: "sudoku", name: "Sudoku", skill: "Logic", desc: "Fill the grid so every row, column and box has 1–9.", emoji: "🔢", higherIsBetter: true, unit: "pts" },
  { slug: "g2048", name: "2048", skill: "Planning", desc: "Slide and merge tiles to reach 2048.", emoji: "🧩", higherIsBetter: true, unit: "pts" },
  { slug: "memory", name: "Memory match", skill: "Memory", desc: "Flip cards and find the pairs.", emoji: "🃏", higherIsBetter: true, unit: "pts" },
  { slug: "sequence", name: "Number sequence", skill: "Pattern", desc: "Find the next number in the pattern.", emoji: "🔁", higherIsBetter: true, unit: "correct" },
  { slug: "math", name: "Mental math", skill: "Speed", desc: "Solve as many sums as you can in 60 seconds.", emoji: "➗", higherIsBetter: true, unit: "correct" },
  { slug: "scramble", name: "Word scramble", skill: "Language", desc: "Unscramble business words against the clock.", emoji: "🔤", higherIsBetter: true, unit: "words" },
  { slug: "riddles", name: "Logic riddles", skill: "Reasoning", desc: "Classic riddles to stretch your thinking.", emoji: "🤔", higherIsBetter: true, unit: "correct" },
  { slug: "pattern", name: "Pattern recognition", skill: "Attention", desc: "Spot the odd one out, faster each round.", emoji: "👁️", higherIsBetter: true, unit: "rounds" },
  { slug: "reaction", name: "Reaction time", skill: "Speed", desc: "Tap the moment the screen turns green.", emoji: "⚡", higherIsBetter: false, unit: "ms" },
  { slug: "nback", name: "N-back", skill: "Working memory", desc: "Does this letter match the one 2 steps back?", emoji: "🧠", higherIsBetter: true, unit: "%" },
  { slug: "difference", name: "Spot the difference", skill: "Attention", desc: "Find the tiles that differ between two grids.", emoji: "🔍", higherIsBetter: true, unit: "pts" },
  { slug: "hanoi", name: "Tower of Hanoi", skill: "Planning", desc: "Move the tower in as few moves as possible.", emoji: "🗼", higherIsBetter: true, unit: "pts" },
  { slug: "maze", name: "Maze", skill: "Spatial", desc: "Find your way out as fast as you can.", emoji: "🌀", higherIsBetter: true, unit: "pts" },
  { slug: "trivia", name: "Trivia", skill: "Knowledge", desc: "Business, money and general knowledge.", emoji: "❓", higherIsBetter: true, unit: "correct" },
  { slug: "rotation", name: "Spatial rotation", skill: "Spatial", desc: "Which shape is the same one, just rotated?", emoji: "🔄", higherIsBetter: true, unit: "correct" },
  { slug: "wordsearch", name: "Word search", skill: "Attention", desc: "Find the hidden words in the grid.", emoji: "🔎", higherIsBetter: true, unit: "pts" },
  { slug: "recall", name: "Sequence recall", skill: "Memory", desc: "Repeat the growing colour sequence.", emoji: "🎵", higherIsBetter: true, unit: "level" },
  { slug: "nonogram", name: "Nonogram", skill: "Logic", desc: "Use the number clues to reveal the picture.", emoji: "▦", higherIsBetter: true, unit: "pts" },
  { slug: "mystery", name: "Deduction mystery", skill: "Reasoning", desc: "Read the clues and work out who did it.", emoji: "🕵️", higherIsBetter: true, unit: "solved" },
];

export const gameBySlug = (slug: string) => GAMES.find((g) => g.slug === slug);

export type GameResult = { score: number; level?: string; won?: boolean; duration_ms?: number };

/** Small seeded-free helpers used by several games. */
export const shuffle = <T,>(a: T[]): T[] => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
};
export const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
