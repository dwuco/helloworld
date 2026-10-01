import crypto from 'node:crypto';
import express from 'express';

// When the app runs on a public address (e.g. so you can use it from your phone),
// APP_PASSWORD keeps everyone else out. Your API keys live on this server, so this matters.

const COOKIE = 'avs_session';
const MAX_AGE = 30 * 24 * 3600; // 30 days
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();

function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return '';
}

export function installAuth(app, password) {
  const token = crypto.createHmac('sha256', password).update('ai-video-studio-session').digest('hex');
  const attempts = new Map(); // ip -> {count, until}

  app.get('/login', (req, res) => res.type('html').send(page(req.query.e)));

  app.post('/login', express.urlencoded({ extended: false, limit: '4kb' }), (req, res) => {
    const ip = req.ip || 'unknown';
    const a = attempts.get(ip) || { count: 0, until: 0 };
    if (a.until > Date.now()) return res.redirect('/login?e=wait');
    const ok = crypto.timingSafeEqual(sha(req.body?.password || ''), sha(password));
    if (!ok) {
      a.count += 1;
      if (a.count >= 8) Object.assign(a, { count: 0, until: Date.now() + 10 * 60_000 });
      attempts.set(ip, a);
      return res.redirect('/login?e=1');
    }
    attempts.delete(ip);
    const secure = req.secure ? '; Secure' : '';
    res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; SameSite=Lax${secure}`);
    res.redirect('/');
  });

  app.post('/logout', (req, res) => {
    res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
    res.redirect('/login');
  });

  app.use((req, res, next) => {
    const got = readCookie(req, COOKIE);
    if (got.length === token.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(token))) return next();
    if (req.path.startsWith('/api/') || req.path.startsWith('/files/')) return res.status(401).json({ error: 'Please sign in again.' });
    res.redirect('/login');
  });
}

function page(error) {
  const msg = error === 'wait' ? 'Too many tries. Wait 10 minutes and try again.' : error ? 'That password is not right.' : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>AI Video Studio</title>
<style>
:root{--bg:#f6f5fb;--card:#fff;--ink:#17132b;--muted:#6b6784;--line:#e6e3f0;--accent:#6a46ff;--err:#d6334a}
@media (prefers-color-scheme:dark){:root{--bg:#0f0d1a;--card:#19162a;--ink:#f1eefc;--muted:#a39fbd;--line:#2c2843;--accent:#8a6dff;color-scheme:dark}}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:16px}
form{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:28px;width:min(380px,100%);display:flex;flex-direction:column;gap:14px}
h1{margin:0;font-size:24px}p{margin:0;color:var(--muted)}
input{font:inherit;color:inherit;background:var(--card);border:1.5px solid var(--line);border-radius:12px;padding:12px 14px}
input:focus{outline:none;border-color:var(--accent)}
button{font:inherit;font-weight:700;border:0;border-radius:12px;padding:13px;background:var(--accent);color:#fff;cursor:pointer}
.err{color:var(--err);font-size:14px}
</style></head><body>
<form method="post" action="/login">
<h1>🎬 AI Video Studio</h1><p>Enter the app password you chose when you set it up.</p>
${msg ? `<div class="err">${msg}</div>` : ''}
<input type="password" name="password" placeholder="Password" autocomplete="current-password" autofocus required>
<button>Sign in</button>
</form></body></html>`;
}
