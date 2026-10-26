export type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed' | 'review_pending';

export type PostCategory = 'daily_special' | 'food_fact' | 'event' | 'promotion' | 'other';

export type Platform = 'instagram' | 'facebook' | 'x';

export type MediaType = 'image' | 'video' | 'gif';

export type Tone = 'casual' | 'exciting' | 'informative' | 'humorous' | 'professional';

export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface AppUser {
  uid: string;
  email: string;
}

export interface Restaurant {
  id: string;
  name: string;
  logoUrl?: string;
  contactEmail: string;
  phone: string;
  address: string;
  workingHours: string;
  ownerId: string;
  brandColor: string;
  fontFamily: string;
  handles: Record<Platform, string>;
  createdAt: string;
}

export interface SocialAccount {
  id: string;
  restaurantId: string;
  platform: Platform;
  platformUsername: string;
  connected: boolean;
  expiresAt?: string;
}

export interface PostPlatform {
  platform: Platform;
  accountId?: string;
  status: PostStatus;
  platformPostId?: string;
}

export interface Post {
  id: string;
  restaurantId: string;
  /** Denormalized owner uid — required for query gating in the security rules. */
  ownerId: string;
  creatorId: string;
  caption: string;
  mediaUrl?: string;
  mediaType: MediaType;
  status: PostStatus;
  scheduledAt?: string;
  publishedAt?: string;
  failedReason?: string;
  category: PostCategory;
  isRecurring: boolean;
  recurrence?: Recurrence;
  platforms: PostPlatform[];
  hashtags: string[];
  watermark: boolean;
  tone?: Tone;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsPoint {
  /** ISO date, e.g. 2026-10-20 */
  date: string;
  engagements: number;
  impressions: number;
  followers: number;
}

export interface PostMetrics {
  postId: string;
  platform: Platform;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
}

export interface AiSuggestion {
  id: string;
  text: string;
  hashtags: string[];
}

export interface Toast {
  id: string;
  message: string;
  kind: 'success' | 'error' | 'info';
}

export const CATEGORY_LABELS: Record<PostCategory, string> = {
  daily_special: 'Daily Special',
  food_fact: 'Food Fact',
  event: 'Event',
  promotion: 'Promotion',
  other: 'Other',
};

export const STATUS_LABELS: Record<PostStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  published: 'Published',
  failed: 'Failed',
  review_pending: 'Review pending',
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  x: 'X (Twitter)',
};

export const TONE_LABELS: Record<Tone, string> = {
  casual: 'Casual',
  exciting: 'Exciting',
  informative: 'Informative',
  humorous: 'Humorous',
  professional: 'Professional',
};
