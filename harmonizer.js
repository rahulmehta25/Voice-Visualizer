/**
 * Harmonizer - Voice Visualizer
 * Generates harmonizing tones based on detected pitch
 */

class Harmonizer {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.oscillators = [];
        this.enabled = false;
        this.currentPitch = 0;
        
        // Harmony settings
        this.harmonyIntervals = [
            0,    // Root
            4,    // Major third
            7,    // Perfect fifth
            12    // Octave
        ];
        
        // Smooth pitch tracking
        this.targetPitch = 0;
        this.smoothing = 0.1;
    }
    
    async init(existingContext = null) {
        try {
            // Use existing audio context or create new one
            this.audioContext = existingContext || new (window.AudioContext || window.webkitAudioContext)();
            
            // Master gain for volume control
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0;
            this.masterGain.connect(this.audioContext.destination);
            
            // Create oscillators for each harmony voice
            for (let i = 0; i < this.harmonyIntervals.length; i++) {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                
                osc.type = 'sine';
                osc.frequency.value = 440;
                gain.gain.value = 0;
                
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start();
                
                this.oscillators.push({ osc, gain, interval: this.harmonyIntervals[i] });
            }
            
            console.log('🎵 Harmonizer initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize harmonizer:', error);
            return false;
        }
    }
    
    setEnabled(enabled) {
        this.enabled = enabled;
        
        const now = this.audioContext.currentTime;
        const targetVolume = enabled ? 0.15 : 0;
        
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        this.masterGain.gain.linearRampToValueAtTime(targetVolume, now + 0.1);
    }
    
    updatePitch(pitch, volume) {
        if (!this.enabled || !this.audioContext || pitch <= 0) return;
        
        // Smooth pitch transitions
        this.targetPitch = pitch;
        this.currentPitch += (this.targetPitch - this.currentPitch) * this.smoothing;
        
        const now = this.audioContext.currentTime;
        
        // Update each harmony voice
        for (let i = 0; i < this.oscillators.length; i++) {
            const { osc, gain, interval } = this.oscillators[i];
            
            // Calculate harmony frequency (semitone intervals)
            const harmonyFreq = this.currentPitch * Math.pow(2, interval / 12);
            
            // Smooth frequency transition
            osc.frequency.cancelScheduledValues(now);
            osc.frequency.setValueAtTime(osc.frequency.value, now);
            osc.frequency.linearRampToValueAtTime(harmonyFreq, now + 0.05);
            
            // Adjust volume based on input volume (with some attenuation for harmonics)
            const voiceVolume = volume * (1 - i * 0.15) * 0.8;
            gain.gain.cancelScheduledValues(now);
            gain.gain.setValueAtTime(gain.gain.value, now);
            gain.gain.linearRampToValueAtTime(voiceVolume, now + 0.05);
        }
    }
    
    // Change harmony type
    setHarmonyType(type) {
        switch (type) {
            case 'major':
                this.harmonyIntervals = [0, 4, 7, 12];
                break;
            case 'minor':
                this.harmonyIntervals = [0, 3, 7, 12];
                break;
            case 'power':
                this.harmonyIntervals = [0, 7, 12, 19];
                break;
            case 'ethereal':
                this.harmonyIntervals = [0, 7, 14, 21];
                break;
            default:
                this.harmonyIntervals = [0, 4, 7, 12];
        }
        
        // Update oscillator intervals
        for (let i = 0; i < this.oscillators.length; i++) {
            this.oscillators[i].interval = this.harmonyIntervals[i] || 0;
        }
    }
    
    // Change wave type for different timbres
    setWaveType(type) {
        for (const { osc } of this.oscillators) {
            osc.type = type; // 'sine', 'triangle', 'sawtooth', 'square'
        }
    }
    
    stop() {
        if (this.masterGain) {
            this.masterGain.gain.value = 0;
        }
        
        for (const { osc } of this.oscillators) {
            try {
                osc.stop();
            } catch (e) {}
        }
        
        this.oscillators = [];
    }
}

// Export
window.Harmonizer = Harmonizer;
