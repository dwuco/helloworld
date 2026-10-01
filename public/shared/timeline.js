// Shared by the browser and the server so scene timing is always identical.

export const FPS = 30;
export const VOICE_GAP = 0.35; // breathing room after each AI voice line (seconds)
export const OUTRO = 0.6; // extra hold on the last scene

export const FORMATS = {
  landscape: { w: 1920, h: 1080, label: 'Landscape 16:9', hint: 'YouTube' },
  portrait: { w: 1080, h: 1920, label: 'Vertical 9:16', hint: 'Shorts · TikTok · Reels' },
  square: { w: 1080, h: 1080, label: 'Square 1:1', hint: 'Instagram feed' },
};

export function wordCount(text) {
  return (text || '').trim().split(/\s+/).filter(Boolean).length;
}

// Typical narration speed is ~150 words per minute (2.5 words/sec).
export function estimateSeconds(text) {
  return Math.max(2.5, wordCount(text) / 2.5 + 0.4);
}

function snap(seconds) {
  return Math.max(1, Math.round(seconds * FPS)) / FPS;
}

/** Does the AI voiceover still match the script? */
export function staleVoiceScenes(scenes, voice) {
  if (!voice || voice.mode !== 'elevenlabs') return [];
  return scenes.filter((s) => {
    const seg = (voice.segments || []).find((g) => g.sceneId === s.id);
    const modelChanged = voice.modelId && (seg?.modelId || voice.modelId) !== voice.modelId;
    return !seg || seg.text !== s.text.trim() || seg.voiceId !== voice.voiceId || modelChanged;
  });
}

/**
 * Work out how long every scene lasts.
 * - AI voice: each scene lasts as long as its own voice clip.
 * - Uploaded voice: the audio is shared across scenes by how much text each has.
 * - No voice: estimated reading time.
 */
export function computeTimeline(scenes, voice) {
  let durations;
  if (voice?.mode === 'elevenlabs') {
    durations = scenes.map((s) => {
      const seg = (voice.segments || []).find((g) => g.sceneId === s.id && g.text === s.text.trim());
      return seg ? seg.duration + VOICE_GAP : estimateSeconds(s.text);
    });
    if (durations.length) durations[durations.length - 1] += OUTRO;
  } else if (voice?.mode === 'upload' && voice.duration > 0) {
    const weights = scenes.map((s) => Math.max(s.text.trim().length, 12));
    const total = weights.reduce((a, b) => a + b, 0) || 1;
    durations = weights.map((w) => (voice.duration * w) / total);
  } else {
    durations = scenes.map((s) => estimateSeconds(s.text));
  }

  let t = 0;
  const items = scenes.map((s, i) => {
    const duration = snap(durations[i]);
    const item = { id: s.id, start: t, duration, frames: Math.round(duration * FPS) };
    t += duration;
    return item;
  });
  return { items, total: t };
}

export function formatTime(sec) {
  const s = Math.round(sec || 0);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
