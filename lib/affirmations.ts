export type Tone = 'motivational' | 'professional' | 'playful' | 'simple';

export type AffirmationFrequency = 'rare' | 'balanced' | 'frequent';

const motivational = [
  'You are moving the needle—one follow-up at a time.',
  'Consistency compounds. This reminder keeps your momentum alive.',
  'Small disciplined actions lead to big wins. Keep going.',
  'Every reminder you complete is a step toward your goals.',
  'You have the power to follow through. Use it now.',
  'Progress happens one reminder at a time. This is yours.',
  'Your future self will thank you for this follow-up.',
  'Momentum builds with action. Take this step.',
  'You are capable of completing what you start.',
  'This reminder is your opportunity to stay on track.',
  'Success is built on consistent follow-through.',
  'You are making progress, one reminder at a time.',
  'Your commitment to follow-ups shows your dedication.',
  'Every completed reminder strengthens your habits.',
  'You have what it takes to finish this task.',
];

const professional = [
  'Timely follow-ups build trust—this one keeps your cadence sharp.',
  'Your reliability is an asset. Maintain it with this touchpoint.',
  'Strategic persistence beats silence. Stay proactive.',
  'Professional relationships thrive on consistent communication.',
  'This follow-up demonstrates your commitment to excellence.',
  'Your attention to detail sets you apart.',
  'Reliability is built one follow-up at a time.',
  'This reminder helps maintain your professional standards.',
  'Consistent follow-ups strengthen business relationships.',
  'Your proactive approach creates opportunities.',
  'Professional success comes from staying connected.',
  'This touchpoint reinforces your credibility.',
  'Timely communication is a competitive advantage.',
  'Your follow-up discipline builds lasting partnerships.',
  'Professional growth happens through consistent action.',
];

const playful = [
  'Ping time! Your future self is high-fiving you.',
  'A gentle nudge from your productivity fairy 🧚‍♂️',
  'Reminder fuel incoming—let\'s keep the streak alive!',
  'Time to sprinkle some follow-up magic! ✨',
  'Your reminder buddy is here to help!',
  'Let\'s turn this reminder into a win! 🎯',
  'Your productivity superpowers are ready!',
  'Time to show this reminder who\'s boss! 💪',
  'Another reminder, another chance to shine!',
  'Your future self is doing a happy dance! 🕺',
  'Let\'s make this follow-up fun and productive!',
  'Your reminder fairy godmother is here! 🧚',
  'Time to add this to your win column!',
  'This reminder is your chance to level up!',
  'Let\'s turn this into a productivity party! 🎉',
];

const simple = [
  'Time to follow up.',
  'Complete this reminder.',
  'Stay on track.',
  'Take action now.',
  'Follow through.',
  'Get it done.',
  'Stay consistent.',
  'Keep moving forward.',
  'One step at a time.',
  'Focus and complete.',
  'Action required.',
  'Stay committed.',
  'Follow up now.',
  'Complete the task.',
  'Take the next step.',
];

const affirmationPools: Record<Tone, string[]> = {
  motivational,
  professional,
  playful,
  simple,
};

/**
 * Generate a random affirmation based on tone
 */
export function generateAffirmation(tone: Tone = 'motivational'): string {
  const pool = affirmationPools[tone] || motivational;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Check if affirmation should be shown based on frequency
 */
export function shouldShowAffirmation(
  frequency: AffirmationFrequency,
  lastShown?: Date
): boolean {
  if (!lastShown) return true;

  const now = new Date();
  const hoursSinceLastShown =
    (now.getTime() - lastShown.getTime()) / (1000 * 60 * 60);

  switch (frequency) {
    case 'rare':
      return hoursSinceLastShown >= 24; // Once per day
    case 'balanced':
      return hoursSinceLastShown >= 4; // Every 4 hours
    case 'frequent':
      return hoursSinceLastShown >= 1; // Every hour
    default:
      return hoursSinceLastShown >= 4;
  }
}

/**
 * Get all affirmations for a specific tone
 */
export function getAffirmationsForTone(tone: Tone): string[] {
  return affirmationPools[tone] || motivational;
}
