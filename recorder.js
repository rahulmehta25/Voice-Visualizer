/**
 * Recorder
 * Captures visual clips and generates sound portrait images.
 */

class Recorder {
    constructor(canvas) {
        this.canvas = canvas;
        this.mediaRecorder = null;
        this.audioStream = null;
        this.recordedChunks = [];
        this.isRecording = false;

        this.startTime = 0;
        this.maxDurationMs = 8000;
        this.timerInterval = null;
        this.stopTimeout = null;

        this.onRecordingStart = null;
        this.onRecordingStop = null;
        this.onTimeUpdate = null;
    }

    async startRecording(options = {}) {
        if (this.isRecording) {
            return false;
        }

        this.maxDurationMs = options.maxDurationMs || 8000;

        try {
            const canvasStream = this.canvas.captureStream(60);
            let combinedStream = canvasStream;

            try {
                this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                combinedStream = new MediaStream([
                    ...canvasStream.getVideoTracks(),
                    ...this.audioStream.getAudioTracks()
                ]);
            } catch (error) {
                console.warn('Recording clip without microphone audio:', error);
            }

            const mimeTypes = [
                'video/webm;codecs=vp9,opus',
                'video/webm;codecs=vp8,opus',
                'video/webm'
            ];

            let selectedMimeType = '';
            for (const type of mimeTypes) {
                if (MediaRecorder.isTypeSupported(type)) {
                    selectedMimeType = type;
                    break;
                }
            }

            const optionsForRecorder = selectedMimeType ? { mimeType: selectedMimeType } : undefined;
            this.mediaRecorder = new MediaRecorder(combinedStream, optionsForRecorder);
            this.recordedChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.handleRecordingStop();
            };

            this.mediaRecorder.start(150);
            this.isRecording = true;
            this.startTime = Date.now();

            this.timerInterval = setInterval(() => {
                const elapsed = Date.now() - this.startTime;
                if (this.onTimeUpdate) {
                    this.onTimeUpdate(this.formatTime(elapsed));
                }
            }, 200);

            this.stopTimeout = setTimeout(() => {
                this.stopRecording();
            }, this.maxDurationMs);

            if (this.onRecordingStart) {
                this.onRecordingStart();
            }

            return true;
        } catch (error) {
            console.error('Failed to start recording:', error);
            return false;
        }
    }

    stopRecording() {
        if (!this.mediaRecorder || !this.isRecording) {
            return;
        }

        clearInterval(this.timerInterval);
        clearTimeout(this.stopTimeout);

        this.isRecording = false;
        try {
            this.mediaRecorder.stop();
        } catch (error) {
            console.error('Failed to stop recorder:', error);
        }
    }

    handleRecordingStop() {
        const durationMs = Date.now() - this.startTime;
        const blob = this.recordedChunks.length
            ? new Blob(this.recordedChunks, { type: 'video/webm' })
            : null;

        if (blob) {
            const fileName = `voice-clip-${this.getTimestamp()}.webm`;
            this.downloadBlob(blob, fileName);
        }

        if (this.audioStream) {
            this.audioStream.getTracks().forEach((track) => track.stop());
            this.audioStream = null;
        }

        if (this.onRecordingStop) {
            this.onRecordingStop({ blob, durationMs });
        }

        this.recordedChunks = [];
        this.mediaRecorder = null;
    }

    takeScreenshot() {
        try {
            const dataUrl = this.canvas.toDataURL('image/png');
            const fileName = `visualizer-frame-${this.getTimestamp()}.png`;
            this.downloadDataUrl(dataUrl, fileName);
            return true;
        } catch (error) {
            console.error('Failed to capture screenshot:', error);
            return false;
        }
    }

    async generateSoundPortrait(payload = {}) {
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1350;
        const ctx = canvas.getContext('2d');

        const palette = payload.palette || ['#57f5ff', '#9e5bff', '#6dff92'];
        const frequencies = Array.isArray(payload.frequencyProfile) && payload.frequencyProfile.length
            ? payload.frequencyProfile
            : new Array(64).fill(0);

        const background = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        background.addColorStop(0, '#050915');
        background.addColorStop(0.5, '#0a1328');
        background.addColorStop(1, '#060916');
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < 90; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const r = Math.random() * 1.6;
            ctx.fillStyle = `rgba(190, 225, 255, ${Math.random() * 0.3})`;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        const glow = ctx.createRadialGradient(540, 520, 120, 540, 520, 520);
        glow.addColorStop(0, 'rgba(120, 225, 255, 0.33)');
        glow.addColorStop(1, 'rgba(120, 225, 255, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#f5f8ff';
        ctx.font = '900 54px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SOUND PORTRAIT', 540, 106);

        ctx.font = '600 30px Rajdhani, sans-serif';
        ctx.fillStyle = 'rgba(229, 240, 255, 0.86)';
        ctx.fillText(payload.modeLabel || 'Waveform', 540, 156);

        const centerX = 540;
        const centerY = 520;
        const innerRadius = 120;

        for (let i = 0; i < frequencies.length; i++) {
            const value = Math.max(0, Math.min(1, frequencies[i] || 0));
            const angle = (i / frequencies.length) * Math.PI * 2 - Math.PI / 2;
            const length = 25 + value * 230;

            const x1 = centerX + Math.cos(angle) * innerRadius;
            const y1 = centerY + Math.sin(angle) * innerRadius;
            const x2 = centerX + Math.cos(angle) * (innerRadius + length);
            const y2 = centerY + Math.sin(angle) * (innerRadius + length);

            const grad = ctx.createLinearGradient(x1, y1, x2, y2);
            grad.addColorStop(0, `${palette[0]}cc`);
            grad.addColorStop(0.55, `${palette[1]}aa`);
            grad.addColorStop(1, `${palette[2]}00`);

            ctx.strokeStyle = grad;
            ctx.lineWidth = 3 + value * 8;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(centerX, centerY, 114, 0, Math.PI * 2);
        const core = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, 110);
        core.addColorStop(0, 'rgba(243, 251, 255, 0.95)');
        core.addColorStop(1, 'rgba(113, 198, 255, 0.20)');
        ctx.fillStyle = core;
        ctx.fill();

        ctx.strokeStyle = 'rgba(218, 242, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();

        const cards = [
            { label: 'BPM', value: payload.bpm || '--' },
            { label: 'Peak', value: `${Math.round((payload.peakVolume || 0) * 100)}%` },
            { label: 'Avg Energy', value: `${Math.round((payload.averageVolume || 0) * 100)}%` },
            { label: 'Beats', value: payload.beatCount ?? 0 },
            { label: 'Top Note', value: payload.dominantNote || '--' },
            { label: 'Duration', value: payload.durationLabel || '00:00' }
        ];

        ctx.textAlign = 'left';
        ctx.font = '600 25px Rajdhani, sans-serif';

        cards.forEach((card, index) => {
            const col = index % 2;
            const row = Math.floor(index / 2);
            const x = 150 + col * 390;
            const y = 780 + row * 140;

            ctx.fillStyle = 'rgba(17, 27, 54, 0.74)';
            ctx.strokeStyle = 'rgba(128, 188, 255, 0.33)';
            ctx.lineWidth = 1;
            this.roundRect(ctx, x, y, 330, 100, 20);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = 'rgba(177, 209, 255, 0.88)';
            ctx.fillText(card.label.toUpperCase(), x + 22, y + 36);

            ctx.fillStyle = '#f7fbff';
            ctx.font = '700 36px Orbitron, sans-serif';
            ctx.fillText(String(card.value), x + 22, y + 74);
            ctx.font = '600 25px Rajdhani, sans-serif';
        });

        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(220, 236, 255, 0.74)';
        ctx.font = '600 24px Rajdhani, sans-serif';
        ctx.fillText(payload.timestampLabel || new Date().toLocaleString(), 540, 1260);

        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        const dataUrl = canvas.toDataURL('image/png');
        const fileName = `sound-portrait-${this.getTimestamp()}.png`;

        return { blob, dataUrl, fileName };
    }

    roundRect(ctx, x, y, width, height, radius) {
        const r = Math.min(radius, width / 2, height / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + width, y, x + width, y + height, r);
        ctx.arcTo(x + width, y + height, x, y + height, r);
        ctx.arcTo(x, y + height, x, y, r);
        ctx.arcTo(x, y, x + width, y, r);
        ctx.closePath();
    }

    downloadBlob(blob, fileName) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    downloadDataUrl(dataUrl, fileName) {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remaining = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
    }

    getTimestamp() {
        const now = new Date();
        const pad = (v) => String(v).padStart(2, '0');
        return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    }
}

window.Recorder = Recorder;
