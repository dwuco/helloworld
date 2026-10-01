import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getKey, DIRS } from './settings.js';
import { probe } from './ffmpeg.js';
import { buildSceneAudio } from './audio.js';
import { VOICE_GAP, OUTRO } from '../public/shared/timeline.js';

const API = process.env.ELEVENLABS_API_URL || 'https://api.elevenlabs.io/v1';
const DEFAULT_MODEL = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
// Used if the account's model list can't be read.
const FALLBACK_MODELS = [
  { id: 'eleven_multilingual_v2', name: 'Multilingual v2', description: 'Most natural, best for narration' },
  { id: 'eleven_flash_v2_5', name: 'Flash v2.5', description: 'Fast and uses fewer credits' },
];

async function el(pathname, { key = getKey('elevenlabs'), ...init } = {}) {
  if (!key) throw new Error('Connect ElevenLabs first (Connections, top right).');
  const res = await fetch(`${API}${pathname}`, {
    ...init,
    headers: { 'xi-api-key': key, ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) {
    let detail = '';
    try {
      const j = await res.json();
      detail = j?.detail?.message || j?.detail?.status || (typeof j?.detail === 'string' ? j.detail : JSON.stringify(j.detail || j));
    } catch {
      /* not JSON */
    }
    if (res.status === 401) throw new Error(`ElevenLabs rejected the API key. ${detail}`.trim());
    throw new Error(`ElevenLabs error ${res.status}: ${detail || res.statusText}`);
  }
  return res;
}

export async function testElevenLabs(key) {
  await el('/voices', { key });
}

/** Who is connected and how many characters they have left. Restricted keys may hide some of this. */
export async function getAccount() {
  const out = { name: '', tier: '', used: null, limit: null, resetsAt: null };
  const [sub, user] = await Promise.allSettled([el('/user/subscription').then((r) => r.json()), el('/user').then((r) => r.json())]);
  if (sub.status === 'fulfilled') {
    const s = sub.value;
    Object.assign(out, { tier: s.tier || '', used: s.character_count ?? null, limit: s.character_limit ?? null, resetsAt: s.next_character_count_reset_unix ?? null });
  }
  if (user.status === 'fulfilled') {
    const u = user.value;
    out.name = u.first_name || u.name || '';
    if (!out.tier && u.subscription) Object.assign(out, { tier: u.subscription.tier || '', used: u.subscription.character_count ?? null, limit: u.subscription.character_limit ?? null });
  }
  return out;
}

/** Text-to-speech models this account can use. */
export async function listModels() {
  try {
    const res = await el('/models');
    const list = (await res.json()).filter((m) => m.can_do_text_to_speech);
    if (!list.length) return { models: FALLBACK_MODELS, defaultId: DEFAULT_MODEL };
    const models = list.map((m) => ({ id: m.model_id, name: m.name, description: (m.description || '').split('.')[0] }));
    const defaultId = models.some((m) => m.id === DEFAULT_MODEL) ? DEFAULT_MODEL : models[0].id;
    return { models, defaultId };
  } catch {
    return { models: FALLBACK_MODELS, defaultId: DEFAULT_MODEL };
  }
}

export async function listVoices() {
  const res = await el('/voices');
  const { voices = [] } = await res.json();
  return voices
    .map((v) => ({
      id: v.voice_id,
      name: v.name,
      previewUrl: v.preview_url,
      category: v.category,
      tags: [v.labels?.gender, v.labels?.accent, v.labels?.age, v.labels?.description || v.labels?.descriptive, v.labels?.use_case]
        .filter(Boolean)
        .slice(0, 4),
    }))
    .sort((a, b) => (a.category === 'premade') - (b.category === 'premade') || a.name.localeCompare(b.name));
}

// Request stitching (previous/next text) keeps the tone smooth across scenes; v3 models don't take it.
const supportsStitching = (modelId) => !/^eleven_v3/.test(modelId);

async function speak({ voiceId, modelId, text, previousText, nextText }) {
  const stitch = supportsStitching(modelId);
  const res = await el(`/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text,
      model_id: modelId,
      previous_text: (stitch && previousText) || undefined,
      next_text: (stitch && nextText) || undefined,
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });
  return Buffer.from(await res.arrayBuffer());
}

/**
 * One voice clip per scene: exact timing, and only changed scenes are regenerated.
 * reuse: segments from a previous run (kept if text + voice are unchanged).
 */
export async function generateVoiceover({ voiceId, modelId = DEFAULT_MODEL, scenes, reuse = [] }) {
  if (!voiceId) throw new Error('Pick a voice first.');
  modelId = String(modelId || DEFAULT_MODEL).replace(/[^\w.-]/g, '');
  const dir = path.join(DIRS.voice, voiceId.replace(/[^\w-]/g, ''));
  fs.mkdirSync(dir, { recursive: true });

  const segments = new Array(scenes.length);
  const todo = [];
  scenes.forEach((s, i) => {
    const text = s.text.trim();
    const old = reuse.find((g) => g.sceneId === s.id && g.text === text && g.voiceId === voiceId && (g.modelId || DEFAULT_MODEL) === modelId);
    if (old && fs.existsSync(path.join(DIRS.voice, old.file))) segments[i] = old;
    else todo.push(i);
  });

  // ElevenLabs free tier allows 2 requests at once.
  let next = 0;
  async function worker() {
    while (next < todo.length) {
      const i = todo[next++];
      const text = scenes[i].text.trim();
      const audio = await speak({ voiceId, modelId, text, previousText: scenes[i - 1]?.text, nextText: scenes[i + 1]?.text });
      const name = `${crypto.createHash('sha1').update(`${voiceId}|${modelId}|${text}`).digest('hex').slice(0, 16)}.mp3`;
      fs.writeFileSync(path.join(dir, name), audio);
      const { duration } = await probe(path.join(dir, name));
      segments[i] = { sceneId: scenes[i].id, text, voiceId, modelId, duration, file: path.relative(DIRS.voice, path.join(dir, name)).split(path.sep).join('/') };
    }
  }
  await Promise.all([worker(), worker()]);

  // A single preview track so the user can listen to the whole thing.
  const previewName = `preview-${crypto.randomBytes(6).toString('hex')}.mp3`;
  await buildSceneAudio(
    segments.map((g, i) => ({ file: path.join(DIRS.voice, g.file), duration: g.duration + VOICE_GAP + (i === segments.length - 1 ? OUTRO : 0) })),
    path.join(dir, previewName)
  );
  return { segments, previewUrl: `/files/voice/${path.basename(dir)}/${previewName}` };
}
