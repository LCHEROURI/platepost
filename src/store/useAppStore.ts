import { create } from 'zustand';
import { postService } from '@/services/postService';
import { seedAccounts, seedPosts, seedRestaurant } from '@/lib/seed';
import { uid } from '@/lib/utils';
import type { Post, Restaurant, SocialAccount, Toast } from '@/lib/types';

interface AppState {
  restaurant: Restaurant;
  accounts: SocialAccount[];
  posts: Post[];
  toasts: Toast[];
  hydrated: boolean;

  hydrate: () => Promise<void>;
  addOrUpdatePost: (post: Post) => void;
  removePost: (id: string) => void;
  updateRestaurant: (patch: Partial<Restaurant>) => void;
  setAccountConnected: (platform: SocialAccount['platform'], connected: boolean) => void;
  pushToast: (message: string, kind?: Toast['kind']) => void;
  dismissToast: (id: string) => void;
}

const TOAST_LIFETIME_MS = 4500;

export const useAppStore = create<AppState>((set, get) => ({
  restaurant: seedRestaurant,
  accounts: seedAccounts,
  posts: seedPosts,
  toasts: [],
  hydrated: false,

  hydrate: async () => {
    try {
      const stored = await postService.load();
      if (stored.length > 0) {
        set({ posts: stored, hydrated: true });
      } else {
        set({ hydrated: true });
      }
    } catch {
      // Persistence unavailable (e.g. blocked storage) — keep demo seed in memory.
      set({ hydrated: true });
    }
  },

  addOrUpdatePost: (post) => {
    set((s) => {
      const exists = s.posts.some((p) => p.id === post.id);
      return { posts: exists ? s.posts.map((p) => (p.id === post.id ? post : p)) : [post, ...s.posts] };
    });
    void postService.save(post).catch(() => {
      get().pushToast('Could not persist this post — it lives in this session only.', 'error');
    });
  },

  removePost: (id) => {
    set((s) => ({ posts: s.posts.filter((p) => p.id !== id) }));
    void postService.remove(id).catch(() => undefined);
  },

  updateRestaurant: (patch) => {
    set((s) => ({ restaurant: { ...s.restaurant, ...patch } }));
    get().pushToast('Restaurant profile updated.', 'success');
  },

  setAccountConnected: (platform, connected) => {
    set((s) => ({
      accounts: s.accounts.map((a) =>
        a.platform === platform
          ? { ...a, connected, platformUsername: connected ? a.platformUsername || 'new-account' : '' }
          : a,
      ),
    }));
    get().pushToast(
      connected ? 'Account connected (OAuth placeholder).' : 'Account disconnected.',
      'info',
    );
  },

  pushToast: (message, kind = 'info') => {
    const id = uid();
    set((s) => ({ toasts: [...s.toasts, { id, message, kind }] }));
    setTimeout(() => get().dismissToast(id), TOAST_LIFETIME_MS);
  },

  dismissToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
