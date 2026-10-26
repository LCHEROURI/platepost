import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import type { Post } from '../lib/types';

const LS_KEY = 'platepost:posts';
const POSTS_COLLECTION = 'posts';

function readLocal(): Post[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Post[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(posts: Post[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(posts));
}

/**
 * Post persistence. Uses Firestore when Firebase is configured (see .env.example),
 * otherwise falls back to localStorage so the demo app is fully functional offline.
 */
export const postService = {
  async load(): Promise<Post[]> {
    if (db && isFirebaseConfigured) {
      const snapshot = await getDocs(collection(db as Firestore, POSTS_COLLECTION));
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Post);
    }
    return readLocal();
  },

  async save(post: Post): Promise<void> {
    if (db && isFirebaseConfigured) {
      const { id, ...data } = post;
      await setDoc(doc(db as Firestore, POSTS_COLLECTION, id), { ...data, id });
      return;
    }
    const posts = readLocal();
    const idx = posts.findIndex((p) => p.id === post.id);
    if (idx >= 0) posts[idx] = post;
    else posts.push(post);
    writeLocal(posts);
  },

  async remove(id: string): Promise<void> {
    if (db && isFirebaseConfigured) {
      await deleteDoc(doc(db as Firestore, POSTS_COLLECTION, id));
      return;
    }
    writeLocal(readLocal().filter((p) => p.id !== id));
  },
};
