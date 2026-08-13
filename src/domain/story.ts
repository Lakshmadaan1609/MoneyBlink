/**
 * The story script.
 *
 * Chapters are data, not screens. One renderer walks a chapter's beats, so adding
 * Chapter 2 costs a block of content rather than another screen — and the dialogue can
 * be reviewed and edited without touching layout code.
 */

import type { ExpressionKey } from '@/theme';
import type { Purpose } from './types';

export type DialogueLine = {
  text: string;
  /** Face for this beat, so the character acts the line rather than just saying it. */
  expression: ExpressionKey;
  /** `{name}` is replaced with the user's first name. */
};

export type ChoiceOption<T extends string = string> = {
  key: T;
  label: string;
  /** Shown beneath the label — the concrete image behind the abstraction. */
  caption: string;
};

export type Chapter = {
  id: string;
  number: number;
  title: string;
  lines: DialogueLine[];
  question: string;
  options: ChoiceOption<Purpose>[];
  /** Face once a choice is made — the moment the avatar "warms". */
  responseExpression: ExpressionKey;
  /** Acknowledgement, keyed by the option chosen. */
  responses: Record<Purpose, string>;
};

export const CHAPTER_ONE: Chapter = {
  id: 'meeting',
  number: 1,
  title: 'The meeting',

  // Curious, calm, welcoming — the expression walks from greeting, through the reveal,
  // to a question the character genuinely wants answered.
  lines: [
    { text: 'Hey, {name}.', expression: 'hello' },
    {
      text: 'This might sound strange, but I’m you… a few years from now.',
      expression: 'confident',
    },
    { text: 'I’ve seen where your money can take us.', expression: 'happy' },
    { text: 'Before we begin, I need to understand something.', expression: 'thinking' },
  ],

  question: 'Who are we building this future for?',

  options: [
    { key: 'parents', label: 'My parents', caption: 'The people who went without, so you didn’t' },
    { key: 'family', label: 'My future family', caption: 'The ones who aren’t here yet' },
    { key: 'home', label: 'My dream home', caption: 'Keys that are actually yours' },
    { key: 'freedom', label: 'Financial freedom', caption: 'Work becoming a choice' },
    { key: 'unsure', label: 'I’m not sure yet', caption: 'That’s honest — we’ll find it together' },
  ],

  responseExpression: 'laughing',

  responses: {
    parents: 'Then let’s make sure they never have to worry again.',
    family: 'Then let’s build something that’s already waiting for them.',
    home: 'Then let’s get those keys in your hand.',
    freedom: 'Then let’s buy back your time, one day at a time.',
    unsure: 'That’s alright. Most people never even ask. We’ll figure it out together.',
  },
};

export const CHAPTERS: Chapter[] = [CHAPTER_ONE];

/** Fills `{name}` placeholders in a line. */
export function renderLine(text: string, name: string): string {
  return text.replace(/\{name\}/g, name);
}
