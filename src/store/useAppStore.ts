import { create } from 'zustand';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  type Unsubscribe,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import { postService } from '@/services/postService';
import { defaultBranding, restaurantService } from '@/services/restaurantService';
import { seedAccounts, seedPosts, seedRestaurant } from '@/lib/seed';
import { uid } from '@/lib/utils';
import type { AppUser, Post, Restaurant, SocialAccount, Toast } from '@/lib/types';

export const DEMO_USER: AppUser = { uid: 'user-demo-1', email: 'demo@platepost.local' };

function authErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address looks invalid.';
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Incorrect email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists — sign in instead.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts — please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network error — check your connection and try again.';
    default:
      return 'Authentication failed. Please try again.';
  }
}

interface AppState {
  user: AppUser | null;
  /** Firebase auth state has settled. */
  authReady: boolean;
  /** The signed-in user's restaurant/posts were loaded (or the attempt finished). */
  userDataReady: boolean;
  demoMode: boolean;
  restaurant: Restaurant | null;
  accounts: SocialAccount[];
  posts: Post[];
  toasts: Toast[];

  initAuth: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, restaurantName: string) => Promise<void>;
  signOut: () => Promise<void>;
  addOrUpdatePost: (post: Post) => void;
  removePost: (id: string) => void;
  updateRestaurant: (patch: Partial<Restaurant>) => void;
  setAccountConnected: (platform: SocialAccount['platform'], connected: boolean) => void;
  pushToast: (message: string, kind?: Toast['kind']) => void;
  dismissToast: (id: string) => void;
}

const TOAST_LIFETIME_MS = 4500;

/** Guard against double subscription (React StrictMode mounts effects twice). */
let unsubscribeAuth: Unsubscribe | null = null;
let subscribedFor = '';

async function loadUserData(uid: string) {
  const restaurant = await restaurantService.getByOwner(uid);
  const posts = restaurant ? await postService.load(restaurant.id) : [];
  return { restaurant, posts };
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  authReady: false,
  userDataReady: false,
  demoMode: false,
  restaurant: null,
  accounts: [],
  posts: [],
  toasts: [],

  initAuth: () => {
    if (subscribedFor === 'demo' || (subscribedFor === 'live' && unsubscribeAuth)) return;

    // Demo mode: no Firebase configuration — everything runs locally.
    if (!isFirebaseConfigured || !auth) {
      subscribedFor = 'demo';
      set({ demoMode: true, user: DEMO_USER, authReady: true, restaurant: seedRestaurant, accounts: seedAccounts });
      void postService
        .load(seedRestaurant.id)
        .then((posts) => set({ posts, userDataReady: true }))
        .catch(() => set({ posts: seedPosts, userDataReady: true }));
      return;
    }

    subscribedFor = 'live';
    unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        set({
          user: null,
          authReady: true,
          userDataReady: true,
          restaurant: null,
          accounts: [],
          posts: [],
        });
        return;
      }
      const user: AppUser = { uid: fbUser.uid, email: fbUser.email ?? '' };
      set({ user, authReady: true });
      try {
        const { restaurant, posts } = await loadUserData(fbUser.uid);
        set({ restaurant, posts, accounts: [], userDataReady: true });
      } catch (err) {
        get().pushToast(
          err instanceof Error
            ? `Could not load your data: ${err.message}`
            : 'Could not load your data. Please reload.',
          'error',
        );
        set({ restaurant: null, posts: [], userDataReady: true });
      }
    });
  },

  signIn: async (email, password) => {
    if (!auth) throw new Error('Firebase is not configured.');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged loads the restaurant and posts.
    } catch (err) {
      const code = (err as { code?: string }).code ?? 'unknown';
      throw new Error(authErrorMessage(code));
    }
  },

  signUp: async (email, password, restaurantName) => {
    if (!auth) throw new Error('Firebase is not configured.');
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // Each new account gets its own restaurant profile, keyed by uid.
      const restaurant: Restaurant = {
        id: cred.user.uid,
        name: restaurantName.trim(),
        contactEmail: email,
        phone: '',
        address: '',
        workingHours: '',
        ownerId: cred.user.uid,
        brandColor: defaultBranding().brandColor,
        fontFamily: defaultBranding().fontFamily,
        handles: { instagram: '', facebook: '', x: '' },
        createdAt: new Date().toISOString(),
      };
      await restaurantService.create(restaurant);
    } catch (err) {
      const code = (err as { code?: string }).code ?? 'unknown';
      if (code === 'auth/email-already-in-use') throw new Error(authErrorMessage(code));
      throw new Error(authErrorMessage(code));
    }
  },

  signOut: async () => {
    if (get().demoMode) {
      set({
        user: DEMO_USER,
        restaurant: seedRestaurant,
        accounts: seedAccounts,
        posts: seedPosts,
      });
      return;
    }
    if (!auth) return;
    await fbSignOut(auth);
    // onAuthStateChanged resets state and RequireAuth redirects to /signin.
  },

  addOrUpdatePost: (post) => {
    set((s) => {
      const exists = s.posts.some((p) => p.id === post.id);
      return {
        posts: exists ? s.posts.map((p) => (p.id === post.id ? post : p)) : [post, ...s.posts],
      };
    });
    void postService.save(post).catch(() => {
      get().pushToast('Could not persist this post — it lives in this session only.', 'error');
    });
  },

  removePost: (id) => {
    const post = get().posts.find((p) => p.id === id);
    set((s) => ({ posts: s.posts.filter((p) => p.id !== id) }));
    if (post) void postService.remove(post).catch(() => undefined);
  },

  updateRestaurant: (patch) => {
    const restaurant = get().restaurant;
    if (!restaurant) return;
    set((s) => ({ restaurant: s.restaurant ? { ...s.restaurant, ...patch } : s.restaurant }));
    void restaurantService.update(restaurant.id, patch).catch(() => {
      get().pushToast('Could not save your profile changes.', 'error');
    });
    get().pushToast('Restaurant profile updated.', 'success');
  },

  setAccountConnected: (platform, connected) => {
    set((s) => ({
      accounts: s.accounts.some((a) => a.platform === platform)
        ? s.accounts.map((a) => (a.platform === platform ? { ...a, connected } : a))
        : [
            ...s.accounts,
            {
              id: uid(),
              restaurantId: s.restaurant?.id ?? '',
              platform,
              platformUsername: '',
              connected,
            },
          ],
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
