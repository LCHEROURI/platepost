import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from './useAppStore';
import { seedPosts } from '@/lib/seed';
import type { Post } from '@/lib/types';

const basePost: Post = {
  id: 'test-post-1',
  restaurantId: 'rest-luna-kitchen',
  creatorId: 'user-demo-1',
  caption: 'Test caption',
  mediaType: 'image',
  status: 'draft',
  category: 'other',
  isRecurring: false,
  recurrence: 'none',
  platforms: [],
  hashtags: [],
  watermark: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState({ posts: [...seedPosts], toasts: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds a new post at the front of the list', () => {
    useAppStore.getState().addOrUpdatePost(basePost);
    const { posts } = useAppStore.getState();
    expect(posts[0].id).toBe('test-post-1');
    expect(posts).toHaveLength(seedPosts.length + 1);
  });

  it('updates an existing post in place', () => {
    useAppStore.getState().addOrUpdatePost(basePost);
    useAppStore
      .getState()
      .addOrUpdatePost({ ...basePost, caption: 'Updated caption', status: 'scheduled' });
    const { posts } = useAppStore.getState();
    expect(posts).toHaveLength(seedPosts.length + 1);
    const post = posts.find((p) => p.id === 'test-post-1');
    expect(post?.caption).toBe('Updated caption');
    expect(post?.status).toBe('scheduled');
  });

  it('removes a post by id', () => {
    const first = seedPosts[0];
    useAppStore.getState().removePost(first.id);
    expect(useAppStore.getState().posts.some((p) => p.id === first.id)).toBe(false);
  });

  it('auto-dismisses toasts after the lifetime', () => {
    vi.useFakeTimers();
    const { pushToast } = useAppStore.getState();
    pushToast('Hello', 'success');
    expect(useAppStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(5000);
    expect(useAppStore.getState().toasts).toHaveLength(0);
  });
});
