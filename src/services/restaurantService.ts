import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import type { Restaurant } from '../lib/types';

const LS_KEY = 'platepost:restaurants';
const COLLECTION = 'restaurants';

function readLocal(): Restaurant[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Restaurant[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(restaurants: Restaurant[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(restaurants));
}

export function defaultBranding() {
  return { brandColor: '#4A5568', fontFamily: 'Inter' };
}

/**
 * Restaurant persistence. Restaurants are keyed by owner uid (doc id == ownerId),
 * which the security rules enforce. Falls back to localStorage in demo mode.
 */
export const restaurantService = {
  async getByOwner(ownerId: string): Promise<Restaurant | null> {
    if (db && isFirebaseConfigured) {
      const snap = await getDoc(doc(db, 'restaurants', ownerId));
      return snap.exists() ? ({ id: snap.id, ...snap.data() } as Restaurant) : null;
    }
    return readLocal().find((r) => r.ownerId === ownerId) ?? null;
  },

  async create(restaurant: Restaurant): Promise<void> {
    if (db && isFirebaseConfigured) {
      await setDoc(doc(db, COLLECTION, restaurant.id), restaurant);
      return;
    }
    writeLocal([...readLocal().filter((r) => r.id !== restaurant.id), restaurant]);
  },

  async update(id: string, patch: Partial<Restaurant>): Promise<void> {
    if (db && isFirebaseConfigured) {
      await updateDoc(doc(db, COLLECTION, id), patch);
      return;
    }
    writeLocal(readLocal().map((r) => (r.id === id ? { ...r, ...patch } : r)));
  },
};
