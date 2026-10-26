/**
 * Integration tests for Firestore security rules and Firebase Auth lifecycle.
 * Run via `npm run test:rules` (firebase emulators:exec --only firestore,auth).
 *
 * Data layout under test (matches the app):
 *   restaurants/{ownerUid}            — restaurant profile, doc id == owner uid
 *   restaurants/{ownerUid}/posts/{id} — posts scoped to their restaurant
 */
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteApp, initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';

const PROJECT_ID = 'demo-platepost';
const RULES = fs.readFileSync(path.join(process.cwd(), 'firestore.rules'), 'utf8');

const ALICE = 'alice';
const BOB = 'bob';

let env: RulesTestEnvironment;
let auth: ReturnType<typeof getAuth>;

function postsRef(db: Firestore, restaurantId: string) {
  return collection(db, 'restaurants', restaurantId, 'posts');
}

function postDoc(db: Firestore, restaurantId: string, postId: string) {
  return doc(db, 'restaurants', restaurantId, 'posts', postId);
}

function restaurantDoc(name: string, ownerId = ALICE) {
  return {
    name,
    ownerId,
    contactEmail: `${ownerId}@test.com`,
    phone: '',
    address: '',
    workingHours: '',
    brandColor: '#4A5568',
    fontFamily: 'Inter',
    createdAt: new Date().toISOString(),
  };
}

function postData(restaurantId: string, caption: string) {
  return {
    restaurantId,
    ownerId: restaurantId,
    caption,
    mediaType: 'image',
    status: 'scheduled',
    platforms: [],
    hashtags: [],
    isRecurring: false,
    recurrence: 'none',
    watermark: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/** A denied query may surface as an error or as zero results — either proves no data leaks. */
async function expectNoData(promise: Promise<{ size: number }>) {
  try {
    const result = await promise;
    expect(result.size).toBe(0);
  } catch {
    // Whole query denied — acceptable.
  }
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: RULES,
      host: '127.0.0.1',
      port: 8080,
    },
  });

  const authApp = initializeApp({ apiKey: 'demo-key', projectId: PROJECT_ID }, 'auth-test-app');
  auth = getAuth(authApp);
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';
  connectAuthEmulator(auth, `http://${authHost}`);
});

beforeEach(async () => {
  await env.clearFirestore();
});

afterAll(async () => {
  await env.cleanup();
  if (auth.app) await deleteApp(auth.app);
});

describe('Firebase Auth lifecycle', () => {
  it('signs up, signs out, and signs back in with email + password', async () => {
    const email = `owner-${Date.now()}@test.com`;
    const password = 'correct-horse-42';

    const created = await createUserWithEmailAndPassword(auth, email, password);
    expect(created.user.uid).toBeTruthy();
    expect(auth.currentUser?.uid).toBe(created.user.uid);

    await signOut(auth);
    expect(auth.currentUser).toBeNull();

    const backIn = await signInWithEmailAndPassword(auth, email, password);
    expect(backIn.user.uid).toBe(created.user.uid);

    await signOut(auth);
  });

  it('rejects a wrong password', async () => {
    const email = `owner-${Date.now()}@test.com`;
    await createUserWithEmailAndPassword(auth, email, 'right-password-42');
    await signOut(auth);
    await expect(signInWithEmailAndPassword(auth, email, 'wrong-password')).rejects.toThrow();
  });

  it('rejects an unknown account', async () => {
    await expect(
      signInWithEmailAndPassword(auth, `nobody-${Date.now()}@test.com`, 'whatever-123'),
    ).rejects.toThrow();
  });
});

describe('Firestore security rules', () => {
  it('denies every read and write to a signed-out visitor', async () => {
    const db = env.unauthenticatedContext().firestore();

    await assertFails(getDoc(doc(db, 'restaurants', ALICE)));
    await assertFails(getDocs(collection(db, 'restaurants')));
    await assertFails(setDoc(doc(db, 'restaurants', ALICE), restaurantDoc('Alice Kitchen')));
    await assertFails(setDoc(postDoc(db, ALICE, 'p1'), postData(ALICE, 'x')));
    await assertFails(deleteDoc(doc(db, 'restaurants', ALICE)));
    await assertFails(getDoc(postDoc(db, ALICE, 'p1')));
  });

  it('lets an owner create, read, and update their own restaurant', async () => {
    const db = env.authenticatedContext(ALICE).firestore();

    await assertSucceeds(setDoc(doc(db, 'restaurants', ALICE), restaurantDoc('Alice Kitchen')));
    const snap = await getDoc(doc(db, 'restaurants', ALICE));
    expect(snap.data()?.name).toBe('Alice Kitchen');
    await assertSucceeds(updateDoc(doc(db, 'restaurants', ALICE), { name: 'Alice Bistro' }));
  });

  it('lets an owner create and read posts in their own restaurant', async () => {
    const db = env.authenticatedContext(ALICE).firestore();
    await setDoc(doc(db, 'restaurants', ALICE), restaurantDoc('Alice Kitchen'));

    await assertSucceeds(setDoc(postDoc(db, ALICE, 'p1'), postData(ALICE, 'Tonight’s special')));
    await assertSucceeds(getDoc(postDoc(db, ALICE, 'p1')));

    const own = await getDocs(postsRef(db, ALICE));
    expect(own.size).toBe(1);
  });

  it('rejects restaurants created under someone else’s id or ownership', async () => {
    const db = env.authenticatedContext(BOB).firestore();

    // Doc id is the owner uid — BOB cannot create a doc keyed by ALICE.
    await assertFails(setDoc(doc(db, 'restaurants', ALICE), restaurantDoc('Spoofed')));
    // OwnerId must match the signed-in user.
    await assertFails(
      setDoc(doc(db, 'restaurants', BOB), restaurantDoc('Bob’s', ALICE)),
    );
  });

  it('blocks cross-restaurant reads, queries, writes, and deletes', async () => {
    const aliceDb = env.authenticatedContext(ALICE).firestore();
    await setDoc(doc(aliceDb, 'restaurants', ALICE), restaurantDoc('Alice Kitchen'));
    await setDoc(postDoc(aliceDb, ALICE, 'p1'), postData(ALICE, 'Alice’s secret post'));

    const bobDb = env.authenticatedContext(BOB).firestore();

    // Direct read of another restaurant’s data → denied.
    await assertFails(getDoc(doc(bobDb, 'restaurants', ALICE)));
    await assertFails(getDoc(postDoc(bobDb, ALICE, 'p1')));

    // Queries over Alice’s posts return nothing to Bob.
    await expectNoData(getDocs(postsRef(bobDb, ALICE)));

    // Writes/deletes against Alice’s data → denied.
    await assertFails(setDoc(postDoc(bobDb, ALICE, 'evil'), postData(ALICE, 'spam')));
    await assertFails(updateDoc(postDoc(bobDb, ALICE, 'p1'), { caption: 'hijacked' }));
    await assertFails(deleteDoc(doc(bobDb, 'restaurants', ALICE)));

    // Bob cannot move Alice’s post to his own restaurant either.
    await assertFails(updateDoc(postDoc(bobDb, ALICE, 'p1'), { restaurantId: BOB }));
  });

  it('lets Bob run his own restaurant without seeing Alice’s data', async () => {
    const aliceDb = env.authenticatedContext(ALICE).firestore();
    await setDoc(doc(aliceDb, 'restaurants', ALICE), restaurantDoc('Alice Kitchen'));
    await setDoc(postDoc(aliceDb, ALICE, 'p1'), postData(ALICE, 'Alice’s special'));

    const bobDb = env.authenticatedContext(BOB).firestore();
    await assertSucceeds(setDoc(doc(bobDb, 'restaurants', BOB), restaurantDoc('Bob’s Grill', BOB)));
    await assertSucceeds(setDoc(postDoc(bobDb, BOB, 'b1'), postData(BOB, 'Bob’s special')));

    const bobPosts = await getDocs(postsRef(bobDb, BOB));
    expect(bobPosts.size).toBe(1);
    await expectNoData(getDocs(postsRef(bobDb, ALICE)));
  });
});
