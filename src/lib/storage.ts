import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { isFirebaseConfigured, storage } from './firebase';
import { uid } from './utils';

/**
 * Upload a local media blob (object URL) to Firebase Storage so Meta's Graph API
 * can reach it via a public URL. Storage rules only allow the owner to write to
 * their own `posts/{uid}/` path (see storage.rules).
 */
export async function uploadMediaFromBlob(blobUrl: string): Promise<string> {
  if (!isFirebaseConfigured || !storage) {
    throw new Error('Media upload is not available in demo mode.');
  }
  const blob = await fetch(blobUrl).then((r) => r.blob());
  const ext = (blob.type.split('/')[1] || 'jpg').replace(/[^a-z0-9]/gi, '');
  const name = `posts/${uid()}.${ext}`;
  const fileRef = ref(storage, name);
  await uploadBytes(fileRef, blob);
  return getDownloadURL(fileRef);
}
