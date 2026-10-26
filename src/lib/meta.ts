import { auth, isFirebaseConfigured } from './firebase';
import type { Platform } from './types';

/** Read at call time so env changes (and tests) take effect. */
function getServiceUrl(): string | undefined {
  return import.meta.env.VITE_META_SERVICE_URL;
}

export class MetaServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MetaServiceError';
  }
}

export interface MetaStatus {
  connected: boolean;
  pageId?: string;
  pageName?: string;
  igUsername?: string | null;
}

export interface PublishResult {
  platform: Platform;
  ok: boolean;
  platformPostId?: string | null;
  error?: string;
}

export interface MetaInsights {
  pageName?: string;
  followers: { instagram: number | null; facebook: number | null };
  engagementLast7d: number;
  impressionsLast7d: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const serviceUrl = getServiceUrl();
  if (!serviceUrl) {
    throw new MetaServiceError(
      "Meta publishing isn't configured yet. Set VITE_META_SERVICE_URL to the Cloud Run service URL.",
    );
  }
  if (!isFirebaseConfigured || !auth) {
    throw new MetaServiceError(
      "Meta publishing isn't available in demo mode. Configure Firebase and the Meta service first.",
    );
  }
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) {
    throw new MetaServiceError('Sign in to connect and publish to your Meta accounts.');
  }

  let res: Response;
  try {
    res = await fetch(`${serviceUrl.replace(/\/+$/, '')}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new MetaServiceError('The Meta service is unreachable right now. Please try again in a moment.');
  }

  if (!res.ok) {
    let message = 'The Meta service is unavailable right now. Please try again in a moment.';
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      // keep default message
    }
    throw new MetaServiceError(message);
  }
  return (await res.json()) as T;
}

/** Step 1 of the connect flow — returns a Meta authorize URL to open in the browser. */
export function startMetaOAuth(returnTo?: string): Promise<{ authorizeUrl: string }> {
  return request('/oauth/init', {
    method: 'POST',
    body: JSON.stringify({ returnTo }),
  });
}

export function getMetaStatus(): Promise<MetaStatus> {
  return request('/status');
}

export function disconnectMeta(): Promise<{ ok: boolean }> {
  return request('/disconnect', { method: 'POST' });
}

export function getMetaInsights(): Promise<MetaInsights> {
  return request('/insights');
}

export function publishToMeta(payload: {
  caption: string;
  hashtags: string[];
  mediaUrl: string | null;
  platforms: Platform[];
}): Promise<{ results: PublishResult[] }> {
  return request('/publish', { method: 'POST', body: JSON.stringify(payload) });
}
