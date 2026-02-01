# 🎤✨ Voice Visualizer

A real-time audio visualization web app. Beatbox, hum, or sing and watch stunning visuals react to your voice!

**[Try it Live →](https://voice-visualizer-eight.vercel.app)**

## 🎨 Visual Modes

| Mode | Description |
|------|-------------|
| 🌊 **Waves** | Flowing waveforms that dance with your voice |
| ✨ **Particles** | Exploding particle systems reacting to beats |
| 🔷 **Geometric** | Sacred geometry patterns that pulse with sound |
| 🌀 **Abstract** | Fluid, organic shapes driven by audio |
| 🎆 **Fireworks** | Beat-reactive explosions of color |

## ✨ Features

- **Real-time audio analysis** - Pitch, volume, and BPM detection
- **5 stunning visual modes** - Each with unique aesthetics
- **Harmonizer** - Generates accompanying tones to your voice
- **Recording** - Capture and export your sessions
- **Customizable** - Adjust sensitivity, colors, and effects
- **Dark theme** - Beautiful neon-on-dark UI

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/rahulmehta25/Voice-Visualizer.git
cd Voice-Visualizer

# Serve locally (any static server works)
npx serve .
# or
python -m http.server 8000
```

Then open `http://localhost:8000` and allow microphone access.

## 🛠️ Tech Stack

- **Audio Processing:** Web Audio API
- **Visualization:** HTML5 Canvas
- **UI:** Vanilla JS with glassmorphism CSS
- **No dependencies** - Pure browser APIs

## 📁 Project Structure

```
Voice-Visualizer/
├── index.html      # Main page
├── styles.css      # Dark theme with neon accents
├── app.js          # Main app controller
├── audio.js        # Web Audio API, mic input, analysis
├── visuals.js      # Canvas rendering engine
├── harmonizer.js   # Tone generation
├── recorder.js     # Recording functionality
└── ACTIVITY_LOG.md # Build documentation
```

## 🎛️ Controls

| Control | Function |
|---------|----------|
| **Mode Selector** | Switch between 5 visual modes |
| **Sensitivity** | Adjust reactivity to audio |
| **Color Theme** | Change the color palette |
| **Harmonize** | Toggle accompanying tones |
| **Record** | Start/stop recording session |

## 📊 Stats Display

- **Pitch** - Detected fundamental frequency
- **Volume** - Current audio level
- **BPM** - Estimated beats per minute
- **Frequency Bars** - Real-time spectrum analyzer

## 📝 License

MIT

## 🤝 Contributing

PRs welcome! Feel free to add new visual modes or features.
