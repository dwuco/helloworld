import express from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import { ROOT, DIRS, getKey, setKey, setYouTube, publicStatus } from './lib/settings.js';
import { ffmpegCapabilities, probe } from './lib/ffmpeg.js';
import { writeScript, testClaude } from './lib/script.js';
import { listVoices, generateVoiceover, testElevenLabs, getAccount, listModels } from './lib/voice.js';
import { installAuth } from './lib/auth.js';
import { searchMedia, sourcesAvailable, testPexels, testPixabay } from './lib/media.js';
import { startRender, getJob, listVideos, deleteVideo, videoFile } from './lib/render.js';
import * as youtube from './lib/youtube.js';

const app = express();
const APP_PASSWORD = process.env.APP_PASSWORD || '';
const PORT = Number(process.env.PORT) || 3000;
// Local-only by default. With a password set, it listens on all addresses (phones on your Wi-Fi, cloud hosts).
const HOST = process.env.HOST || (APP_PASSWORD ? '0.0.0.0' : '127.0.0.1');
const LOCAL = ['127.0.0.1', 'localhost', '::1'].includes(HOST);
if (!LOCAL && !APP_PASSWORD) {
  console.error('\n  Refusing to start: HOST is public but APP_PASSWORD is not set.\n  Anyone could use your API keys. Set APP_PASSWORD and try again.\n');
  process.exit(1);
}

app.set('trust proxy', 1); // correct https:// URLs behind hosts like Render
app.get('/healthz', (req, res) => res.send('ok'));
if (APP_PASSWORD) installAuth(app, APP_PASSWORD);
app.use(express.json({ limit: '5mb' }));

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error(`[${req.method} ${req.path}]`, err.message);
    if (!res.headersSent) res.status(err.status || 400).json({ error: err.message || 'Something went wrong' });
  }
};

const upload = multer({
  storage: multer.diskStorage({
    destination: DIRS.uploads,
    filename: (req, file, cb) => cb(null, `${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname).toLowerCase().replace(/[^.\w]/g, '').slice(0, 8)}`),
  }),
  limits: { fileSize: 500 * 1024 * 1024 },
});

// --- Status & connections ----------------------------------------------------

app.get('/api/status', wrap(async (req, res) => {
  res.json({ connections: publicStatus(), ffmpeg: await ffmpegCapabilities(), sources: sourcesAvailable(), signedIn: !!APP_PASSWORD });
}));

const testers = { elevenlabs: testElevenLabs, anthropic: testClaude, pexels: testPexels, pixabay: testPixabay };

app.post('/api/connections/:name', wrap(async (req, res) => {
  const { name } = req.params;
  if (!testers[name]) throw new Error('Unknown connection');
  const key = String(req.body.key || '').trim();
  if (!key) throw new Error('Paste your API key first.');
  try {
    await testers[name](key);
  } catch (err) {
    throw new Error(`That key didn't work: ${err.message}`);
  }
  setKey(name, key);
  res.json({ connections: publicStatus() });
}));

app.delete('/api/connections/:name', wrap(async (req, res) => {
  if (req.params.name === 'youtube') {
    youtube.disconnect();
    setYouTube({ clientId: '', clientSecret: '' });
  } else setKey(req.params.name, '');
  res.json({ connections: publicStatus() });
}));

// --- Script ------------------------------------------------------------------

app.post('/api/script', wrap(async (req, res) => {
  const { topic = '', tone = 'friendly', lengthSec = 60, format = 'landscape', script = '' } = req.body;
  if (!topic.trim() && !script.trim()) throw new Error('Tell me what the video is about first.');
  const out = await writeScript({ topic: topic.slice(0, 2000), tone, lengthSec: Math.min(600, Math.max(15, Number(lengthSec) || 60)), format, script: script.slice(0, 20000) });
  res.json(out);
}));

// --- Voice -------------------------------------------------------------------

app.get('/api/voices', wrap(async (req, res) => res.json({ voices: await listVoices() })));
app.get('/api/elevenlabs/account', wrap(async (req, res) => {
  const [account, models] = await Promise.all([getAccount(), listModels()]);
  res.json({ account, ...models });
}));

app.post('/api/voice/elevenlabs', wrap(async (req, res) => {
  const { voiceId, modelId, scenes, reuse } = req.body;
  if (!Array.isArray(scenes) || !scenes.length) throw new Error('Write a script first.');
  if (scenes.some((s) => !s.text?.trim())) throw new Error('One of your scenes is empty. Add some words or delete it.');
  res.json(await generateVoiceover({ voiceId, modelId, scenes, reuse }));
}));

app.post('/api/voice/upload', upload.single('file'), wrap(async (req, res) => {
  if (!req.file) throw new Error('No file received.');
  let info;
  try {
    info = await probe(req.file.path);
  } catch {
    info = {};
  }
  if (!info.hasAudio || !(info.duration > 0)) {
    fs.rmSync(req.file.path, { force: true });
    throw new Error("That file doesn't look like audio. Try an MP3, WAV or M4A.");
  }
  res.json({ file: req.file.filename, name: req.file.originalname, duration: info.duration, url: `/files/uploads/${req.file.filename}` });
}));

// --- Media -------------------------------------------------------------------

app.get('/api/media/search', wrap(async (req, res) => {
  res.json(await searchMedia({ q: String(req.query.q || ''), format: String(req.query.format || 'landscape'), kind: String(req.query.kind || 'any') }));
}));

app.post('/api/media/upload', upload.single('file'), wrap(async (req, res) => {
  if (!req.file) throw new Error('No file received.');
  let info;
  try {
    info = await probe(req.file.path);
  } catch {
    info = {};
  }
  if (!info.hasVideo) {
    fs.rmSync(req.file.path, { force: true });
    throw new Error('Please upload an image (JPG, PNG) or a video (MP4, MOV).');
  }
  const isImage = /^image\//.test(req.file.mimetype) || info.duration < 1;
  const url = `/files/uploads/${req.file.filename}`;
  res.json({
    id: `upload-${req.file.filename}`, source: 'upload', type: isImage ? 'image' : 'video', url, thumb: isImage ? url : '',
    width: info.width, height: info.height, duration: info.duration, credit: `Your upload: ${req.file.originalname}`,
  });
}));

// --- Render & library ---------------------------------------------------------

app.post('/api/render', wrap(async (req, res) => res.json({ jobId: startRender(req.body.project) })));

app.get('/api/render/:id', wrap(async (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'That render was not found (the app may have restarted).' });
  res.json(job);
}));

app.get('/api/videos', wrap(async (req, res) => res.json({ videos: listVideos() })));
app.delete('/api/videos/:id', wrap(async (req, res) => {
  deleteVideo(req.params.id);
  res.json({ ok: true });
}));
app.get('/api/videos/:id/download', (req, res) => {
  const file = videoFile(req.params.id);
  if (!file) return res.status(404).send('Not found');
  res.download(file);
});

// --- YouTube -----------------------------------------------------------------

app.post('/api/youtube/config', wrap(async (req, res) => {
  const clientId = String(req.body.clientId || '').trim();
  const clientSecret = String(req.body.clientSecret || '').trim();
  if (!clientId || !clientSecret) throw new Error('Both the Client ID and Client secret are needed.');
  setYouTube({ clientId, clientSecret });
  res.json({ connections: publicStatus() });
}));

app.get('/api/youtube/auth', (req, res) => {
  try {
    res.redirect(youtube.authUrl(req));
  } catch (err) {
    res.redirect(`/?youtube_error=${encodeURIComponent(err.message)}`);
  }
});

app.get('/api/youtube/callback', async (req, res) => {
  try {
    await youtube.handleCallback(req);
    res.redirect('/?youtube=connected');
  } catch (err) {
    res.redirect(`/?youtube_error=${encodeURIComponent(err.message)}`);
  }
});

app.post('/api/youtube/upload', wrap(async (req, res) => {
  const file = videoFile(String(req.body.videoId || ''));
  if (!file) throw new Error('Video not found. Render it again.');
  res.json(await youtube.upload({ file, ...req.body }));
}));

// --- Static ------------------------------------------------------------------

// Only these folders are public. settings.json (your keys) is never served.
app.use('/files/uploads', express.static(DIRS.uploads));
app.use('/files/voice', express.static(DIRS.voice));
app.use('/files/videos', express.static(DIRS.videos));
app.use(express.static(path.join(ROOT, 'public')));

app.listen(PORT, HOST, async () => {
  const caps = await ffmpegCapabilities();
  console.log(`\n  🎬 AI Video Studio is running → http://localhost:${PORT}\n`);
  if (!LOCAL) {
    const lan = Object.values(os.networkInterfaces()).flat().filter((n) => n && n.family === 'IPv4' && !n.internal).map((n) => n.address);
    console.log('  🔒 Password protected.');
    lan.forEach((ip) => console.log(`  📱 On a phone on the same Wi-Fi, open → http://${ip}:${PORT}`));
    console.log('');
  }
  if (!caps.ok) console.log(`  ⚠️  ffmpeg problem: ${caps.error}\n`);
  if (!getKey('anthropic')) console.log('  Tip: connect Claude in the app for AI-written scripts.');
  if (!getKey('elevenlabs')) console.log('  Tip: connect ElevenLabs in the app for AI voiceovers.');
});
