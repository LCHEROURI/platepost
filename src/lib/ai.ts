import { uid } from './utils';
import type { AiSuggestion, PostCategory, Tone } from './types';

const INTROS: Record<Tone, string[]> = {
  casual: ['Just in case you needed a reason', "We can't get enough of this", 'Heads up, friends'],
  exciting: ['🔥 You do not want to miss this', 'BIG news from our kitchen', 'Today only — get ready for'],
  informative: ['Did you know?', 'Chef tip of the day:', 'A little backstory on'],
  humorous: ["Warning: this may cause sudden cravings 🥲", 'Our kitchen called, it said', 'BRB, daydreaming about'],
  professional: ['We are pleased to present', 'Introducing', 'Now available'],
};

const CATEGORY_PHRASES: Record<PostCategory, string[]> = {
  daily_special: [
    "today's special, fresh from the pass",
    'the daily special our regulars order on sight',
    "tonight's featured plate, plated to perfection",
  ],
  food_fact: [
    'a fun fact about the ingredients we cook with every day',
    'the story behind this dish, one bite at a time',
    'something worth knowing before your next order',
  ],
  event: [
    'an evening you will want to book early',
    'the event we have been planning all month',
    'live music, good food, great company — one night only',
  ],
  promotion: [
    'a deal too good to leave on the table',
    'our happiest hour of the week',
    'a limited-time offer for our favorite people',
  ],
  other: [
    'something special from our kitchen',
    'a little taste of what we do best',
    'made with love, served with a smile',
  ],
};

const CLOSERS: Record<Tone, string[]> = {
  casual: ['Swing by and say hi 👋', 'See you at the table!'],
  exciting: ['Run, don’t walk 🏃', 'Tag who you’re bringing!'],
  informative: ['Come taste the difference.', 'Learn more at your next visit.'],
  humorous: ['Your stomach will thank you.', 'Resistance is futile.'],
  professional: ['Reservations recommended.', 'We look forward to serving you.'],
};

const BASE_HASHTAGS: Record<PostCategory, string[]> = {
  daily_special: ['dailyspecial', 'chefschoice', 'fresh'],
  food_fact: ['foodfacts', 'didyouknow', 'kitchenstories'],
  event: ['localevents', 'livemusic', 'datenight'],
  promotion: ['deal', 'happyhour', 'offers'],
  other: ['foodie', 'instafood'],
};

const HASHTAG_POOL = ['foodie', 'foodporn', 'instafood', 'yum', 'foodlover', 'dinner', 'lunch', 'local'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function suggestHashtags(category: PostCategory, keywords: string[]): string[] {
  const fromKeywords = keywords
    .map((k) => k.trim().toLowerCase().replace(/[^a-z0-9]/g, ''))
    .filter(Boolean)
    .slice(0, 3);
  const extras = pick(HASHTAG_POOL);
  return [...new Set([...BASE_HASHTAGS[category], ...fromKeywords, extras])].slice(0, 8);
}

/**
 * Generate AI caption suggestions.
 *
 * TODO(google-ai): replace the mock generator with a call to a Cloud Run service that
 * proxies Google Gemini (see project README "Backend roadmap"). The service keeps the
 * API key server-side and returns the same AiSuggestion[] shape, so the UI needs no change.
 */
export async function generateCaptions(input: {
  restaurantName: string;
  category: PostCategory;
  keywords: string[];
  tone: Tone;
}): Promise<AiSuggestion[]> {
  // Simulate network latency so loading states are exercised in the UI.
  await new Promise((r) => setTimeout(r, 700));

  const { restaurantName, category, keywords, tone } = input;
  const subject =
    keywords.length > 0
      ? keywords.map((k) => k.trim().toLowerCase()).join(', ')
      : pick(CATEGORY_PHRASES[category]);

  const templates = [
    `${pick(INTROS[tone])} ${subject}. At ${restaurantName}, we keep it simple: real ingredients, real flavor. ${pick(CLOSERS[tone])}`,
    `${subject} — and trust us, it tastes even better than it looks. Come see why ${restaurantName} is the neighborhood favorite. ${pick(CLOSERS[tone])}`,
    `Fresh from the ${restaurantName} kitchen: ${subject}. Quality you can taste, made for sharing. ${pick(CLOSERS[tone])}`,
  ];

  return templates.map((text) => ({
    id: uid(),
    text,
    hashtags: suggestHashtags(category, keywords),
  }));
}
