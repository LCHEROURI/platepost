import express from 'express';
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

/**
 * PlatePost Meta service (Cloud Run, project platepost-e133a).
 *
 * Handles the Facebook/Instagram connect flow (OAuth) and Graph API publishing.
 * The Meta App ID/Secret come ONLY from Secret Manager via env vars — never code.
 * User access tokens never leave this service; only the long-lived Page token is
 * stored, in Firestore under `meta_connections/{uid}` (client SDK rules deny all
 * access to that collection — the blanket deny-all in firestore.rules covers it).
 */

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'platepost-e133a';
const META_APP_ID = process.env.META_APP_ID || null;
const META_APP_SECRET = process.env.META_APP_SECRET || null;
const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v22.0';
const SERVICE_URL = process.env.SERVICE_URL || 'https://platepost-meta-634241914382.us-central1.run.app';
const APP_ORIGIN = process.env.APP_ORIGIN || 'http://localhost:5173';
// Local testing only — never set this in Cloud Run.
const ALLOW_UNAUTH = process.env.ALLOW_UNAUTH === '1';

initializeApp({ projectId: PROJECT_ID, credential: applicationDefault() });
const db = getFirestore();

const app = express();
app.use(express.json({ limit: '64kb' }));

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

const META_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish',
].join(',');

const REDIRECT_URI = `${SERVICE_URL}/oauth/callback`;

async function verifyUser(req, res) {
  if (ALLOW_UNAUTH) return { uid: 'local-dev-user' };
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    res.status(401).json({ error: 'Missing credentials.' });
    return null;
  }
  try {
    return await getAuth().verifyIdToken(token);
  } catch {
    res.status(401).json({ error: 'Invalid credentials.' });
    return null;
  }
}

function requireConfigured(res) {
  if (!META_APP_ID || !META_APP_SECRET) {
    res.status(503).json({ error: 'Meta app is not configured yet (set META_APP_ID/META_APP_SECRET via Secret Manager).' });
    return false;
  }
  return true;
}

async function graphGet(path, accessToken) {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${path}${path.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error?.message || `Graph API ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

async function graphPost(path, body, accessToken) {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...body, access_token: accessToken }).toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error?.message || `Graph API ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

async function exchangeCodeForToken(code) {
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: META_APP_ID,
      client_secret: META_APP_SECRET,
      redirect_uri: REDIRECT_URI,
      code,
    }).toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(data?.error?.message || 'Token exchange failed');
  }
  return data.access_token;
}

async function fetchPages(userToken) {
  const data = await graphGet(
    'me/accounts?fields=name,access_token,instagram_business_account{id,username}',
    userToken,
  );
  return Array.isArray(data?.data) ? data.data : [];
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, configured: Boolean(META_APP_ID && META_APP_SECRET) });
});

/** Step 1 of the connect flow: returns the Meta authorize URL for the SPA to open. */
app.post('/oauth/init', async (req, res) => {
  if (!requireConfigured(res)) return;
  const user = await verifyUser(req, res);
  if (!user) return;

  const returnTo = typeof req.body?.returnTo === 'string' ? req.body.returnTo : `${APP_ORIGIN}/settings`;
  const state = `${user.uid}.${Date.now()}.${Math.random().toString(36).slice(2, 10)}`;
  await db.collection('meta_oauth_states').doc(state).set({
    uid: user.uid,
    returnTo,
    createdAt: Timestamp.now(),
  });

  const params = new URLSearchParams({
    client_id: META_APP_ID,
    redirect_uri: REDIRECT_URI,
    state,
    scope: META_SCOPES,
    response_type: 'code',
    display: 'popup',
  });
  res.json({ authorizeUrl: `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params}` });
});

/** Step 2: Meta redirects here after the owner approves. Exchanges code, stores Page token. */
app.get('/oauth/callback', async (req, res) => {
  const { code, state } = req.query;
  const fail = (message) => res.redirect(`${APP_ORIGIN}/settings?meta=error&msg=${encodeURIComponent(message)}`);

  if (!requireConfigured(res)) return fail('Meta app is not configured.');
  if (!code || !state) return fail('OAuth callback missing code or state.');

  const stateDoc = await db.collection('meta_oauth_states').doc(String(state)).get();
  if (!stateDoc.exists) return fail('OAuth state not found or expired.');
  const { uid, returnTo } = stateDoc.data();
  await stateDoc.ref.delete();

  try {
    const userToken = await exchangeCodeForToken(String(code));
    const pages = await fetchPages(userToken);
    if (pages.length === 0) return fail('No Facebook Pages found on your account. Create a Page first.');

    // Prefer a page that has a linked Instagram business account.
    const page =
      pages.find((p) => p?.instagram_business_account?.id) || pages[0];
    const ig = page.instagram_business_account || null;

    await db.collection('meta_connections').doc(uid).set({
      uid,
      pageId: page.id,
      pageName: page.name,
      pageToken: page.access_token,
      igUserId: ig?.id || null,
      igUsername: ig?.username || null,
      updatedAt: Timestamp.now(),
    });
    res.redirect(`${returnTo}?meta=connected`);
  } catch (err) {
    console.error('oauth callback error', err);
    fail(err instanceof Error ? err.message : 'Connection failed.');
  }
});

app.post('/disconnect', async (req, res) => {
  const user = await verifyUser(req, res);
  if (!user) return;
  await db.collection('meta_connections').doc(user.uid).delete();
  res.json({ ok: true });
});

app.get('/status', async (req, res) => {
  const user = await verifyUser(req, res);
  if (!user) return;
  const doc = await db.collection('meta_connections').doc(user.uid).get();
  if (!doc.exists) return res.json({ connected: false });
  const d = doc.data();
  res.json({
    connected: true,
    pageId: d.pageId,
    pageName: d.pageName,
    igUsername: d.igUsername,
  });
});

async function publishInstagram(connection, payload) {
  const { igUserId, pageToken } = connection;
  if (!igUserId) throw new Error('No Instagram business account linked to your Page.');
  if (!payload.mediaUrl) throw new Error('Instagram publishing requires an image or video URL.');
  const caption = `${payload.caption}${payload.hashtags.length ? '\n\n' + payload.hashtags.map((h) => `#${h}`).join(' ') : ''}`;
  const created = await graphPost(
    `${igUserId}/media`,
    { image_url: payload.mediaUrl, caption },
    pageToken,
  );
  const creationId = created?.id;
  if (!creationId) throw new Error('Instagram did not return a creation id.');
  // Container must reach FINISHED before publishing.
  let statusCode = '';
  for (let i = 0; i < 15; i++) {
    const check = await graphGet(`${creationId}?fields=status_code`, pageToken);
    statusCode = check?.status_code || '';
    if (statusCode === 'FINISHED') break;
    if (statusCode === 'ERROR') throw new Error('Instagram media container failed.');
    await new Promise((r) => setTimeout(r, 2000));
  }
  if (statusCode !== 'FINISHED') throw new Error('Instagram media container timed out.');
  const published = await graphPost(`${igUserId}/media_publish`, { creation_id: creationId }, pageToken);
  return { platformPostId: published?.id || null };
}

async function publishFacebook(connection, payload) {
  const { pageId, pageToken } = connection;
  const caption = `${payload.caption}${payload.hashtags.length ? '\n\n' + payload.hashtags.map((h) => `#${h}`).join(' ') : ''}`;
  const published = payload.mediaUrl
    ? await graphPost(`${pageId}/photos`, { url: payload.mediaUrl, caption }, pageToken)
    : await graphPost(`${pageId}/feed`, { message: caption }, pageToken);
  return { platformPostId: published?.id || published?.post_id || null };
}

app.post('/publish', async (req, res) => {
  if (!requireConfigured(res)) return;
  const user = await verifyUser(req, res);
  if (!user) return;

  const doc = await db.collection('meta_connections').doc(user.uid).get();
  if (!doc.exists) {
    return res.status(400).json({ error: 'No connected Meta accounts. Connect your Page in Settings first.' });
  }
  const connection = doc.data();
  const { caption = '', hashtags = [], mediaUrl = null, platforms = [] } = req.body || {};

  const results = [];
  for (const platform of platforms) {
    try {
      const outcome =
        platform === 'instagram'
          ? await publishInstagram(connection, { caption, hashtags, mediaUrl })
          : await publishFacebook(connection, { caption, hashtags, mediaUrl });
      results.push({ platform, ok: true, platformPostId: outcome.platformPostId });
    } catch (err) {
      results.push({ platform, ok: false, error: err instanceof Error ? err.message : 'Publish failed' });
    }
  }
  res.json({ results });
});

app.get('/insights', async (req, res) => {
  if (!requireConfigured(res)) return;
  const user = await verifyUser(req, res);
  if (!user) return;

  const doc = await db.collection('meta_connections').doc(user.uid).get();
  if (!doc.exists) {
    return res.status(400).json({ error: 'No connected Meta accounts.' });
  }
  const connection = doc.data();
  try {
    const page = await graphGet(
      `${connection.pageId}?fields=fan_count,followers_count,name`,
      connection.pageToken,
    );
    const engaged = await graphGet(
      `${connection.pageId}/insights?metric=page_engaged_users,page_impressions&period=day`,
      connection.pageToken,
    );
    const sumMetric = (name) =>
      (engaged?.data || [])
        .filter((row) => row.name === name)
        .flatMap((row) => (row.values || []).map((v) => v.value || 0))
        .reduce((a, b) => a + b, 0);

    let igFollowers = null;
    if (connection.igUserId) {
      try {
        const ig = await graphGet(
          `${connection.igUserId}?fields=followers_count,media_count`,
          connection.pageToken,
        );
        igFollowers = ig?.followers_count ?? null;
      } catch {
        igFollowers = null;
      }
    }

    res.json({
      pageName: page?.name || connection.pageName,
      followers: { instagram: igFollowers, facebook: page?.followers_count ?? page?.fan_count ?? null },
      engagementLast7d: Math.round(sumMetric('page_engaged_users')),
      impressionsLast7d: Math.round(sumMetric('page_impressions')),
    });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Insights unavailable.' });
  }
});

const PORT = Number(process.env.PORT || 8080);
app.listen(PORT, () => {
  console.log(`platepost-meta listening on ${PORT} (configured: ${Boolean(META_APP_ID && META_APP_SECRET)})`);
});
