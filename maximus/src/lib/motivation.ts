/** Short lines added to notification pop-ups and push alerts. */
export const MOTIVATION = [
  "Small steps every day build big results.",
  "Your consistency is your superpower.",
  "Every conversation is a seed. Keep planting.",
  "Discipline today, freedom tomorrow.",
  "You are closer than you think. Keep going.",
  "Leaders show up, especially on hard days.",
  "Progress, not perfection.",
  "Your team grows when you grow.",
  "Do it now. Your future self will thank you.",
  "One more call, one more step, one more win.",
  "Believe in the vision and work the plan.",
  "Great things take time. Stay in the game.",
  "Focus on what you can control today.",
  "Your why is bigger than your excuses.",
  "Keep your word to yourself. That's how trust is built.",
] as const;

/** A line picked from a seed, so the same notification always shows the same line. */
export function motivationFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return MOTIVATION[Math.abs(h) % MOTIVATION.length];
}
