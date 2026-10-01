import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DIRS, ROOT } from './settings.js';
import { ffmpeg, probe, ffmpegCapabilities } from './ffmpeg.js';
import { resolveMediaFile } from './media.js';
import { buildSceneAudio, buildUploadedAudio, buildSilence } from './audio.js';
import { computeTimeline, staleVoiceScenes, FORMATS, FPS } from '../public/shared/timeline.js';

const jobs = new Map();
const FONT = path.join(ROOT, 'assets', 'fonts', 'Montserrat-ExtraBold.ttf');
const BACKDROPS = ['0x1e1b4b', '0x0f172a', '0x3b0764', '0x042f2e', '0x431407'];

export function getJob(id) {
  const j = jobs.get(id);
  if (!j) return null;
  const { project, ...pub } = j;
  return pub;
}

export function startRender(project) {
  validate(project);
  const id = crypto.randomBytes(8).toString('hex');
  const job = { id, status: 'running', progress: 0, message: 'Getting ready…', warnings: [], startedAt: Date.now(), project };
  jobs.set(id, job);
  runJob(job).catch((err) => {
    console.error('[render]', err);
    job.status = 'error';
    job.error = err.message;
  });
  return id;
}

function validate(p) {
  if (!p || !Array.isArray(p.scenes) || !p.scenes.length) throw new Error('Your video needs at least one scene.');
  if (!FORMATS[p.format]) throw new Error('Unknown video format.');
  if (p.scenes.some((s) => typeof s.text !== 'string' || !s.id)) throw new Error('Scenes are malformed.');
  if (p.voice?.mode === 'elevenlabs' && staleVoiceScenes(p.scenes, p.voice).length) {
    throw new Error('The script changed after the voiceover was made. Go back to the Voice step and regenerate it.');
  }
  if (p.voice?.mode === 'upload' && !(p.voice.duration > 0)) throw new Error('Upload your voiceover file first.');
}

const set = (job, progress, message) => Object.assign(job, { progress: Math.round(progress), message });

async function runJob(job) {
  const p = job.project;
  const { w: W, h: H } = FORMATS[p.format];
  const caps = await ffmpegCapabilities();
  if (!caps.ok) throw new Error(caps.error);
  const captions = p.captions !== false && caps.captions;
  if (p.captions !== false && !caps.captions) job.warnings.push('Captions were skipped: this ffmpeg build has no subtitle support.');

  const dir = path.join(DIRS.jobs, job.id);
  fs.mkdirSync(path.join(dir, 'fonts'), { recursive: true });
  fs.copyFileSync(FONT, path.join(dir, 'fonts', path.basename(FONT)));

  const { items: timeline, total } = computeTimeline(p.scenes, p.voice);
  const n = p.scenes.length;

  // 1. Visuals ---------------------------------------------------------------
  const media = [];
  for (let i = 0; i < n; i++) {
    set(job, 2 + (18 * i) / n, `Downloading visuals (${i + 1} of ${n})…`);
    const item = p.scenes[i].media;
    let file = null;
    try {
      file = await resolveMediaFile(item);
    } catch (err) {
      job.warnings.push(`Scene ${i + 1}: could not download its visual (${err.message}), used a plain background instead.`);
    }
    let info = null;
    if (file) {
      try {
        info = await probe(file);
        if (!info.hasVideo) throw new Error('not an image or video');
      } catch {
        job.warnings.push(`Scene ${i + 1}: the visual could not be read, used a plain background instead.`);
        file = null;
      }
    }
    // Images report a tiny duration; anything under ~1s is treated as a still.
    const isVideo = !!file && item?.type !== 'image' && info.duration > 1;
    media.push({ file, isVideo });
  }

  // 2. Voiceover -------------------------------------------------------------
  set(job, 21, 'Mixing the voiceover…');
  const audio = path.join(dir, 'audio.m4a');
  const v = p.voice || { mode: 'none' };
  if (v.mode === 'elevenlabs') {
    const pieces = p.scenes.map((s, i) => {
      const seg = v.segments.find((g) => g.sceneId === s.id);
      const file = seg && path.resolve(DIRS.voice, seg.file);
      return { file: file && file.startsWith(DIRS.voice + path.sep) && fs.existsSync(file) ? file : null, duration: timeline[i].duration };
    });
    if (pieces.some((x) => !x.file)) throw new Error('Some voiceover clips are missing. Regenerate the voiceover on the Voice step.');
    await buildSceneAudio(pieces, audio);
  } else if (v.mode === 'upload') {
    const file = path.resolve(DIRS.uploads, path.basename(v.file || ''));
    if (!fs.existsSync(file)) throw new Error('The uploaded voiceover file is missing. Upload it again on the Voice step.');
    await buildUploadedAudio(file, total, audio);
  } else {
    await buildSilence(total, audio);
  }

  // 3. Scenes ----------------------------------------------------------------
  const list = [];
  for (let i = 0; i < n; i++) {
    set(job, 25 + (67 * i) / n, `Rendering scene ${i + 1} of ${n}…`);
    const seg = `seg${String(i).padStart(3, '0')}.mp4`;
    let sub = '';
    if (captions && p.scenes[i].text.trim()) {
      const assName = `cap${i}.ass`;
      fs.writeFileSync(path.join(dir, assName), captionFile(p.scenes[i].text, timeline[i].duration, p.format, W, H));
      sub = `,subtitles=${assName}:fontsdir=fonts`;
    }
    await renderScene({ dir, out: seg, media: media[i], frames: timeline[i].frames, W, H, index: i, sub });
    list.push(`file '${seg}'`);
  }

  // 4. Join + mux ------------------------------------------------------------
  set(job, 93, 'Putting it all together…');
  fs.writeFileSync(path.join(dir, 'list.txt'), list.join('\n'));
  const slug = (p.title || 'video').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'video';
  const fileName = `${slug}-${job.id.slice(0, 6)}.mp4`;
  const out = path.join(DIRS.videos, fileName);
  await ffmpeg(['-f', 'concat', '-safe', '0', '-i', 'list.txt', '-i', 'audio.m4a', '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'copy', '-shortest', '-movflags', '+faststart', out], { cwd: dir });

  // Thumbnail from 1/3 of the way in.
  const thumbName = fileName.replace(/\.mp4$/, '.jpg');
  await ffmpeg(['-ss', (total / 3).toFixed(2), '-i', out, '-frames:v', '1', '-vf', 'scale=640:-2', '-update', '1', path.join(DIRS.videos, thumbName)]).catch(() => {});

  const meta = {
    id: fileName.replace(/\.mp4$/, ''),
    file: fileName,
    title: p.title || 'Untitled video',
    description: p.description || '',
    hashtags: p.hashtags || [],
    credits: credits(p.scenes),
    format: p.format,
    duration: total,
    createdAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(DIRS.videos, `${meta.id}.json`), JSON.stringify(meta, null, 2));
  fs.rmSync(dir, { recursive: true, force: true });

  Object.assign(job, {
    status: 'done', progress: 100, message: 'Your video is ready!',
    video: { ...meta, url: `/files/videos/${fileName}`, thumb: `/files/videos/${thumbName}` },
    seconds: Math.round((Date.now() - job.startedAt) / 1000),
  });
}

async function renderScene({ dir, out, media, frames, W, H, index, sub }) {
  const dur = (frames / FPS).toFixed(3);
  const enc = ['-an', '-frames:v', String(frames), '-r', String(FPS), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p', out];
  const fit = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1`;

  if (media.file && media.isVideo) {
    // Loops short clips so they always fill the scene.
    await ffmpeg(['-stream_loop', '-1', '-i', media.file, '-t', dur, '-vf', `${fit},fps=${FPS}${sub},format=yuv420p`, ...enc], { cwd: dir });
  } else if (media.file) {
    // Slow "Ken Burns" zoom so photos don't feel static. Alternate in/out.
    const bw = Math.round(W * 1.25 / 2) * 2;
    const bh = Math.round(H * 1.25 / 2) * 2;
    const z = index % 2 === 0 ? `1+0.12*on/${frames}` : `1.12-0.12*on/${frames}`;
    const zoom = `scale=${bw}:${bh}:force_original_aspect_ratio=increase,crop=${bw}:${bh},zoompan=z='${z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${W}x${H}:fps=${FPS},setsar=1`;
    await ffmpeg(['-loop', '1', '-framerate', String(FPS), '-i', media.file, '-vf', `${zoom}${sub},format=yuv420p`, ...enc], { cwd: dir });
  } else {
    const c1 = BACKDROPS[index % BACKDROPS.length];
    const c2 = BACKDROPS[(index + 2) % BACKDROPS.length];
    await ffmpeg(['-f', 'lavfi', '-i', `gradients=s=${W}x${H}:c0=${c1}:c1=${c2}:x0=0:y0=0:x1=${W}:y1=${H}:speed=0.01:r=${FPS}`, '-vf', `setsar=1${sub},format=yuv420p`, ...enc], { cwd: dir }).catch(() =>
      ffmpeg(['-f', 'lavfi', '-i', `color=c=${c1}:s=${W}x${H}:r=${FPS}`, '-vf', `setsar=1${sub},format=yuv420p`, ...enc], { cwd: dir })
    );
  }
}

// --- Captions ----------------------------------------------------------------

function assTime(t) {
  const cs = Math.max(0, Math.round(t * 100));
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs % 100).padStart(2, '0')}`;
}

/** Short, punchy caption chunks timed across the scene. */
export function captionFile(text, duration, format, W, H) {
  const perChunk = format === 'landscape' ? 7 : 4;
  const size = format === 'landscape' ? 84 : format === 'portrait' ? 92 : 80;
  const marginV = format === 'portrait' ? Math.round(H * 0.24) : Math.round(H * 0.1);
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const chunks = [];
  for (let i = 0; i < words.length; ) {
    let end = Math.min(words.length, i + perChunk);
    // Prefer to break right after punctuation.
    for (let j = i + 1; j < end; j++) if (/[,.!?;:]$/.test(words[j - 1]) && j - i >= 2) { end = j; break; }
    chunks.push(words.slice(i, end).join(' '));
    i = end;
  }
  const weights = chunks.map((c) => c.length + 4);
  const sum = weights.reduce((a, b) => a + b, 0);
  const usable = Math.max(0.5, duration - 0.15);
  let t = 0;
  const events = chunks.map((c, i) => {
    const d = (usable * weights[i]) / sum;
    const line = `Dialogue: 0,${assTime(t)},${assTime(t + d)},Cap,,0,0,0,,${c.replace(/[{}\\]/g, '')}`;
    t += d;
    return line;
  });
  return `[Script Info]
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Montserrat ExtraBold,${size},&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,0,0,0,0,100,100,0,0,1,6,3,2,${Math.round(W * 0.08)},${Math.round(W * 0.08)},${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events.join('\n')}
`;
}

export function credits(scenes) {
  const seen = new Set();
  return scenes
    .map((s) => s.media)
    .filter((m) => m && m.source !== 'upload' && m.credit)
    .filter((m) => !seen.has(m.credit) && seen.add(m.credit))
    .map((m) => (m.pageUrl ? `${m.credit} (${m.pageUrl})` : m.credit));
}

export function listVideos() {
  return fs
    .readdirSync(DIRS.videos)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      try {
        const m = JSON.parse(fs.readFileSync(path.join(DIRS.videos, f), 'utf8'));
        if (!fs.existsSync(path.join(DIRS.videos, m.file))) return null;
        return { ...m, url: `/files/videos/${m.file}`, thumb: `/files/videos/${m.file.replace(/\.mp4$/, '.jpg')}` };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function deleteVideo(id) {
  const safe = path.basename(id);
  for (const ext of ['.mp4', '.jpg', '.json']) fs.rmSync(path.join(DIRS.videos, safe + ext), { force: true });
}

export function videoFile(id) {
  const file = path.join(DIRS.videos, `${path.basename(id)}.mp4`);
  return fs.existsSync(file) ? file : null;
}
