/**
 * Voice Visualizer App
 * Signal Theatre controller for audio, rendering, and portraits.
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
        this.recProgressTimer = null;

        this.modeLabels = {
            waveform: 'Wave',
            radial: 'Radial',
            cloud: 'Cloud',
            aurora: 'Aurora'
        };

        this.modePalettes = {
            waveform: ['#e23a8f', '#8a5cd6', '#f3eef7'],
            radial: ['#e23a8f', '#9a6adf', '#f3eef7'],
            cloud: ['#e23a8f', '#8a5cd6', '#d7c4f0'],
            aurora: ['#e23a8f', '#7046b8', '#f3eef7']
        };

        this.canvas = document.getElementById('visualizer');
        this.startBtn = document.getElementById('startBtn');
        this.startLabel = document.getElementById('startLabel');
        this.recordBtn = document.getElementById('recordBtn');
        this.recordLabel = document.getElementById('recordLabel');
        this.screenshotBtn = document.getElementById('screenshotBtn');
        this.levelBar = document.getElementById('levelBar');
        this.levelValue = document.getElementById('levelValue');
        this.beatIndicator = document.getElementById('beatIndicator');
        this.pitchValue = document.getElementById('pitchValue');
        this.volumeValue = document.getElementById('volumeValue');
        this.bpmValue = document.getElementById('bpmValue');
        this.modeValue = document.getElementById('modeValue');
        this.freqBars = document.getElementById('freqBars');
        this.spectrumState = document.getElementById('spectrumState');
        this.recordingIndicator = document.getElementById('recordingIndicator');
        this.recTime = document.getElementById('recTime');
        this.recRail = document.getElementById('recRail');
        this.recRailFill = document.getElementById('recRailFill');
        this.statusText = document.getElementById('statusText');

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
        this.setStageState('idle');

        this.renderLoop();
    }

    setStageState(state) {
        document.body.classList.toggle('is-idle', state === 'idle');
        document.body.classList.toggle('is-live', state === 'live' || state === 'recording');
        document.body.classList.toggle('is-recording', state === 'recording');

        if (state === 'idle') {
            this.statusText.textContent = 'House dark';
            this.spectrumState.textContent = 'Waiting';
        } else if (state === 'live') {
            this.statusText.textContent = 'Listening';
            this.spectrumState.textContent = 'Live';
        } else if (state === 'recording') {
            this.statusText.textContent = 'Recording';
            this.spectrumState.textContent = 'Capture';
        }
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.toggleAudio());

        this.recordBtn.addEventListener('click', async () => {
            if (!this.isRunning || !this.audioEngine) {
                this.showToast('Start listening before recording a portrait.', 'error');
                return;
            }

            if (!this.recorder.isRecording) {
                const ok = await this.recorder.startRecording({ maxDurationMs: 9000 });
                if (ok) {
                    this.startMetricsCapture();
                    this.startRecProgress(9000);
                    this.showToast('Recording clip. Portrait generates when you stop.', 'success');
                } else {
                    this.showToast('Unable to start recording clip.', 'error');
                }
            } else {
                this.recorder.stopRecording();
            }
        });

        this.screenshotBtn.addEventListener('click', () => {
            const ok = this.recorder.takeScreenshot();
            this.showToast(ok ? 'Frame saved.' : 'Frame capture failed.', ok ? 'success' : 'error');
        });

        document.querySelectorAll('.scene-btn').forEach((button) => {
            button.addEventListener('click', () => {
                const mode = button.dataset.mode;
                this.setMode(mode);
            });
        });

        this.portraitClose.addEventListener('click', () => this.closePortrait());
        this.portraitShare.addEventListener('click', () => this.sharePortrait());

        this.portraitPanel.addEventListener('click', (event) => {
            if (event.target === this.portraitPanel) {
                this.closePortrait();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !this.portraitPanel.classList.contains('hidden')) {
                this.closePortrait();
                return;
            }

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

            if (key === 's' && !event.metaKey && !event.ctrlKey) {
                event.preventDefault();
                this.screenshotBtn.click();
                return;
            }

            if (['1', '2', '3', '4'].includes(key)) {
                const map = ['waveform', 'radial', 'cloud', 'aurora'];
                this.setMode(map[Number(key) - 1]);
            }
        });
    }

    closePortrait() {
        this.portraitPanel.classList.add('hidden');
    }

    setupRecorderCallbacks() {
        this.recorder.onRecordingStart = () => {
            this.recordBtn.classList.add('recording');
            this.recordLabel.textContent = 'Stop';
            this.recordingIndicator.classList.remove('hidden');
            this.recRail.classList.remove('hidden');
            this.recTime.textContent = '00:00';
            this.setStageState('recording');
        };

        this.recorder.onRecordingStop = async ({ blob, durationMs }) => {
            this.recordBtn.classList.remove('recording');
            this.recordLabel.textContent = 'Record';
            this.recordingIndicator.classList.add('hidden');
            this.stopRecProgress();
            this.setStageState(this.isRunning ? 'live' : 'idle');

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

    startRecProgress(maxDurationMs) {
        const started = Date.now();
        this.recRailFill.style.width = '0%';

        clearInterval(this.recProgressTimer);
        this.recProgressTimer = setInterval(() => {
            const elapsed = Date.now() - started;
            const pct = Math.min(100, (elapsed / maxDurationMs) * 100);
            this.recRailFill.style.width = `${pct}%`;
            if (pct >= 100) {
                clearInterval(this.recProgressTimer);
            }
        }, 80);
    }

    stopRecProgress() {
        clearInterval(this.recProgressTimer);
        this.recRail.classList.add('hidden');
        this.recRailFill.style.width = '0%';
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
            this.visualEngine.setLive(true);
            this.startBtn.classList.add('is-live');
            this.startLabel.textContent = 'Silence';
            this.recordBtn.disabled = false;
            this.setStageState('live');
            this.showToast('Listening. Switch scenes and record a portrait.', 'success');
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
        this.visualEngine.setLive(false);
        this.startBtn.classList.remove('is-live');
        this.startLabel.textContent = 'Listen';
        this.recordBtn.disabled = true;
        this.setStageState('idle');

        this.updateStats({ volume: 0, pitch: 'Idle', bpm: 'Idle' });
        this.updateFrequencyBars([]);
        this.levelBar.style.width = '0%';
        this.levelValue.textContent = '0%';
    }

    setMode(mode) {
        if (!mode || !this.modeLabels[mode]) {
            return;
        }

        this.currentMode = mode;
        this.visualEngine.setMode(mode);
        this.modeValue.textContent = this.modeLabels[mode];

        document.querySelectorAll('.scene-btn').forEach((button) => {
            button.classList.toggle('active', button.dataset.mode === mode);
        });
    }

    createFrequencyBars() {
        const total = 48;
        this.freqBars.innerHTML = '';

        for (let i = 0; i < total; i++) {
            const bar = document.createElement('div');
            bar.className = 'freq-bar';
            bar.style.height = '3px';
            this.freqBars.appendChild(bar);
        }
    }

    updateFrequencyBars(frequencies) {
        const bars = this.freqBars.children;
        const total = bars.length;
        for (let i = 0; i < total; i++) {
            const idx = frequencies.length ? Math.floor((i / total) * frequencies.length) : 0;
            const value = frequencies[idx] || 0;
            const height = 3 + value * 34;
            bars[i].style.height = `${height}px`;
        }
    }

    updateStats({ volume, pitch, bpm }) {
        const levelPct = Math.round((volume || 0) * 100);
        this.volumeValue.textContent = `${levelPct}%`;
        this.levelValue.textContent = `${levelPct}%`;
        this.levelBar.style.width = `${Math.min(100, Math.max(0, levelPct))}%`;

        if (typeof pitch === 'number' && Number.isFinite(pitch) && pitch > 0) {
            this.pitchValue.textContent = `${Math.round(pitch)}Hz`;
            this.pitchValue.classList.remove('idle-value');
        } else if (pitch && pitch !== 'Idle' && pitch !== '--') {
            this.pitchValue.textContent = pitch;
            this.pitchValue.classList.remove('idle-value');
        } else {
            this.pitchValue.textContent = 'Idle';
            this.pitchValue.classList.add('idle-value');
        }

        if (bpm && bpm !== 'Idle' && bpm > 0) {
            this.bpmValue.textContent = String(bpm);
            this.bpmValue.classList.remove('idle-value');
        } else {
            this.bpmValue.textContent = 'Idle';
            this.bpmValue.classList.add('idle-value');
        }
    }

    triggerBeatIndicator() {
        this.beatIndicator.classList.add('active');

        clearTimeout(this.beatIndicatorTimer);
        this.beatIndicatorTimer = setTimeout(() => {
            this.beatIndicator.classList.remove('active');
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
