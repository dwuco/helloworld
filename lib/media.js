import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { getKey, DIRS, DATA_DIR } from './settings.js';

const UA = 'AI-Video-Studio/1.0 (+https://github.com)';
const TIMEOUT = 20_000;

async function getJSON(url, headers = {}, keyed = true) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, ...headers }, signal: AbortSignal.timeout(TIMEOUT) });
  if (res.status === 401 || res.status === 403) throw new Error(keyed ? 'API key was rejected' : `access was blocked (HTTP ${res.status}), check your internet connection`);
  if (res.status === 429) throw new Error('rate limited, try again in a minute');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const LONG_SIDE = 1920;

function pickPexelsFile(files, format) {
  const mp4 = files.filter((f) => f.file_type === 'video/mp4' && f.width && f.height);
  const long = (f) => Math.max(f.width, f.height);
  // Big enough for 1080p, but avoid 4K downloads.
  const good = mp4.filter((f) => long(f) >= 1280 && long(f) <= 2560).sort((a, b) => long(b) - long(a));
  return good[0] || mp4.sort((a, b) => Math.abs(long(a) - LONG_SIDE) - Math.abs(long(b) - LONG_SIDE))[0];
}

const orient = {
  pexels: { landscape: 'landscape', portrait: 'portrait', square: 'square' },
  pixabay: { landscape: 'horizontal', portrait: 'vertical', square: 'all' },
  openverse: { landscape: 'wide', portrait: 'tall', square: 'square' },
};

async function pexelsVideos(q, format, key) {
  const j = await getJSON(`https://api.pexels.com/videos/search?query=${encodeURIComponent(q)}&per_page=12&orientation=${orient.pexels[format]}`, { Authorization: key });
  return (j.videos || []).map((v) => {
    const f = pickPexelsFile(v.video_files || [], format);
    return f && {
      id: `pexels-v-${v.id}`, source: 'pexels', type: 'video', url: f.link, thumb: v.image, width: f.width, height: f.height, duration: v.duration,
      credit: `Video by ${v.user?.name || 'unknown'} on Pexels`, pageUrl: v.url, license: 'Pexels License',
    };
  }).filter(Boolean);
}

async function pexelsPhotos(q, format, key) {
  const j = await getJSON(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=12&orientation=${orient.pexels[format]}`, { Authorization: key });
  return (j.photos || []).map((p) => ({
    id: `pexels-p-${p.id}`, source: 'pexels', type: 'image', url: p.src.large2x || p.src.original, thumb: p.src.medium, width: p.width, height: p.height,
    credit: `Photo by ${p.photographer} on Pexels`, pageUrl: p.url, license: 'Pexels License',
  }));
}

async function pixabayVideos(q, format, key) {
  const j = await getJSON(`https://pixabay.com/api/videos/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(q.slice(0, 100))}&per_page=12&safesearch=true`);
  return (j.hits || []).map((v) => {
    const f = [v.videos?.large, v.videos?.medium, v.videos?.small].find((x) => x?.url);
    if (!f) return null;
    const thumb = v.videos?.medium?.thumbnail || v.videos?.small?.thumbnail || v.videos?.tiny?.thumbnail || '';
    return {
      id: `pixabay-v-${v.id}`, source: 'pixabay', type: 'video', url: f.url, thumb, width: f.width, height: f.height, duration: v.duration,
      credit: `Video by ${v.user} on Pixabay`, pageUrl: v.pageURL, license: 'Pixabay Content License',
    };
  }).filter(Boolean).filter((v) => format === 'square' || (format === 'portrait') === (v.height > v.width));
}

async function pixabayPhotos(q, format, key) {
  const j = await getJSON(`https://pixabay.com/api/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(q.slice(0, 100))}&per_page=12&image_type=photo&safesearch=true&orientation=${orient.pixabay[format]}`);
  return (j.hits || []).map((p) => ({
    id: `pixabay-p-${p.id}`, source: 'pixabay', type: 'image', url: p.largeImageURL, thumb: p.webformatURL, width: p.imageWidth, height: p.imageHeight,
    credit: `Image by ${p.user} on Pixabay`, pageUrl: p.pageURL, license: 'Pixabay Content License',
  }));
}

async function openverse(q, format) {
  const base = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=12&license_type=commercial,modification&mature=false`;
  let j = await getJSON(`${base}&size=large&aspect_ratio=${orient.openverse[format]}`, {}, false);
  if (!j.results?.length) j = await getJSON(base, {}, false);
  return (j.results || []).map((r) => ({
    id: `openverse-${r.id}`, source: 'openverse', type: 'image', url: r.url, thumb: r.thumbnail || r.url, width: r.width, height: r.height,
    fallbackUrl: r.thumbnail,
    credit: `"${(r.title || 'Untitled').slice(0, 80)}" by ${r.creator || 'unknown'}, ${r.license === 'cc0' ? 'CC0' : `CC ${String(r.license).toUpperCase()} ${r.license_version || ''}`.trim()}`,
    pageUrl: r.foreign_landing_url, license: r.license_url || r.license,
  }));
}

export function sourcesAvailable() {
  return {
    pexels: !!getKey('pexels'),
    pixabay: !!getKey('pixabay'),
    openverse: true,
  };
}

/** Search every connected free library. Videos first, sources interleaved. */
export async function searchMedia({ q, format = 'landscape', kind = 'any' }) {
  q = (q || '').trim() || 'nature';
  const pexels = getKey('pexels');
  const pixabay = getKey('pixabay');
  const tasks = [];
  if (kind !== 'image') {
    if (pexels) tasks.push(['Pexels videos', pexelsVideos(q, format, pexels)]);
    if (pixabay) tasks.push(['Pixabay videos', pixabayVideos(q, format, pixabay)]);
  }
  if (kind !== 'video') {
    if (pexels) tasks.push(['Pexels photos', pexelsPhotos(q, format, pexels)]);
    if (pixabay) tasks.push(['Pixabay photos', pixabayPhotos(q, format, pixabay)]);
    if (!pexels && !pixabay) tasks.push(['Openverse', openverse(q, format)]);
  }
  const settled = await Promise.allSettled(tasks.map(([, p]) => p));
  const errors = [];
  const lists = { video: [], image: [] };
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      const list = r.value;
      if (list.length) lists[list[0].type].push(list);
    } else errors.push(`${tasks[i][0]}: ${r.reason?.message || r.reason}`);
  });
  const interleave = (groups) => {
    const out = [];
    for (let i = 0; groups.some((g) => i < g.length); i++) groups.forEach((g) => g[i] && out.push(g[i]));
    return out;
  };
  return { items: [...interleave(lists.video), ...interleave(lists.image)], errors };
}

export async function testPexels(key) {
  await getJSON('https://api.pexels.com/v1/search?query=ocean&per_page=1', { Authorization: key });
}
export async function testPixabay(key) {
  await getJSON(`https://pixabay.com/api/?key=${encodeURIComponent(key)}&q=ocean&per_page=3`);
}

// ---------------------------------------------------------------------------
// Downloading (with a local cache so re-renders are fast)

const EXT = { 'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov', 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
const MAX_BYTES = 400 * 1024 * 1024;

export async function download(url) {
  const hash = crypto.createHash('sha1').update(url).digest('hex');
  const existing = fs.readdirSync(DIRS.cache).find((f) => f.startsWith(hash));
  if (existing) return path.join(DIRS.cache, existing);

  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(120_000), redirect: 'follow' });
  if (!res.ok || !res.body) throw new Error(`download failed (HTTP ${res.status})`);
  if (Number(res.headers.get('content-length')) > MAX_BYTES) throw new Error('file is too large');
  const type = (res.headers.get('content-type') || '').split(';')[0].trim();
  const ext = EXT[type] || path.extname(new URL(url).pathname).slice(0, 6) || '.bin';
  const tmp = path.join(DIRS.cache, `${hash}.part`);
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(tmp));
  const final = path.join(DIRS.cache, `${hash}${ext}`);
  fs.renameSync(tmp, final);
  return final;
}

/** Turn a media item into a file on disk: local upload or a downloaded copy. */
export async function resolveMediaFile(item) {
  if (!item?.url) return null;
  if (item.url.startsWith('/files/')) {
    const local = path.resolve(DATA_DIR, decodeURIComponent(item.url.slice('/files/'.length)));
    if (!local.startsWith(DIRS.uploads + path.sep) || !fs.existsSync(local)) return null;
    return local;
  }
  if (!/^https?:\/\//.test(item.url)) return null;
  try {
    return await download(item.url);
  } catch (err) {
    if (item.fallbackUrl) return download(item.fallbackUrl);
    throw err;
  }
}
