import { addDays, subDays, setHours, setMinutes } from 'date-fns';
import type { AnalyticsPoint, Post, PostMetrics, Restaurant, SocialAccount } from './types';

const iso = (d: Date): string => d.toISOString();

/** Inline SVG placeholder so the demo works fully offline. */
function placeholderMedia(emoji: string, bg: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="800" height="800" fill="${bg}"/><text x="400" y="430" font-size="280" text-anchor="middle" dominant-baseline="middle">${emoji}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const seedRestaurant: Restaurant = {
  id: 'rest-luna-kitchen',
  name: 'Luna Kitchen',
  contactEmail: 'hello@lunakitchen.example',
  phone: '(555) 010-2233',
  address: '128 Grove St, Brooklyn, NY',
  workingHours: 'Mon–Sun · 11:00 – 23:00',
  ownerId: 'user-demo-1',
  brandColor: '#4A5568',
  fontFamily: 'Inter',
  handles: { instagram: '@lunakitchen', facebook: 'lunakitchen', x: '@lunakitchen' },
  createdAt: subDays(new Date(), 420).toISOString(),
};

export const seedAccounts: SocialAccount[] = [
  {
    id: 'acct-ig',
    restaurantId: seedRestaurant.id,
    platform: 'instagram',
    platformUsername: 'lunakitchen',
    connected: true,
    expiresAt: addDays(new Date(), 42).toISOString(),
  },
  {
    id: 'acct-fb',
    restaurantId: seedRestaurant.id,
    platform: 'facebook',
    platformUsername: 'Luna Kitchen',
    connected: true,
    expiresAt: addDays(new Date(), 37).toISOString(),
  },
  { id: 'acct-x', restaurantId: seedRestaurant.id, platform: 'x', platformUsername: '', connected: false },
];

const R = seedRestaurant.id;

interface PostInput {
  caption: string;
  emoji: string;
  bg: string;
  category: Post['category'];
  status: Post['status'];
  offsetDays: number; // 0 = today; negative = past; positive = future
  hour: number;
  minute?: number;
  hashtags: string[];
  isRecurring?: boolean;
  recurrence?: Post['recurrence'];
  failedReason?: string;
}

function makePost(input: PostInput): Post {
  const base = addDays(new Date(), input.offsetDays);
  const at = setMinutes(setHours(base, input.hour), input.minute ?? 0);
  const isPast = input.offsetDays < 0 || (input.offsetDays === 0 && at.getTime() < Date.now());
  const published = input.status === 'published';
  return {
    id: `post-${input.emoji.codePointAt(0)?.toString(16)}-${input.offsetDays}-${input.hour}`,
    restaurantId: R,
    ownerId: seedRestaurant.ownerId,
    creatorId: 'user-demo-1',
    caption: input.caption,
    mediaUrl: placeholderMedia(input.emoji, input.bg),
    mediaType: 'image',
    status: input.status,
    scheduledAt: input.status === 'scheduled' ? iso(at) : undefined,
    publishedAt: published ? iso(isPast ? at : subDays(at, 7)) : undefined,
    failedReason: input.failedReason,
    category: input.category,
    isRecurring: input.isRecurring ?? false,
    recurrence: input.recurrence ?? 'none',
    platforms: [
      { platform: 'instagram', accountId: 'acct-ig', status: input.status, platformPostId: published ? 'IG-1042' : undefined },
      { platform: 'facebook', accountId: 'acct-fb', status: input.status, platformPostId: published ? 'FB-8813' : undefined },
    ],
    hashtags: input.hashtags,
    watermark: true,
    createdAt: subDays(at, 2).toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export const seedPosts: Post[] = [
  makePost({
    caption:
      "Tonight's special: smoked chipotle birria tacos with consommé on the side. Slow-braised for six hours — worth every minute. 🌮",
    emoji: '🌮',
    bg: '#FDEBD0',
    category: 'daily_special',
    status: 'published',
    offsetDays: -2,
    hour: 11,
    hashtags: ['dailyspecial', 'birria', 'tacos'],
  }),
  makePost({
    caption:
      'Happy hour is live until 7pm: $7 margaritas and half-price small plates. The perfect excuse to end the week early. 🍸',
    emoji: '🍸',
    bg: '#D6EAF8',
    category: 'promotion',
    status: 'published',
    offsetDays: -4,
    hour: 16,
    hashtags: ['happyhour', 'margarita', 'deal'],
  }),
  makePost({
    caption:
      'Did you know? We ferment our sourdough for 48 hours before it ever sees the oven. Slower bread, deeper flavor. 🍞',
    emoji: '🍞',
    bg: '#F5EEF8',
    category: 'food_fact',
    status: 'published',
    offsetDays: -6,
    hour: 9,
    hashtags: ['foodfacts', 'sourdough', 'bakery'],
  }),
  makePost({
    caption:
      "Tomorrow's lunch: grilled halloumi salad with charred lemon and mint. Light, bright, and gone by 1pm. 🥗",
    emoji: '🥗',
    bg: '#E8F8F5',
    category: 'daily_special',
    status: 'scheduled',
    offsetDays: 1,
    hour: 11,
    hashtags: ['dailyspecial', 'salad', 'lunch'],
  }),
  makePost({
    caption:
      'Live jazz night this Friday from 8pm — reserve a table by the window and let the trio do the rest. 🎷',
    emoji: '🎷',
    bg: '#FDF2E9',
    category: 'event',
    status: 'scheduled',
    offsetDays: 3,
    hour: 18,
    hashtags: ['livejazz', 'localevents', 'datenight'],
  }),
  makePost({
    caption:
      'Wine Wednesday returns: every bottle on the list is 30% off with any two mains. Bring someone you like. 🍷',
    emoji: '🍷',
    bg: '#FADBD8',
    category: 'promotion',
    status: 'scheduled',
    offsetDays: 5,
    hour: 15,
    hashtags: ['winewednesday', 'deal', 'datenight'],
  }),
  makePost({
    caption:
      'Monday Margaritas are back — every Monday, all day. Same recipe, same lime-salt rim, zero excuses. 🍹',
    emoji: '🍹',
    bg: '#EAF2F8',
    category: 'promotion',
    status: 'scheduled',
    offsetDays: 6,
    hour: 10,
    hashtags: ['mondaymargaritas', 'happyhour', 'margarita'],
    isRecurring: true,
    recurrence: 'weekly',
  }),
  makePost({
    caption:
      'Draft: kitchen tour behind the scenes — open the pass, meet the crew, watch the wood-fired oven in action.',
    emoji: '👨‍🍳',
    bg: '#FEF9E7',
    category: 'other',
    status: 'draft',
    offsetDays: 0,
    hour: 9,
    hashtags: ['behindthescenes', 'kitchen'],
  }),
  makePost({
    caption:
      'Why we season with smoked salt: a quick primer on the pantry staple that changed our roast vegetables forever.',
    emoji: '🧂',
    bg: '#F4F6F7',
    category: 'food_fact',
    status: 'review_pending',
    offsetDays: 2,
    hour: 12,
    hashtags: ['foodfacts', 'pantry', 'tips'],
  }),
  makePost({
    caption: 'Flash sale: 20% off all desserts after 9pm. Late-night sweet tooth? We see you. 🍰',
    emoji: '🍰',
    bg: '#FDEDEC',
    category: 'promotion',
    status: 'failed',
    offsetDays: -1,
    hour: 21,
    hashtags: ['dessert', 'deal', 'latenight'],
    failedReason: 'Instagram access token expired — reconnect in Settings → Social Accounts.',
  }),
];

/** Deterministic 30-day analytics series so charts render consistently. */
export function seedAnalytics(days = 30): AnalyticsPoint[] {
  const points: AnalyticsPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const dayOfMonth = date.getDate();
    const wobble = Math.round(Math.sin(i * 1.7) * 40 + Math.sin(i * 0.53) * 22);
    const engagements = Math.max(60, 240 + wobble + dayOfMonth);
    const impressions = engagements * 14 + Math.round(Math.sin(i * 0.9) * 900);
    const followers = 4120 + Math.round((days - i) * 14) + Math.round(Math.sin(i * 0.7) * 30);
    points.push({
      date: date.toISOString().slice(0, 10),
      engagements,
      impressions,
      followers,
    });
  }
  return points;
}

export function seedPostMetrics(posts: Post[]): PostMetrics[] {
  return posts
    .filter((p) => p.status === 'published' || p.status === 'scheduled')
    .flatMap((p) =>
      p.platforms.map((pp, i) => {
        const base = 300 + (p.caption.length * 7 + p.hashtags.length * 40) % 700 + i * 120;
        return {
          postId: p.id,
          platform: pp.platform,
          impressions: base * 11,
          reach: base * 8,
          likes: Math.round(base * 0.6),
          comments: Math.round(base * 0.08),
          shares: Math.round(base * 0.05),
          saves: Math.round(base * 0.12),
          clicks: Math.round(base * 0.02),
        };
      }),
    )
    .slice(0, 14); // keep the analytics table digestible
}

export const seedCategories = [...new Set(seedPosts.map((p) => p.category))];
