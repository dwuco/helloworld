import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function resolveBinary(envName, pkg, fallback) {
  if (process.env[envName]) return process.env[envName];
  try {
    const mod = require(pkg);
    const p = typeof mod === 'string' ? mod : mod?.path;
    if (p && fs.existsSync(p)) return p;
  } catch {
    /* optional dependency not installed */
  }
  return fallback;
}

export const FFMPEG = resolveBinary('FFMPEG_PATH', 'ffmpeg-static', 'ffmpeg');
export const FFPROBE = resolveBinary('FFPROBE_PATH', 'ffprobe-static', 'ffprobe');

export function run(bin, args, { cwd } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { cwd, windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => {
      stderr += d;
      if (stderr.length > 200_000) stderr = stderr.slice(-100_000);
    });
    child.on('error', (err) => {
      if (err.code === 'ENOENT') {
        reject(new Error(`Could not find "${bin}". Run "npm install" again, or install ffmpeg and make sure it is on your PATH.`));
      } else reject(err);
    });
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else {
        const tail = stderr.trim().split('\n').slice(-6).join('\n');
        reject(new Error(`ffmpeg failed (code ${code}): ${tail}`));
      }
    });
  });
}

export const ffmpeg = (args, opts) => run(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args], opts);

export async function probe(file) {
  const { stdout } = await run(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height', '-of', 'json', file]);
  const info = JSON.parse(stdout);
  const video = (info.streams || []).find((s) => s.codec_type === 'video');
  const audio = (info.streams || []).find((s) => s.codec_type === 'audio');
  return {
    duration: parseFloat(info.format?.duration) || 0,
    hasVideo: !!video,
    hasAudio: !!audio,
    width: video?.width || 0,
    height: video?.height || 0,
  };
}

let capabilities;
export async function ffmpegCapabilities() {
  if (capabilities) return capabilities;
  try {
    const { stdout } = await run(FFMPEG, ['-hide_banner', '-filters']);
    const version = (await run(FFMPEG, ['-version'])).stdout.split('\n')[0];
    capabilities = {
      ok: true,
      version,
      captions: /\ssubtitles\s/.test(stdout),
    };
  } catch (err) {
    capabilities = { ok: false, error: err.message, captions: false };
  }
  return capabilities;
}
