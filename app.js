/**
 * Voice Visualizer - Main Application
 * Ties together audio, visuals, harmonizer, and recorder
 */

class VoiceVisualizerApp {
    constructor() {
        // Core engines
        this.audioEngine = null;
        this.visualEngine = null;
        this.harmonizer = null;
        this.recorder = null;
        
        // State
        this.isRunning = false;
        this.currentMode = 'particles';
        
        // DOM elements
        this.canvas = document.getElementById('visualizer');
        this.startBtn = document.getElementById('startBtn');
        this.settingsToggle = document.getElementById('settingsToggle');
        this.settingsPanel = document.getElementById('settingsPanel');
        this.recordBtn = document.getElementById('recordBtn');
        this.screenshotBtn = document.getElementById('screenshotBtn');
        this.recordingIndicator = document.getElementById('recordingIndicator');
        this.recTime = document.getElementById('recTime');
        this.levelBar = document.getElementById('levelBar');
        this.pitchValue = document.getElementById('pitchValue');
        this.volumeValue = document.getElementById('volumeValue');
        this.bpmValue = document.getElementById('bpmValue');
        this.freqBars = document.getElementById('freqBars');
        
        // Settings elements
        this.sensitivityInput = document.getElementById('sensitivity');
        this.colorThemeSelect = document.getElementById('colorTheme');
        this.harmonizeCheckbox = document.getElementById('harmonize');
        this.bgStyleSelect = document.getElementById('bgStyle');
        
        // Initialize
        this.init();
    }
    
    async init() {
        // Initialize visual engine
        this.visualEngine = new VisualEngine(this.canvas);
        
        // Initialize recorder
        this.recorder = new Recorder(this.canvas);
        this.setupRecorderCallbacks();
        
        // Create frequency bars
        this.createFrequencyBars();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Start render loop (even without audio)
        this.render();
        
        console.log('🎨 Voice Visualizer initialized');
    }
    
    setupEventListeners() {
        // Start button
        this.startBtn.addEventListener('click', () => this.toggleAudio());
        
        // Mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.currentTarget.dataset.mode;
                this.setMode(mode);
                
                // Update active state
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });
        
        // Settings toggle
        this.settingsToggle.addEventListener('click', () => {
            this.settingsPanel.classList.toggle('hidden');
        });
        
        // Settings controls
        this.sensitivityInput.addEventListener('input', (e) => {
            if (this.audioEngine) {
                this.audioEngine.setSensitivity(parseInt(e.target.value));
            }
        });
        
        this.colorThemeSelect.addEventListener('change', (e) => {
            this.visualEngine.setColorTheme(e.target.value);
        });
        
        this.harmonizeCheckbox.addEventListener('change', (e) => {
            if (this.harmonizer) {
                this.harmonizer.setEnabled(e.target.checked);
            }
        });
        
        this.bgStyleSelect.addEventListener('change', (e) => {
            this.visualEngine.setBgStyle(e.target.value);
        });
        
        // Record button
        this.recordBtn.addEventListener('click', () => this.toggleRecording());
        
        // Screenshot button
        this.screenshotBtn.addEventListener('click', () => {
            if (this.recorder.takeScreenshot()) {
                this.showToast('Screenshot saved!', 'success');
            } else {
                this.showToast('Failed to take screenshot', 'error');
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            switch (e.key.toLowerCase()) {
                case ' ':
                    e.preventDefault();
                    this.toggleAudio();
                    break;
                case 'r':
                    if (e.ctrlKey || e.metaKey) return;
                    this.toggleRecording();
                    break;
                case 's':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.recorder.takeScreenshot();
                    }
                    break;
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                    const modes = ['particles', 'waves', 'geometric', 'abstract', 'fireworks'];
                    const modeIndex = parseInt(e.key) - 1;
                    if (modes[modeIndex]) {
                        this.setMode(modes[modeIndex]);
                        document.querySelectorAll('.mode-btn').forEach((btn, i) => {
                            btn.classList.toggle('active', i === modeIndex);
                        });
                    }
                    break;
            }
        });
    }
    
    async toggleAudio() {
        if (!this.isRunning) {
            // Start audio
            this.audioEngine = new AudioEngine();
            const success = await this.audioEngine.init();
            
            if (success) {
                this.isRunning = true;
                this.startBtn.classList.add('active');
                this.startBtn.querySelector('.btn-text').textContent = 'TAP TO STOP';
                
                // Set sensitivity
                this.audioEngine.setSensitivity(parseInt(this.sensitivityInput.value));
                
                // Initialize harmonizer
                this.harmonizer = new Harmonizer();
                await this.harmonizer.init(this.audioEngine.audioContext);
                this.harmonizer.setEnabled(this.harmonizeCheckbox.checked);
                
                // Set up beat callback
                this.audioEngine.onBeat = (intensity) => {
                    // Flash effect or other beat reactions
                    document.body.style.boxShadow = `inset 0 0 100px rgba(0, 255, 255, ${intensity * 0.5})`;
                    setTimeout(() => {
                        document.body.style.boxShadow = 'none';
                    }, 100);
                };
                
                this.showToast('Microphone active! Make some noise!', 'success');
            } else {
                this.showToast('Could not access microphone', 'error');
            }
        } else {
            // Stop audio
            if (this.audioEngine) {
                this.audioEngine.stop();
                this.audioEngine = null;
            }
            if (this.harmonizer) {
                this.harmonizer.stop();
                this.harmonizer = null;
            }
            
            this.isRunning = false;
            this.startBtn.classList.remove('active');
            this.startBtn.querySelector('.btn-text').textContent = 'TAP TO START';
            
            // Reset stats
            this.updateStats(0, '--', 0);
        }
    }
    
    setMode(mode) {
        this.currentMode = mode;
        this.visualEngine.setMode(mode);
    }
    
    toggleRecording() {
        if (!this.recorder.isRecording) {
            this.recorder.startRecording();
        } else {
            this.recorder.stopRecording();
        }
    }
    
    setupRecorderCallbacks() {
        this.recorder.onRecordingStart = () => {
            this.recordBtn.classList.add('recording');
            this.recordingIndicator.classList.remove('hidden');
        };
        
        this.recorder.onRecordingStop = () => {
            this.recordBtn.classList.remove('recording');
            this.recordingIndicator.classList.add('hidden');
            this.showToast('Video saved!', 'success');
        };
        
        this.recorder.onTimeUpdate = (time) => {
            this.recTime.textContent = time;
        };
    }
    
    createFrequencyBars() {
        const numBars = 64;
        this.freqBars.innerHTML = '';
        
        for (let i = 0; i < numBars; i++) {
            const bar = document.createElement('div');
            bar.className = 'freq-bar';
            bar.style.height = '4px';
            this.freqBars.appendChild(bar);
        }
    }
    
    updateFrequencyBars(frequencies) {
        const bars = this.freqBars.children;
        const numBars = Math.min(bars.length, frequencies.length);
        
        for (let i = 0; i < numBars; i++) {
            const height = 4 + frequencies[i] * 56;
            bars[i].style.height = `${height}px`;
        }
    }
    
    updateStats(volume, pitch, bpm) {
        this.volumeValue.textContent = Math.round(volume * 100) + '%';
        this.pitchValue.textContent = typeof pitch === 'string' ? pitch : Math.round(pitch) + 'Hz';
        this.bpmValue.textContent = bpm > 0 ? bpm : '--';
        
        // Update level bar
        this.levelBar.style.width = `${volume * 100}%`;
    }
    
    render() {
        requestAnimationFrame(() => this.render());
        
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
            
            // Update stats display
            this.updateStats(
                this.audioEngine.volume,
                this.audioEngine.dominantNote || Math.round(this.audioEngine.pitch),
                this.audioEngine.bpm
            );
            
            // Update frequency bars
            this.updateFrequencyBars(this.audioEngine.frequencies);
            
            // Update harmonizer
            if (this.harmonizer && this.harmonizeCheckbox.checked) {
                this.harmonizer.updatePitch(this.audioEngine.pitch, this.audioEngine.volume);
            }
        }
        
        // Render visuals
        this.visualEngine.render(audioData);
    }
    
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span>${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new VoiceVisualizerApp();
});
