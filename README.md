# Voice Visualizer

A real-time voice canvas. Beatbox, hum, or sing and watch Signal Theatre react on a near-black stage.

**[Try it Live](https://voice-visualizer-eight.vercel.app)**

## Visual scenes

| Scene | Description |
|------|-------------|
| **Wave** | Luminous magenta waveform layers across the stage |
| **Radial** | Circular spectrum spokes with a beating core |
| **Cloud** | Depth particle field that blooms on loud tones |
| **Aurora** | Violet and magenta curtains driven by frequency |

## Features

- Real-time pitch, level, and tempo sensing
- Four immersive visual scenes
- Cinematic idle state before the mic opens
- Clip recording with automatic sound portrait export
- Frame capture for stills
- Local microphone only. Nothing is uploaded.

## Quick start

```bash
git clone https://github.com/rahulmehta25/Voice-Visualizer.git
cd Voice-Visualizer

npx serve .
# or
python -m http.server 8000
```

Open `http://localhost:8000` and allow microphone access.

## Tech stack

- Web Audio API for analysis
- HTML5 Canvas for rendering
- Vanilla JS and CSS. No framework dependencies.

## Project structure

```
Voice-Visualizer/
├── index.html      # Stage shell
├── styles.css      # Signal Theatre theme
├── app.js          # App controller
├── audio.js        # Mic input and analysis
├── visuals.js      # Canvas engine and scenes
├── harmonizer.js   # Optional tone generation
├── recorder.js     # Clip and portrait export
└── ACTIVITY_LOG.md # Build notes
```

## Controls

| Control | Action |
|---------|--------|
| **Listen / Silence** | Open or close the microphone |
| **Scenes 1 to 4** | Switch Wave, Radial, Cloud, Aurora |
| **Record** | Capture a short clip and generate a portrait |
| **Frame** | Save the current canvas as PNG |
| **Space** | Toggle listening |
| **R** | Toggle record |
| **S** | Save frame |
| **Esc** | Close portrait dialog |

## License

MIT
