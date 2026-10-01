# 🎬 AI Video Studio

Make a narrated video in five simple steps, right on your computer:

1. **Idea**: type what the video is about and pick where you'll post it (YouTube, Shorts/TikTok/Reels, or Instagram square).
2. **Script**: AI writes the script, split into scenes. Edit anything. You can also paste your own script.
3. **Voice**: pick a realistic AI voice from ElevenLabs, upload your own recording, or go captions-only.
4. **Visuals**: free stock videos and photos are matched to every scene. Swap, search, or upload your own.
5. **Export**: the app renders an MP4 with captions. Download it, upload straight to YouTube, or post it anywhere else.

Your work is saved automatically in the browser, so a refresh never loses anything.

## Use it on your phone

GitHub only shows the code. To use the app on your phone, it has to run somewhere your phone can reach. Pick one:

**Option A: free cloud link (works anywhere).**

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/dwuco/helloworld/tree/feature/ai-video-studio)

1. Tap the button and sign in to Render with your GitHub account (free).
2. Render asks for a few values. Make up an **APP_PASSWORD**. Paste your ElevenLabs and Pexels keys now, or later inside the app.
3. Wait for the first build (about 3 minutes), then open the `https://….onrender.com` link on your phone and sign in with your password.

Good to know about Render's free plan: the app sleeps after 15 minutes without use and takes about a minute to wake up. Its storage is wiped on every restart, so download finished videos right away. Keys you entered as Render settings are kept; keys pasted inside the app are not.

**Option B: your computer on the same Wi-Fi.**

```bash
APP_PASSWORD=pick-something npm start
```

The terminal prints the address to open on your phone, like `http://192.168.1.20:3000`. On Windows PowerShell, run `$env:APP_PASSWORD="pick-something"; npm start` instead.

Without `APP_PASSWORD` the app only accepts connections from the computer it runs on, and it refuses to start on a public address, because anyone who could reach it could spend your API credits.

## Phone version

`mobile/index.html` is a pocket edition that runs entirely in the phone's browser as a claude.ai page. Claude writes the script through your claude.ai account, so no API keys are needed. You add your own recording and camera-roll photos or clips. The video is recorded on the phone itself as MP4 (WebM on some Android browsers) and saved through the page's save prompt.

It cannot reach ElevenLabs, Pexels or YouTube directly, because claude.ai pages can't call outside services. Make an ElevenLabs voiceover in their app, download the MP3, and add it as your recording.

## Quick start

You need [Node.js](https://nodejs.org) 18.17 or newer.

```bash
npm install
npm start
```

Then open **http://localhost:3000**.

The video engine (ffmpeg) is downloaded automatically by `npm install`. If that download is blocked on your network, install ffmpeg yourself and make sure it is on your PATH. You can also point the app at a specific binary with `FFMPEG_PATH` and `FFPROBE_PATH`.

## Try it with zero setup

Everything works without any accounts, so you can test the whole flow first:

| Step | Without keys | With keys |
| --- | --- | --- |
| Script | Starter template you can edit | Claude writes a real script, title, description and hashtags |
| Voice | Upload your own audio, or no voice | ElevenLabs AI voices |
| Visuals | Free Creative Commons photos from Openverse | Free HD **video clips** and photos from Pexels and Pixabay |
| Publish | Download the MP4 | One-click YouTube upload |

## Connecting services

Click **Connections** in the top right, paste a key and press **Connect**. Each key is checked before it is saved.

**ElevenLabs:** ElevenLabs doesn't offer a "Sign in with ElevenLabs" button for other apps, so an API key from your own account is how the app connects. Once connected, the Voice step shows your name, plan and characters left, lists your own and cloned voices first, and lets you pick the voice model (for example Multilingual v2 for the most natural narration, or Flash for speed and lower cost). When creating the key, allow Text to Speech, Voices and User (read).

**Real video clips:** with Pexels (or Pixabay) connected, every scene gets an HD stock video clip, preferring clips long enough to cover the scene without looping. Without either, scenes use Creative Commons photos.

| Service | What it does | Where to get a key | Cost |
| --- | --- | --- | --- |
| ElevenLabs | AI voiceovers with your own account, voices and clones | [elevenlabs.io → API keys](https://elevenlabs.io/app/settings/api-keys) | Free tier available |
| Claude | Writes scripts | [console.anthropic.com → API keys](https://console.anthropic.com/settings/keys) | Pay per use, a script costs about a cent |
| Pexels | Real HD stock **video clips** + photos (recommended) | [pexels.com/api](https://www.pexels.com/api/new/) | Free |
| Pixabay | Free stock videos + photos | [pixabay.com/api/docs](https://pixabay.com/api/docs/) | Free |
| Openverse | Free CC photos | Nothing to do, always on | Free |

Keys are stored only on your computer in `data/settings.json`. They are never sent to the browser. You can also set them as environment variables: `ELEVENLABS_API_KEY`, `ANTHROPIC_API_KEY`, `PEXELS_API_KEY`, `PIXABAY_API_KEY`.

### YouTube publishing (optional, one-time setup)

YouTube requires your own Google OAuth app:

1. In [Google Cloud Console](https://console.cloud.google.com/apis/library/youtube.googleapis.com), enable **YouTube Data API v3**.
2. Create an **OAuth client ID** of type **Web application**.
3. Add `http://localhost:3000/api/youtube/callback` as an authorised redirect URI.
4. On the OAuth consent screen, add your Google account as a test user.
5. Paste the client ID and secret into **Connections → YouTube**, then sign in.

Uploads default to **Private** so you can review them in YouTube Studio before going public.

## How it works

- **Timing.** With an AI voice, each scene is recorded separately, so every clip lasts exactly as long as its narration. Only scenes you changed get re-recorded. With your own recording, the audio is spread across scenes by how much text each scene has. With no voice, scenes are timed for comfortable reading.
- **Visuals.** Video clips are cropped to fit the format and looped if they are short. Photos get a slow zoom. If a visual can't be downloaded, that scene falls back to a colour background and you get a warning instead of a failed render.
- **Captions.** Burned in using the bundled Montserrat font (SIL Open Font License, see `assets/fonts/OFL.txt`).
- **Credits.** Stock media credits are added to the publish description automatically. Keep them when you post, since Creative Commons photos require attribution.

Finished videos are saved in `data/videos/` and listed under **My videos**.

## Settings

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | Web server port |
| `HOST` | `127.0.0.1` | Only reachable from this computer. Set `0.0.0.0` to share on your network |
| `DATA_DIR` | `./data` | Where keys, uploads and videos are stored |
| `CLAUDE_MODEL` | `claude-opus-5-5` | Model used to write scripts |
| `ELEVENLABS_MODEL` | `eleven_multilingual_v2` | ElevenLabs voice model |

## Testing

```bash
npm test
```

The smoke test needs no internet or keys. It runs a fake ElevenLabs server, then goes through script writing, voice generation, uploads, and real renders in all three formats.

## Project layout

```
server.js            web server and API routes
lib/script.js        Claude script writer + no-key starter template
lib/voice.js         ElevenLabs voices and per-scene recording
lib/media.js         Pexels / Pixabay / Openverse search and downloads
lib/render.js        ffmpeg video pipeline and captions
lib/youtube.js       Google sign-in and YouTube upload
public/              the app you see in the browser (no build step)
public/shared/       scene timing shared by browser and server
```
