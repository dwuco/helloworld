import { computeTimeline, staleVoiceScenes, wordCount, formatTime, FORMATS } from './shared/timeline.js';

// ---------------------------------------------------------------------------
// State

const STEPS = [
  { key: 'idea', label: 'Idea', icon: '💡' },
  { key: 'script', label: 'Script', icon: '📝' },
  { key: 'voice', label: 'Voice', icon: '🎙️' },
  { key: 'visuals', label: 'Visuals', icon: '🖼️' },
  { key: 'export', label: 'Export', icon: '🚀' },
];

const TONES = ['Friendly', 'Energetic', 'Professional', 'Storytelling', 'Funny', 'Calm'];
const LENGTHS = [
  [30, '30 sec'],
  [60, '1 min'],
  [90, '1.5 min'],
  [120, '2 min'],
];
// One-tap starting points, like OpenArt's templates.
const TEMPLATES = [
  { id: 'facts', icon: '🤯', name: 'Fun facts', desc: 'Quick facts with a hook', topic: '5 surprising facts about octopuses', format: 'portrait', lengthSec: 30, tone: 'Energetic', style: 'stock', captionStyle: 'yellow', mood: 'Upbeat pop' },
  { id: 'story', icon: '📖', name: 'Short story', desc: 'A tiny tale with a twist', topic: 'A lonely robot who finds a flower on Mars', format: 'portrait', lengthSec: 60, tone: 'Storytelling', style: 'cinematic', character: 'a small rusty robot with big round blue eyes', captionStyle: 'bold', mood: 'Epic cinematic' },
  { id: 'anime', icon: '🌸', name: 'Anime tale', desc: 'Anime-style story', topic: 'A girl who can talk to the wind', format: 'portrait', lengthSec: 60, tone: 'Storytelling', style: 'anime', character: 'a teenage girl with short silver hair and a green scarf', captionStyle: 'boxed', mood: 'Calm lo-fi' },
  { id: 'kids', icon: '🧸', name: 'Kids story', desc: 'Bedtime story in 3D', topic: 'A brave little turtle crosses the big pond', format: 'landscape', lengthSec: 60, tone: 'Friendly', style: '3d', character: 'a tiny green turtle with a red backpack', captionStyle: 'bold', mood: 'Acoustic happy' },
  { id: 'explainer', icon: '🎓', name: 'Explainer', desc: 'Teach one idea clearly', topic: 'How solar panels turn sunlight into electricity', format: 'landscape', lengthSec: 90, tone: 'Professional', style: 'stock', captionStyle: 'minimal', mood: 'Corporate inspiring' },
  { id: 'promo', icon: '🛍️', name: 'Product promo', desc: 'Sell it in 30 seconds', topic: 'Launching our handmade soy candles', format: 'portrait', lengthSec: 30, tone: 'Energetic', style: 'product', captionStyle: 'yellow', mood: 'Upbeat pop' },
  { id: 'motivation', icon: '🔥', name: 'Motivation', desc: 'Short and inspiring', topic: 'Why small daily habits beat big goals', format: 'portrait', lengthSec: 30, tone: 'Calm', style: 'cinematic', captionStyle: 'bold', mood: 'Epic cinematic' },
  { id: 'travel', icon: '✈️', name: 'Travel guide', desc: 'Show off a place', topic: '3 perfect days in Lisbon', format: 'landscape', lengthSec: 60, tone: 'Friendly', style: 'stock', captionStyle: 'minimal', mood: 'Acoustic happy' },
];

// Visual styles. "Real footage" uses free stock video; the rest are AI-generated (fal.ai).
const STYLES = [
  { id: 'stock', name: 'Real footage', icon: '🎥', bg: 'linear-gradient(135deg,#2b5876,#4e4376)' },
  { id: 'cinematic', name: 'Cinematic', icon: '🎬', bg: 'linear-gradient(135deg,#0f2027,#2c5364 55%,#d4a373)' },
  { id: 'photoreal', name: 'Photo-real', icon: '📷', bg: 'linear-gradient(135deg,#3a6073,#a8c0ff)' },
  { id: 'anime', name: 'Anime', icon: '🌸', bg: 'linear-gradient(135deg,#ff9a9e,#a18cd1)' },
  { id: '3d', name: '3D cartoon', icon: '🧸', bg: 'linear-gradient(135deg,#f6d365,#fda085)' },
  { id: 'storybook', name: 'Storybook', icon: '🎨', bg: 'linear-gradient(135deg,#f3c98b,#7fc8a9)' },
  { id: 'comic', name: 'Comic', icon: '💥', bg: 'linear-gradient(135deg,#f9d423,#ff4e50)' },
  { id: 'neon', name: 'Neon', icon: '🌃', bg: 'linear-gradient(135deg,#12c2e9,#c471ed 55%,#f64f59)' },
  { id: 'product', name: 'Product ad', icon: '🛍️', bg: 'linear-gradient(135deg,#8e9eab,#eef2f3)' },
];
const isAI = (style) => style && style !== 'stock';

const CAPTION_STYLES = [
  { id: 'off', name: 'Off' },
  { id: 'bold', name: 'Bold' },
  { id: 'yellow', name: 'Yellow pop' },
  { id: 'boxed', name: 'Boxed' },
  { id: 'minimal', name: 'Minimal' },
];
const MOODS = ['Calm lo-fi', 'Upbeat pop', 'Epic cinematic', 'Acoustic happy', 'Corporate inspiring', 'Dark ambient'];

const blankProject = () => ({
  topic: '',
  tone: 'Friendly',
  lengthSec: 60,
  format: 'landscape',
  ownScript: '',
  showOwn: false,
  title: '',
  description: '',
  hashtags: [],
  writer: '',
  scenes: [],
  voice: { mode: '' },
  captions: true,
  captionStyle: 'bold',
  style: 'stock',
  character: '',
  music: { mode: 'none', prompt: 'Calm lo-fi' },
  seed: Math.floor(Math.random() * 1e6), // same seed for every AI picture keeps the look consistent
  visualsFor: '',
});

const state = {
  step: 0,
  project: blankProject(),
  status: null,
  voices: null,
  voicesError: '',
  busy: {},
  job: null,
  video: null,
  searching: new Set(),
  animating: new Map(), // sceneId -> {jobId, message}
  auto: null, // one-click progress
};

const STORE = 'ai-video-studio:v1';
function save() {
  try {
    localStorage.setItem(STORE, JSON.stringify({ step: state.step, project: state.project, job: state.job?.status === 'done' ? state.job : null, video: state.video }));
  } catch {
    /* storage unavailable: fine, nothing is lost until reload */
  }
}
function restore() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (raw?.project) {
      state.project = { ...blankProject(), ...raw.project };
      state.step = raw.step || 0;
      state.video = raw.video || null;
      state.job = raw.job || null;
    }
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Helpers

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const uid = () => Math.random().toString(36).slice(2, 10);
const P = () => state.project;

async function api(url, opts = {}) {
  const init = { ...opts };
  if (opts.json !== undefined) {
    init.method = init.method || 'POST';
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(opts.json);
  }
  const res = await fetch(url, init);
  if (res.status === 401) {
    location.href = '/login';
    throw new Error('Please sign in again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function toast(msg, kind = '') {
  if ([...$('#toasts').children].some((t) => t.textContent === msg)) return; // no duplicates
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = msg;
  $('#toasts').append(el);
  setTimeout(() => el.remove(), kind === 'err' ? 7000 : 3500);
}

async function busy(key, fn) {
  if (state.busy[key]) return;
  state.busy[key] = true;
  render();
  try {
    return await fn();
  } catch (err) {
    toast(err.message, 'err');
  } finally {
    state.busy[key] = false;
    render();
  }
}

const spin = (key, label, busyLabel) => (state.busy[key] ? `<span class="spinner"></span> ${busyLabel || label}` : label);
const conn = (name) => !!state.status?.connections?.[name]?.connected;

function go(step) {
  state.step = step;
  save();
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (STEPS[step].key === 'visuals') autoFindVisuals();
  if (STEPS[step].key === 'voice' && P().voice.mode === 'elevenlabs') loadVoices();
}

function canVisit(i) {
  if (i === 0) return true;
  if (i <= 3) return P().scenes.length > 0;
  return !!(state.job || state.video);
}

// ---------------------------------------------------------------------------
// Rendering

function render() {
  renderStepper();
  const view = [viewIdea, viewScript, viewVoice, viewVisuals, viewExport][state.step];
  const main = $('#main');
  // Keep focus & caret if a text field is being edited during a re-render.
  const active = document.activeElement;
  const focusKey = active?.dataset?.focus;
  const caret = focusKey && active.selectionStart;
  main.innerHTML = view();
  if (focusKey) {
    const el = main.querySelector(`[data-focus="${CSS.escape(focusKey)}"]`);
    if (el) {
      el.focus();
      try { el.setSelectionRange(caret, caret); } catch { /* not a text field */ }
    }
  }
  const c = state.status?.connections || {};
  const n = ['elevenlabs', 'anthropic', 'pexels', 'pixabay', 'fal', 'youtube'].filter((k) => c[k]?.connected).length;
  $('#conn-count').textContent = n ? `${n} ✓` : '';
  $('#conn-count').className = n ? 'pill ok' : 'pill';
}

function renderStepper() {
  $('#stepper').innerHTML = STEPS.map((s, i) => {
    const cls = i === state.step ? 'active' : i < state.step ? 'done' : '';
    return `<li class="${cls}"><button data-action="step" data-i="${i}" ${canVisit(i) ? '' : 'disabled'}>
      <span class="dot">${i < state.step ? '✓' : s.icon}</span><span class="label">${s.label}</span></button></li>`;
  }).join('');
}

// --- Step 1: Idea ------------------------------------------------------------

function shapeIcon(format) {
  const { w, h } = FORMATS[format];
  const k = 26 / Math.max(w, h);
  return `<span class="shape" style="width:${Math.round(w * k)}px;height:${Math.round(h * k)}px"></span>`;
}

function styleGrid(compact) {
  const p = P();
  return `<div class="styles ${compact ? 'compact' : ''}">${STYLES.map((st) => `
    <button class="style ${p.style === st.id ? 'on' : ''}" data-action="style" data-v="${st.id}" aria-pressed="${p.style === st.id}">
      <span class="swatch" style="background:${st.bg}">${st.icon}${isAI(st.id) ? '<span class="ai-tag">AI</span>' : ''}</span>
      <span class="style-name">${st.name}</span>
    </button>`).join('')}</div>`;
}

function falNote() {
  if (!isAI(P().style) || conn('fal')) return '';
  return `<p class="notice small">AI styles need a <b>fal.ai</b> key (pay as you go, a few cents per picture). <button class="link" data-action="open-connections">Connect fal.ai</button>. Until then you'll get real footage instead.</p>`;
}

function viewIdea() {
  const p = P();
  const claude = conn('anthropic');
  return `
  <div class="hero">
    <h1>What do you want to make?</h1>
    <p>Pick a template or type an idea. One tap makes the whole video, and you can tweak anything after.</p>
  </div>
  <div class="templates" role="list">
    ${TEMPLATES.map((t) => `
      <button class="template ${p.template === t.id ? 'on' : ''}" data-action="template" data-v="${t.id}" role="listitem">
        <span class="t-icon" style="background:${STYLES.find((x) => x.id === t.style).bg}">${t.icon}</span>
        <span class="t-name">${t.name}</span><span class="t-desc">${t.desc}</span>
      </button>`).join('')}
  </div>
  <div class="card stack">
    <div>
      <label class="lbl" for="topic">Your idea</label>
      <textarea id="topic" class="input topic" data-bind="topic" data-focus="topic" placeholder="e.g. 5 surprising facts about octopuses">${esc(p.topic)}</textarea>
    </div>

    <div class="section">
      <label class="lbl">Style</label>
      ${styleGrid()}
      ${falNote()}
    </div>

    ${isAI(p.style) ? `
    <div class="section">
      <label class="lbl" for="character">Main character <span class="muted small">(optional, keeps them looking the same in every scene)</span></label>
      <input id="character" class="input" data-bind="character" data-focus="character" value="${esc(p.character)}" placeholder="e.g. a small orange cat with a blue scarf" />
    </div>` : ''}

    <div class="section">
      <label class="lbl">Where will you post it?</label>
      <div class="choice-grid">
        ${Object.entries(FORMATS).map(([k, f]) => `
          <button class="choice ${p.format === k ? 'on' : ''}" data-action="format" data-v="${k}">
            ${shapeIcon(k)}<span><span class="title">${f.label}</span><span class="sub">${f.hint}</span></span>
          </button>`).join('')}
      </div>
    </div>

    <div class="section row" style="gap:28px;align-items:flex-start">
      <div>
        <label class="lbl">Length</label>
        <div class="chips">${LENGTHS.map(([v, l]) => `<button class="chip ${p.lengthSec === v ? 'on' : ''}" data-action="length" data-v="${v}">${l}</button>`).join('')}</div>
      </div>
      <div>
        <label class="lbl">Tone</label>
        <div class="chips">${TONES.map((t) => `<button class="chip ${p.tone === t ? 'on' : ''}" data-action="tone" data-v="${t}">${t}</button>`).join('')}</div>
      </div>
    </div>

    ${p.showOwn ? `
    <div class="section">
      <label class="lbl" for="own">Paste your script</label>
      <textarea id="own" class="input" rows="8" data-bind="ownScript" data-focus="own" placeholder="Paste the full voiceover text here. We'll split it into scenes and pick visuals.">${esc(p.ownScript)}</textarea>
    </div>` : ''}

    <div class="make">
      <button class="btn primary big make-btn" data-action="make" ${state.auto || state.busy.script ? 'disabled' : ''}>⚡ Make my video</button>
      <p class="muted small center" style="margin:0">Writes the script, ${conn('elevenlabs') ? 'records your ElevenLabs voice, ' : ''}${isAI(p.style) && conn('fal') ? 'creates AI pictures' : 'finds video clips'}, adds music${conn('elevenlabs') ? '' : ' if you have it'} and renders it.</p>
    </div>
    <div class="actions" style="margin-top:4px">
      <button class="link" data-action="toggle-own">${p.showOwn ? '← Let AI write it instead' : 'I already have a script'}</button>
      ${p.showOwn
        ? `<button class="btn" data-action="use-own" ${state.busy.script ? 'disabled' : ''}>${spin('script', 'Step by step with my script →', 'Splitting into scenes…')}</button>`
        : `<button class="btn" data-action="write" ${state.busy.script ? 'disabled' : ''}>${spin('script', 'Step by step →', 'Writing your script…')}</button>`}
    </div>
    ${!claude ? `<p class="notice small">No AI writer connected yet, so you'll get a <b>starter template</b> to edit. <button class="link" data-action="open-connections">Connect Claude</button> for real AI-written scripts.</p>` : `<p class="muted small center">✓ Scripts are written by Claude</p>`}
  </div>`;
}

async function generateScript(useOwn, { auto = false } = {}) {
  const p = P();
  if (!useOwn && !p.topic.trim()) return toast('Tell me what your video is about first 🙂', 'err');
  if (useOwn && !p.ownScript.trim()) return toast('Paste your script first.', 'err');
  if (!auto && p.scenes.length && !confirm('Replace your current script with a new one?')) return;
  return busy('script', async () => {
    const out = await api('/api/script', { json: { topic: p.topic, tone: p.tone, lengthSec: p.lengthSec, format: p.format, script: useOwn ? p.ownScript : '', style: p.style, character: p.character } });
    Object.assign(p, {
      title: out.title,
      description: out.description,
      hashtags: out.hashtags || [],
      writer: out.writer,
      scenes: out.scenes.map((s) => ({ id: uid(), text: s.text, keywords: s.keywords, imagePrompt: s.imagePrompt || s.text, media: null, alts: [] })),
      visualsFor: '',
    });
    if (p.voice.mode === 'elevenlabs') p.voice = { ...p.voice, segments: [], previewUrl: '' };
    if (!auto) state.step = 1;
    save();
    if (!auto) window.scrollTo({ top: 0 });
    return true;
  });
}

// ---------------------------------------------------------------- One click: idea -> finished video
const AUTO_STAGES = ['Writing the script', 'Recording the voice', 'Creating the visuals', 'Adding music', 'Rendering the video'];

function renderAuto() {
  const a = state.auto;
  if (!a) return;
  $('#modal').innerHTML = `
    <div class="auto">
      <div class="big-emoji">🎬</div>
      <h2>Making your video</h2>
      <ol class="auto-stages">
        ${AUTO_STAGES.map((name, i) => {
          const st = a.skipped.includes(i) ? 'skip' : i < a.stage ? 'done' : i === a.stage ? 'now' : '';
          return `<li class="${st}"><span class="mark">${st === 'done' ? '✓' : st === 'skip' ? '–' : st === 'now' ? '<span class="spinner"></span>' : ''}</span>${name}${a.notes[i] ? `<span class="muted small"> · ${esc(a.notes[i])}</span>` : ''}</li>`;
        }).join('')}
      </ol>
      <p class="muted small">You can tweak every step afterwards.</p>
    </div>`;
}

function autoStage(i, note) {
  state.auto.stage = i;
  if (note) state.auto.notes[i] = note;
  renderAuto();
}
function autoSkip(i, note) {
  state.auto.skipped.push(i);
  state.auto.notes[i] = note;
  renderAuto();
}

async function makeItForMe() {
  const p = P();
  const own = !!(p.showOwn && p.ownScript?.trim());
  if (!own && !p.topic.trim()) return toast('Type an idea or pick a template first 🙂', 'err');
  if (p.scenes.length && !confirm('Make a brand new video from this idea? Your current script will be replaced.')) return;
  state.auto = { stage: 0, notes: {}, skipped: [] };
  renderAuto();
  showModal();
  try {
    if (!(await generateScript(own, { auto: true }))) throw new Error('stopped');

    autoStage(1);
    if (conn('elevenlabs')) {
      if (p.voice.mode !== 'elevenlabs') p.voice = (p.voiceMemory?.elevenlabs?.mode === 'elevenlabs' && p.voiceMemory.elevenlabs) || { mode: 'elevenlabs', segments: [] };
      await loadVoices(true);
      applyVoiceDefaults();
      await generateVoice({ quiet: true });
      if (!voiceReady()) { p.voice = { mode: 'none' }; autoSkip(1, 'skipped, the voice could not be made'); }
    } else if (p.voice.mode === 'upload' && p.voice.file) {
      state.auto.notes[1] = 'your recording';
    } else {
      p.voice = { mode: 'none' };
      autoSkip(1, 'no voice connected, captions only');
    }

    autoStage(2);
    p.visualsFor = p.format;
    if (isAI(p.style) && conn('fal')) await aiAllScenes();
    else await autoFindVisuals(true);

    autoStage(3);
    if (p.music?.mode === 'none' && conn('elevenlabs')) {
      p.music = { ...p.music, prompt: p.music.prompt || 'Calm lo-fi' };
      if (!(await makeMusic({ quiet: true }))) autoSkip(3, 'skipped');
    } else if (p.music?.file) state.auto.notes[3] = 'your music';
    else autoSkip(3, 'connect ElevenLabs for AI music');

    autoStage(4);
    state.auto = null;
    closeOverlays();
    await createVideo();
  } catch (err) {
    state.auto = null;
    closeOverlays();
    if (err.message !== 'stopped') toast(err.message, 'err');
    go(P().scenes.length ? 1 : 0);
  }
}

// --- Step 2: Script ----------------------------------------------------------

function scriptStats() {
  const p = P();
  const words = p.scenes.reduce((a, s) => a + wordCount(s.text), 0);
  const { total } = computeTimeline(p.scenes, p.voice);
  return `<span><b>${p.scenes.length}</b> scenes</span><span><b>${words}</b> words</span><span>about <b>${formatTime(total)}</b> long</span>`;
}

function viewScript() {
  const p = P();
  return `
  <div class="hero"><h1>Your script</h1><p>Edit anything you like. Each scene gets its own clip.</p></div>
  <div class="card">
    <label class="lbl" for="title">Video title</label>
    <input id="title" class="input" data-bind="title" data-focus="title" value="${esc(p.title)}" placeholder="Give it a catchy title" />
    ${p.writer === 'basic' ? `<p class="notice warn small" style="margin-top:14px">This is a starter template. Rewrite it in your own words, or <button class="link" data-action="open-connections">connect Claude</button> and then press "Rewrite with AI".</p>` : ''}
    <div class="section">
      ${p.scenes.map((s, i) => `
        <div class="scene">
          <span class="num">${i + 1}</span>
          <div>
            <textarea class="input" rows="2" data-scene-text="${s.id}" data-focus="t-${s.id}" placeholder="What should the narrator say?">${esc(s.text)}</textarea>
            ${isAI(p.style)
              ? `<div class="kw" title="What the AI picture should show">🖼️ Picture: <input data-scene-ip="${s.id}" data-focus="i-${s.id}" value="${esc(s.imagePrompt || '')}" placeholder="Describe the picture" /></div>`
              : `<div class="kw" title="What to search for in the free stock library">🎬 Visual: <input data-scene-kw="${s.id}" data-focus="k-${s.id}" value="${esc(s.keywords)}" placeholder="e.g. ocean waves" /></div>`}
          </div>
          <div class="scene-tools">
            <button class="icon-btn" title="Move up" data-action="move" data-id="${s.id}" data-dir="-1" ${i === 0 ? 'disabled' : ''}>↑</button>
            <button class="icon-btn" title="Move down" data-action="move" data-id="${s.id}" data-dir="1" ${i === p.scenes.length - 1 ? 'disabled' : ''}>↓</button>
            <button class="icon-btn" title="Delete scene" data-action="del-scene" data-id="${s.id}">✕</button>
          </div>
        </div>`).join('')}
      <div class="row spread" style="margin-top:12px">
        <button class="btn" data-action="add-scene">＋ Add scene</button>
        <div class="stats" id="script-stats">${scriptStats()}</div>
      </div>
    </div>
    <div class="actions">
      <div class="row">
        <button class="btn ghost" data-action="step" data-i="0">← Back</button>
        ${conn('anthropic') ? `<button class="btn" data-action="rewrite" ${state.busy.script ? 'disabled' : ''}>${spin('script', '🔄 Rewrite with AI', 'Rewriting…')}</button>` : ''}
      </div>
      <button class="btn primary big" data-action="step" data-i="2" ${p.scenes.length ? '' : 'disabled'}>Next: Voice →</button>
    </div>
  </div>`;
}

// --- Step 3: Voice -----------------------------------------------------------

function viewVoice() {
  const p = P();
  const v = p.voice;
  const el = conn('elevenlabs');
  const stale = staleVoiceScenes(p.scenes, v);
  const ready = voiceReady();
  return `
  <div class="hero"><h1>Pick a voice</h1><p>Use an AI voice, upload your own recording, or skip it.</p></div>
  <div class="card">
    <div class="choice-grid">
      <button class="choice ${v.mode === 'elevenlabs' ? 'on' : ''}" data-action="voice-mode" data-v="elevenlabs">
        <span class="emoji">🤖</span><span><span class="title">AI voice</span><span class="sub">${el ? 'ElevenLabs ✓ connected' : 'ElevenLabs (connect first)'}</span></span>
      </button>
      <button class="choice ${v.mode === 'upload' ? 'on' : ''}" data-action="voice-mode" data-v="upload">
        <span class="emoji">🎤</span><span><span class="title">My own recording</span><span class="sub">Upload MP3, WAV or M4A</span></span>
      </button>
      <button class="choice ${v.mode === 'none' ? 'on' : ''}" data-action="voice-mode" data-v="none">
        <span class="emoji">🔇</span><span><span class="title">No voiceover</span><span class="sub">Captions only</span></span>
      </button>
    </div>

    <div class="section">
      ${v.mode === 'elevenlabs' ? voiceAI(el, stale) : ''}
      ${v.mode === 'upload' ? voiceUpload() : ''}
      ${v.mode === 'none' ? `<p class="notice">No problem. Your video will use captions, and each scene will be timed for comfortable reading.</p>` : ''}
      ${!v.mode ? `<p class="muted center">Choose one of the options above.</p>` : ''}
    </div>

    <div class="actions">
      <button class="btn ghost" data-action="step" data-i="1">← Back</button>
      <button class="btn primary big" data-action="step" data-i="3" ${ready ? '' : 'disabled'}>Next: Visuals →</button>
    </div>
  </div>`;
}

function elevenConnectCard() {
  return `
    <div class="connect-card">
      <div class="row" style="gap:12px;align-items:flex-start;flex-wrap:nowrap">
        <span class="conn-icon">🎙️</span>
        <div style="min-width:0"><h3 style="margin:0">Connect your ElevenLabs account</h3>
        <p class="muted small" style="margin:2px 0 0">Use your own voices, including cloned ones, and your own character allowance.</p></div>
      </div>
      <ol class="small steps-list">
        <li><a class="btn small" href="https://elevenlabs.io/app/settings/api-keys" target="_blank" rel="noopener">Open my ElevenLabs API keys ↗</a></li>
        <li>Tap <b>Create API key</b>. If it asks about permissions, allow <b>Text to Speech</b>, <b>Voices</b> and <b>User</b> (read).</li>
        <li>Copy the key, come back and paste it here.</li>
      </ol>
      <form class="key-row" data-form="key" data-name="elevenlabs">
        <input class="input" type="password" name="key" placeholder="Paste your ElevenLabs API key" autocomplete="off" aria-label="ElevenLabs API key" />
        <button class="btn primary" ${state.busy['key-elevenlabs'] ? 'disabled' : ''}>${spin('key-elevenlabs', 'Connect', '')}</button>
      </form>
      <p class="muted tiny" style="margin:0">ElevenLabs doesn't offer a "Sign in with ElevenLabs" button for other apps, so this key is how the app reaches your account. It's stored only on the app's server and never shown in the browser. You can delete it in ElevenLabs at any time.</p>
    </div>`;
}

function accountBar() {
  const a = state.el?.account;
  if (!a) return '';
  const left = a.limit != null && a.used != null ? Math.max(0, a.limit - a.used) : null;
  const need = P().scenes.reduce((n, sc) => n + sc.text.trim().length, 0);
  const low = left != null && left < need;
  return `
    <div class="account ${low ? 'low' : ''}">
      <div><b>✓ ElevenLabs${a.name ? ` · ${esc(a.name)}` : ''}</b>${a.tier ? ` <span class="pill">${esc(a.tier.replace(/_/g, ' '))}</span>` : ''}</div>
      <div class="small muted">${left != null ? `<b class="num">${left.toLocaleString()}</b> characters left · this video needs about <b class="num">${need.toLocaleString()}</b>` : `This video needs about <b class="num">${need.toLocaleString()}</b> characters`}</div>
      ${low ? '<div class="small" style="color:var(--err)">Not enough characters left. Shorten the script or top up your ElevenLabs plan.</div>' : ''}
    </div>`;
}

function voiceCard(x, v) {
  return `
    <div class="voice ${v.voiceId === x.id ? 'on' : ''}" data-action="pick-voice" data-id="${x.id}" role="button" tabindex="0">
      ${x.previewUrl ? `<button class="play" title="Listen" data-action="preview" data-url="${esc(x.previewUrl)}">▶</button>` : '<span class="play" aria-hidden="true" style="display:grid;place-items:center">🎙️</span>'}
      <span><span class="name">${esc(x.name)}</span><br><span class="tags">${esc(x.tags.join(' · ') || x.category || '')}</span></span>
    </div>`;
}

function voiceAI(connected, stale) {
  const v = P().voice;
  if (!connected) return elevenConnectCard();
  if (state.voicesError) return `<p class="notice err">${esc(state.voicesError)} <button class="link" data-action="reload-voices">Try again</button></p>`;
  if (!state.voices) return `<p class="muted center"><span class="spinner" style="border-top-color:var(--accent)"></span> Loading your ElevenLabs voices…</p>`;
  const has = (v.segments || []).length > 0;
  const mine = state.voices.filter((x) => x.category && x.category !== 'premade');
  const library = state.voices.filter((x) => !x.category || x.category === 'premade');
  const models = state.el?.models || [];
  return `
    ${accountBar()}
    <label class="lbl" style="margin-top:16px">1. Choose a voice</label>
    <div class="voice-scroll">
      ${mine.length ? `<div class="group-title" style="margin-top:0">Your voices</div><div class="voice-list">${mine.map((x) => voiceCard(x, v)).join('')}</div>` : ''}
      ${library.length ? `<div class="group-title" ${mine.length ? '' : 'style="margin-top:0"'}>ElevenLabs voices</div><div class="voice-list">${library.map((x) => voiceCard(x, v)).join('')}</div>` : ''}
    </div>
    ${models.length > 1 ? `
    <div class="section">
      <label class="lbl" for="el-model">Voice model</label>
      <select id="el-model" class="input" data-model style="max-width:420px">
        ${models.map((m) => `<option value="${esc(m.id)}" ${v.modelId === m.id ? 'selected' : ''}>${esc(m.name)}${m.description ? ` · ${esc(m.description)}` : ''}</option>`).join('')}
      </select>
    </div>` : ''}
    <div class="section">
      <label class="lbl">2. Create the voiceover</label>
      ${has && stale.length ? `<p class="notice warn small">Your script, voice or model changed. ${stale.length} scene${stale.length > 1 ? 's need' : ' needs'} a new recording.</p>` : ''}
      ${has && !stale.length && v.previewUrl ? `<audio controls src="${esc(v.previewUrl)}"></audio><p class="muted small" style="margin-top:6px">✓ Voiceover ready. Scenes are timed to the voice automatically.</p>` : ''}
      <button class="btn ${has && !stale.length ? '' : 'primary big'}" data-action="gen-voice" ${!v.voiceId || state.busy.voice ? 'disabled' : ''}>
        ${spin('voice', has ? (stale.length ? '🎙️ Update voiceover' : '🔄 Re-record') : '🎙️ Generate voiceover', 'Recording… (about 2 sec per scene)')}
      </button>
      ${!v.voiceId ? '<span class="muted small" style="margin-left:8px">Pick a voice first</span>' : ''}
    </div>`;
}

function voiceUpload() {
  const v = P().voice;
  return `
    ${v.file ? `
      <div class="notice"><b>🎵 ${esc(v.name)}</b> · ${formatTime(v.duration)}</div>
      <audio controls src="${esc(v.url)}" style="margin-top:10px"></audio>
      <p class="muted small" style="margin-top:6px">Scenes are spread across your recording based on how much text each one has. Adjust the script if a clip changes too early or late.</p>
      <button class="btn" data-action="pick-voice-file">Replace file</button>` : `
      <div class="drop" data-action="pick-voice-file" data-drop="voice">
        <div style="font-size:34px">⬆️</div>
        <b>${state.busy.upload ? '<span class="spinner" style="border-top-color:var(--accent)"></span> Uploading…' : 'Click or drop your voiceover here'}</b>
        <div class="muted small">MP3, WAV, M4A · up to 500 MB</div>
      </div>
      <p class="muted small" style="margin-top:10px">Tip: make sure the script on the previous step matches what you say, since it is used for captions and to pick visuals.</p>`}`;
}

function voiceReady() {
  const v = P().voice;
  if (v.mode === 'none') return true;
  if (v.mode === 'upload') return !!v.file;
  if (v.mode === 'elevenlabs') return (v.segments || []).length > 0 && !staleVoiceScenes(P().scenes, v).length;
  return false;
}

async function loadVoices(force) {
  if (!conn('elevenlabs') || (state.voices && !force)) return;
  state.voicesError = '';
  try {
    const [{ voices }, el] = await Promise.all([api('/api/voices'), api('/api/elevenlabs/account').catch(() => null)]);
    state.voices = voices;
    state.el = el;
    applyVoiceDefaults();
    save();
  } catch (err) {
    state.voicesError = err.message;
  }
  render();
}

// Default to the person's own voice (cloned or designed) when they have one, and the account's default model.
function applyVoiceDefaults() {
  const v = P().voice;
  const voices = state.voices || [];
  if (v.mode !== 'elevenlabs' || !voices.length) return;
  const own = voices.find((x) => x.category && x.category !== 'premade');
  if (!v.voiceId || !voices.some((x) => x.id === v.voiceId)) v.voiceId = (own || voices[0]).id;
  if (!v.modelId && state.el?.defaultId) v.modelId = state.el.defaultId;
}

let previewAudio;
function playPreview(url) {
  if (previewAudio && !previewAudio.paused && previewAudio.src === url) return previewAudio.pause();
  previewAudio?.pause();
  previewAudio = new Audio(url);
  previewAudio.play().catch(() => toast('Could not play the preview.', 'err'));
}

async function generateVoice({ quiet = false } = {}) {
  const p = P();
  if (p.scenes.some((s) => !s.text.trim())) return toast('One of your scenes is empty. Add words or delete it.', 'err');
  await busy('voice', async () => {
    const out = await api('/api/voice/elevenlabs', {
      json: { voiceId: p.voice.voiceId, modelId: p.voice.modelId, scenes: p.scenes.map((s) => ({ id: s.id, text: s.text })), reuse: p.voice.segments || [] },
    });
    p.voice = { ...p.voice, segments: out.segments, previewUrl: out.previewUrl };
    save();
    api('/api/elevenlabs/account').then((el) => { state.el = el; render(); }).catch(() => {});
    if (quiet) return;
    toast('Voiceover ready 🎉', 'ok');
  });
}

async function uploadVoice(file) {
  if (!file) return;
  await busy('upload', async () => {
    const fd = new FormData();
    fd.append('file', file);
    const out = await api('/api/voice/upload', { method: 'POST', body: fd });
    P().voice = { mode: 'upload', ...out };
    save();
    toast('Recording added ✓', 'ok');
  });
}

// --- Step 4: Visuals ---------------------------------------------------------

function sourceLabel() {
  const s = state.status?.sources || {};
  const list = [s.pexels && 'Pexels', s.pixabay && 'Pixabay'].filter(Boolean);
  return list.length ? `${list.join(' + ')} (free videos & photos)` : 'Openverse (free Creative Commons photos)';
}

function pexelsCard() {
  return `
    <div class="connect-card" style="margin-bottom:16px">
      <div class="row" style="gap:12px;flex-wrap:nowrap;align-items:flex-start">
        <span class="conn-icon">📹</span>
        <div style="min-width:0"><h3 style="margin:0">Get real HD video clips</h3>
        <p class="muted small" style="margin:2px 0 0">Right now you're getting still photos. Pexels has millions of professional stock videos that are free to use. The key is free and takes about a minute.</p></div>
      </div>
      <ol class="small steps-list">
        <li><a class="btn small" href="https://www.pexels.com/api/new/" target="_blank" rel="noopener">Get my free Pexels key ↗</a></li>
        <li>Copy the key, then paste it here.</li>
      </ol>
      <form class="key-row" data-form="key" data-name="pexels">
        <input class="input" type="password" name="key" placeholder="Paste your Pexels API key" autocomplete="off" aria-label="Pexels API key" />
        <button class="btn primary" ${state.busy['key-pexels'] ? 'disabled' : ''}>${spin('key-pexels', 'Connect', '')}</button>
      </form>
    </div>`;
}

function falCard() {
  return `
    <div class="connect-card" style="margin-bottom:16px">
      <div class="row" style="gap:12px;flex-wrap:nowrap;align-items:flex-start">
        <span class="conn-icon">🪄</span>
        <div style="min-width:0"><h3 style="margin:0">Turn on AI pictures and AI video clips</h3>
        <p class="muted small" style="margin:2px 0 0">fal.ai runs top image and video models (FLUX for pictures, Kling for moving clips). Pay as you go: pictures cost a fraction of a cent, a 5 second clip costs more and takes a minute or two.</p></div>
      </div>
      <ol class="small steps-list">
        <li><a class="btn small" href="https://fal.ai/dashboard/keys" target="_blank" rel="noopener">Get my fal.ai key ↗</a></li>
        <li>Add a little credit in fal.ai's billing page, copy the key and paste it here.</li>
      </ol>
      <form class="key-row" data-form="key" data-name="fal">
        <input class="input" type="password" name="key" placeholder="Paste your fal.ai key" autocomplete="off" aria-label="fal.ai key" />
        <button class="btn primary" ${state.busy['key-fal'] ? 'disabled' : ''}>${spin('key-fal', 'Connect', '')}</button>
      </form>
    </div>`;
}

function viewVisuals() {
  const p = P();
  const tl = computeTimeline(p.scenes, p.voice);
  const s = state.status?.sources || {};
  const ai = isAI(p.style) && conn('fal');
  const pictures = p.scenes.filter((sc) => sc.media?.type === 'image').length;
  const busyAny = state.searching.size || state.animating.size;
  return `
  <div class="hero"><h1>Pick your visuals</h1><p>${ai ? 'Every scene gets an AI picture in your style. Bring any of them to life as a moving clip.' : 'Every scene gets a free video clip automatically. Swap any you don\'t love.'}</p></div>
  <div class="card">
    <label class="lbl">Style</label>
    ${styleGrid(true)}
    <div style="margin-top:14px"></div>
    ${isAI(p.style) && !conn('fal') ? falCard() : ''}
    ${!ai && !s.pexels && !s.pixabay ? pexelsCard() : ''}
    <div class="row spread" style="margin-bottom:16px">
      <span class="muted small">Source: <b>${ai ? `AI · ${STYLES.find((x) => x.id === p.style).name}` : sourceLabel()}</b></span>
      <div class="row">
        ${ai
          ? `<button class="btn small" data-action="ai-all" ${busyAny ? 'disabled' : ''}>✨ New AI pictures for all</button>
             <button class="btn small" data-action="animate-all" ${busyAny || !pictures ? 'disabled' : ''} title="Turns every picture into a 5 second moving clip">🎬 Animate all (${pictures})</button>`
          : `<button class="btn small" data-action="refind" ${busyAny ? 'disabled' : ''}>🔄 Find all again</button>`}
      </div>
    </div>
    <div class="board">
      ${p.scenes.map((sc, i) => tile(sc, i, tl.items[i])).join('')}
    </div>
    ${finishingTouches()}
    <div class="actions">
      <button class="btn ghost" data-action="step" data-i="2">← Back</button>
      <span class="muted small">Total <b>${formatTime(tl.total)}</b> · ${FORMATS[p.format].label}</span>
      <button class="btn primary big" data-action="create" ${state.searching.size || state.busy.render ? 'disabled' : ''}>🎬 Create my video</button>
    </div>
  </div>`;
}

function finishingTouches() {
  const p = P();
  const captionsOk = state.status?.ffmpeg?.captions !== false;
  const cs = p.captions === false ? 'off' : p.captionStyle || 'bold';
  const m = p.music || { mode: 'none' };
  return `
    <div class="touches">
      <div>
        <label class="lbl">Captions</label>
        ${captionsOk ? `<div class="cap-styles">${CAPTION_STYLES.map((c) => `
          <button class="cap ${cs === c.id ? 'on' : ''}" data-action="caption-style" data-v="${c.id}">
            <span class="cap-preview cap-${c.id}"><span>${c.id === 'off' ? 'No captions' : 'Hello world'}</span></span><span class="small">${c.name}</span>
          </button>`).join('')}</div>` : '<p class="muted small">This copy of ffmpeg cannot draw captions.</p>'}
      </div>
      <div>
        <label class="lbl">Background music</label>
        <div class="chips">
          <button class="chip ${m.mode === 'none' ? 'on' : ''}" data-action="music-mode" data-v="none">None</button>
          <button class="chip ${m.mode === 'ai' ? 'on' : ''}" data-action="music-mode" data-v="ai">✨ AI music</button>
          <button class="chip ${m.mode === 'upload' ? 'on' : ''}" data-action="music-mode" data-v="upload">⬆️ My music</button>
        </div>
        ${m.mode === 'ai' ? (conn('elevenlabs') ? `
          <div class="chips" style="margin-top:10px">${MOODS.map((x) => `<button class="chip example ${m.prompt === x ? 'on' : ''}" data-action="mood" data-v="${x}">${x}</button>`).join('')}</div>
          <div class="key-row" style="margin-top:10px">
            <input class="input" data-music-prompt data-focus="music-prompt" value="${esc(m.prompt || '')}" placeholder="Describe the music, e.g. warm acoustic guitar" aria-label="Music description" />
            <button class="btn primary" data-action="make-music" ${state.busy.music ? 'disabled' : ''}>${spin('music', m.file ? 'Make new' : 'Make music', 'Composing…')}</button>
          </div>
          <p class="muted tiny" style="margin-top:6px">Made by Eleven Music with your ElevenLabs account. Needs a plan that includes music.</p>`
          : `<p class="notice small" style="margin-top:10px">AI music uses your ElevenLabs account. <button class="link" data-action="open-connections">Connect ElevenLabs</button> or upload your own music.</p>`) : ''}
        ${m.mode === 'upload' && !m.file ? `<button class="btn small" style="margin-top:10px" data-action="pick-music-file">Choose a music file</button>` : ''}
        ${m.file && m.mode !== 'none' ? `
          <div class="notice small" style="margin-top:10px">🎵 <b>${esc(m.name || 'Music')}</b> · ${formatTime(m.duration)} ${m.mode === 'upload' ? '<button class="link" data-action="pick-music-file">Replace</button>' : ''}</div>
          <audio controls src="${esc(m.url)}" style="margin-top:8px"></audio>
          <div class="chips" style="margin-top:8px"><span class="muted small" style="align-self:center">Volume</span>${[['Low', 0.15], ['Medium', 0.3], ['High', 0.5]].map(([n, v]) => `<button class="chip ${(m.volume || 0.3) === v ? 'on' : ''}" data-action="music-volume" data-v="${v}">${n}</button>`).join('')}</div>
          <p class="muted tiny" style="margin-top:6px">Music dips automatically while the voice is speaking.</p>` : ''}
      </div>
    </div>`;
}

function tile(sc, i, t) {
  const m = sc.media;
  const anim = state.animating.get(sc.id);
  const loading = state.searching.has(sc.id) || !!anim;
  const fmt = P().format;
  const fal = conn('fal');
  const bg = m?.thumb ? `style="background-image:url('${esc(m.thumb)}')"` : '';
  return `
  <div class="tile">
    <div class="thumb ${fmt} ${loading ? 'loading' : ''} ${!m && !loading ? 'empty' : ''}" ${loading ? '' : bg} data-hover="${m?.type === 'video' ? esc(m.url) : ''}">
      <span class="badge">${i + 1}${m ? (m.type === 'video' ? ' · ▶ Video' : ' · Picture') : ''}${m?.source === 'ai' ? ' · AI' : ''}</span>
      ${anim ? `<span class="anim-msg small">🎬 ${esc(anim.message || 'Animating…')}<br><span class="tiny">usually 1 to 3 minutes</span></span>` : ''}
      ${t ? `<span class="badge dur">${t.duration.toFixed(1)}s</span>` : ''}
      ${!m && !loading ? `<span class="small" style="padding:12px;text-align:center">${sc.searched ? 'Nothing yet.<br>A colour background will be used.' : ''}</span>` : ''}
      ${m?.type === 'video' && !m.thumb ? '<span style="font-size:30px">▶</span>' : ''}
    </div>
    <div class="tile-body">
      <div class="tile-text">${esc(sc.text)}</div>
      ${m?.credit ? `<div class="credit" title="${esc(m.credit)}">${esc(m.credit)}</div>` : ''}
      <div class="tile-tools">
        <button class="btn small" data-action="swap" data-id="${sc.id}" ${loading || (sc.alts || []).length < 2 ? 'disabled' : ''}>🔀 Swap</button>
        <button class="btn small" data-action="choose" data-id="${sc.id}">🔍 Choose</button>
        <button class="btn small" data-action="upload-media" data-id="${sc.id}">⬆️ Upload</button>
        ${fal ? `<button class="btn small" data-action="ai-one" data-id="${sc.id}" ${loading ? 'disabled' : ''}>✨ AI picture</button>` : ''}
        ${fal && m?.type === 'image' ? `<button class="btn small" data-action="animate" data-id="${sc.id}" ${loading ? 'disabled' : ''}>🎬 Animate</button>` : ''}
      </div>
    </div>
  </div>`;
}

function usedUrls(exceptId) {
  return new Set(P().scenes.filter((s) => s.id !== exceptId && s.media).map((s) => s.media.url));
}

async function findFor(scene, quiet) {
  state.searching.add(scene.id);
  render();
  try {
    const { items, errors } = await api(`/api/media/search?q=${encodeURIComponent(scene.keywords || scene.text.slice(0, 60))}&format=${P().format}`);
    if (errors?.length && !items.length) {
      if (quiet) return errors[0];
      toast(`Search problem: ${errors[0]}`, 'err');
    }
    scene.alts = items;
    const used = usedUrls(scene.id);
    const need = computeTimeline(P().scenes, P().voice).items.find((t) => t.id === scene.id)?.duration || 5;
    const fresh = items.filter((x) => !used.has(x.url));
    // Best: a real video clip long enough to cover the scene without looping.
    scene.media =
      fresh.find((x) => x.type === 'video' && (x.duration || 0) >= need) ||
      fresh.find((x) => x.type === 'video') ||
      fresh[0] || items[0] || null;
    scene.searched = true;
  } catch (err) {
    scene.searched = true;
    if (quiet) return err.message;
    toast(err.message, 'err');
  } finally {
    state.searching.delete(scene.id);
    save();
    render();
  }
}

async function autoFindVisuals(force) {
  const p = P();
  const key = `${p.format}`;
  if (p.visualsFor !== key) force = true; // format changed: orientation of clips is wrong
  p.visualsFor = key;
  if (isAI(p.style) && conn('fal')) return aiAllScenes(force);
  const todo = p.scenes.filter((s) => force ? s.media?.source !== 'upload' : !s.media && !s.searched);
  if (force) todo.forEach((s) => { s.media = null; s.searched = false; });
  // 3 at a time keeps the APIs happy.
  const queue = [...todo];
  const problems = [];
  await Promise.all([0, 1, 2].map(async () => {
    while (queue.length) {
      const problem = await findFor(queue.shift(), true);
      if (problem) problems.push(problem);
    }
  }));
  if (problems.length) toast(`Couldn't search the free media library for ${problems.length} scene${problems.length > 1 ? 's' : ''}: ${problems[0]}`, 'err');
}

// ---------------------------------------------------------------- AI pictures & clips (fal.ai)
async function aiImageFor(sc, quiet) {
  const p = P();
  state.searching.add(sc.id);
  render();
  try {
    sc.media = await api('/api/ai/image', { json: { prompt: sc.imagePrompt || sc.text, style: p.style, character: p.character, format: p.format, seed: p.seed } });
    sc.searched = true;
    save();
  } catch (err) {
    sc.searched = true;
    if (quiet) return err.message;
    toast(err.message, 'err');
  } finally {
    state.searching.delete(sc.id);
    render();
  }
}

async function aiAllScenes(force = true) {
  const p = P();
  const todo = p.scenes.filter((s) => (force ? s.media?.source !== 'upload' : !s.media));
  const queue = [...todo];
  const problems = [];
  await Promise.all([0, 1, 2].map(async () => {
    while (queue.length) {
      const problem = await aiImageFor(queue.shift(), true);
      if (problem) problems.push(problem);
    }
  }));
  if (problems.length) toast(`${problems.length} picture${problems.length > 1 ? 's' : ''} could not be made: ${problems[0]}`, 'err');
}

async function animateScene(sc) {
  if (!sc?.media || sc.media.type !== 'image') return toast('Pick or make a picture for this scene first.', 'err');
  const p = P();
  const dur = computeTimeline(p.scenes, p.voice).items.find((t) => t.id === sc.id)?.duration || 5;
  try {
    const { jobId } = await api('/api/ai/animate', { json: { image: sc.media, prompt: sc.imagePrompt || sc.text, style: p.style, character: p.character, seconds: dur > 6 ? 10 : 5 } });
    state.animating.set(sc.id, { jobId, message: 'Starting…' });
    render();
    pollAnimation(sc.id);
  } catch (err) {
    toast(err.message, 'err');
  }
}

function pollAnimation(sceneId) {
  setTimeout(async () => {
    const a = state.animating.get(sceneId);
    if (!a) return;
    try {
      const job = await api(`/api/ai/jobs/${a.jobId}`);
      const sc = P().scenes.find((s) => s.id === sceneId);
      if (job.status === 'done') {
        state.animating.delete(sceneId);
        if (sc) { sc.media = job.item; save(); }
        toast(`Scene ${P().scenes.indexOf(sc) + 1} is moving now 🎬`, 'ok');
      } else if (job.status === 'error') {
        state.animating.delete(sceneId);
        toast(job.error, 'err');
      } else {
        a.message = job.message;
        pollAnimation(sceneId);
      }
    } catch (err) {
      state.animating.delete(sceneId);
      toast(err.message, 'err');
    }
    if (STEPS[state.step].key === 'visuals') render();
  }, 3000);
}

// ---------------------------------------------------------------- music
async function makeMusic({ quiet = false } = {}) {
  const p = P();
  const total = computeTimeline(p.scenes, p.voice).total;
  let ok = false;
  await busy('music', async () => {
    const out = await api('/api/music/elevenlabs', { json: { prompt: p.music?.prompt || 'Calm lo-fi', seconds: Math.ceil(total) + 2 } });
    p.music = { ...p.music, mode: 'ai', ...out, volume: p.music?.volume || 0.3 };
    save();
    ok = true;
    if (!quiet) toast('Music ready 🎵', 'ok');
  });
  return ok;
}

async function uploadMusic(file) {
  if (!file) return;
  await busy('music', async () => {
    const fd = new FormData();
    fd.append('file', file);
    const out = await api('/api/voice/upload', { method: 'POST', body: fd });
    P().music = { ...P().music, mode: 'upload', ...out, volume: P().music?.volume || 0.3 };
    save();
    toast('Music added ✓', 'ok');
  });
}

function swap(id) {
  const sc = P().scenes.find((s) => s.id === id);
  if (!sc?.alts?.length) return;
  const used = usedUrls(id);
  const start = Math.max(0, sc.alts.findIndex((x) => x.url === sc.media?.url));
  for (let k = 1; k <= sc.alts.length; k++) {
    const cand = sc.alts[(start + k) % sc.alts.length];
    if (!used.has(cand.url) || k === sc.alts.length) {
      sc.media = cand;
      break;
    }
  }
  save();
  render();
}

// Choose dialog
let chooser = null;
function openChooser(id) {
  const sc = P().scenes.find((s) => s.id === id);
  chooser = { id, q: sc.keywords, kind: 'any', items: sc.alts || [], loading: false };
  renderChooser();
  showModal();
  if (!chooser.items.length) chooserSearch(chooser.q, 'any');
}

function renderChooser() {
  if (!chooser) return;
  const sc = P().scenes.find((s) => s.id === chooser.id);
  $('#modal').innerHTML = `
    <div class="row spread"><h2>Choose a visual for scene ${P().scenes.indexOf(sc) + 1}</h2><button class="icon-btn" data-action="close-overlays">✕</button></div>
    <p class="muted small">"${esc(sc.text.slice(0, 140))}${sc.text.length > 140 ? '…' : ''}"</p>
    <form class="row" data-form="chooser" style="margin:12px 0">
      <input class="input" name="q" value="${esc(chooser.q)}" placeholder="Search free videos & photos" style="flex:1;min-width:180px" />
      <select class="input" name="kind" style="width:auto">
        <option value="any" ${chooser.kind === 'any' ? 'selected' : ''}>Videos & photos</option>
        <option value="video" ${chooser.kind === 'video' ? 'selected' : ''}>Videos only</option>
        <option value="image" ${chooser.kind === 'image' ? 'selected' : ''}>Photos only</option>
      </select>
      <button class="btn primary">${chooser.loading ? '<span class="spinner"></span>' : 'Search'}</button>
    </form>
    ${chooser.kind === 'video' && !state.status?.sources?.pexels && !state.status?.sources?.pixabay ? '<p class="notice small">Video clips need a free Pexels or Pixabay key. <button class="link" data-action="open-connections">Add one</button></p>' : ''}
    <div class="pick-grid">
      ${chooser.items.map((x, i) => `
        <button class="pick ${sc.media?.url === x.url ? 'on' : ''}" data-action="pick-media" data-i="${i}">
          <div class="thumb ${P().format}" style="background-image:url('${esc(x.thumb)}')" data-hover="${x.type === 'video' ? esc(x.url) : ''}">
            <span class="badge">${x.type === 'video' ? `▶ ${x.duration ? `${x.duration}s` : 'Video'}` : 'Photo'}</span>
          </div>
          <div class="credit">${esc(x.credit)}</div>
        </button>`).join('') || `<p class="muted" style="grid-column:1/-1">${chooser.loading ? 'Searching…' : 'No results. Try different words.'}</p>`}
    </div>`;
}

async function chooserSearch(q, kind) {
  Object.assign(chooser, { q, kind, loading: true });
  renderChooser();
  try {
    const { items, errors } = await api(`/api/media/search?q=${encodeURIComponent(q)}&format=${P().format}&kind=${kind}`);
    if (errors?.length) toast(errors[0], 'err');
    chooser.items = items;
  } catch (err) {
    toast(err.message, 'err');
  }
  chooser.loading = false;
  renderChooser();
}

let uploadTarget = null;
async function uploadMedia(file) {
  if (!file || !uploadTarget) return;
  const sc = P().scenes.find((s) => s.id === uploadTarget);
  state.searching.add(sc.id);
  render();
  try {
    const fd = new FormData();
    fd.append('file', file);
    const item = await api('/api/media/upload', { method: 'POST', body: fd });
    sc.media = item;
    save();
    toast('Added your file ✓', 'ok');
  } catch (err) {
    toast(err.message, 'err');
  } finally {
    state.searching.delete(sc.id);
    render();
  }
}

// --- Step 5: Export ----------------------------------------------------------

function viewExport() {
  const job = state.job;
  if (job && job.status === 'running') {
    return `
    <div class="card render-box">
      <div class="big-emoji">🎬</div>
      <h2>Creating your video…</h2>
      <p class="muted">${esc(job.message || '')}</p>
      <div class="progress" style="max-width:520px;margin:20px auto 8px"><div style="width:${job.progress || 0}%"></div></div>
      <p class="muted small">${job.progress || 0}% · you can keep this tab open, it usually takes a minute or two.</p>
    </div>`;
  }
  if (job && job.status === 'error') {
    return `
    <div class="card render-box">
      <div style="font-size:48px">😕</div>
      <h2>That didn't work</h2>
      <p class="notice err" style="text-align:left">${esc(job.error)}</p>
      <div class="row" style="justify-content:center;margin-top:16px">
        <button class="btn" data-action="step" data-i="3">← Back to visuals</button>
        <button class="btn primary" data-action="create">Try again</button>
      </div>
    </div>`;
  }
  const v = state.video;
  if (!v) return `<div class="card center"><p>No video yet.</p><button class="btn primary" data-action="step" data-i="3">Go to visuals</button></div>`;
  return viewResult(v);
}

function publishText(v) {
  const p = P();
  const tags = (p.hashtags || []).map((h) => `#${h}`).join(' ');
  const credits = (v.credits || []).length ? `\n\nCredits:\n${v.credits.join('\n')}` : '';
  return `${p.description || ''}${tags ? `\n\n${tags}` : ''}${credits}`.trim();
}

function viewResult(v) {
  const p = P();
  const yt = state.status?.connections?.youtube || {};
  const canShare = !!navigator.canShare;
  return `
  <div class="hero"><h1>🎉 Your video is ready</h1><p>${formatTime(v.duration)} · ${FORMATS[v.format]?.label || ''}${state.job?.seconds ? ` · made in ${state.job.seconds}s` : ''}</p></div>
  ${(state.job?.warnings || []).length ? `<div class="notice warn small" style="margin-bottom:14px">${state.job.warnings.map(esc).join('<br>')}</div>` : ''}
  <div class="result">
    <div class="card" style="padding:12px">
      <video class="player" src="${esc(v.url)}" controls playsinline poster="${esc(v.thumb)}"></video>
      <div class="row" style="margin-top:12px">
        <a class="btn primary big" style="flex:1" href="/api/videos/${encodeURIComponent(v.id)}/download">⬇️ Download MP4</a>
        ${canShare ? `<button class="btn big" data-action="share">📤 Share</button>` : ''}
      </div>
    </div>
    <div class="card stack">
      <h2>Publish</h2>
      <div>
        <label class="lbl" for="pub-title">Title</label>
        <div class="copy-field"><input id="pub-title" class="input" data-bind="title" data-focus="pub-title" value="${esc(p.title)}" /><button class="btn small" data-action="copy" data-target="pub-title">Copy</button></div>
      </div>
      <div>
        <label class="lbl" for="pub-desc">Description</label>
        <div class="copy-field"><textarea id="pub-desc" class="input" rows="6" data-bind="publishDesc" data-focus="pub-desc">${esc(p.publishDesc ?? publishText(v))}</textarea><button class="btn small" data-action="copy" data-target="pub-desc">Copy</button></div>
        <p class="muted tiny" style="margin-top:4px">Free stock media credits are included. Keep them for Creative Commons images.</p>
      </div>

      <div class="conn">
        <div class="conn-head"><span class="conn-icon">▶️</span><div style="flex:1"><b>YouTube</b><div class="muted small">${yt.connected ? `Connected${yt.channel ? ` as ${esc(yt.channel)}` : ''}` : 'Upload straight to your channel'}</div></div></div>
        <div class="conn-body">
          ${yt.connected ? `
            <div class="row">
              <select class="input" id="yt-privacy" style="width:auto">
                <option value="private">Private</option><option value="unlisted">Unlisted</option><option value="public">Public</option>
              </select>
              <button class="btn primary" data-action="yt-upload" ${state.busy.yt ? 'disabled' : ''}>${spin('yt', 'Upload to YouTube', 'Uploading…')}</button>
            </div>
            ${state.ytResult ? `<p class="notice small" style="margin-top:10px">✓ Uploaded! <a href="${esc(state.ytResult.url)}" target="_blank" rel="noopener">Watch</a> · <a href="${esc(state.ytResult.studioUrl)}" target="_blank" rel="noopener">Edit in YouTube Studio</a></p>` : ''}`
            : `<button class="btn" data-action="open-connections">🔌 Connect YouTube</button>`}
        </div>
      </div>

      <div>
        <label class="lbl">Post anywhere else</label>
        <p class="muted small">Download the MP4, then open the upload page and paste your title & description.</p>
        <div class="platforms">
          ${[
            ['TikTok', 'https://www.tiktok.com/tiktokstudio/upload'],
            ['Instagram', 'https://www.instagram.com/'],
            ['Facebook', 'https://www.facebook.com/'],
            ['X / Twitter', 'https://x.com/compose/post'],
            ['LinkedIn', 'https://www.linkedin.com/feed/'],
            ['YouTube Studio', 'https://studio.youtube.com/'],
          ].map(([n, u]) => `<a class="btn small" href="${u}" target="_blank" rel="noopener">${n} ↗</a>`).join('')}
        </div>
      </div>
    </div>
  </div>
  <div class="actions">
    <button class="btn ghost" data-action="step" data-i="3">← Make changes</button>
    <button class="btn" data-action="new">✨ Start a new video</button>
  </div>`;
}

let pollTimer;
async function createVideo() {
  const p = P();
  if (!voiceReady()) {
    toast('Finish the Voice step first.', 'err');
    return go(2);
  }
  if (state.animating.size) return toast('Wait for the clips that are still animating, then try again.', 'err');
  await busy('render', async () => {
    const project = {
      title: p.title, description: p.description, hashtags: p.hashtags, format: p.format,
      captions: p.captions !== false && p.captionStyle !== 'off', captionStyle: p.captionStyle,
      music: p.music?.mode !== 'none' && p.music?.file ? { file: p.music.file, volume: p.music.volume } : null,
      voice: p.voice,
      scenes: p.scenes.map(({ id, text, keywords, media }) => ({ id, text, keywords, media })),
    };
    const { jobId } = await api('/api/render', { json: { project } });
    state.job = { id: jobId, status: 'running', progress: 0, message: 'Getting ready…' };
    state.video = null;
    state.ytResult = null;
    state.step = 4;
    poll();
  });
}

function poll() {
  clearTimeout(pollTimer);
  pollTimer = setTimeout(async () => {
    try {
      const job = await api(`/api/render/${state.job.id}`);
      state.job = job;
      if (job.status === 'done') {
        state.video = job.video;
        P().publishDesc = null; // rebuild with the new credits
        save();
        toast('Your video is ready! 🎉', 'ok');
      }
    } catch (err) {
      state.job = { status: 'error', error: err.message };
    }
    if (STEPS[state.step].key === 'export') render();
    if (state.job?.status === 'running') poll();
  }, 900);
}

async function ytUpload() {
  const v = state.video;
  await busy('yt', async () => {
    state.ytResult = await api('/api/youtube/upload', {
      json: { videoId: v.id, title: P().title, description: $('#pub-desc').value, tags: P().hashtags, privacy: $('#yt-privacy').value },
    });
    toast('Uploaded to YouTube 🎉', 'ok');
  });
}

async function share() {
  try {
    const blob = await (await fetch(state.video.url)).blob();
    const file = new File([blob], state.video.file, { type: 'video/mp4' });
    if (!navigator.canShare({ files: [file] })) throw new Error('Sharing files is not supported in this browser.');
    await navigator.share({ files: [file], title: P().title, text: P().title });
  } catch (err) {
    if (err.name !== 'AbortError') toast(err.message, 'err');
  }
}

// ---------------------------------------------------------------------------
// Connections drawer

const CONNECTIONS = [
  { group: 'Voice', name: 'elevenlabs', icon: '🎙️', title: 'ElevenLabs', desc: 'Realistic AI voiceovers', link: 'https://elevenlabs.io/app/settings/api-keys', linkText: 'Get your API key' },
  { group: 'Script writing', name: 'anthropic', icon: '✨', title: 'Claude', desc: 'Writes your scripts, titles and descriptions', link: 'https://console.anthropic.com/settings/keys', linkText: 'Get an API key' },
  { group: 'Free stock media', name: 'pexels', icon: '📹', title: 'Pexels', desc: 'Real HD video clips & photos. Recommended', link: 'https://www.pexels.com/api/new/', linkText: 'Get a free key' },
  { group: 'AI pictures & clips', name: 'fal', icon: '🪄', title: 'fal.ai', desc: 'AI pictures (FLUX) and AI video clips (Kling). Pay as you go', link: 'https://fal.ai/dashboard/keys', linkText: 'Get your fal.ai key' },
  { group: 'Free stock media', name: 'pixabay', icon: '🌄', title: 'Pixabay', desc: 'Free videos & photos', link: 'https://pixabay.com/api/docs/#api_search_images', linkText: 'Get a free key (shown once you log in)' },
];

function openDrawer() {
  renderDrawer();
  $('#drawer').classList.add('show');
  $('#scrim').classList.add('show');
  refreshStatus();
}

function renderDrawer() {
  const c = state.status?.connections || {};
  let lastGroup = '';
  const cards = CONNECTIONS.map((x) => {
    const st = c[x.name] || {};
    const head = x.group !== lastGroup ? `<div class="group-title">${x.group}</div>` : '';
    lastGroup = x.group;
    return `${head}
    <div class="conn">
      <div class="conn-head">
        <span class="conn-icon">${x.icon}</span>
        <div style="flex:1"><b>${x.title}</b><div class="muted small">${x.desc}</div></div>
        ${st.connected ? `<span class="pill ok">Connected</span>` : ''}
      </div>
      <div class="conn-body">
        ${st.connected
          ? `<div class="row spread"><span class="muted small">Key ${esc(st.hint)}${st.fromEnv ? ' (from environment)' : ''}</span>${st.fromEnv ? '' : `<button class="btn small danger" data-action="disconnect" data-name="${x.name}">Disconnect</button>`}</div>`
          : `<form class="key-row" data-form="key" data-name="${x.name}">
              <input class="input" type="password" name="key" placeholder="Paste API key" autocomplete="off" />
              <button class="btn primary" ${state.busy[`key-${x.name}`] ? 'disabled' : ''}>${spin(`key-${x.name}`, 'Connect', '')}</button>
            </form>
            <a class="tiny" href="${x.link}" target="_blank" rel="noopener">${x.linkText} ↗</a>`}
      </div>
    </div>`;
  }).join('');

  const yt = c.youtube || {};
  const redirect = `${location.origin}/api/youtube/callback`;
  $('#drawer').innerHTML = `
    <div class="row spread"><h2>Connections</h2><button class="icon-btn" data-action="close-overlays">✕</button></div>
    <p class="muted small">Keys are saved only on this computer (in the app's <code>data</code> folder) and never shown in the browser.</p>
    ${cards}
    <div class="conn" style="margin-top:12px">
      <div class="conn-head"><span class="conn-icon">🆓</span><div style="flex:1"><b>Openverse</b><div class="muted small">Free Creative Commons photos. Used automatically when Pexels and Pixabay aren't connected.</div></div><span class="pill ok">Always on</span></div>
    </div>

    <div class="group-title">Publishing</div>
    <div class="conn">
      <div class="conn-head"><span class="conn-icon">▶️</span><div style="flex:1"><b>YouTube</b><div class="muted small">Upload finished videos to your channel</div></div>${yt.connected ? '<span class="pill ok">Connected</span>' : yt.configured ? '<span class="pill warn">Not signed in</span>' : ''}</div>
      <div class="conn-body">
        ${yt.connected ? `<div class="row spread"><span class="small">${esc(yt.channel || 'Your channel')}</span><button class="btn small danger" data-action="disconnect" data-name="youtube">Disconnect</button></div>`
        : yt.configured ? `<a class="btn primary" href="/api/youtube/auth">Sign in with Google</a> <button class="btn small ghost danger" data-action="disconnect" data-name="youtube">Reset</button>`
        : `<details>
            <summary class="small" style="cursor:pointer">One-time setup (about 5 minutes)</summary>
            <ol class="small muted" style="padding-left:18px">
              <li>Open <a href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" target="_blank" rel="noopener">Google Cloud Console</a> and enable <b>YouTube Data API v3</b>.</li>
              <li>Create an <b>OAuth client ID</b> of type <b>Web application</b>.</li>
              <li>Add this as an authorised redirect URI:<br><code style="user-select:all">${esc(redirect)}</code></li>
              <li>On the OAuth consent screen, add your Google account as a test user.</li>
              <li>Paste the client ID and secret below.</li>
            </ol>
          </details>
          <form data-form="yt" class="stack" style="margin-top:10px">
            <input class="input" name="clientId" placeholder="Client ID" autocomplete="off" />
            <input class="input" name="clientSecret" type="password" placeholder="Client secret" autocomplete="off" />
            <button class="btn primary">Save & sign in</button>
          </form>`}
      </div>
    </div>
    ${state.status?.ffmpeg && !state.status.ffmpeg.ok ? `<p class="notice err small" style="margin-top:16px">Video engine problem: ${esc(state.status.ffmpeg.error)}</p>` : ''}`;
}

async function saveKey(name, key) {
  await busy(`key-${name}`, async () => {
    const out = await api(`/api/connections/${name}`, { json: { key } });
    state.status.connections = out.connections;
    await refreshStatus();
    if (name === 'elevenlabs') {
      state.voices = null;
      loadVoices(true);
    }
    if ((name === 'pexels' || name === 'pixabay') && STEPS[state.step].key === 'visuals') autoFindVisuals(true);
    toast('Connected ✓', 'ok');
  });
  renderDrawer();
}

async function disconnect(name) {
  if (!confirm('Disconnect this service?')) return;
  const out = await api(`/api/connections/${name}`, { method: 'DELETE' });
  state.status.connections = out.connections;
  await refreshStatus();
  if (name === 'elevenlabs') state.voices = null;
  renderDrawer();
  render();
}

async function refreshStatus() {
  try {
    state.status = await api('/api/status');
  } catch {
    /* server unreachable: keep old status */
  }
  if ($('#drawer').classList.contains('show')) renderDrawer();
  render();
}

// Library
async function openLibrary() {
  $('#modal').innerHTML = '<p class="muted">Loading…</p>';
  showModal();
  const { videos } = await api('/api/videos');
  $('#modal').innerHTML = `
    <div class="row spread"><h2>My videos</h2><button class="icon-btn" data-action="close-overlays">✕</button></div>
    ${videos.length ? videos.map((v) => `
      <div class="lib-item">
        <img src="${esc(v.thumb)}" alt="" loading="lazy" />
        <div><b>${esc(v.title)}</b><div class="muted small">${formatTime(v.duration)} · ${FORMATS[v.format]?.label || ''} · ${new Date(v.createdAt).toLocaleString()}</div></div>
        <div class="row">
          <a class="btn small" href="${esc(v.url)}" target="_blank" rel="noopener">▶ Play</a>
          <a class="btn small" href="/api/videos/${encodeURIComponent(v.id)}/download">⬇️</a>
          <button class="btn small danger" data-action="delete-video" data-id="${esc(v.id)}">🗑</button>
        </div>
      </div>`).join('') : '<p class="muted">No videos yet. Your finished videos will show up here.</p>'}`;
}

function showModal() {
  $('#modal').classList.add('show');
  $('#scrim').classList.add('show');
}

function closeOverlays() {
  $('#modal').classList.remove('show');
  $('#drawer').classList.remove('show');
  $('#scrim').classList.remove('show');
  chooser = null;
}

// ---------------------------------------------------------------------------
// Events

const actions = {
  home: () => go(0),
  step: (el) => go(Number(el.dataset.i)),
  example: (el) => { P().topic = el.dataset.v; save(); render(); },
  format: (el) => { P().format = el.dataset.v; save(); render(); },
  length: (el) => { P().lengthSec = Number(el.dataset.v); save(); render(); },
  tone: (el) => { P().tone = el.dataset.v; save(); render(); },
  'toggle-own': () => { P().showOwn = !P().showOwn; save(); render(); },
  write: () => generateScript(false),
  make: () => makeItForMe(),
  template: (el) => {
    const t = TEMPLATES.find((x) => x.id === el.dataset.v);
    if (!t) return;
    Object.assign(P(), { template: t.id, topic: t.topic, format: t.format, lengthSec: t.lengthSec, tone: t.tone, style: t.style, character: t.character || '', captionStyle: t.captionStyle, captions: true, music: { ...(P().music || {}), prompt: t.mood }, showOwn: false });
    save();
    render();
    toast(`${t.name} template loaded. Change the idea, or tap Make my video.`);
  },
  style: (el) => {
    const p = P();
    if (p.style === el.dataset.v) return;
    const wasAI = isAI(p.style);
    p.style = el.dataset.v;
    save();
    render();
    // On the Visuals step, switching style re-does the scenes (keeps your uploads).
    if (STEPS[state.step].key === 'visuals' && (wasAI || isAI(p.style))) {
      if (isAI(p.style) && conn('fal')) aiAllScenes(true);
      else if (!isAI(p.style)) autoFindVisuals(true);
    }
  },
  'ai-one': (el) => aiImageFor(P().scenes.find((s) => s.id === el.dataset.id)),
  'ai-all': () => aiAllScenes(true),
  animate: (el) => animateScene(P().scenes.find((s) => s.id === el.dataset.id)),
  'animate-all': () => {
    const pics = P().scenes.filter((s) => s.media?.type === 'image' && !state.animating.has(s.id));
    if (!pics.length) return;
    if (!confirm(`Animate ${pics.length} picture${pics.length > 1 ? 's' : ''}? Each clip takes 1 to 3 minutes and is billed by fal.ai.`)) return;
    pics.forEach((sc) => animateScene(sc));
  },
  'caption-style': (el) => { P().captionStyle = el.dataset.v; P().captions = el.dataset.v !== 'off'; save(); render(); },
  'music-mode': (el) => { P().music = { ...(P().music || {}), mode: el.dataset.v }; if (el.dataset.v === 'none') P().music.file = ''; save(); render(); if (el.dataset.v === 'upload' && !P().music.file) $('#file-music').click(); },
  mood: (el) => { P().music = { ...P().music, prompt: el.dataset.v }; save(); render(); },
  'make-music': () => makeMusic(),
  'pick-music-file': () => $('#file-music').click(),
  'music-volume': (el) => { P().music.volume = Number(el.dataset.v); save(); render(); },
  'use-own': () => generateScript(true),
  rewrite: () => (P().ownScript && P().showOwn ? generateScript(true) : generateScript(false)),
  'add-scene': () => {
    P().scenes.push({ id: uid(), text: '', keywords: '', media: null, alts: [] });
    save();
    render();
    const last = P().scenes.at(-1);
    $(`[data-scene-text="${last.id}"]`)?.focus();
  },
  'del-scene': (el) => {
    const p = P();
    if (p.scenes.length === 1) return toast('Your video needs at least one scene.', 'err');
    p.scenes = p.scenes.filter((s) => s.id !== el.dataset.id);
    save();
    render();
  },
  move: (el) => {
    const s = P().scenes;
    const i = s.findIndex((x) => x.id === el.dataset.id);
    const j = i + Number(el.dataset.dir);
    if (j < 0 || j >= s.length) return;
    [s[i], s[j]] = [s[j], s[i]];
    save();
    render();
  },
  'voice-mode': (el) => {
    const p = P();
    const mode = el.dataset.v;
    if (p.voice.mode === mode) return;
    // Remember each option so switching back and forth loses nothing.
    p.voiceMemory = p.voiceMemory || {};
    if (p.voice.mode) p.voiceMemory[p.voice.mode] = p.voice;
    p.voice = p.voiceMemory[mode]?.mode === mode ? p.voiceMemory[mode] : mode === 'elevenlabs' ? { mode, segments: [] } : { mode };
    applyVoiceDefaults();
    save();
    render();
    if (mode === 'elevenlabs') loadVoices();
  },
  'reload-voices': () => loadVoices(true),
  'pick-voice': (el) => { P().voice.voiceId = el.dataset.id; save(); render(); },
  preview: (el, e) => { e.stopPropagation(); playPreview(el.dataset.url); },
  'gen-voice': () => generateVoice(),
  'pick-voice-file': () => $('#file-voice').click(),
  refind: () => autoFindVisuals(true),
  swap: (el) => swap(el.dataset.id),
  choose: (el) => openChooser(el.dataset.id),
  'pick-media': (el) => {
    const sc = P().scenes.find((s) => s.id === chooser.id);
    const item = chooser.items[Number(el.dataset.i)];
    sc.media = item;
    if (!sc.alts?.some((x) => x.url === item.url)) sc.alts = chooser.items;
    save();
    closeOverlays();
    render();
  },
  'upload-media': (el) => { uploadTarget = el.dataset.id; $('#file-media').click(); },
  captions: (el) => { P().captions = el.checked; save(); render(); },
  create: () => createVideo(),
  copy: async (el) => {
    const t = $(`#${el.dataset.target}`);
    try {
      await navigator.clipboard.writeText(t.value);
      toast('Copied ✓', 'ok');
    } catch {
      t.select();
      document.execCommand('copy');
      toast('Copied ✓', 'ok');
    }
  },
  'yt-upload': () => ytUpload(),
  share: () => share(),
  new: () => {
    if (!confirm('Start a new video? Your current project will be cleared (finished videos stay in "My videos").')) return;
    const keepVoice = P().voice.mode === 'elevenlabs' ? { mode: 'elevenlabs', voiceId: P().voice.voiceId, segments: [] } : { mode: '' };
    state.project = { ...blankProject(), format: P().format, lengthSec: P().lengthSec, tone: P().tone, voice: keepVoice };
    state.job = null;
    state.video = null;
    go(0);
  },
  'open-connections': () => { closeOverlays(); openDrawer(); },
  'open-library': () => openLibrary().catch((e) => toast(e.message, 'err')),
  'close-overlays': () => closeOverlays(),
  disconnect: (el) => disconnect(el.dataset.name).catch((e) => toast(e.message, 'err')),
  'delete-video': async (el) => {
    if (!confirm('Delete this video for good?')) return;
    await api(`/api/videos/${encodeURIComponent(el.dataset.id)}`, { method: 'DELETE' });
    if (state.video?.id === el.dataset.id) { state.video = null; state.job = null; save(); render(); }
    openLibrary();
  },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.tagName === 'INPUT') return;
  const fn = actions[el.dataset.action];
  if (fn) {
    if (el.tagName === 'A' && !el.getAttribute('href')) e.preventDefault();
    if (el.dataset.action === 'home') e.preventDefault();
    fn(el, e);
  }
});

document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.matches('input[type=checkbox][data-action]')) actions[el.dataset.action]?.(el, e);
  if (el.matches('[data-model]')) { P().voice.modelId = el.value; save(); render(); }
  if (el.id === 'file-voice') { uploadVoice(el.files[0]); el.value = ''; }
  if (el.id === 'file-media') { uploadMedia(el.files[0]); el.value = ''; }
  if (el.id === 'file-music') { uploadMusic(el.files[0]); el.value = ''; }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeOverlays();
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.voice[data-action]')) {
    e.preventDefault();
    actions['pick-voice'](e.target);
  }
  // Ctrl/Cmd+Enter on the idea box writes the script.
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && e.target.id === 'topic') generateScript(false);
});

let statsTimer;
document.addEventListener('input', (e) => {
  const el = e.target;
  const p = P();
  if (el.dataset.bind) p[el.dataset.bind] = el.value;
  if (el.dataset.sceneText) {
    const sc = p.scenes.find((s) => s.id === el.dataset.sceneText);
    if (sc) sc.text = el.value;
    clearTimeout(statsTimer);
    statsTimer = setTimeout(() => { const s = $('#script-stats'); if (s) s.innerHTML = scriptStats(); }, 200);
  }
  if (el.dataset.sceneIp) {
    const sc = p.scenes.find((s) => s.id === el.dataset.sceneIp);
    if (sc) sc.imagePrompt = el.value;
  }
  if (el.matches('[data-music-prompt]')) p.music = { ...p.music, prompt: el.value };
  if (el.dataset.sceneKw) {
    const sc = p.scenes.find((s) => s.id === el.dataset.sceneKw);
    if (sc && sc.keywords !== el.value) {
      sc.keywords = el.value;
      // New search words means new visuals for this scene next time.
      if (sc.media?.source !== 'upload') { sc.media = null; sc.alts = []; sc.searched = false; }
    }
  }
  save();
});

document.addEventListener('submit', (e) => {
  const form = e.target;
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  if (form.dataset.form === 'key') saveKey(form.dataset.name, data.key);
  if (form.dataset.form === 'chooser') chooserSearch(data.q, data.kind);
  if (form.dataset.form === 'yt') {
    api('/api/youtube/config', { json: data })
      .then(() => { location.href = '/api/youtube/auth'; })
      .catch((err) => toast(err.message, 'err'));
  }
});

// Drag & drop voice files
document.addEventListener('dragover', (e) => {
  const d = e.target.closest?.('[data-drop]');
  if (d) { e.preventDefault(); d.classList.add('over'); }
});
document.addEventListener('dragleave', (e) => e.target.closest?.('[data-drop]')?.classList.remove('over'));
document.addEventListener('drop', (e) => {
  const d = e.target.closest?.('[data-drop]');
  if (!d) return;
  e.preventDefault();
  uploadVoice(e.dataTransfer.files[0]);
});

// Hover a video thumbnail to preview the clip.
document.addEventListener('mouseover', (e) => {
  const t = e.target.closest?.('[data-hover]');
  if (!t || !t.dataset.hover || t.querySelector('video')) return;
  const v = document.createElement('video');
  Object.assign(v, { src: t.dataset.hover, muted: true, autoplay: true, loop: true, playsInline: true });
  t.append(v);
  t.addEventListener('mouseleave', () => v.remove(), { once: true });
});

// ---------------------------------------------------------------------------
// Boot

restore();
const params = new URLSearchParams(location.search);
if (params.get('youtube') === 'connected') setTimeout(() => toast('YouTube connected ✓', 'ok'), 300);
if (params.get('youtube_error')) setTimeout(() => toast(params.get('youtube_error'), 'err'), 300);
if (location.search) history.replaceState(null, '', '/');
if (state.step === 4 && !state.video) state.step = state.project.scenes.length ? 3 : 0;
render();
refreshStatus().then(() => {
  if (STEPS[state.step].key === 'voice') loadVoices();
  if (STEPS[state.step].key === 'visuals') autoFindVisuals();
});
