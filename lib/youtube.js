import fs from 'node:fs';
import crypto from 'node:crypto';
import { getYouTube, setYouTube } from './settings.js';

const SCOPE = 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly';
let pendingState = null;

export function redirectUri(req) {
  return `${req.protocol}://${req.get('host')}/api/youtube/callback`;
}

export function authUrl(req) {
  const { clientId } = getYouTube();
  if (!clientId) throw new Error('Add your Google OAuth Client ID and secret first.');
  pendingState = crypto.randomBytes(16).toString('hex');
  const q = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(req),
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state: pendingState,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

async function tokenRequest(params) {
  const { clientId, clientSecret } = getYouTube();
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, ...params }),
    signal: AbortSignal.timeout(30_000),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`Google sign-in failed: ${j.error_description || j.error || res.status}`);
  return j;
}

export async function handleCallback(req) {
  if (req.query.error) throw new Error(`Google said: ${req.query.error}`);
  if (!pendingState || req.query.state !== pendingState) throw new Error('Sign-in expired. Please click Connect YouTube again.');
  pendingState = null;
  const t = await tokenRequest({ code: String(req.query.code), grant_type: 'authorization_code', redirect_uri: redirectUri(req) });
  const tokens = { access_token: t.access_token, refresh_token: t.refresh_token || getYouTube().tokens?.refresh_token, expires_at: Date.now() + (t.expires_in - 60) * 1000 };
  setYouTube({ tokens });
  try {
    const res = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', { headers: { Authorization: `Bearer ${tokens.access_token}` } });
    const j = await res.json();
    setYouTube({ channel: j.items?.[0]?.snippet?.title || '' });
  } catch {
    /* channel name is just a nicety */
  }
}

async function accessToken() {
  const { tokens } = getYouTube();
  if (!tokens?.refresh_token) throw new Error('Connect your YouTube account first.');
  if (tokens.access_token && tokens.expires_at > Date.now()) return tokens.access_token;
  const t = await tokenRequest({ refresh_token: tokens.refresh_token, grant_type: 'refresh_token' });
  setYouTube({ tokens: { ...tokens, access_token: t.access_token, expires_at: Date.now() + (t.expires_in - 60) * 1000 } });
  return t.access_token;
}

export function disconnect() {
  setYouTube({ tokens: null, channel: '' });
}

export async function upload({ file, title, description, tags, privacy }) {
  const token = await accessToken();
  const size = fs.statSync(file).size;
  const meta = {
    snippet: {
      title: (title || 'My video').replace(/[<>]/g, '').slice(0, 100),
      description: (description || '').replace(/[<>]/g, '').slice(0, 4900),
      tags: (tags || []).map((t) => t.replace(/^#/, '')).filter(Boolean).slice(0, 15),
      categoryId: '22',
    },
    status: { privacyStatus: ['public', 'unlisted', 'private'].includes(privacy) ? privacy : 'private', selfDeclaredMadeForKids: false },
  };
  const init = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': 'video/mp4',
      'X-Upload-Content-Length': String(size),
    },
    body: JSON.stringify(meta),
  });
  if (!init.ok) {
    const j = await init.json().catch(() => ({}));
    throw new Error(`YouTube refused the upload: ${j.error?.message || init.status}`);
  }
  const location = init.headers.get('location');
  const put = await fetch(location, { method: 'PUT', headers: { 'Content-Type': 'video/mp4' }, body: fs.readFileSync(file) });
  const j = await put.json().catch(() => ({}));
  if (!put.ok) throw new Error(`YouTube upload failed: ${j.error?.message || put.status}`);
  return { id: j.id, url: `https://youtu.be/${j.id}`, studioUrl: `https://studio.youtube.com/video/${j.id}/edit` };
}
