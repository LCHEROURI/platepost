import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  currentUser: { getIdToken: vi.fn(async (): Promise<string | null> => 'fake-id-token') },
}));

vi.mock('@/lib/firebase', () => ({
  isFirebaseConfigured: true,
  auth: { currentUser: mocks.currentUser },
  db: null,
  storage: null,
}));

import { getMetaStatus, MetaServiceError, publishToMeta } from './meta';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

describe('Meta service client', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_META_SERVICE_URL', 'https://meta.example.com/');
    mocks.currentUser.getIdToken.mockResolvedValue('fake-id-token');
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('fetches connection status with the Firebase ID token', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ connected: true, pageName: 'Luna Kitchen', igUsername: 'lunakitchen' }),
    );
    const status = await getMetaStatus();
    expect(status.connected).toBe(true);
    expect(status.pageName).toBe('Luna Kitchen');
    expect(fetch).toHaveBeenCalledWith('https://meta.example.com/status', {
      method: undefined,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer fake-id-token',
      },
    });
  });

  it('publishes to Meta and returns per-platform results', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        results: [
          { platform: 'instagram', ok: true, platformPostId: 'IG-1' },
          { platform: 'facebook', ok: false, error: 'Token expired' },
        ],
      }),
    );
    const { results } = await publishToMeta({
      caption: 'Hello',
      hashtags: ['food'],
      mediaUrl: 'https://storage.example.com/x.jpg',
      platforms: ['instagram', 'facebook'],
    });
    expect(results).toHaveLength(2);
    expect(results[0].platformPostId).toBe('IG-1');
    expect(results[1].ok).toBe(false);
  });

  it('surfaces the service error message when publishing fails', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ error: 'No connected Meta accounts. Connect your Page in Settings first.' }, false, 400),
    );
    await expect(
      publishToMeta({ caption: 'x', hashtags: [], mediaUrl: null, platforms: ['facebook'] }),
    ).rejects.toThrow(/Connect your Page in Settings/);
  });

  it('throws a clear error when the service URL is not configured', async () => {
    vi.stubEnv('VITE_META_SERVICE_URL', '');
    await expect(getMetaStatus()).rejects.toThrow(MetaServiceError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('throws a clear error when signed out', async () => {
    mocks.currentUser.getIdToken.mockResolvedValue(null);
    await expect(getMetaStatus()).rejects.toThrow(/Sign in/);
  });

  it('throws a clear error when the service is unreachable', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('fetch failed'));
    await expect(getMetaStatus()).rejects.toThrow(/unreachable/);
  });
});
