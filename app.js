/**
 * Voice Visualizer App
 * Coordinates audio analysis, rendering, recording, and portrait generation.
 */

class VoiceVisualizerApp {
    constructor() {
        this.audioEngine = null;
        this.visualEngine = null;
        this.recorder = null;

        this.isRunning = false;
        this.currentMode = 'waveform';
        this.recordingMetrics = null;
        this.lastPortrait = null;
        this.beatIndicatorTimer = null;

        this.modeLabels = {
            waveform: 'Waveform',
            radial: 'Radial Spectrum',
            cloud: '3D Cloud',
            aurora: 'Northern Lights'
        };

        this.modePalettes = {
            waveform: ['#57f5ff', '#77b5ff', '#9e5bff'],
            radial: ['#7ff7ff', '#74b8ff', '#ffb861'],
            cloud: ['#7ee1ff', '#88a8ff', '#d08cff'],
            aurora: ['#74ffca', '#7cd2ff', '#9d7aff']
        };

        this.canvas = document.getElementById('visualizer');
        this.startBtn = document.getElementById('startBtn');
        this.recordBtn = document.getElementById('recordBtn');
        this.screenshotBtn = document.getElementById('screenshotBtn');
        this.levelBar = document.getElementById('levelBar');
        this.beatIndicator = document.getElementById('beatIndicator');
        this.pitchValue = document.getElementById('pitchValue');
        this.volumeValue = document.getElementById('volumeValue');
        this.bpmValue = document.getElementById('bpmValue');
        this.modeValue = document.getElementById('modeValue');
        this.freqBars = document.getElementById('freqBars');
        this.recordingIndicator = document.getElementById('recordingIndicator');
        this.recTime = document.getElementById('recTime');

        this.portraitPanel = document.getElementById('portraitPanel');
        this.portraitPreview = document.getElementById('portraitPreview');
        this.portraitDownload = document.getElementById('portraitDownload');
        this.portraitShare = document.getElementById('portraitShare');
        this.portraitClose = document.getElementById('portraitClose');

        this.init();
    }

    init() {
        this.visualEngine = new VisualEngine(this.canvas);
        this.recorder = new Recorder(this.canvas);

        this.createFrequencyBars();
        this.setupEventListeners();
        this.setupRecorderCallbacks();
        this.modeValue.textContent = this.modeLabels[this.currentMode];

        this.renderLoop();
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.toggleAudio());

        this.recordBtn.addEventListener('click', async () => {
            if (!this.isRunning || !this.audioEngine) {
                this.showToast('Start the mic first to record a portrait clip.', 'error');
                return;
            }

            if (!this.recorder.isRecording) {
                const ok = await this.recorder.startRecording({ maxDurationMs: 9000 });
                if (ok) {
                    this.startMetricsCapture();
                    this.showToast('Recording clip. Portrait will generate automatically.', 'success');
                } else {
                    this.showToast('Unable to start recording clip.', 'error');
                }
            } else {
                this.recorder.stopRecording();
            }
        });

        this.screenshotBtn.addEventListener('click', () => {
            const ok = this.recorder.takeScreenshot();
            this.showToast(ok ? 'Snapshot saved.' : 'Snapshot failed.', ok ? 'success' : 'error');
        });

        document.querySelectorAll('.mode-btn').forEach((button) => {
            button.addEventListener('click', () => {
                const mode = button.dataset.mode;
                this.setMode(mode);
            });
        });

        this.portraitClose.addEventListener('click', () => {
            this.portraitPanel.classList.add('hidden');
        });

        this.portraitShare.addEventListener('click', () => this.sharePortrait());

        document.addEventListener('keydown', (event) => {
            const key = event.key.toLowerCase();
            if (key === ' ') {
                event.preventDefault();
                this.toggleAudio();
                return;
            }

            if (key === 'r') {
                event.preventDefault();
                this.recordBtn.click();
                return;
            }

            if (['1', '2', '3', '4'].includes(key)) {
                const map = ['waveform', 'radial', 'cloud', 'aurora'];
                this.setMode(map[Number(key) - 1]);
            }
        });
    }

    setupRecorderCallbacks() {
        this.recorder.onRecordingStart = () => {
            this.recordBtn.classList.add('recording');
            this.recordBtn.querySelector('.text').textContent = 'Stop Recording';
            this.recordingIndicator.classList.remove('hidden');
            this.recTime.textContent = '00:00';
        };

        this.recorder.onRecordingStop = async ({ blob, durationMs }) => {
            this.recordBtn.classList.remove('recording');
            this.recordBtn.querySelector('.text').textContent = 'Record Clip + Portrait';
            this.recordingIndicator.classList.add('hidden');

            if (blob) {
                this.showToast('Clip saved. Generating sound portrait...', 'success');
            }

            if (!this.recordingMetrics || this.recordingMetrics.frames < 2) {
                this.showToast('Not enough audio data for a portrait.', 'error');
                return;
            }

            const payload = this.buildPortraitPayload(durationMs);
            this.lastPortrait = await this.recorder.generateSoundPortrait(payload);

            if (this.lastPortrait?.dataUrl) {
                this.portraitPreview.src = this.lastPortrait.dataUrl;
                this.portraitDownload.href = this.lastPortrait.dataUrl;
                this.portraitDownload.download = this.lastPortrait.fileName;

                this.recorder.downloadDataUrl(this.lastPortrait.dataUrl, this.lastPortrait.fileName);

                this.portraitPanel.classList.remove('hidden');
                this.showToast('Sound portrait generated and downloaded.', 'success');
            } else {
                this.showToast('Portrait generation failed.', 'error');
            }
        };

        this.recorder.onTimeUpdate = (timeLabel) => {
            this.recTime.textContent = timeLabel;
        };
    }

    async toggleAudio() {
        if (!this.isRunning) {
            this.audioEngine = new AudioEngine();
            const ok = await this.audioEngine.init();
            if (!ok) {
                this.audioEngine = null;
                this.showToast('Microphone access was denied.', 'error');
                return;
            }

            this.audioEngine.setSensitivity(58);
            this.audioEngine.onBeat = (intensity) => {
                this.triggerBeatIndicator(intensity);
            };

            this.isRunning = true;
            this.startBtn.classList.add('active');
            this.startBtn.querySelector('.text').textContent = 'Stop Mic';
            this.showToast('Microphone active. Switch modes and record a portrait.', 'success');
            return;
        }

        if (this.recorder.isRecording) {
            this.recorder.stopRecording();
        }

        if (this.audioEngine) {
            this.audioEngine.stop();
            this.audioEngine = null;
        }

        this.isRunning = false;
        this.startBtn.classList.remove('active');
        this.startBtn.querySelector('.text').textContent = 'Start Mic';

        this.updateStats({ volume: 0, pitch: '--', bpm: '--' });
        this.updateFrequencyBars([]);
        this.levelBar.style.width = '0%';
    }

    setMode(mode) {
        if (!mode || !this.modeLabels[mode]) {
            return;
        }

        this.currentMode = mode;
        this.visualEngine.setMode(mode);
        this.modeValue.textContent = this.modeLabels[mode];

        document.querySelectorAll('.mode-btn').forEach((button) => {
            button.classList.toggle('active', button.dataset.mode === mode);
        });
    }

    createFrequencyBars() {
        const total = 48;
        this.freqBars.innerHTML = '';

        for (let i = 0; i < total; i++) {
            const bar = document.createElement('div');
            bar.className = 'freq-bar';
            bar.style.height = '4px';
            this.freqBars.appendChild(bar);
        }
    }

    updateFrequencyBars(frequencies) {
        const bars = this.freqBars.children;
        const total = bars.length;
        for (let i = 0; i < total; i++) {
            const idx = frequencies.length ? Math.floor((i / total) * frequencies.length) : 0;
            const value = frequencies[idx] || 0;
            const height = 4 + value * 46;
            bars[i].style.height = `${height}px`;
        }
    }

    updateStats({ volume, pitch, bpm }) {
        this.volumeValue.textContent = `${Math.round((volume || 0) * 100)}%`;

        if (typeof pitch === 'number' && Number.isFinite(pitch) && pitch > 0) {
            this.pitchValue.textContent = `${Math.round(pitch)}Hz`;
        } else {
            this.pitchValue.textContent = pitch || '--';
        }

        this.bpmValue.textContent = bpm && bpm > 0 ? String(bpm) : '--';
        this.levelBar.style.width = `${Math.min(100, Math.max(0, (volume || 0) * 100))}%`;
    }

    triggerBeatIndicator(intensity = 0.5) {
        this.beatIndicator.classList.add('active');
        const scale = 1 + Math.min(0.8, intensity * 0.65);
        this.beatIndicator.style.transform = `scale(${scale})`;

        clearTimeout(this.beatIndicatorTimer);
        this.beatIndicatorTimer = setTimeout(() => {
            this.beatIndicator.classList.remove('active');
            this.beatIndicator.style.transform = 'scale(1)';
        }, 180);
    }

    startMetricsCapture() {
        this.recordingMetrics = {
            startedAt: Date.now(),
            modeAtStart: this.currentMode,
            frames: 0,
            volumeSum: 0,
            peakVolume: 0,
            bpmSamples: [],
            noteCounts: {},
            beatCount: 0,
            frequencySums: new Array(64).fill(0)
        };
    }

    collectMetrics(audioData) {
        if (!this.recorder.isRecording || !this.recordingMetrics) {
            return;
        }

        this.recordingMetrics.frames += 1;
        this.recordingMetrics.volumeSum += audioData.volume || 0;
        this.recordingMetrics.peakVolume = Math.max(this.recordingMetrics.peakVolume, audioData.volume || 0);

        if (audioData.isBeat) {
            this.recordingMetrics.beatCount += 1;
        }

        if (this.audioEngine?.bpm && this.audioEngine.bpm > 0) {
            this.recordingMetrics.bpmSamples.push(this.audioEngine.bpm);
        }

        if (this.audioEngine?.dominantNote) {
            const note = this.audioEngine.dominantNote;
            this.recordingMetrics.noteCounts[note] = (this.recordingMetrics.noteCounts[note] || 0) + 1;
        }

        const freqs = audioData.frequencies || [];
        const bucketCount = this.recordingMetrics.frequencySums.length;
        for (let i = 0; i < bucketCount; i++) {
            const idx = freqs.length ? Math.floor((i / bucketCount) * freqs.length) : 0;
            this.recordingMetrics.frequencySums[i] += freqs[idx] || 0;
        }
    }

    buildPortraitPayload(durationMs) {
        const metrics = this.recordingMetrics;
        const frames = Math.max(1, metrics.frames);

        const frequencyProfile = metrics.frequencySums.map((sum) => sum / frames);
        const averageVolume = metrics.volumeSum / frames;
        const bpm = metrics.bpmSamples.length
            ? Math.round(metrics.bpmSamples.reduce((a, b) => a + b, 0) / metrics.bpmSamples.length)
            : 0;

        let dominantNote = '--';
        let maxCount = 0;
        Object.entries(metrics.noteCounts).forEach(([note, count]) => {
            if (count > maxCount) {
                maxCount = count;
                dominantNote = note;
            }
        });

        const durationLabel = this.recorder.formatTime(durationMs || (Date.now() - metrics.startedAt));

        return {
            frequencyProfile,
            averageVolume,
            peakVolume: metrics.peakVolume,
            bpm,
            beatCount: metrics.beatCount,
            dominantNote,
            modeLabel: this.modeLabels[metrics.modeAtStart] || this.modeLabels[this.currentMode],
            durationLabel,
            timestampLabel: new Date().toLocaleString(),
            palette: this.modePalettes[metrics.modeAtStart] || this.modePalettes.waveform
        };
    }

    async sharePortrait() {
        if (!this.lastPortrait) {
            return;
        }

        if (navigator.share && this.lastPortrait.blob) {
            try {
                const file = new File([this.lastPortrait.blob], this.lastPortrait.fileName, { type: 'image/png' });
                if (!navigator.canShare || navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: 'My Sound Portrait',
                        text: 'Generated with Voice Visualizer',
                        files: [file]
                    });
                    return;
                }
            } catch (error) {
                console.warn('Web Share failed, falling back to clipboard.', error);
            }
        }

        try {
            await navigator.clipboard.writeText('I generated a sound portrait with Voice Visualizer.');
            this.showToast('Share caption copied. Send it with the downloaded portrait image.', 'success');
        } catch (error) {
            this.showToast('Share available via downloaded portrait file.', 'success');
        }
    }

    renderLoop() {
        requestAnimationFrame(() => this.renderLoop());

        let audioData = {
            volume: 0,
            frequencies: [],
            waveform: [],
            isBeat: false,
            bass: 0,
            mids: 0,
            highs: 0
        };

        if (this.isRunning && this.audioEngine) {
            audioData = {
                volume: this.audioEngine.volume,
                frequencies: this.audioEngine.frequencies,
                waveform: this.audioEngine.waveform,
                isBeat: this.audioEngine.isBeat,
                bass: this.audioEngine.getBass(),
                mids: this.audioEngine.getMids(),
                highs: this.audioEngine.getHighs()
            };

            this.updateStats({
                volume: this.audioEngine.volume,
                pitch: this.audioEngine.dominantNote || this.audioEngine.pitch,
                bpm: this.audioEngine.bpm
            });
            this.updateFrequencyBars(this.audioEngine.frequencies);
            this.collectMetrics(audioData);
        }

        this.visualEngine.render(audioData);
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-4px)';
            setTimeout(() => toast.remove(), 260);
        }, 2600);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new VoiceVisualizerApp();
});
