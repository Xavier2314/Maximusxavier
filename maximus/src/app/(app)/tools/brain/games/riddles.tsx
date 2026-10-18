"use client";

import type { GameProps } from "../game-host";
import { Quiz, type QuizItem } from "./_quiz";

const BANK: QuizItem[] = [
  { q: "What has keys but can't open locks?", options: ["A piano", "A map", "A wallet", "A door"], answer: "A piano" },
  { q: "The more you take, the more you leave behind. What are they?", options: ["Footsteps", "Coins", "Photos", "Memories"], answer: "Footsteps" },
  { q: "What gets wetter the more it dries?", options: ["A towel", "A sponge", "Rain", "Soap"], answer: "A towel" },
  { q: "A farmer has 17 sheep. All but 9 run away. How many are left?", options: ["9", "8", "17", "0"], answer: "9", explain: "'All but 9' means 9 stay." },
  { q: "If you have me, you want to share me. If you share me, you don't have me. What am I?", options: ["A secret", "Money", "Food", "Time"], answer: "A secret" },
  { q: "What can you catch but not throw?", options: ["A cold", "A ball", "A fish", "A bus"], answer: "A cold" },
  { q: "How many months have 28 days?", options: ["All 12", "1", "2", "6"], answer: "All 12", explain: "Every month has at least 28 days." },
  { q: "A bat and a ball cost ₦1,100. The bat costs ₦1,000 more than the ball. How much is the ball?", options: ["₦50", "₦100", "₦10", "₦150"], answer: "₦50", explain: "Ball ₦50 + bat ₦1,050 = ₦1,100." },
  { q: "What has a neck but no head?", options: ["A bottle", "A shirt", "A guitar", "A giraffe"], answer: "A bottle" },
  { q: "If 5 machines make 5 items in 5 minutes, how long do 100 machines take to make 100 items?", options: ["5 minutes", "100 minutes", "20 minutes", "1 minute"], answer: "5 minutes", explain: "Each machine makes one item in 5 minutes." },
  { q: "I'm tall when I'm young and short when I'm old. What am I?", options: ["A candle", "A tree", "A pencil", "A shadow"], answer: "A candle" },
  { q: "Which word becomes shorter when you add two letters to it?", options: ["Short", "Long", "Small", "Brief"], answer: "Short", explain: "Short + er = shorter." },
  { q: "What has many teeth but can't bite?", options: ["A comb", "A shark", "A saw", "A zip"], answer: "A comb" },
  { q: "A lily pad doubles in size daily and covers the pond on day 30. On which day was it half covered?", options: ["Day 29", "Day 15", "Day 20", "Day 28"], answer: "Day 29" },
  { q: "What comes once in a minute, twice in a moment, but never in a thousand years?", options: ["The letter M", "A second", "A heartbeat", "Luck"], answer: "The letter M" },
  { q: "You see a boat full of people, yet there isn't a single person on board. How?", options: ["They're all married", "It's a toy", "It's a picture", "They swam away"], answer: "They're all married", explain: "Not a single (unmarried) person." },
];

export default function Riddles({ onDone }: GameProps) {
  return <Quiz bank={BANK} rounds={8} title="Logic riddles" onDone={onDone} />;
}
