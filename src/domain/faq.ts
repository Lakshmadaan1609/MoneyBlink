/**
 * Frequently asked questions.
 *
 * Data, not JSX, so the copy can be reviewed, reordered or translated without touching a
 * screen — and so the answers stay in one place rather than being restated wherever a
 * feature happens to need explaining.
 */

export type FaqEntry = {
  id: string;
  question: string;
  answer: string;
};

export const FAQS: readonly FaqEntry[] = [
  {
    id: 'what-is-futureos',
    question: 'What is FutureOS?',
    answer:
      'FutureOS is a behavioral wealth system that helps you build long-term financial ' +
      'habits through streaks, goals, and future progress visualisation.',
  },
  {
    id: 'wealth-streak',
    question: 'What is a Wealth Streak?',
    answer:
      'A Wealth Streak tracks consecutive days of financial consistency and rewards ' +
      'disciplined investing behaviour. Miss a full day and it resets — though a shield, ' +
      'earned every seven unbroken days, will cover one slip for you.',
  },
  {
    id: 'urgent-money',
    question: 'What happens if I need money urgently?',
    answer:
      'Use Borrow Without Break to access liquidity against your portfolio without ' +
      'selling your investments or breaking long-term compounding.',
  },
  {
    id: 'future-you',
    question: 'How does Future You work?',
    answer:
      'Future You is a visual representation of your financial progress that evolves as ' +
      'you reach wealth milestones. Their standing is gated on both consistency and ' +
      'capital, so it cannot be bought with a single deposit.',
  },
  {
    id: 'why-consistency',
    question: 'Why does the app focus on consistency?',
    answer:
      'Long-term wealth is built through consistent habits, not large one-off decisions. ' +
      'FutureOS makes that progress visible and emotionally motivating, so the habit has ' +
      'something to hold on to on the days it would otherwise slip.',
  },
] as const;
