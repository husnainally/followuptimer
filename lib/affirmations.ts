type Tone = 'motivational' | 'professional' | 'playful';

const motivational = [
  'You are moving the needle—one follow-up at a time.',
  'Consistency compounds. This reminder keeps your momentum alive.',
  'Small disciplined actions lead to big wins. Keep going.',
];

const professional = [
  'Timely follow-ups build trust—this one keeps your cadence sharp.',
  'Your reliability is an asset. Maintain it with this touchpoint.',
  'Strategic persistence beats silence. Stay proactive.',
];

const playful = [
  'Ping time! Your future self is high‑fiving you.',
  'A gentle nudge from your productivity fairy 🧚‍♂️',
  'Reminder fuel incoming—let’s keep the streak alive!',
];

export function generateAffirmation(tone: Tone): string {
  const pool =
    tone === 'motivational'
      ? motivational
      : tone === 'professional'
      ? professional
      : playful;
  return pool[Math.floor(Math.random() * pool.length)];
}
