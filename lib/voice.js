import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getKey, DIRS } from './settings.js';
import { probe } from './ffmpeg.js';
import { buildSceneAudio } from './audio.js';
import { VOICE_GAP, OUTRO } from '../public/shared/timeline.js';

const API = process.env.ELEVENLABS_API_URL || 'https://api.elevenlabs.io/v1';
const MODEL = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';

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

async function speak({ voiceId, text, previousText, nextText }) {
  const res = await el(`/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text,
      model_id: MODEL,
      previous_text: previousText || undefined,
      next_text: nextText || undefined,
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });
  return Buffer.from(await res.arrayBuffer());
}

/**
 * One voice clip per scene: exact timing, and only changed scenes are regenerated.
 * reuse: segments from a previous run (kept if text + voice are unchanged).
 */
export async function generateVoiceover({ voiceId, scenes, reuse = [] }) {
  if (!voiceId) throw new Error('Pick a voice first.');
  const dir = path.join(DIRS.voice, voiceId.replace(/[^\w-]/g, ''));
  fs.mkdirSync(dir, { recursive: true });

  const segments = new Array(scenes.length);
  const todo = [];
  scenes.forEach((s, i) => {
    const text = s.text.trim();
    const old = reuse.find((g) => g.sceneId === s.id && g.text === text && g.voiceId === voiceId);
    if (old && fs.existsSync(path.join(DIRS.voice, old.file))) segments[i] = old;
    else todo.push(i);
  });

  // ElevenLabs free tier allows 2 requests at once.
  let next = 0;
  async function worker() {
    while (next < todo.length) {
      const i = todo[next++];
      const text = scenes[i].text.trim();
      const audio = await speak({ voiceId, text, previousText: scenes[i - 1]?.text, nextText: scenes[i + 1]?.text });
      const name = `${crypto.createHash('sha1').update(`${voiceId}|${MODEL}|${text}`).digest('hex').slice(0, 16)}.mp3`;
      fs.writeFileSync(path.join(dir, name), audio);
      const { duration } = await probe(path.join(dir, name));
      segments[i] = { sceneId: scenes[i].id, text, voiceId, duration, file: path.relative(DIRS.voice, path.join(dir, name)).split(path.sep).join('/') };
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
