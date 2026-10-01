import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getKey, DIRS } from './settings.js';
import { download } from './media.js';
import { probe } from './ffmpeg.js';

// AI images and video clips through fal.ai (one key, many models: FLUX, Kling, ...).
// Model ids can be changed with env vars when fal.ai publishes newer ones.
const FAL = process.env.FAL_API_URL || 'https://queue.fal.run';
export const IMAGE_MODEL = process.env.FAL_IMAGE_MODEL || 'fal-ai/flux/schnell';
export const VIDEO_MODEL = process.env.FAL_VIDEO_MODEL || 'fal-ai/kling-video/v2.1/standard/image-to-video';

export const STYLES = {
  stock: { name: 'Real footage', prompt: '' },
  cinematic: { name: 'Cinematic', prompt: 'cinematic film still, dramatic lighting, shallow depth of field, anamorphic 35mm, rich colour grading' },
  photoreal: { name: 'Photo-real', prompt: 'ultra realistic photograph, natural light, sharp detail, professional photography' },
  anime: { name: 'Anime', prompt: 'anime illustration, vibrant colours, detailed painted background, studio quality key visual' },
  '3d': { name: '3D cartoon', prompt: '3D animated film still, cute stylised characters, soft global illumination, playful' },
  storybook: { name: 'Storybook', prompt: "watercolour children's storybook illustration, soft textures, warm and whimsical" },
  comic: { name: 'Comic', prompt: 'comic book panel, bold ink lines, halftone shading, dynamic composition' },
  neon: { name: 'Neon', prompt: 'cyberpunk night scene, glowing neon lights, rain reflections, moody atmosphere' },
  product: { name: 'Product ad', prompt: 'clean commercial product photography, studio lighting, minimal background, premium feel' },
};

function key() {
  const k = getKey('fal');
  if (!k) throw new Error('Connect fal.ai first (Connections, top right) to generate AI images and clips.');
  return k;
}

async function falFetch(url, init = {}, k = key()) {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Key ${k}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
    signal: AbortSignal.timeout(60_000),
  });
  if (res.status === 401 || res.status === 403) throw new Error('fal.ai rejected the API key. Check it in Connections.');
  return res;
}

async function readError(res) {
  const j = await res.json().catch(() => ({}));
  const d = j.detail;
  const msg = Array.isArray(d) ? d.map((x) => x.msg || JSON.stringify(x)).join('; ') : d?.message || d || j.message || res.statusText;
  if (res.status === 402 || /balance|credit|billing/i.test(String(msg))) return 'Your fal.ai balance is empty. Add credit at fal.ai/dashboard/billing.';
  return `fal.ai error ${res.status}: ${msg}`;
}

/** Submit to the fal queue and wait for the result. */
async function falRun(model, input, { timeoutMs = 120_000, onStatus } = {}) {
  const submit = await falFetch(`${FAL}/${model}`, { method: 'POST', body: JSON.stringify(input) });
  if (!submit.ok) throw new Error(await readError(submit));
  const { request_id: id, status_url: statusUrl, response_url: responseUrl } = await submit.json();
  const base = `${FAL}/${model.split('/').slice(0, 2).join('/')}/requests/${id}`;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const st = await falFetch(statusUrl || `${base}/status`);
    if (!st.ok && st.status !== 202) throw new Error(await readError(st));
    const s = await st.json();
    onStatus?.(s);
    if (s.status === 'COMPLETED') {
      const out = await falFetch(responseUrl || base);
      if (!out.ok) throw new Error(await readError(out));
      return out.json();
    }
    if (s.status === 'FAILED' || s.error) throw new Error(`fal.ai could not make this: ${s.error || 'generation failed'}`);
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error('fal.ai took too long. Try again in a minute.');
}

export async function testFal(k) {
  if (!/^[\w-]{8,}:[\w-]{8,}$/.test(k)) throw new Error('fal.ai keys look like "abcd-1234…:5678efgh…". Copy the whole key.');
  // Asking for the status of a request that doesn't exist costs nothing: 401 means a bad key.
  await falFetch(`${FAL}/${IMAGE_MODEL}/requests/00000000-0000-0000-0000-000000000000/status`, {}, k);
}

export function buildPrompt({ prompt, style, character }) {
  const st = STYLES[style]?.prompt || STYLES.cinematic.prompt;
  const who = character?.trim() && !prompt.toLowerCase().includes(character.trim().toLowerCase().slice(0, 20)) ? ` The main character: ${character.trim()}.` : '';
  return `${prompt.trim()}.${who} ${st}. No text, no captions, no watermark.`.replace(/\.\./g, '.');
}

async function keepLocally(url, ext) {
  const tmp = await download(url);
  const name = `ai-${crypto.randomBytes(8).toString('hex')}${ext || path.extname(tmp) || ''}`;
  fs.copyFileSync(tmp, path.join(DIRS.uploads, name));
  return { name, file: path.join(DIRS.uploads, name) };
}

const IMAGE_SIZE = { landscape: 'landscape_16_9', portrait: 'portrait_16_9', square: 'square_hd' };

export async function generateImage({ prompt, style, character, format = 'landscape', seed }) {
  if (!prompt?.trim()) throw new Error('Describe what the picture should show.');
  const full = buildPrompt({ prompt, style, character });
  const out = await falRun(IMAGE_MODEL, {
    prompt: full,
    image_size: IMAGE_SIZE[format] || 'landscape_16_9',
    num_images: 1,
    enable_safety_checker: true,
    ...(Number.isInteger(seed) ? { seed } : {}),
  });
  const img = out.images?.[0];
  if (!img?.url) throw new Error('fal.ai returned no image. Try different words.');
  const { name } = await keepLocally(img.url);
  const url = `/files/uploads/${name}`;
  return {
    id: `ai-${name}`, source: 'ai', type: 'image', url, thumb: url, remoteUrl: img.url,
    width: img.width, height: img.height, prompt: prompt.trim(), credit: `AI image (${IMAGE_MODEL.split('/').slice(1).join(' ')})`,
  };
}

// --- Image -> video clips take minutes, so they run as background jobs ------------------

const jobs = new Map();

export function getAiJob(id) {
  return jobs.get(id) || null;
}

function imageAsUrl(item) {
  if (item.remoteUrl && /^https?:/.test(item.remoteUrl)) return item.remoteUrl;
  if (/^https?:/.test(item.url)) return item.url;
  // A local file (an upload): send it inline.
  const file = path.resolve(DIRS.uploads, path.basename(item.url || ''));
  if (!fs.existsSync(file)) throw new Error('That picture is missing. Pick it again.');
  const ext = path.extname(file).slice(1).toLowerCase().replace('jpg', 'jpeg') || 'jpeg';
  return `data:image/${ext};base64,${fs.readFileSync(file).toString('base64')}`;
}

export function startAnimate({ image, prompt, style, character, seconds = 5 }) {
  if (!image || image.type !== 'image') throw new Error('Pick a picture to animate first.');
  key();
  const id = crypto.randomBytes(8).toString('hex');
  const job = { id, status: 'running', message: 'Waiting in line at fal.ai…', startedAt: Date.now() };
  jobs.set(id, job);
  (async () => {
    const motion = `${(prompt || image.prompt || 'gentle natural movement').trim()}. Smooth cinematic camera movement, ${STYLES[style]?.name || 'cinematic'} look.`;
    const out = await falRun(
      VIDEO_MODEL,
      { prompt: buildPrompt({ prompt: motion, style, character }).slice(0, 2000), image_url: imageAsUrl(image), duration: seconds > 5 ? '10' : '5' },
      {
        timeoutMs: 15 * 60_000,
        onStatus: (s) => {
          job.message = s.status === 'IN_QUEUE' ? `Waiting in line at fal.ai${s.queue_position != null ? ` (position ${s.queue_position + 1})` : ''}…` : 'Animating your picture…';
        },
      }
    );
    const v = out.video || out.videos?.[0];
    if (!v?.url) throw new Error('fal.ai returned no video.');
    const { name, file } = await keepLocally(v.url, '.mp4');
    const info = await probe(file).catch(() => ({}));
    const url = `/files/uploads/${name}`;
    Object.assign(job, {
      status: 'done',
      message: 'Done',
      item: { id: `ai-${name}`, source: 'ai', type: 'video', url, thumb: image.thumb || image.url, duration: info.duration || seconds, width: info.width, height: info.height, credit: `AI video (${VIDEO_MODEL.split('/').slice(1, 2).join('')})` },
    });
  })().catch((err) => Object.assign(job, { status: 'error', error: err.message }));
  return id;
}
