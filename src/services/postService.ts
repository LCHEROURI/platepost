import { collection, deleteDoc, doc, getDocs, setDoc, type Firestore } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import type { Post } from '../lib/types';

const LS_KEY = 'platepost:posts';

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

/** Posts live at restaurants/{restaurantId}/posts — path-scoped by the security rules. */
function postsCollection(restaurantId: string) {
  return collection(db as Firestore, 'restaurants', restaurantId, 'posts');
}

/**
 * Post persistence, scoped to one restaurant. Uses Firestore subcollections when
 * configured (matching the security rules), otherwise falls back to localStorage
 * so demo mode keeps working offline.
 */
export const postService = {
  async load(restaurantId: string): Promise<Post[]> {
    if (db && isFirebaseConfigured) {
      const snapshot = await getDocs(postsCollection(restaurantId));
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Post);
    }
    return readLocal().filter((p) => p.restaurantId === restaurantId);
  },

  async save(post: Post): Promise<void> {
    if (db && isFirebaseConfigured) {
      const { id, ...data } = post;
      await setDoc(doc(postsCollection(post.restaurantId), id), { ...data, id });
      return;
    }
    const posts = readLocal();
    const idx = posts.findIndex((p) => p.id === post.id);
    if (idx >= 0) posts[idx] = post;
    else posts.push(post);
    writeLocal(posts);
  },

  async remove(post: Post): Promise<void> {
    if (db && isFirebaseConfigured) {
      await deleteDoc(doc(postsCollection(post.restaurantId), post.id));
      return;
    }
    writeLocal(readLocal().filter((p) => p.id !== post.id));
  },
};
