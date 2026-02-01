/**
 * Audio Engine - Voice Visualizer
 * Handles microphone input, audio analysis, pitch detection, beat detection
 */

class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.dataArray = null;
        this.frequencyData = null;
        this.isRunning = false;
        this.sensitivity = 1.0;
        
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
    }
    
    async init() {
        try {
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });
            
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create analyser node
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.8;
            
            // Connect microphone
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            this.microphone.connect(this.analyser);
            
            // Initialize data arrays
            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);
            this.frequencyData = new Uint8Array(bufferLength);
            
            this.isRunning = true;
            this.analyze();
            
            console.log('🎤 Audio Engine initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize audio:', error);
            return false;
        }
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
        if (this.microphone) {
            this.microphone.disconnect();
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
}

// Export
window.AudioEngine = AudioEngine;
