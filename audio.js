/**
 * Audio Engine - Voice Visualizer
 * Handles microphone input, audio analysis, pitch detection, beat detection
 */

class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.bus = null;
        this.hear = null;
        this.microphone = null;
        this.micStream = null;
        this.micActive = false;
        this.dataArray = null;
        this.frequencyData = null;
        this.isRunning = false;
        this.sensitivity = 1.0;

        this.mediaEl = null;
        this.mediaSource = null;
        this.bufferSource = null;
        this.overlaySources = [];
        this.objectUrls = [];
        this.bufferCache = new Map();
        this.exclusivePlaying = false;
        this.initError = null;
        
        // Analysis results
        this.volume = 0;
        this.pitch = 0;
        this.frequencies = [];
        this.waveform = [];
        
        // Beat detection
        this.beatThreshold = 0.15;
        this.lastBeatTime = 0;
        this.beatCooldown = 100; // ms
        this.isBeat = false;
        this.bpm = 0;
        this.beatHistory = [];
        
        // Pitch detection
        this.pitchHistory = [];
        this.dominantNote = '';
        
        // Callbacks
        this.onBeat = null;
        this.onPitchChange = null;
        this.onPlaybackStart = null;
        this.onPlaybackEnd = null;
        this.onPlaybackTime = null;
    }

    async ensureEngine() {
        if (this.audioContext && this.audioContext.state !== 'closed') {
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            return true;
        }

        const Context = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new Context();

        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyser.smoothingTimeConstant = 0.8;

        this.bus = this.audioContext.createGain();
        this.bus.gain.value = 1;
        this.bus.connect(this.analyser);

        this.hear = this.audioContext.createGain();
        this.hear.gain.value = 1;
        this.hear.connect(this.audioContext.destination);

        const bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(bufferLength);
        this.frequencyData = new Uint8Array(bufferLength);

        this.isRunning = true;
        this.analyze();

        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        return true;
    }

    async unlockPlayback() {
        await this.ensureEngine();
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    connectToAnalyser(node, { hear = false } = {}) {
        node.connect(this.bus);
        if (hear) {
            node.connect(this.hear);
        }
    }

    async init() {
        this.initError = null;
        try {
            await this.ensureEngine();
            const ok = await this.startMicrophone();
            if (ok) {
                console.log('Audio Engine initialized');
            }
            return ok;
        } catch (error) {
            console.error('Failed to initialize audio:', error);
            this.initError = this.initError || {
                reason: 'unavailable',
                message: error && error.message ? error.message : 'Microphone access failed.'
            };
            return false;
        }
    }

    classifyMicError(error) {
        let reason = 'unavailable';
        if (error && (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError')) {
            reason = 'denied';
        } else if (error && (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError')) {
            reason = 'nodevice';
        } else if (error && error.name === 'NotReadableError') {
            reason = 'busy';
        } else if (error && error.name === 'SecurityError') {
            reason = 'secure';
        }

        return {
            reason,
            message: error && error.message ? error.message : 'Microphone access failed.'
        };
    }

    async startMicrophone() {
        this.initError = null;

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.initError = {
                reason: 'unsupported',
                message: 'This browser cannot access a microphone here.'
            };
            return false;
        }

        await this.ensureEngine();
        this.stopExclusivePlayback();

        if (this.micActive && this.microphone) {
            return true;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });

            this.micStream = stream;
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            this.connectToAnalyser(this.microphone, { hear: false });
            this.micActive = true;
            return true;
        } catch (error) {
            console.error('Failed to start microphone:', error);
            this.initError = this.classifyMicError(error);
            return false;
        }
    }

    stopMicrophone() {
        if (this.microphone) {
            try {
                this.microphone.disconnect();
            } catch (error) {
                console.warn('Mic disconnect skipped:', error);
            }
            this.microphone = null;
        }

        if (this.micStream) {
            this.micStream.getTracks().forEach((track) => track.stop());
            this.micStream = null;
        }

        this.micActive = false;
    }

    ensureMediaElement() {
        if (this.mediaEl && this.mediaSource) {
            return;
        }

        this.mediaEl = new Audio();
        this.mediaEl.crossOrigin = 'anonymous';
        this.mediaEl.preload = 'auto';
        this.mediaSource = this.audioContext.createMediaElementSource(this.mediaEl);
        this.connectToAnalyser(this.mediaSource, { hear: true });

        this.mediaEl.addEventListener('ended', () => {
            this.exclusivePlaying = false;
            this.revokeObjectUrls();
            if (this.onPlaybackEnd) {
                this.onPlaybackEnd();
            }
        });

        this.mediaEl.addEventListener('timeupdate', () => {
            if (!this.onPlaybackTime || !this.mediaEl) {
                return;
            }
            const duration = this.mediaEl.duration;
            this.onPlaybackTime({
                currentTime: this.mediaEl.currentTime || 0,
                duration: Number.isFinite(duration) ? duration : 0
            });
        });
    }

    stopExclusivePlayback() {
        if (this.bufferSource) {
            try {
                this.bufferSource.onended = null;
                this.bufferSource.stop();
            } catch (error) {
                // already stopped
            }
            try {
                this.bufferSource.disconnect();
            } catch (error) {
                // already disconnected
            }
            this.bufferSource = null;
        }

        if (this.mediaEl) {
            this.mediaEl.pause();
            this.mediaEl.removeAttribute('src');
            this.mediaEl.load();
        }

        this.exclusivePlaying = false;
        this.revokeObjectUrls();
    }

    stopOverlays() {
        this.overlaySources.forEach((source) => {
            try {
                source.onended = null;
                source.stop();
                source.disconnect();
            } catch (error) {
                // already gone
            }
        });
        this.overlaySources = [];
    }

    revokeObjectUrls() {
        this.objectUrls.forEach((url) => URL.revokeObjectURL(url));
        this.objectUrls = [];
    }

    rememberObjectUrl(url) {
        this.objectUrls.push(url);
        return url;
    }

    notifyPlaybackStart() {
        this.exclusivePlaying = true;
        if (this.onPlaybackStart) {
            this.onPlaybackStart();
        }
    }

    async playUrl(url, { stopMic = true } = {}) {
        await this.unlockPlayback();
        if (stopMic) {
            this.stopMicrophone();
        }
        this.stopExclusivePlayback();
        this.ensureMediaElement();
        this.mediaEl.src = url;
        this.mediaEl.load();
        this.notifyPlaybackStart();

        try {
            await this.mediaEl.play();
        } catch (error) {
            await this.unlockPlayback();
            await this.mediaEl.play();
        }
        return true;
    }

    async playBlob(blob, options = {}) {
        // Stop and revoke prior URLs first. Creating the object URL before
        // stopExclusivePlayback used to revoke the fresh blob and break Speak.
        await this.unlockPlayback();
        if (options.stopMic !== false) {
            this.stopMicrophone();
        }
        this.stopExclusivePlayback();
        const url = this.rememberObjectUrl(URL.createObjectURL(blob));
        this.ensureMediaElement();
        this.mediaEl.src = url;
        this.mediaEl.load();
        this.notifyPlaybackStart();

        try {
            await this.mediaEl.play();
        } catch (error) {
            await this.unlockPlayback();
            await this.mediaEl.play();
        }
        return true;
    }

    async playBuffer(buffer, { stopMic = true, exclusive = true } = {}) {
        await this.unlockPlayback();
        if (stopMic) {
            this.stopMicrophone();
        }

        if (exclusive) {
            this.stopExclusivePlayback();
        }

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        this.connectToAnalyser(source, { hear: true });

        if (exclusive) {
            this.bufferSource = source;
            this.notifyPlaybackStart();
            source.onended = () => {
                if (this.bufferSource === source) {
                    this.bufferSource = null;
                    this.exclusivePlaying = false;
                    if (this.onPlaybackEnd) {
                        this.onPlaybackEnd();
                    }
                }
            };
        } else {
            this.overlaySources.push(source);
            source.onended = () => {
                try {
                    source.disconnect();
                } catch (error) {
                    // already disconnected
                }
                this.overlaySources = this.overlaySources.filter((item) => item !== source);
            };
        }

        source.start();
        return true;
    }

    async loadBuffer(url) {
        await this.ensureEngine();
        if (this.bufferCache.has(url)) {
            return this.bufferCache.get(url);
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Unable to load audio from ${url}`);
        }

        const bytes = await response.arrayBuffer();
        const buffer = await this.audioContext.decodeAudioData(bytes.slice(0));
        this.bufferCache.set(url, buffer);
        return buffer;
    }

    async playSample(url, { overlay = false, stopMic = !overlay } = {}) {
        if (overlay) {
            const buffer = await this.loadBuffer(url);
            return this.playBuffer(buffer, { stopMic, exclusive: false });
        }
        return this.playUrl(url, { stopMic });
    }

    getPlaybackProgress() {
        if (!this.mediaEl || !this.exclusivePlaying) {
            return { currentTime: 0, duration: 0, ratio: 0 };
        }
        const duration = Number.isFinite(this.mediaEl.duration) ? this.mediaEl.duration : 0;
        const currentTime = this.mediaEl.currentTime || 0;
        return {
            currentTime,
            duration,
            ratio: duration > 0 ? Math.min(1, currentTime / duration) : 0
        };
    }
    
    analyze() {
        if (!this.isRunning) return;
        
        requestAnimationFrame(() => this.analyze());
        
        // Get frequency data
        this.analyser.getByteFrequencyData(this.frequencyData);
        // Get waveform data
        this.analyser.getByteTimeDomainData(this.dataArray);
        
        // Process audio data
        this.processVolume();
        this.processFrequencies();
        this.processPitch();
        this.detectBeat();
        this.processWaveform();
    }
    
    processVolume() {
        let sum = 0;
        for (let i = 0; i < this.frequencyData.length; i++) {
            sum += this.frequencyData[i];
        }
        const average = sum / this.frequencyData.length;
        this.volume = (average / 255) * this.sensitivity;
        this.volume = Math.min(1, Math.max(0, this.volume));
    }
    
    processFrequencies() {
        // Create frequency bands
        const bands = 64;
        const bandSize = Math.floor(this.frequencyData.length / bands);
        this.frequencies = [];
        
        for (let i = 0; i < bands; i++) {
            let sum = 0;
            for (let j = 0; j < bandSize; j++) {
                sum += this.frequencyData[i * bandSize + j];
            }
            this.frequencies.push((sum / bandSize / 255) * this.sensitivity);
        }
    }
    
    processWaveform() {
        this.waveform = Array.from(this.dataArray).map(v => (v - 128) / 128);
    }
    
    processPitch() {
        // Simple pitch detection using autocorrelation
        const sampleRate = this.audioContext.sampleRate;
        const buffer = new Float32Array(this.dataArray.length);
        
        for (let i = 0; i < this.dataArray.length; i++) {
            buffer[i] = (this.dataArray[i] - 128) / 128;
        }
        
        // Find the pitch using autocorrelation
        const pitch = this.autoCorrelate(buffer, sampleRate);
        
        if (pitch > 0) {
            this.pitch = pitch;
            this.pitchHistory.push(pitch);
            if (this.pitchHistory.length > 10) {
                this.pitchHistory.shift();
            }
            
            // Get musical note
            this.dominantNote = this.frequencyToNote(pitch);
            
            if (this.onPitchChange) {
                this.onPitchChange(pitch, this.dominantNote);
            }
        }
    }
    
    autoCorrelate(buffer, sampleRate) {
        const SIZE = buffer.length;
        let rms = 0;
        
        for (let i = 0; i < SIZE; i++) {
            rms += buffer[i] * buffer[i];
        }
        rms = Math.sqrt(rms / SIZE);
        
        // Not enough signal
        if (rms < 0.01) return -1;
        
        // Find the autocorrelation
        let r1 = 0, r2 = SIZE - 1;
        const threshold = 0.2;
        
        for (let i = 0; i < SIZE / 2; i++) {
            if (Math.abs(buffer[i]) < threshold) { r1 = i; break; }
        }
        for (let i = 1; i < SIZE / 2; i++) {
            if (Math.abs(buffer[SIZE - i]) < threshold) { r2 = SIZE - i; break; }
        }
        
        const buf2 = buffer.slice(r1, r2);
        const c = new Array(buf2.length).fill(0);
        
        for (let i = 0; i < buf2.length; i++) {
            for (let j = 0; j < buf2.length - i; j++) {
                c[i] += buf2[j] * buf2[j + i];
            }
        }
        
        let d = 0;
        while (c[d] > c[d + 1]) d++;
        
        let maxVal = -1, maxPos = -1;
        for (let i = d; i < buf2.length; i++) {
            if (c[i] > maxVal) {
                maxVal = c[i];
                maxPos = i;
            }
        }
        
        let t0 = maxPos;
        
        // Parabolic interpolation
        const x1 = c[t0 - 1] || 0;
        const x2 = c[t0];
        const x3 = c[t0 + 1] || 0;
        const a = (x1 + x3 - 2 * x2) / 2;
        const b = (x3 - x1) / 2;
        
        if (a) t0 = t0 - b / (2 * a);
        
        return sampleRate / t0;
    }
    
    frequencyToNote(freq) {
        const noteStrings = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const noteNum = 12 * (Math.log(freq / 440) / Math.log(2));
        const note = Math.round(noteNum) + 69;
        const octave = Math.floor(note / 12) - 1;
        const noteName = noteStrings[note % 12];
        return noteName + octave;
    }
    
    detectBeat() {
        const now = Date.now();
        this.isBeat = false;
        
        // Focus on bass frequencies for beat detection
        let bassSum = 0;
        const bassEnd = Math.floor(this.frequencyData.length * 0.1);
        
        for (let i = 0; i < bassEnd; i++) {
            bassSum += this.frequencyData[i];
        }
        
        const bassLevel = bassSum / bassEnd / 255;
        
        // Detect beat
        if (bassLevel > this.beatThreshold && now - this.lastBeatTime > this.beatCooldown) {
            this.isBeat = true;
            this.lastBeatTime = now;
            
            // Track beat history for BPM calculation
            this.beatHistory.push(now);
            if (this.beatHistory.length > 8) {
                this.beatHistory.shift();
            }
            
            // Calculate BPM
            if (this.beatHistory.length >= 4) {
                const intervals = [];
                for (let i = 1; i < this.beatHistory.length; i++) {
                    intervals.push(this.beatHistory[i] - this.beatHistory[i - 1]);
                }
                const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
                this.bpm = Math.round(60000 / avgInterval);
                this.bpm = Math.min(200, Math.max(40, this.bpm));
            }
            
            if (this.onBeat) {
                this.onBeat(bassLevel);
            }
        }
    }
    
    setSensitivity(value) {
        this.sensitivity = value / 50; // 0-100 -> 0-2
    }
    
    // Get bass frequencies (useful for visuals)
    getBass() {
        return this.frequencies.slice(0, 8).reduce((a, b) => a + b, 0) / 8;
    }
    
    // Get mid frequencies
    getMids() {
        return this.frequencies.slice(8, 32).reduce((a, b) => a + b, 0) / 24;
    }
    
    // Get high frequencies
    getHighs() {
        return this.frequencies.slice(32).reduce((a, b) => a + b, 0) / 32;
    }
    
    stop() {
        this.isRunning = false;
        this.stopExclusivePlayback();
        this.stopOverlays();
        this.stopMicrophone();

        if (this.mediaSource) {
            try {
                this.mediaSource.disconnect();
            } catch (error) {
                // already disconnected
            }
            this.mediaSource = null;
        }

        this.mediaEl = null;
        this.bufferCache.clear();

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        this.analyser = null;
        this.bus = null;
        this.hear = null;
    }
}

// Export
window.AudioEngine = AudioEngine;
