import { ffmpeg } from './ffmpeg.js';

/**
 * Build one narration track that lines up exactly with the scene timeline.
 * pieces: [{ file|null, duration }] in scene order (file null = silence)
 * Output codec is picked from the extension (.m4a -> AAC, .mp3 -> MP3).
 */
export async function buildSceneAudio(pieces, outFile) {
  const args = [];
  const filters = [];
  pieces.forEach((p, i) => {
    if (p.file) args.push('-i', p.file);
    else args.push('-f', 'lavfi', '-t', p.duration.toFixed(3), '-i', 'anullsrc=r=48000:cl=stereo');
    filters.push(`[${i}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,apad,atrim=0:${p.duration.toFixed(3)},asetpts=N/SR/TB[a${i}]`);
  });
  const total = pieces.reduce((a, p) => a + p.duration, 0);
  const graph = `${filters.join(';')};${pieces.map((_, i) => `[a${i}]`).join('')}concat=n=${pieces.length}:v=0:a=1[out]`;
  await ffmpeg([...args, '-filter_complex', graph, '-map', '[out]', '-t', total.toFixed(3), ...codecFor(outFile), outFile]);
}

/** Uploaded voiceover: normalise it and pad/trim to the video length. */
export async function buildUploadedAudio(file, total, outFile) {
  await ffmpeg(['-i', file, '-vn', '-af', 'aresample=48000,aformat=channel_layouts=stereo,apad', '-t', total.toFixed(3), ...codecFor(outFile), outFile]);
}

export async function buildSilence(total, outFile) {
  await ffmpeg(['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', total.toFixed(3), ...codecFor(outFile), outFile]);
}

function codecFor(file) {
  return file.endsWith('.mp3') ? ['-c:a', 'libmp3lame', '-b:a', '160k'] : ['-c:a', 'aac', '-b:a', '192k'];
}

/**
 * Lay background music under the narration. The music loops to fill the video, fades in and out,
 * and dips automatically whenever someone is speaking (sidechain "ducking").
 */
export async function mixMusic(narration, music, total, outFile, { volume = 0.3, hasVoice = true } = {}) {
  const fadeOut = Math.max(0, total - 2).toFixed(2);
  const m = `[1:a]aresample=48000,aformat=channel_layouts=stereo,volume=${volume.toFixed(2)},afade=t=in:d=1,afade=t=out:st=${fadeOut}:d=2[m]`;
  const graph = hasVoice
    ? `${m};[0:a]asplit=2[v1][v2];[m][v2]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[md];[v1][md]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[out]`
    : `${m};[0:a][m]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[out]`;
  await ffmpeg(['-i', narration, '-stream_loop', '-1', '-i', music, '-filter_complex', graph, '-map', '[out]', '-t', total.toFixed(3), ...codecFor(outFile), outFile]);
}
