# Voice Visualizer

A real-time voice canvas. Beatbox, hum, or sing and watch Signal Theatre react on a near-black stage. Cue bundled house scenes with no microphone, or give the stage a live line through ElevenLabs.

**[Try it Live](https://voice-visualizer-eight.vercel.app)**

## Visual scenes

| Scene | Description |
|------|-------------|
| **Wave** | Luminous magenta waveform layers across the stage |
| **Radial** | Circular spectrum spokes with a beating core |
| **Cloud** | Depth particle field that blooms on loud tones |
| **Aurora** | Violet and magenta curtains driven by frequency |

## House reel

Bundled clips in `samples/` play through the same AnalyserNode as the microphone, so Wave, Radial, Cloud, and Aurora react with no mic and no API key.

| Cue | File | Paired visual |
|-----|------|----------------|
| **Monologue** | `samples/monologue.mp3` | Wave |
| **Whisper** | `samples/whisper.mp3` | Cloud |
| **Pulse** | `samples/pulse.mp3` | Radial |
| **Crescendo** | `samples/crescendo.mp3` | Aurora |
| **Whoosh Impact** | `samples/whoosh-impact.mp3` | Radial |

The Pulse control overlays the whoosh so it can punch an existing cue.

## Features

- Real-time pitch, level, and tempo sensing
- Four immersive visual scenes
- Cinematic idle state before the mic opens
- Scene library, Speak, and Morph cue board
- Clip recording with automatic sound portrait export
- Frame capture for stills
- Local microphone by default. Live voice calls only happen if you ask for Speak or Morph.

## ElevenLabs (optional live voice)

Scenes and Pulse work offline from the bundled MP3s. Speak and Morph need a key.

### Preferred: Vercel env var

This project already deploys on Vercel. Add a serverless key so the browser never sees it.

1. In the Vercel project, open **Settings → Environment Variables**.
2. Add `ELEVENLABS_API_KEY` with your ElevenLabs API key.
3. Redeploy.

Live routes used by the cue board:

- Speak calls `POST /api/tts`
- Morph calls `POST /api/morph`
- SFX generation hook is `POST /api/sfx`

Local live voice:

```bash
npx vercel dev
```

That serves the page and those `/api` routes together. A plain static server will not provide `/api/tts` or `/api/morph`.

### Optional: session key in the page

Open **Session key** on the cue board and paste an ElevenLabs API key. It is stored in `sessionStorage` only, labeled as a browser-session key, and sent as `x-elevenlabs-key` to `/api/tts` and `/api/morph`. If you are on a static host without those routes, the client falls back to the public ElevenLabs API with that same session key. CORS may block that fallback. Prefer `vercel dev` or the Vercel env var.

The house default voice is Instant Clone `9BYzVcM9pJCYJmEU4drb` (Rahul).

Do not commit an API key into the frontend.

## Quick start

```bash
git clone https://github.com/rahulmehta25/Voice-Visualizer.git
cd Voice-Visualizer

npx serve .
# or
python -m http.server 8000
```

Open `http://localhost:8000`. Play a house scene with no permission prompt, or press Listen and allow the microphone.

## Tech stack

- Web Audio API for analysis
- HTML5 Canvas for rendering
- Vanilla JS and CSS. No framework dependencies.
- Optional Vercel serverless proxies for ElevenLabs

## Project structure

```
Voice-Visualizer/
├── index.html      # Stage shell
├── styles.css      # Signal Theatre theme
├── app.js          # App controller
├── audio.js        # Mic, playback, and analysis
├── visuals.js      # Canvas engine and scenes
├── elevenlabs.js   # Scene catalog and ElevenLabs client
├── api/            # Vercel TTS, morph, and SFX proxies
├── samples/        # Bundled cinematic MP3s
├── harmonizer.js   # Optional tone generation
├── recorder.js     # Clip and portrait export
└── ACTIVITY_LOG.md # Build notes
```

## Controls

| Control | Action |
|---------|--------|
| **Listen / Silence** | Open or close the microphone |
| **Scenes / Speak / Morph** | Cue board for house reel, TTS, and voice morph |
| **Pulse** | One-click whoosh impact through the analyser |
| **Visuals 1 to 4** | Switch Wave, Radial, Cloud, Aurora |
| **Record** | Capture a short clip and generate a portrait |
| **Frame** | Save the current canvas as PNG |
| **Space** | Toggle listening |
| **R** | Toggle record |
| **S** | Save frame |
| **Esc** | Close portrait dialog |

## License

MIT
