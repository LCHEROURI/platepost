import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Post } from '@/lib/types';

const mocks = vi.hoisted(() => ({
  postService: {
    load: vi.fn(async () => [] as Post[]),
    save: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
  },
  restaurantService: {
    getByOwner: vi.fn(async () => null),
    create: vi.fn(async () => undefined),
    update: vi.fn(async () => undefined),
  },
}));

vi.mock('@/lib/firebase', () => ({
  isFirebaseConfigured: false,
  auth: null,
  db: null,
  storage: null,
}));

vi.mock('@/services/postService', () => ({ postService: mocks.postService }));
vi.mock('@/services/restaurantService', () => ({
  restaurantService: mocks.restaurantService,
  defaultBranding: () => ({ brandColor: '#4A5568', fontFamily: 'Inter' }),
}));

import { DEMO_USER, useAppStore } from './useAppStore';
import { seedPosts, seedRestaurant } from '@/lib/seed';

const basePost: Post = {
  id: 'test-post-1',
  restaurantId: 'rest-luna-kitchen',
  ownerId: 'user-demo-1',
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

function resetStore() {
  useAppStore.setState({
    user: null,
    authReady: false,
    userDataReady: false,
    demoMode: false,
    restaurant: null,
    accounts: [],
    posts: [],
    toasts: [],
  });
}

describe('useAppStore', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initAuth enters demo mode with the demo restaurant when Firebase is unconfigured', async () => {
    mocks.postService.load.mockResolvedValue(seedPosts);
    useAppStore.getState().initAuth();

    await vi.waitFor(() => {
      expect(useAppStore.getState().userDataReady).toBe(true);
    });

    const s = useAppStore.getState();
    expect(s.demoMode).toBe(true);
    expect(s.user?.uid).toBe(DEMO_USER.uid);
    expect(s.restaurant?.id).toBe(seedRestaurant.id);
    expect(s.posts).toEqual(seedPosts);
    expect(s.authReady).toBe(true);
  });

  it('adds a new post and persists it through the post service', () => {
    useAppStore.setState({ posts: [...seedPosts] });
    useAppStore.getState().addOrUpdatePost(basePost);
    const { posts } = useAppStore.getState();
    expect(posts[0].id).toBe('test-post-1');
    expect(mocks.postService.save).toHaveBeenCalledWith(basePost);
  });

  it('updates an existing post in place', () => {
    useAppStore.setState({ posts: [...seedPosts] });
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

  it('removes a post and deletes it through the post service', () => {
    useAppStore.setState({ posts: [...seedPosts] });
    const first = seedPosts[0];
    useAppStore.getState().removePost(first.id);
    expect(useAppStore.getState().posts.some((p) => p.id === first.id)).toBe(false);
    expect(mocks.postService.remove).toHaveBeenCalledWith(first);
  });

  it('creates a restaurant for the signed-in user via createRestaurant', async () => {
    vi.useFakeTimers();
    useAppStore.setState({ user: { uid: 'user-42', email: 'owner@test.com' } });
    await useAppStore.getState().createRestaurant('New Bistro');

    const s = useAppStore.getState();
    expect(s.restaurant?.name).toBe('New Bistro');
    expect(s.restaurant?.id).toBe('user-42');
    expect(s.restaurant?.ownerId).toBe('user-42');
    expect(s.userDataReady).toBe(true);
    expect(mocks.restaurantService.create).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-42', ownerId: 'user-42', name: 'New Bistro' }),
    );
    vi.useRealTimers();
  });

  it('rejects createRestaurant when nobody is signed in', async () => {
    await expect(useAppStore.getState().createRestaurant('No Owner')).rejects.toThrow(
      'Not signed in',
    );
  });

  it('signs out to the demo user in demo mode', async () => {
    useAppStore.setState({ demoMode: true, user: DEMO_USER });
    await useAppStore.getState().signOut();
    const s = useAppStore.getState();
    expect(s.user?.uid).toBe(DEMO_USER.uid);
    expect(s.restaurant?.id).toBe(seedRestaurant.id);
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
