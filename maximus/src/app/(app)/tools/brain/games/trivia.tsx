"use client";

import type { GameProps } from "../game-host";
import { Quiz, type QuizItem } from "./_quiz";

const BANK: QuizItem[] = [
  { q: "What is the capital of Nigeria?", options: ["Abuja", "Lagos", "Ibadan", "Kano"], answer: "Abuja" },
  { q: "What does 'ROI' stand for in business?", options: ["Return on investment", "Rate of interest", "Risk of income", "Revenue over inflation"], answer: "Return on investment" },
  { q: "Compound interest means you earn interest on…", options: ["Your interest too", "Only your deposit", "Your salary", "Your debts"], answer: "Your interest too" },
  { q: "Which planet is known as the Red Planet?", options: ["Mars", "Venus", "Jupiter", "Mercury"], answer: "Mars" },
  { q: "What is the Nigerian currency?", options: ["Naira", "Cedi", "Rand", "Shilling"], answer: "Naira" },
  { q: "In sales, a 'prospect' is…", options: ["A potential customer", "A product", "A refund", "A competitor"], answer: "A potential customer" },
  { q: "How many minutes are in a classic Pomodoro focus block?", options: ["25", "15", "45", "60"], answer: "25" },
  { q: "Which is the largest ocean?", options: ["Pacific", "Atlantic", "Indian", "Arctic"], answer: "Pacific" },
  { q: "What is 15% of 2,000?", options: ["300", "150", "250", "350"], answer: "300" },
  { q: "Who wrote 'Things Fall Apart'?", options: ["Chinua Achebe", "Wole Soyinka", "Chimamanda Adichie", "Ben Okri"], answer: "Chinua Achebe" },
  { q: "A budget that spends 50% on needs, 30% on wants and 20% on…", options: ["Savings", "Rent", "Food", "Transport"], answer: "Savings" },
  { q: "Which gas do plants absorb from the air?", options: ["Carbon dioxide", "Oxygen", "Nitrogen", "Helium"], answer: "Carbon dioxide" },
  { q: "What does 'PV' usually mean in network marketing?", options: ["Point value", "Price value", "Profit volume", "Personal visit"], answer: "Point value" },
  { q: "How many continents are there?", options: ["7", "5", "6", "8"], answer: "7" },
  { q: "Upwork and Fiverr are platforms for…", options: ["Freelance work", "Banking", "Shipping", "Social media"], answer: "Freelance work" },
  { q: "What is the boiling point of water at sea level?", options: ["100°C", "90°C", "80°C", "120°C"], answer: "100°C" },
  { q: "If you save ₦1,000 a day, how much is that in a 30-day month?", options: ["₦30,000", "₦3,000", "₦300,000", "₦13,000"], answer: "₦30,000" },
  { q: "Which river is the longest in Africa?", options: ["Nile", "Niger", "Congo", "Zambezi"], answer: "Nile" },
  { q: "'SMART' goals are Specific, Measurable, Achievable, Relevant and…", options: ["Time-bound", "Tough", "Tracked", "True"], answer: "Time-bound" },
  { q: "The Eisenhower matrix sorts tasks by…", options: ["Urgency and importance", "Cost and time", "Size and colour", "Who asked"], answer: "Urgency and importance" },
];

export default function Trivia({ onDone }: GameProps) {
  return <Quiz bank={BANK} rounds={10} title="Trivia" onDone={onDone} />;
}
