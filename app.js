/**
 * Voice Visualizer App
 * Signal Theatre controller for audio, rendering, and portraits.
 */

class VoiceVisualizerApp {
    constructor() {
        this.audioEngine = null;
        this.visualEngine = null;
        this.recorder = null;

        this.isListening = false;
        this.isRunning = false;
        this.currentMode = 'waveform';
        this.recordingMetrics = null;
        this.lastPortrait = null;
        this.beatIndicatorTimer = null;
        this.recProgressTimer = null;
        this.act = null;
        this.speakVoiceId = window.ELEVEN_DEFAULT_VOICE;
        this.morphVoiceId = window.ELEVEN_DEFAULT_VOICE;
        this.morphRecorder = null;
        this.morphChunks = [];
        this.morphTimer = null;
        this.voices = window.CAST_VOICES;
        this.eleven = new ElevenLabsClient();
        this.impactTimer = null;

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
        this.levelMeter = document.getElementById('levelMeter');
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
        this.nowPlaying = document.getElementById('nowPlaying');
        this.idleHint = document.getElementById('idleHint');
        this.micErrorBand = document.getElementById('micErrorBand');
        this.micErrorCopy = document.getElementById('micErrorCopy');
        this.dockActions = document.getElementById('dockActions');
        this.sceneList = document.getElementById('sceneList');
        this.speakText = document.getElementById('speakText');
        this.speakBtn = document.getElementById('speakBtn');
        this.speakVoices = document.getElementById('speakVoices');
        this.morphBtn = document.getElementById('morphBtn');
        this.morphLabel = document.getElementById('morphLabel');
        this.morphNote = document.getElementById('morphNote');
        this.morphVoices = document.getElementById('morphVoices');
        this.sfxPulseBtn = document.getElementById('sfxPulseBtn');
        this.elevenKeyInput = document.getElementById('elevenKeyInput');
        this.cueRail = document.getElementById('cueRail');
        this.cueRailFill = document.getElementById('cueRailFill');

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
        this.buildCueBoard();
        this.setupEventListeners();
        this.setupRecorderCallbacks();
        this.modeValue.textContent = this.modeLabels[this.currentMode];
        this.setLevel(0);
        this.setStageState('idle');

        this.renderLoop();
    }

    refreshStage() {
        if (this.recorder?.isRecording) {
            this.setStageState('recording');
            return;
        }
        if (this.act) {
            this.setStageState(this.act.type, this.act.label);
            return;
        }
        if (this.isListening) {
            this.setStageState('live');
            return;
        }
        this.setStageState('idle');
    }

    setStageState(state, label = '') {
        const live = state !== 'idle' && state !== 'error';
        document.body.classList.toggle('is-idle', state === 'idle' || state === 'error');
        document.body.classList.toggle('is-live', live);
        document.body.classList.toggle('is-recording', state === 'recording');
        document.body.classList.toggle('has-mic-error', state === 'error');

        const liveActions = state === 'live' || state === 'recording';
        this.setDockActionsVisible(liveActions);

        const status = {
            idle: 'House dark',
            error: 'No input',
            live: 'Listening',
            recording: 'Recording',
            scene: label ? `Playing ${label}` : 'Playing',
            speaking: 'Speaking',
            morphing: 'Morphing',
            impact: 'Impact'
        };

        this.statusText.textContent = status[state] || 'House dark';

        if (state === 'idle') {
            this.spectrumState.textContent = 'Waiting';
            if (this.idleHint) {
                this.idleHint.hidden = false;
            }
        } else if (state === 'error') {
            this.spectrumState.textContent = 'Unavailable';
            if (this.idleHint) {
                this.idleHint.hidden = true;
            }
        } else if (state === 'recording') {
            this.spectrumState.textContent = 'Capture';
            if (this.idleHint) {
                this.idleHint.hidden = true;
            }
        } else if (state === 'speaking' || state === 'morphing') {
            this.spectrumState.textContent = 'Voice';
            if (this.idleHint) {
                this.idleHint.hidden = true;
            }
        } else if (state === 'scene' || state === 'impact') {
            this.spectrumState.textContent = 'Cue';
            if (this.idleHint) {
                this.idleHint.hidden = true;
            }
        } else {
            this.spectrumState.textContent = 'Live';
            if (this.idleHint) {
                this.idleHint.hidden = true;
            }
            this.clearMicError();
        }

        if (this.nowPlaying) {
            if (state === 'idle') {
                this.nowPlaying.textContent = 'Now playing: silence';
            } else if (state === 'error') {
                this.nowPlaying.textContent = 'Now playing: no input';
            } else if (label) {
                this.nowPlaying.textContent = `Now playing: ${label}`;
            } else {
                this.nowPlaying.textContent = `Now playing: ${status[state] || 'signal'}`;
            }
        }

        if (this.visualEngine) {
            this.visualEngine.setLive(live);
        }

        if (state === 'idle' || state === 'error') {
            this.hideCueRail();
            this.markPlayingScene(null);
        }
    }

    setDockActionsVisible(visible) {
        if (!this.dockActions) {
            return;
        }

        this.dockActions.hidden = !visible;
        [this.recordBtn, this.screenshotBtn].forEach((button) => {
            if (!button) {
                return;
            }
            button.tabIndex = visible ? 0 : -1;
            if (!visible) {
                button.setAttribute('aria-hidden', 'true');
            } else {
                button.removeAttribute('aria-hidden');
            }
        });
    }

    clearMicError() {
        if (this.micErrorBand) {
            this.micErrorBand.classList.add('hidden');
        }
        document.body.classList.remove('has-mic-error');
    }

    showMicError(reason = 'unavailable') {
        const copy = {
            denied: 'Microphone permission is needed to listen. Allow access, then try Listen again.',
            nodevice: 'No input device was found on this machine.',
            busy: 'The microphone is unavailable right now. Close other apps using it, then try again.',
            secure: 'Microphone access needs a secure context (localhost or HTTPS).',
            unsupported: 'This browser cannot access a microphone here.',
            unavailable: 'Microphone access failed. Check permission and input device.'
        };

        if (this.micErrorCopy) {
            this.micErrorCopy.textContent = copy[reason] || copy.unavailable;
        }
        if (this.micErrorBand) {
            this.micErrorBand.classList.remove('hidden');
        }

        this.setLevel(0);
        this.updateStats({ volume: 0, pitch: 'Idle', bpm: 'Idle' });
        this.updateFrequencyBars([]);
        this.setStageState('error');
    }

    setLevel(volume) {
        const levelPct = Math.min(100, Math.max(0, Math.round((volume || 0) * 100)));
        this.levelValue.textContent = `${levelPct}%`;
        this.levelBar.style.width = `${levelPct}%`;
        if (this.levelMeter) {
            this.levelMeter.setAttribute('aria-valuenow', String(levelPct));
        }
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.toggleAudio());

        this.recordBtn.addEventListener('click', async () => {
            if (!this.isListening || !this.audioEngine) {
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

        document.querySelectorAll('.cue-tab').forEach((tab) => {
            tab.addEventListener('click', () => this.setCueTab(tab.dataset.cue));
        });

        this.sfxPulseBtn.addEventListener('click', () => this.pulseHouse());
        this.speakBtn.addEventListener('click', () => this.generateSpeech());
        this.morphBtn.addEventListener('click', () => this.toggleMorphRecord());

        this.elevenKeyInput.value = this.eleven.getSessionKey();
        this.elevenKeyInput.addEventListener('change', () => {
            this.eleven.setSessionKey(this.elevenKeyInput.value);
            this.showToast(this.eleven.getSessionKey() ? 'Session key stored in this tab.' : 'Session key cleared.', 'success');
        });

        document.addEventListener('keydown', (event) => {
            const typing = event.target.matches?.('input, textarea, select, summary') || event.target.isContentEditable;
            if (typing) {
                return;
            }

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
                if (!this.isListening) {
                    this.showToast('Start listening before recording a portrait.', 'error');
                    return;
                }
                this.recordBtn.click();
                return;
            }

            if (key === 's' && !event.metaKey && !event.ctrlKey) {
                event.preventDefault();
                if (!this.isListening && !this.act) {
                    this.showToast('Start listening or play a cue before saving a frame.', 'error');
                    return;
                }
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
            this.refreshStage();

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

    bindAudioEngine(engine) {
        engine.setSensitivity(58);
        engine.onBeat = () => this.triggerBeatIndicator();
        engine.onPlaybackStart = () => {};
        engine.onPlaybackEnd = () => this.handlePlaybackEnd();
        engine.onPlaybackTime = ({ currentTime, duration }) => this.updateCueRail(currentTime, duration);
    }

    async ensureAudioEngine() {
        if (this.audioEngine && this.audioEngine.audioContext && this.audioEngine.audioContext.state !== 'closed') {
            await this.audioEngine.ensureEngine();
            return this.audioEngine;
        }

        this.audioEngine = new AudioEngine();
        this.bindAudioEngine(this.audioEngine);
        await this.audioEngine.ensureEngine();
        return this.audioEngine;
    }

    async toggleAudio() {
        if (!this.isListening) {
            this.clearMicError();
            try {
                await this.ensureAudioEngine();
                const ok = await this.audioEngine.startMicrophone();
                if (!ok) {
                    const reason = this.audioEngine?.initError?.reason || 'unavailable';
                    this.showMicError(reason);
                    return;
                }
            } catch (error) {
                this.showMicError('unavailable');
                return;
            }

            this.isListening = true;
            this.isRunning = true;
            this.act = null;
            this.markPlayingScene(null);
            this.startBtn.classList.add('is-live');
            this.startLabel.textContent = 'Silence';
            this.recordBtn.disabled = false;
            this.refreshStage();
            this.showToast('Listening. Switch visuals and record a portrait.', 'success');
            return;
        }

        if (this.recorder.isRecording) {
            this.recorder.stopRecording();
        }

        if (this.audioEngine) {
            this.audioEngine.stopMicrophone();
        }

        this.isListening = false;
        this.startBtn.classList.remove('is-live');
        this.startLabel.textContent = 'Listen';
        this.recordBtn.disabled = true;
        this.clearMicError();

        if (!this.act) {
            this.teardownEngineIfIdle();
        }

        this.refreshStage();
        if (!this.act) {
            this.resetMeters();
        }
    }

    teardownEngineIfIdle() {
        if (this.isListening || this.act || this.recorder.isRecording) {
            return;
        }
        if (this.audioEngine) {
            this.audioEngine.stop();
            this.audioEngine = null;
        }
        this.isRunning = false;
    }

    resetMeters() {
        this.updateStats({ volume: 0, pitch: 'Idle', bpm: 'Idle' });
        this.updateFrequencyBars([]);
        this.setLevel(0);
    }

    handlePlaybackEnd() {
        if (this.act && (this.act.type === 'scene' || this.act.type === 'speaking' || this.act.type === 'morphing')) {
            this.act = null;
            this.markPlayingScene(null);
            this.hideCueRail();
            this.speakBtn.classList.remove('is-busy');
            this.speakBtn.disabled = false;
        }

        if (!this.isListening) {
            this.teardownEngineIfIdle();
            this.resetMeters();
        }

        this.refreshStage();
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
        this.setLevel(volume || 0);

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

    buildCueBoard() {
        this.sceneList.innerHTML = '';
        window.SCENE_LIBRARY.forEach((scene) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'cue-scene';
            button.dataset.scene = scene.id;
            button.innerHTML = `
                <span class="cue-scene-copy">
                    <span class="cue-scene-name">${scene.name}</span>
                    <span class="cue-scene-line">${scene.logline}</span>
                </span>
                <span class="cue-scene-mode">${this.modeLabels[scene.mode] || scene.mode}</span>
            `;
            button.addEventListener('click', () => this.playScene(scene));
            this.sceneList.appendChild(button);
        });

        this.renderVoicePills(this.speakVoices, 'speak');
        this.renderVoicePills(this.morphVoices, 'morph');

        if (this.speakText && !this.speakText.value) {
            this.speakText.placeholder = window.HOUSE_LINE;
        }
    }

    renderVoicePills(container, kind) {
        container.innerHTML = '';
        this.voices.forEach((voice) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'voice-pill';
            button.textContent = voice.name;
            button.title = voice.role;
            button.dataset.voice = voice.id;
            if ((kind === 'speak' && voice.id === this.speakVoiceId) || (kind === 'morph' && voice.id === this.morphVoiceId)) {
                button.classList.add('is-active');
            }
            button.addEventListener('click', () => {
                if (kind === 'speak') {
                    this.speakVoiceId = voice.id;
                } else {
                    this.morphVoiceId = voice.id;
                }
                this.renderVoicePills(container, kind);
            });
            container.appendChild(button);
        });
    }

    setCueTab(name) {
        document.querySelectorAll('.cue-tab').forEach((tab) => {
            const active = tab.dataset.cue === name;
            tab.classList.toggle('is-active', active);
            tab.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        document.querySelectorAll('.cue-panel').forEach((panel) => {
            panel.classList.toggle('hidden', panel.dataset.panel !== name);
        });
    }

    markPlayingScene(sceneId) {
        this.sceneList.querySelectorAll('.cue-scene').forEach((button) => {
            button.classList.toggle('is-playing', button.dataset.scene === sceneId);
        });
    }

    updateCueRail(currentTime, duration) {
        if (!duration) {
            return;
        }
        this.cueRail.classList.remove('hidden');
        this.cueRailFill.style.width = `${Math.min(100, (currentTime / duration) * 100)}%`;
    }

    hideCueRail() {
        this.cueRail.classList.add('hidden');
        this.cueRailFill.style.width = '0%';
    }

    async playScene(scene) {
        if (this.act && this.act.type === 'scene' && this.act.id === scene.id) {
            this.audioEngine?.stopExclusivePlayback();
            this.handlePlaybackEnd();
            return;
        }

        try {
            await this.ensureAudioEngine();
            await this.audioEngine.unlockPlayback();
            this.setMode(scene.mode);
            this.act = { type: 'scene', id: scene.id, label: scene.name };
            this.markPlayingScene(scene.id);
            this.isRunning = true;
            this.refreshStage();
            await this.audioEngine.playSample(scene.file, { overlay: false, stopMic: this.isListening });
            if (this.isListening) {
                this.isListening = false;
                this.startBtn.classList.remove('is-live');
                this.startLabel.textContent = 'Listen';
                this.recordBtn.disabled = true;
            }
            this.showToast(`${scene.name} takes the stage.`, 'success');
        } catch (error) {
            console.error(error);
            this.act = null;
            this.refreshStage();
            this.showToast('That scene could not start.', 'error');
        }
    }

    isMissingKeyError(error) {
        const status = error?.status;
        const message = String(error?.message || error || '').toLowerCase();
        if (status === 503) {
            return true;
        }
        return (
            message.includes('missing elevenlabs_api_key') ||
            message.includes('add a session key') ||
            message.includes('set elevenlabs_api_key') ||
            message.includes('no live key')
        );
    }

    async generateSpeech() {
        const text = (this.speakText.value || '').trim() || window.HOUSE_LINE;
        this.speakBtn.disabled = true;
        this.speakBtn.classList.add('is-busy');
        this.act = { type: 'speaking', label: 'Rahul' };
        const voice = this.voices.find((item) => item.id === this.speakVoiceId);
        if (voice) {
            this.act.label = voice.name;
        }
        this.refreshStage();

        let blob = null;
        try {
            await this.ensureAudioEngine();
            await this.audioEngine.unlockPlayback();
            this.isRunning = true;
            blob = await this.eleven.speak(text, this.speakVoiceId);

            if (!blob || !blob.size) {
                throw new Error('TTS returned empty audio.');
            }

            await this.audioEngine.playBlob(blob, { stopMic: true });
            if (this.isListening) {
                this.isListening = false;
                this.startBtn.classList.remove('is-live');
                this.startLabel.textContent = 'Listen';
                this.recordBtn.disabled = true;
            }
            this.showToast('The house voice is speaking.', 'success');
        } catch (error) {
            console.warn('Speak failed:', error);

            // If TTS already succeeded, retry playback once instead of falling back.
            if (blob && blob.size) {
                try {
                    await this.ensureAudioEngine();
                    await this.audioEngine.unlockPlayback();
                    await this.audioEngine.playBlob(blob, { stopMic: true });
                    this.showToast('The house voice is speaking.', 'success');
                    return;
                } catch (playError) {
                    console.error('TTS playback retry failed:', playError);
                    this.speakBtn.disabled = false;
                    this.speakBtn.classList.remove('is-busy');
                    this.act = null;
                    this.refreshStage();
                    this.showToast(`TTS audio arrived, but playback failed: ${playError.message || playError}`, 'error');
                    return;
                }
            }

            this.speakBtn.disabled = false;
            this.speakBtn.classList.remove('is-busy');

            if (this.isMissingKeyError(error)) {
                const fallback = this.eleven.fallbackSceneForSpeak(text);
                this.showToast('No live key. Playing a house reel instead.', 'info');
                this.act = null;
                if (fallback) {
                    await this.playScene(fallback);
                } else {
                    this.refreshStage();
                }
                return;
            }

            this.act = null;
            this.refreshStage();
            this.showToast(`Speak failed: ${error.message || error}`, 'error');
        }
    }

    async toggleMorphRecord() {
        if (this.morphRecorder && this.morphRecorder.state === 'recording') {
            this.morphRecorder.stop();
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.morphChunks = [];
            const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : '';
            this.morphRecorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);

            this.morphRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size) {
                    this.morphChunks.push(event.data);
                }
            };

            this.morphRecorder.onstop = async () => {
                stream.getTracks().forEach((track) => track.stop());
                clearTimeout(this.morphTimer);
                this.morphLabel.textContent = 'Record';
                this.morphBtn.classList.remove('is-busy');
                const blob = new Blob(this.morphChunks, { type: this.morphRecorder.mimeType || 'audio/webm' });
                this.morphRecorder = null;
                await this.runMorph(blob);
            };

            this.morphRecorder.start();
            this.morphLabel.textContent = 'Stop';
            this.morphBtn.classList.add('is-busy');
            this.act = { type: 'morphing', label: 'Source' };
            this.refreshStage();
            this.morphNote.textContent = 'Hold the thought. We cut in three.';
            this.morphTimer = setTimeout(() => {
                if (this.morphRecorder && this.morphRecorder.state === 'recording') {
                    this.morphRecorder.stop();
                }
            }, 3200);
        } catch (error) {
            this.showToast('Microphone access is needed to morph a line.', 'error');
        }
    }

    async runMorph(blob) {
        const voice = this.voices.find((item) => item.id === this.morphVoiceId);
        this.act = { type: 'morphing', label: voice ? voice.name : 'Cast' };
        this.refreshStage();
        this.morphNote.textContent = 'Recasting the line.';

        try {
            await this.ensureAudioEngine();
            this.isRunning = true;
            const result = await this.eleven.morph(blob, this.morphVoiceId);
            await this.audioEngine.playBlob(result, { stopMic: true });
            if (this.isListening) {
                this.isListening = false;
                this.startBtn.classList.remove('is-live');
                this.startLabel.textContent = 'Listen';
                this.recordBtn.disabled = true;
            }
            this.morphNote.textContent = 'The cast has changed.';
            this.showToast('Morph complete.', 'success');
        } catch (error) {
            console.warn('Morph failed:', error);
            this.act = null;
            if (this.isMissingKeyError(error)) {
                this.morphNote.textContent = 'No live key. House rehearsal instead.';
                this.showToast('No live key. Playing a rehearsal morph.', 'info');
                const rehearsal = this.eleven.sceneById('whisper');
                if (rehearsal) {
                    await this.playScene(rehearsal);
                    return;
                }
            } else {
                this.morphNote.textContent = 'Morph failed. Try again.';
                this.showToast(`Morph failed: ${error.message || error}`, 'error');
            }
            this.refreshStage();
        }
    }

    async pulseHouse() {
        const overlay = Boolean(this.act) || this.isListening;
        this.sfxPulseBtn.classList.add('is-hot');

        try {
            await this.ensureAudioEngine();
            this.isRunning = true;
            this.setMode('radial');

            if (!overlay) {
                this.act = { type: 'impact', label: 'Whoosh Impact' };
                this.markPlayingScene('whoosh-impact');
                this.refreshStage();
                await this.audioEngine.playSample('samples/whoosh-impact.mp3', {
                    overlay: false,
                    stopMic: true
                });
                if (this.isListening) {
                    this.isListening = false;
                    this.startBtn.classList.remove('is-live');
                    this.startLabel.textContent = 'Listen';
                    this.recordBtn.disabled = true;
                }
            } else {
                this.statusText.textContent = 'Impact';
                try {
                    await this.audioEngine.playSample('samples/whoosh-impact.mp3', {
                        overlay: true,
                        stopMic: false
                    });
                } catch (overlayError) {
                    console.warn('Overlay pulse failed, using exclusive playback:', overlayError);
                    this.act = { type: 'impact', label: 'Whoosh Impact' };
                    this.markPlayingScene('whoosh-impact');
                    this.refreshStage();
                    await this.audioEngine.playSample('samples/whoosh-impact.mp3', {
                        overlay: false,
                        stopMic: false
                    });
                }
            }

            this.triggerBeatIndicator();
            this.showToast('The house takes the hit.', 'success');

            clearTimeout(this.impactTimer);
            this.impactTimer = setTimeout(() => {
                this.sfxPulseBtn.classList.remove('is-hot');
                if (overlay && this.act && this.act.type !== 'impact') {
                    this.refreshStage();
                }
            }, 1600);
        } catch (error) {
            console.error(error);
            this.sfxPulseBtn.classList.remove('is-hot');
            this.showToast('Pulse missed the house.', 'error');
            if (!overlay) {
                this.act = null;
                this.markPlayingScene(null);
            }
            this.refreshStage();
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

        if (this.audioEngine && this.audioEngine.isRunning) {
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
        if (!container) {
            return;
        }

        // Keep the stack short so toasts never bury the Spectrum strip.
        while (container.children.length >= 2) {
            container.firstElementChild.remove();
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(4px)';
            setTimeout(() => toast.remove(), 260);
        }, 2600);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new VoiceVisualizerApp();
});
