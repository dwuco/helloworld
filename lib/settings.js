import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
export const DIRS = {
  uploads: path.join(DATA_DIR, 'uploads'),
  voice: path.join(DATA_DIR, 'voice'),
  cache: path.join(DATA_DIR, 'cache'),
  jobs: path.join(DATA_DIR, 'jobs'),
  videos: path.join(DATA_DIR, 'videos'),
};
for (const dir of Object.values(DIRS)) fs.mkdirSync(dir, { recursive: true });

const FILE = path.join(DATA_DIR, 'settings.json');

// Environment variables work too, handy for servers.
const ENV = {
  elevenlabs: 'ELEVENLABS_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  pexels: 'PEXELS_API_KEY',
  pixabay: 'PIXABAY_API_KEY',
  fal: 'FAL_KEY',
};

let cache;
function load() {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    cache = {};
  }
  return cache;
}

function persist() {
  fs.writeFileSync(FILE, JSON.stringify(cache, null, 2), { mode: 0o600 });
}

export function getKey(name) {
  return load().keys?.[name] || process.env[ENV[name]] || '';
}

export function setKey(name, value) {
  const s = load();
  s.keys = { ...(s.keys || {}), [name]: value };
  if (!value) delete s.keys[name];
  persist();
}

export function getYouTube() {
  return load().youtube || {};
}

export function setYouTube(patch) {
  const s = load();
  s.youtube = { ...(s.youtube || {}), ...patch };
  persist();
}

const mask = (k) => (k ? `••••${k.slice(-4)}` : '');

/** What the browser is allowed to see: never the keys themselves. */
export function publicStatus() {
  const yt = getYouTube();
  const out = {};
  for (const name of Object.keys(ENV)) {
    const key = getKey(name);
    out[name] = { connected: !!key, hint: mask(key), fromEnv: !load().keys?.[name] && !!key };
  }
  out.openverse = { connected: true, hint: 'No key needed' };
  out.youtube = {
    configured: !!(yt.clientId && yt.clientSecret),
    connected: !!yt.tokens?.refresh_token,
    channel: yt.channel || '',
    hint: mask(yt.clientId),
  };
  return out;
}
