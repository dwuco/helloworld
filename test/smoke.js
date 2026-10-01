// End-to-end smoke test that needs no internet or API keys.
// Starts a mock ElevenLabs API + the app, then runs every step and renders real videos.
import { spawn, execFileSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { FFMPEG, FFPROBE } from '../lib/ffmpeg.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'avs-'));
const PORT = 3999;
const MOCK = 3998;
const base = `http://127.0.0.1:${PORT}`;

const ff = (...a) => execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...a]);
ff('-f', 'lavfi', '-i', 'sine=frequency=440:duration=1.2', path.join(tmp, 'tone.mp3'));
ff('-f', 'lavfi', '-i', 'sine=frequency=330:duration=9', path.join(tmp, 'voice.wav'));
ff('-f', 'lavfi', '-i', 'testsrc2=s=1280x720:d=1', '-frames:v', '1', path.join(tmp, 'photo.jpg'));
ff('-f', 'lavfi', '-i', 'testsrc=s=1280x720:d=2:r=25', '-pix_fmt', 'yuv420p', path.join(tmp, 'clip.mp4'));

// Mock ElevenLabs: /voices, /user, /user/subscription, /models and /text-to-speech/:id
const ttsModels = [];
const json = (res, body) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
const mock = http.createServer((req, res) => {
  if (req.headers['xi-api-key'] !== 'test-key') { res.writeHead(401, { 'Content-Type': 'application/json' }); return res.end('{"detail":{"message":"bad key"}}'); }
  if (req.url.startsWith('/voices')) {
    return json(res, { voices: [
      { voice_id: 'v1', name: 'Rachel', category: 'premade', labels: { gender: 'female', accent: 'american' }, preview_url: '' },
      { voice_id: 'mine', name: 'My Clone', category: 'cloned', labels: {}, preview_url: '' },
    ] });
  }
  if (req.url === '/user/subscription') return json(res, { tier: 'creator', character_count: 1200, character_limit: 100000, next_character_count_reset_unix: 1800000000 });
  if (req.url === '/user') return json(res, { first_name: 'Sam', subscription: { tier: 'creator' } });
  if (req.url === '/models') return json(res, [
    { model_id: 'eleven_multilingual_v2', name: 'Eleven Multilingual v2', can_do_text_to_speech: true, description: 'Our most life-like model. Great for narration.' },
    { model_id: 'eleven_flash_v2_5', name: 'Eleven Flash v2.5', can_do_text_to_speech: true, description: 'Ultra low latency.' },
    { model_id: 'eleven_english_sts_v2', name: 'Speech to speech', can_do_text_to_speech: false },
  ]);
  if (req.url.startsWith('/text-to-speech/v1')) {
    let body = '';
    req.on('data', (d) => (body += d));
    req.on('end', () => {
      const j = JSON.parse(body);
      if (!j.text || !j.model_id) { res.writeHead(400); return res.end('{}'); }
      ttsModels.push(j.model_id);
      res.writeHead(200, { 'Content-Type': 'audio/mpeg' });
      res.end(fs.readFileSync(path.join(tmp, 'tone.mp3')));
    });
    return;
  }
  res.writeHead(404).end();
}).listen(MOCK);

const app = spawn(process.execPath, ['server.js'], {
  env: { ...process.env, PORT: String(PORT), DATA_DIR: path.join(tmp, 'data'), ELEVENLABS_API_URL: `http://127.0.0.1:${MOCK}`, ANTHROPIC_API_KEY: '', ELEVENLABS_API_KEY: '', PEXELS_API_KEY: '', PIXABAY_API_KEY: '' },
  stdio: ['ignore', 'pipe', 'inherit'],
});
await new Promise((r) => app.stdout.on('data', (d) => d.toString().includes('running') && r()));

async function call(url, opts = {}) {
  const init = opts.json ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(opts.json) } : opts;
  const res = await fetch(base + url, init);
  const data = await res.json();
  if (!res.ok) throw new Error(`${url}: ${data.error}`);
  return data;
}
async function uploadFile(url, file) {
  const fd = new FormData();
  fd.append('file', new Blob([fs.readFileSync(file)]), path.basename(file));
  return call(url, { method: 'POST', body: fd });
}
const check = (cond, msg) => { if (!cond) throw new Error(`FAILED: ${msg}`); console.log(`  ✓ ${msg}`); };

async function renderAndCheck(project, label) {
  const { jobId } = await call('/api/render', { json: { project } });
  let job;
  for (let i = 0; i < 300; i++) {
    job = await call(`/api/render/${jobId}`);
    if (job.status !== 'running') break;
    await new Promise((r) => setTimeout(r, 500));
  }
  if (job.status !== 'done') throw new Error(`${label} render failed: ${job.error}`);
  const out = path.join(tmp, 'data', 'videos', job.video.file);
  const probe = JSON.parse(execFileSync(FFPROBE, ['-v', 'error', '-show_entries', 'stream=codec_type,width,height:format=duration', '-of', 'json', out], { encoding: 'utf8' }));
  return { job, probe, out };
}

try {
  console.log('Status');
  const status = await call('/api/status');
  check(status.ffmpeg.ok, `ffmpeg found (${status.ffmpeg.version.split(' ').slice(0, 3).join(' ')})`);
  check(status.connections.openverse.connected, 'Openverse is on by default');

  console.log('Script (starter template, no AI key)');
  const script = await call('/api/script', { json: { topic: '5 surprising facts about octopuses', lengthSec: 30, format: 'landscape' } });
  check(script.writer === 'basic' && script.scenes.length >= 4, `got ${script.scenes.length} scenes`);
  check(script.scenes.every((s) => s.text && s.keywords), 'every scene has text + visual keywords');
  const own = await call('/api/script', { json: { script: 'Octopuses have three hearts. Two pump blood to the gills, and one pumps it to the rest of the body. Their blood is blue because it uses copper instead of iron. They can also change colour in a fraction of a second, even though they are colour blind.' } });
  check(own.scenes.length >= 2, `own script split into ${own.scenes.length} scenes`);

  console.log('ElevenLabs connection (mock)');
  let bad = false;
  try { await call('/api/connections/elevenlabs', { json: { key: 'wrong' } }); } catch { bad = true; }
  check(bad, 'a wrong key is rejected');
  await call('/api/connections/elevenlabs', { json: { key: 'test-key' } });
  const { voices } = await call('/api/voices');
  check(voices[0].id === 'mine' && voices.length === 2, 'your own (cloned) voice is listed first');
  const acct = await call('/api/elevenlabs/account');
  check(acct.account.name === 'Sam' && acct.account.limit - acct.account.used === 98800, 'account name and characters left shown');
  check(acct.models.length === 2 && acct.defaultId === 'eleven_multilingual_v2', 'only text-to-speech models offered, best one by default');
  const fs404 = await fetch(`${base}/files/settings.json`);
  check(fs404.status === 404, 'settings file (keys) is not publicly served');

  const scenes = own.scenes.map((s, i) => ({ id: `s${i}`, text: s.text, keywords: s.keywords }));
  const vo = await call('/api/voice/elevenlabs', { json: { voiceId: 'v1', scenes } });
  check(vo.segments.length === scenes.length && vo.segments.every((g) => g.duration > 1), 'one voice clip per scene');
  const vo2 = await call('/api/voice/elevenlabs', { json: { voiceId: 'v1', scenes, reuse: vo.segments } });
  check(vo2.segments.every((g, i) => g.file === vo.segments[i].file), 'unchanged scenes are reused');
  const before = ttsModels.length;
  const vo3 = await call('/api/voice/elevenlabs', { json: { voiceId: 'v1', modelId: 'eleven_flash_v2_5', scenes, reuse: vo.segments } });
  check(ttsModels.length - before === scenes.length && ttsModels.at(-1) === 'eleven_flash_v2_5' && vo3.segments[0].modelId === 'eleven_flash_v2_5', 'switching model re-records with the chosen model');

  console.log('Media uploads');
  const photo = await uploadFile('/api/media/upload', path.join(tmp, 'photo.jpg'));
  const clip = await uploadFile('/api/media/upload', path.join(tmp, 'clip.mp4'));
  check(photo.type === 'image' && clip.type === 'video', 'image and video detected');

  console.log('Render: AI voice, landscape, captions');
  const media = [photo, clip, null, photo];
  const p1 = { title: 'Octopus facts', format: 'landscape', captions: true, voice: { mode: 'elevenlabs', voiceId: 'v1', segments: vo.segments }, scenes: scenes.map((s, i) => ({ ...s, media: media[i % media.length] })) };
  const r1 = await renderAndCheck(p1, 'landscape');
  const v1 = r1.probe.streams.find((s) => s.codec_type === 'video');
  check(v1.width === 1920 && v1.height === 1080, '1920x1080 output');
  check(r1.probe.streams.some((s) => s.codec_type === 'audio'), 'has an audio track');
  const expected = vo.segments.reduce((a, g) => a + g.duration + 0.35, 0.6);
  check(Math.abs(parseFloat(r1.probe.format.duration) - expected) < 0.25, `duration ${parseFloat(r1.probe.format.duration).toFixed(2)}s matches voice timeline (${expected.toFixed(2)}s)`);

  console.log('Render: uploaded voice, vertical');
  const up = await uploadFile('/api/voice/upload', path.join(tmp, 'voice.wav'));
  check(Math.abs(up.duration - 9) < 0.2, 'uploaded voice duration read');
  const p2 = { ...p1, title: 'Vertical test', format: 'portrait', voice: { mode: 'upload', ...up } };
  const r2 = await renderAndCheck(p2, 'portrait');
  const v2 = r2.probe.streams.find((s) => s.codec_type === 'video');
  check(v2.width === 1080 && v2.height === 1920, '1080x1920 output');
  check(Math.abs(parseFloat(r2.probe.format.duration) - 9) < 0.25, 'video length follows the uploaded recording');

  console.log('Render: no voice, square, broken remote media falls back');
  const p3 = { ...p1, title: 'Square test', format: 'square', voice: { mode: 'none' }, scenes: p1.scenes.map((s, i) => ({ ...s, media: i === 0 ? { type: 'image', url: 'http://127.0.0.1:1/missing.jpg' } : s.media })) };
  const r3 = await renderAndCheck(p3, 'square');
  check(r3.job.warnings.length >= 1, `warning shown for broken media: "${r3.job.warnings[0]}"`);

  const stale = { ...p1, scenes: p1.scenes.map((s, i) => (i === 0 ? { ...s, text: `${s.text} Changed.` } : s)) };
  let staleErr = '';
  try { await call('/api/render', { json: { project: stale } }); } catch (e) { staleErr = e.message; }
  check(/regenerate/i.test(staleErr), 'stale voiceover is caught before rendering');

  const { videos } = await call('/api/videos');
  check(videos.length === 3, 'library lists 3 videos');
  const dl = await fetch(`${base}/api/videos/${videos[0].id}/download`);
  check(dl.ok && /attachment/.test(dl.headers.get('content-disposition')), 'download sends the MP4 as an attachment');

  fs.copyFileSync(r1.out, path.join(process.env.SMOKE_OUT || tmp, 'smoke-landscape.mp4'));
  fs.copyFileSync(r2.out, path.join(process.env.SMOKE_OUT || tmp, 'smoke-portrait.mp4'));
  console.log('Password gate (for phone / cloud use)');
  const refused = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: '3997', HOST: '0.0.0.0', APP_PASSWORD: '', DATA_DIR: path.join(tmp, 'data2') }, stdio: 'ignore' });
  const code = await new Promise((r) => refused.on('exit', r));
  check(code === 1, 'refuses to go public without a password');
  const gated = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: '3996', APP_PASSWORD: 'sesame', DATA_DIR: path.join(tmp, 'data3') }, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((r) => gated.stdout.on('data', (d) => d.toString().includes('running') && r()));
  try {
    const g = 'http://127.0.0.1:3996';
    check((await fetch(`${g}/api/status`)).status === 401, 'API locked before sign-in');
    check((await fetch(`${g}/`, { redirect: 'manual' })).headers.get('location') === '/login', 'app redirects to sign-in');
    check((await fetch(`${g}/healthz`)).ok, 'health check stays open for the host');
    const bad = await fetch(`${g}/login`, { method: 'POST', body: new URLSearchParams({ password: 'nope' }), redirect: 'manual' });
    check(bad.headers.get('location') === '/login?e=1' && !bad.headers.get('set-cookie'), 'wrong password rejected');
    const good = await fetch(`${g}/login`, { method: 'POST', body: new URLSearchParams({ password: 'sesame' }), redirect: 'manual' });
    const cookie = good.headers.get('set-cookie').split(';')[0];
    check((await fetch(`${g}/api/status`, { headers: { cookie } })).ok, 'signed in with the right password');
  } finally {
    gated.kill();
  }

  console.log('\nAll good ✅');
} catch (err) {
  console.error(`\n❌ ${err.message}`);
  process.exitCode = 1;
} finally {
  app.kill();
  mock.close();
}
