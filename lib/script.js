import Anthropic from '@anthropic-ai/sdk';
import { getKey } from './settings.js';

const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-5-5';

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'description', 'hashtags', 'scenes'],
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    hashtags: { type: 'array', items: { type: 'string' } },
    scenes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['narration', 'visual', 'image_prompt'],
        properties: {
          narration: { type: 'string' },
          visual: { type: 'string' },
          image_prompt: { type: 'string' },
        },
      },
    },
  },
};

const SYSTEM = `You write voiceover scripts for short faceless videos that are illustrated with free stock footage.

Each scene is one or two spoken sentences that will be read aloud by a text-to-speech voice, so write for the ear: plain words, no stage directions, no emojis, no markdown, no "[music]" cues, no speaker labels.

For each scene also give "visual": a 1-3 word search phrase for a stock video library (Pexels / Pixabay) that would show something concrete and filmable for that line, such as "ocean waves", "city traffic night" or "woman typing laptop". Avoid abstract words, brand names and named people, since stock libraries rarely have them.

Also give "image_prompt": one vivid sentence describing a single frame for an AI image generator: subject, action, setting, lighting and camera angle. Never ask for text, letters or logos in the image. If the request names a main character, describe that character with the same wording every time they appear so they look consistent.

Also write a catchy title (under 70 characters), a 2-3 sentence description for the upload page, and 3-6 relevant hashtags without the # sign.`;

export function claudeConnected() {
  return !!getKey('anthropic');
}

function lengthGuide(lengthSec) {
  const words = Math.round(lengthSec * 2.5);
  const scenes = Math.min(16, Math.max(4, Math.round(lengthSec / 7)));
  return { words, scenes };
}

async function callClaude(prompt) {
  const client = new Anthropic({ apiKey: getKey('anthropic') });
  const params = {
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
    messages: [{ role: 'user', content: prompt }],
  };

  let response;
  try {
    // Server-side fallback: if a safety classifier declines, Anthropic re-runs it on a fallback model.
    response = await client.beta.messages.create({
      ...params,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new Error('Claude rejected the API key. Check it in Connections.');
    if (err instanceof Anthropic.BadRequestError) {
      response = await client.messages.create(params); // account without the fallback beta
    } else if (err instanceof Anthropic.RateLimitError) {
      throw new Error('Claude is rate limiting this key right now. Wait a minute and try again.');
    } else throw err;
  }

  if (response.stop_reason === 'refusal') {
    throw new Error('Claude declined to write this script. Try rewording the topic.');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('The script came back too long. Try a shorter video length.');
  }
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return JSON.parse(text);
}

export async function writeScript({ topic, tone, lengthSec, format, script, style, character }) {
  const { words, scenes } = lengthGuide(lengthSec);
  const platform = format === 'portrait' ? 'a vertical short (TikTok / YouTube Shorts / Reels)' : format === 'square' ? 'an Instagram feed video' : 'a YouTube video';

  const extras = `${style && style !== 'stock' ? `\nVisual style for the AI images: ${style}.` : ''}${character?.trim() ? `\nMain character (keep identical in every image prompt where they appear): ${character.trim()}` : ''}`;
  if (claudeConnected()) {
    let prompt;
    if (script?.trim()) {
      prompt = `Here is a finished voiceover script for ${platform}. Split it into scenes WITHOUT changing a single word of the narration (keep the exact wording, just divide it at natural sentence boundaries; aim for about ${scenes} scenes). Then add the visual search phrase and image prompt for each scene, plus a title, description and hashtags.${extras}\n\n<script>\n${script.trim()}\n</script>`;
    } else {
      prompt = `Write a script for ${platform}.\n\nTopic: ${topic}\nTone: ${tone || 'friendly'}\nTarget length: about ${lengthSec} seconds when spoken, which is roughly ${words} words in total across about ${scenes} scenes.\n\nOpen with a strong hook in the first scene and end with a short call to action.${extras}`;
    }
    const out = await callClaude(prompt);
    return {
      writer: 'claude',
      title: out.title,
      description: out.description,
      hashtags: out.hashtags.map((h) => h.replace(/^#/, '').replace(/\s+/g, '')),
      scenes: out.scenes.map((s) => ({ text: s.narration.trim(), keywords: s.visual.trim(), imagePrompt: (s.image_prompt || '').trim() })).filter((s) => s.text),
    };
  }

  const out = script?.trim() ? splitOwnScript(script, topic) : starterScript({ topic, lengthSec });
  // Without Claude, the AI image prompt is the scene itself plus the topic for context.
  out.scenes.forEach((s) => (s.imagePrompt = `${character?.trim() ? `${character.trim()}, ` : ''}${s.text.replace(/[.!?]+$/, '')}${topic ? `, about ${topic}` : ''}`));
  return out;
}

// ---------------------------------------------------------------------------
// No-AI fallbacks so the whole app can be tested without any API keys.

const STOP = new Set(
  'a an the and or but if then so of to in on at by for with about from into over under is are was were be been being it its this that these those you your we our they their i me my he she his her them as than too very can will just do does did not no yes how what why when where who which there here more most some any all every each much many make made get got have has had one two three five ten things thing ways way facts fact tips tip guide secrets surprising amazing best top why really'.split(' ')
);

export function keywordsFrom(text, max = 2) {
  const words = (text || '').toLowerCase().replace(/[^a-z0-9\s'-]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
  const counts = new Map();
  words.forEach((w, i) => counts.set(w, (counts.get(w) || 0) + 1 + (words.length - i) / 1000));
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length).slice(0, max).map(([w]) => w).join(' ');
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function starterScript({ topic, lengthSec }) {
  const t = (topic || 'something amazing').trim().replace(/[.?!]+$/, '');
  const main = keywordsFrom(t, 2) || 'nature';
  const one = main.split(' ')[0];
  const lines = [
    [`Here's something worth a minute of your time: ${t}.`, main],
    [`Most people never stop to think about it, but it shapes more of the world than you might expect.`, `${one} closeup`],
    [`It all starts with a simple idea, and that idea grows into something much bigger.`, `${one} sunrise`],
    [`Look closer and you'll find small details that are easy to miss, and hard to forget.`, `${one} detail`],
    [`Every day, people around the world discover new ways to enjoy it.`, `people ${one}`],
    [`And the best part is that you don't need to be an expert to appreciate it.`, `happy people`],
    [`Some of the most interesting moments happen when nobody is watching.`, `${one} slow motion`],
    [`Once you start noticing it, you'll see it everywhere.`, `${one} aerial`],
    [`So next time you come across it, take a second look.`, `${main}`],
    [`If you learned something new, share this with a friend and follow for more.`, `${one} beautiful`],
  ];
  const n = Math.min(lines.length, Math.max(4, Math.round(lengthSec / 6)));
  const picked = [...lines.slice(0, n - 1), lines[lines.length - 1]];
  return {
    writer: 'basic',
    title: cap(t).slice(0, 90),
    description: `A quick look at ${t}. Made with AI Video Studio.`,
    hashtags: main.split(' ').concat(['shorts', 'learn']).slice(0, 4),
    scenes: picked.map(([text, keywords]) => ({ text, keywords })),
  };
}

function splitOwnScript(script, topic) {
  const sentences = script.replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) || [script];
  const scenes = [];
  let buf = '';
  for (const s of sentences) {
    buf = buf ? `${buf} ${s.trim()}` : s.trim();
    if (buf.split(' ').length >= 14) {
      scenes.push(buf);
      buf = '';
    }
  }
  if (buf) scenes.push(buf);
  const fallback = keywordsFrom(topic || script, 2) || 'nature';
  return {
    writer: 'basic',
    title: cap((topic || scenes[0] || 'My video').replace(/[.?!]+$/, '')).slice(0, 90),
    description: scenes[0] || '',
    hashtags: fallback.split(' '),
    scenes: scenes.map((text) => ({ text, keywords: keywordsFrom(text, 2) || fallback })),
  };
}

export async function testClaude(key) {
  const client = new Anthropic({ apiKey: key });
  await client.models.retrieve(MODEL);
}
