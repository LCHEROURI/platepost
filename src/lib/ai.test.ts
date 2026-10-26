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

import { AiServiceError, generateCaptions } from './ai';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

describe('generateCaptions (real AI service client)', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_AI_SERVICE_URL', 'https://ai.example.com/');
    mocks.currentUser.getIdToken.mockResolvedValue('fake-id-token');
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  const input = {
    restaurantName: 'Luna Kitchen',
    category: 'daily_special' as const,
    keywords: ['birria tacos'],
    tone: 'exciting' as const,
  };

  it('posts the draft to the service with the Firebase ID token and maps the suggestions', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        suggestions: [
          { caption: 'Option A', hashtags: ['tacos', 'dailyspecial'] },
          { caption: 'Option B', hashtags: ['#foodie', ''] },
        ],
      }),
    );

    const results = await generateCaptions(input);

    expect(fetch).toHaveBeenCalledWith('https://ai.example.com/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer fake-id-token' },
      body: JSON.stringify(input),
    });
    expect(results).toHaveLength(2);
    expect(results[0].text).toBe('Option A');
    expect(results[0].hashtags).toEqual(['tacos', 'dailyspecial']);
    expect(results[1].hashtags).toEqual(['foodie']);
    expect(results[0].id).toBeTruthy();
  });

  it('throws a clear error when the service responds with an error status', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ error: 'down' }, false, 502));
    await expect(generateCaptions(input)).rejects.toThrow(AiServiceError);
    await expect(generateCaptions(input)).rejects.toThrow(/unavailable/);
  });

  it('throws a clear error when the service is unreachable', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('fetch failed'));
    await expect(generateCaptions(input)).rejects.toThrow(/unreachable/);
  });

  it('throws when there is no signed-in user', async () => {
    mocks.currentUser.getIdToken.mockResolvedValue(null);
    await expect(generateCaptions(input)).rejects.toThrow(/Sign in/);
  });

  it('throws when the service returns no usable suggestions — never falls back to mocks', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ suggestions: [] }));
    await expect(generateCaptions(input)).rejects.toThrow(/No captions could be generated/);
  });

  it('throws when the service URL is not configured', async () => {
    vi.stubEnv('VITE_AI_SERVICE_URL', '');
    await expect(generateCaptions(input)).rejects.toThrow(/aren't configured/);
    expect(fetch).not.toHaveBeenCalled();
  });
});
