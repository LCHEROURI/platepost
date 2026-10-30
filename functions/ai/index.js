import express from 'express';
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { GoogleAuth } from 'google-auth-library';

/**
 * PlatePost AI caption service (Cloud Run, project platepost-e133a).
 *
 * - POST /generate : verifies the caller's Firebase ID token, prompts Vertex AI
 *   Gemini for caption options, and returns { suggestions: [{id, text, hashtags}] }.
 * - GET  /healthz  : Cloud Run health check.
 *
 * No API keys anywhere: Vertex AI is called with the service account's own
 * identity (roles/aiplatform.user on the Cloud Run service account).
 */

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'platepost-e133a';
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'global';
const MODEL = process.env.GEMINI_MODEL || 'gemini-4-argon';
// Optional fallback backend: AI Studio key, kept ONLY as a server-side secret
// (Cloud Run env var backed by Secret Manager). Absent => Vertex AI via IAM.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || null;
// Local testing only — never set this in Cloud Run.
const ALLOW_UNAUTH = process.env.ALLOW_UNAUTH === '1';

initializeApp({ projectId: PROJECT_ID, credential: applicationDefault() });

const app = express();
app.use(express.json({ limit: '32kb' }));

// CORS: allow PlatePost app origins (env-configurable, comma-separated).
const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (CORS_ORIGINS.includes('*') || CORS_ORIGINS.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '3600');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
  }
  next();
});

const CATEGORY_LABELS = {
  daily_special: 'daily special',
  food_fact: 'food fact',
  event: 'event',
  promotion: 'promotion',
  other: 'general restaurant post',
};

const TONES = ['casual', 'exciting', 'informative', 'humorous', 'professional'];

export function buildPrompt({ restaurantName, category, keywords, tone }) {
  const subject =
    keywords.length > 0
      ? `the following draft notes: ${keywords.join(', ')}`
      : `a ${CATEGORY_LABELS[category] || 'general'} post`;
  return [
    `You write short, engaging social media captions for a restaurant called "${restaurantName}".`,
    `Write captions about ${subject}.`,
    `Tone: ${tone}. Category: ${CATEGORY_LABELS[category] || 'other'}.`,
    'Write exactly 3 distinct caption options, each under 220 characters.',
    'Write all captions and hashtags in English only, even if the restaurant name or keywords are in another language.',
    'For each caption, provide 4-6 relevant hashtags (lowercase, no spaces).',
    'Respond ONLY with a JSON array of objects with keys "caption" (string) and "hashtags" (array of strings). No markdown fences, no commentary.',
  ].join('\n');
}

export function parseSuggestions(raw) {
  const cleaned = raw.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start < 0 || end <= start) throw new Error('No JSON array in AI response');
  const parsed = JSON.parse(cleaned.slice(start, end + 1));
  if (!Array.isArray(parsed)) throw new Error('AI response is not an array');
  return parsed
    .slice(0, 3)
    .map((item, i) => ({
      id: `ai-${i}`,
      text: String(item?.caption ?? item?.text ?? '').trim(),
      hashtags: Array.isArray(item?.hashtags)
        ? item.hashtags
            .map((h) => String(h).replace(/^#/, '').trim())
            .filter(Boolean)
            .slice(0, 8)
        : [],
    }))
    .filter((s) => s.text.length > 0);
}

app.get('/healthz', (_req, res) => {
  res.json({ ok: true });
});

// Note: /healthz is intercepted by the platform on *.run.app domains,
// so expose /health for external health checks too.
app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/generate', async (req, res) => {
  try {
    if (!ALLOW_UNAUTH) {
      const header = req.headers.authorization || '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : '';
      if (!token) {
        res.status(401).json({ error: 'Missing credentials.' });
        return;
      }
      try {
        await getAuth().verifyIdToken(token);
      } catch {
        res.status(401).json({ error: 'Invalid credentials.' });
        return;
      }
    }

    const { restaurantName, category, keywords, tone } = req.body || {};
    if (typeof restaurantName !== 'string' || !restaurantName.trim()) {
      res.status(400).json({ error: 'restaurantName is required.' });
      return;
    }
    const safeKeywords = Array.isArray(keywords)
      ? keywords.filter((k) => typeof k === 'string').map((k) => k.trim()).filter(Boolean).slice(0, 8)
      : [];
    const safeTone = TONES.includes(tone) ? tone : 'casual';
    const safeCategory = Object.prototype.hasOwnProperty.call(CATEGORY_LABELS, category)
      ? category
      : 'other';

    const promptText = buildPrompt({
      restaurantName: restaurantName.trim(),
      category: safeCategory,
      keywords: safeKeywords,
      tone: safeTone,
    });

    let upstream;
    if (GEMINI_API_KEY) {
      // AI Studio (generativelanguage) path — key from Secret Manager, server-side only.
      upstream = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
        {
          method: 'POST',
          headers: { 'x-goog-api-key': GEMINI_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: promptText }] }],
            generationConfig: { temperature: 0.9, maxOutputTokens: 800 },
          }),
        },
      );
    } else {
      // Vertex AI path — authenticated with the service account identity, no keys.
      const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
      const client = await auth.getClient();
      const { token: accessToken } = await client.getAccessToken();
      const host =
        LOCATION === 'global'
          ? 'aiplatform.googleapis.com'
          : `${LOCATION}-aiplatform.googleapis.com`;
      const url = `https://${host}/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`;
      upstream = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: promptText }] }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 800 },
        }),
      });
    }

    if (!upstream.ok) {
      const body = await upstream.text().catch(() => '');
      console.error('Vertex AI error', upstream.status, body.slice(0, 400));
      res.status(502).json({ error: 'The AI provider is unavailable right now.' });
      return;
    }

    const data = await upstream.json();
    const rawText = data?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? '')
      .join('') ?? '';
    const suggestions = parseSuggestions(rawText);
    if (suggestions.length === 0) {
      res.status(502).json({ error: 'No captions could be generated.' });
      return;
    }
    res.json({ suggestions });
  } catch (err) {
    console.error('generate error', err);
    res.status(500).json({ error: 'Caption generation failed.' });
  }
});

const PORT = Number(process.env.PORT || 8080);
app.listen(PORT, () => {
  console.log(`platepost-ai listening on ${PORT}`);
});
