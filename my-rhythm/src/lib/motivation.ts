/** Gentle, original encouragement (no quoted Scripture text is fabricated here). */
const LINES = [
  "Small, faithful steps build a strong life.",
  "Start with God, and let the rest of the day follow.",
  "Discipline is choosing what you want most over what you want now.",
  "Progress, not perfection. Show up today.",
  "Rest is part of the rhythm, not a break from it.",
  "Practise a little every day — mastery is patient.",
  "Your future is built in today's ordinary hours.",
  "Be present in each moment you've planned.",
  "Consistency beats intensity.",
  "Protect your mornings and your evenings will thank you.",
  "Grace for yesterday, focus for today, hope for tomorrow.",
  "One hour at a time. One note at a time. One rep at a time.",
];
export function motivation(date: string): string {
  let h = 0;
  for (const c of date) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return LINES[h % LINES.length];
}
