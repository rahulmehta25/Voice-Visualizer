/**
 * Visual Engine
 * Four immersive audio-reactive modes with smooth crossfades.
 */

class VisualEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        this.width = 0;
        this.height = 0;
        this.centerX = 0;
        this.centerY = 0;
        this.radius = 0;

        this.mode = 'waveform';
        this.previousMode = null;
        this.transition = 0;

        this.time = 0;
        this.beatPulse = 0;

        this.volume = 0;
        this.frequencies = [];
        this.waveform = [];
        this.isBeat = false;
        this.bass = 0;
        this.mids = 0;
        this.highs = 0;

        this.cloudParticles = [];
        this.auroraSeeds = [];

        this.initCloudParticles();
        this.initAuroraSeeds();
        this.resize();

        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
        this.radius = Math.min(this.width, this.height) * 0.48;

        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    initCloudParticles() {
        this.cloudParticles = [];
        for (let i = 0; i < 620; i++) {
            this.cloudParticles.push({
                x: (Math.random() - 0.5) * 2.6,
                y: (Math.random() - 0.5) * 2.6,
                z: (Math.random() - 0.5) * 2.6,
                vx: (Math.random() - 0.5) * 0.006,
                vy: (Math.random() - 0.5) * 0.006,
                vz: (Math.random() - 0.5) * 0.006,
                hue: Math.random() * 360
            });
        }
    }

    initAuroraSeeds() {
        this.auroraSeeds = [];
        for (let i = 0; i < 9; i++) {
            this.auroraSeeds.push({
                phase: Math.random() * Math.PI * 2,
                speed: 0.45 + Math.random() * 0.55,
                amplitude: 26 + Math.random() * 36,
                yOffset: 0.18 + i * 0.075,
                hue: 140 + i * 14
            });
        }
    }

    setMode(mode) {
        if (this.mode === mode) {
            return;
        }

        this.previousMode = this.mode;
        this.mode = mode;
        this.transition = 1;
    }

    render(audioData) {
        this.time += 0.016 * (1 + (audioData?.volume || 0) * 0.45);

        this.volume = audioData?.volume || 0;
        this.frequencies = audioData?.frequencies || [];
        this.waveform = audioData?.waveform || [];
        this.isBeat = Boolean(audioData?.isBeat);
        this.bass = audioData?.bass || 0;
        this.mids = audioData?.mids || 0;
        this.highs = audioData?.highs || 0;

        if (this.isBeat) {
            this.beatPulse = 1;
        } else {
            this.beatPulse = Math.max(0, this.beatPulse - 0.055);
        }

        this.ctx.clearRect(0, 0, this.width, this.height);
        this.renderBackdrop();

        if (this.transition > 0 && this.previousMode) {
            this.ctx.save();
            this.ctx.globalAlpha = this.transition;
            this.renderMode(this.previousMode);
            this.ctx.restore();

            this.ctx.save();
            this.ctx.globalAlpha = 1 - this.transition;
            this.renderMode(this.mode);
            this.ctx.restore();

            this.transition = Math.max(0, this.transition - 0.045);
            if (this.transition === 0) {
                this.previousMode = null;
            }
        } else {
            this.renderMode(this.mode);
        }

        this.renderVignette();
    }

    renderBackdrop() {
        const drift = Math.sin(this.time * 0.55) * 0.5 + 0.5;
        const grad = this.ctx.createLinearGradient(0, 0, this.width, this.height);
        grad.addColorStop(0, `rgba(${18 + Math.floor(25 * drift)}, ${20 + Math.floor(20 * this.highs)}, 46, 0.92)`);
        grad.addColorStop(0.5, `rgba(8, 12, ${28 + Math.floor(this.bass * 60)}, 0.9)`);
        grad.addColorStop(1, `rgba(6, 9, ${22 + Math.floor(this.mids * 42)}, 0.96)`);

        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.width, this.height);

        const glow = this.ctx.createRadialGradient(
            this.centerX + Math.sin(this.time * 0.4) * this.width * 0.2,
            this.centerY - this.height * 0.2,
            this.radius * 0.1,
            this.centerX,
            this.centerY,
            this.radius
        );
        glow.addColorStop(0, `rgba(87, 245, 255, ${0.12 + this.volume * 0.16})`);
        glow.addColorStop(1, 'rgba(87, 245, 255, 0)');
        this.ctx.fillStyle = glow;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    renderVignette() {
        const vignette = this.ctx.createRadialGradient(
            this.centerX,
            this.centerY,
            this.radius * 0.2,
            this.centerX,
            this.centerY,
            this.radius * 1.25
        );
        vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignette.addColorStop(1, 'rgba(0, 0, 0, 0.56)');
        this.ctx.fillStyle = vignette;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    renderMode(mode) {
        switch (mode) {
            case 'waveform':
                this.renderWaveformMode();
                break;
            case 'radial':
                this.renderRadialMode();
                break;
            case 'cloud':
                this.renderCloudMode();
                break;
            case 'aurora':
                this.renderAuroraMode();
                break;
            default:
                this.renderWaveformMode();
                break;
        }
    }

    renderWaveformMode() {
        const waveform = this.waveform.length ? this.waveform : new Array(1024).fill(0);
        const layers = [1, 0.72, 0.45];
        const phaseBase = this.time * 2.8;

        for (let i = 0; i < 6; i++) {
            const y = (this.height / 6) * i;
            this.ctx.strokeStyle = `rgba(130, 170, 255, ${0.06 + this.volume * 0.08})`;
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }

        layers.forEach((layer, index) => {
            const amp = (55 + this.volume * 170) * layer;
            const wobble = 10 + this.mids * 40;
            const gradient = this.ctx.createLinearGradient(0, 0, this.width, 0);
            const alpha = 0.85 - index * 0.22;

            gradient.addColorStop(0, `rgba(87, 245, 255, ${alpha})`);
            gradient.addColorStop(0.5, `rgba(124, 180, 255, ${alpha})`);
            gradient.addColorStop(1, `rgba(158, 91, 255, ${alpha})`);

            this.ctx.beginPath();
            for (let x = 0; x <= this.width; x += 3) {
                const waveIndex = Math.floor((x / this.width) * (waveform.length - 1));
                const signal = waveform[waveIndex] || 0;
                const synthetic = Math.sin(x * 0.007 + phaseBase + index) * wobble;
                const y = this.centerY + signal * amp + synthetic;

                if (x === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 2 + (layers.length - index);
            this.ctx.shadowColor = 'rgba(87, 245, 255, 0.55)';
            this.ctx.shadowBlur = 14 + this.volume * 25;
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
        });

        this.ctx.beginPath();
        this.ctx.moveTo(0, this.centerY);
        for (let x = 0; x <= this.width; x += 5) {
            const waveIndex = Math.floor((x / this.width) * (waveform.length - 1));
            const signal = waveform[waveIndex] || 0;
            const y = this.centerY + signal * (45 + this.volume * 110);
            this.ctx.lineTo(x, y);
        }
        this.ctx.lineTo(this.width, this.height);
        this.ctx.lineTo(0, this.height);
        this.ctx.closePath();
        const fill = this.ctx.createLinearGradient(0, this.centerY, 0, this.height);
        fill.addColorStop(0, `rgba(100, 220, 255, ${0.22 + this.volume * 0.22})`);
        fill.addColorStop(1, 'rgba(5, 8, 20, 0)');
        this.ctx.fillStyle = fill;
        this.ctx.fill();
    }

    renderRadialMode() {
        const frequencies = this.frequencies.length ? this.frequencies : new Array(64).fill(0);
        const waveform = this.waveform.length ? this.waveform : new Array(512).fill(0);
        const bars = Math.min(96, frequencies.length);

        this.ctx.save();
        this.ctx.translate(this.centerX, this.centerY);
        this.ctx.rotate(this.time * 0.36);

        const innerRadius = this.radius * 0.19;

        for (let i = 0; i < bars; i++) {
            const angle = (i / bars) * Math.PI * 2;
            const freq = frequencies[i] || 0;
            const length = 38 + freq * this.radius * 0.46;
            const x1 = Math.cos(angle) * innerRadius;
            const y1 = Math.sin(angle) * innerRadius;
            const x2 = Math.cos(angle) * (innerRadius + length);
            const y2 = Math.sin(angle) * (innerRadius + length);

            const hue = 175 + (i / bars) * 170 + this.highs * 90;
            this.ctx.strokeStyle = `hsla(${hue % 360}, 92%, 68%, ${0.2 + freq * 0.85})`;
            this.ctx.lineWidth = 1.2 + freq * 5;
            this.ctx.lineCap = 'round';
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        }

        this.ctx.beginPath();
        for (let i = 0; i <= waveform.length; i += 6) {
            const idx = i % waveform.length;
            const angle = (i / waveform.length) * Math.PI * 2;
            const signal = waveform[idx] || 0;
            const r = innerRadius + 24 + signal * (35 + this.mids * 110);
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.closePath();
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 + this.volume * 0.5})`;
        this.ctx.lineWidth = 2.5;
        this.ctx.shadowColor = 'rgba(173, 231, 255, 0.8)';
        this.ctx.shadowBlur = 20;
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;

        const pulseRadius = innerRadius + 20 + this.beatPulse * 80;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, pulseRadius, 0, Math.PI * 2);
        this.ctx.strokeStyle = `rgba(255, 197, 110, ${this.beatPulse * 0.75})`;
        this.ctx.lineWidth = 3 + this.beatPulse * 6;
        this.ctx.stroke();

        this.ctx.restore();
    }

    renderCloudMode() {
        const frequencies = this.frequencies.length ? this.frequencies : new Array(64).fill(0);
        const rotY = this.time * 0.24 + this.mids * 1.5;
        const rotX = Math.sin(this.time * 0.31) * 0.45 + this.bass * 0.85;

        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);
        const cosX = Math.cos(rotX);
        const sinX = Math.sin(rotX);

        const projected = [];

        this.ctx.save();
        this.ctx.translate(this.centerX, this.centerY);

        for (let i = 0; i < this.cloudParticles.length; i++) {
            const p = this.cloudParticles[i];
            const freq = frequencies[i % frequencies.length] || 0;

            if (this.isBeat && i % 9 === 0) {
                p.vx += (Math.random() - 0.5) * 0.02;
                p.vy += (Math.random() - 0.5) * 0.02;
                p.vz += (Math.random() - 0.5) * 0.02;
            }

            const speed = 0.55 + this.volume * 2.25;
            p.x += p.vx * speed;
            p.y += p.vy * speed;
            p.z += p.vz * speed;

            if (p.x > 1.4 || p.x < -1.4) p.vx *= -1;
            if (p.y > 1.4 || p.y < -1.4) p.vy *= -1;
            if (p.z > 1.4 || p.z < -1.4) p.vz *= -1;

            const x1 = p.x * cosY - p.z * sinY;
            const z1 = p.x * sinY + p.z * cosY;
            const y1 = p.y * cosX - z1 * sinX;
            const z2 = p.y * sinX + z1 * cosX;

            const depth = (z2 + 2.4) / 4.8;
            if (depth <= 0) continue;

            const perspective = 0.35 + depth * 1.65;
            const sx = x1 * this.radius * 0.65 * perspective;
            const sy = y1 * this.radius * 0.65 * perspective;
            const size = (0.9 + depth * 2.8) * (1 + freq * 3.2);
            const alpha = Math.min(0.98, 0.16 + depth * 0.5 + this.volume * 0.2);

            const hue = (p.hue + this.time * 24 + i * 0.04 + this.highs * 80) % 360;
            this.ctx.fillStyle = `hsla(${hue}, 96%, 74%, ${alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(sx, sy, size, 0, Math.PI * 2);
            this.ctx.fill();

            if (i < 260) {
                projected.push({ x: sx, y: sy, alpha, hue });
            }
        }

        this.ctx.lineWidth = 0.7;
        for (let i = 0; i < projected.length; i += 7) {
            const a = projected[i];
            const b = projected[(i + 11) % projected.length];
            const dist = Math.hypot(a.x - b.x, a.y - b.y);
            if (dist > this.radius * 0.42) {
                continue;
            }

            this.ctx.strokeStyle = `hsla(${a.hue}, 90%, 70%, ${Math.max(0, 0.28 - dist / (this.radius * 1.8))})`;
            this.ctx.beginPath();
            this.ctx.moveTo(a.x, a.y);
            this.ctx.lineTo(b.x, b.y);
            this.ctx.stroke();
        }

        const core = this.ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 0.34);
        core.addColorStop(0, `rgba(123, 223, 255, ${0.22 + this.volume * 0.3})`);
        core.addColorStop(1, 'rgba(123, 223, 255, 0)');
        this.ctx.fillStyle = core;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.radius * 0.34, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    renderAuroraMode() {
        const frequencies = this.frequencies.length ? this.frequencies : new Array(64).fill(0);

        this.ctx.save();
        this.ctx.globalCompositeOperation = 'screen';

        for (let i = 0; i < this.auroraSeeds.length; i++) {
            const seed = this.auroraSeeds[i];
            const hue = (seed.hue + this.time * 20 + this.highs * 90) % 360;
            const amp = seed.amplitude + this.volume * 130;
            const baseY = this.height * seed.yOffset;

            this.ctx.beginPath();
            this.ctx.moveTo(0, this.height);
            for (let x = 0; x <= this.width; x += 10) {
                const freq = frequencies[(Math.floor((x / this.width) * frequencies.length) + i * 3) % frequencies.length] || 0;
                const waveA = Math.sin(x * 0.008 + this.time * seed.speed + seed.phase) * amp;
                const waveB = Math.cos(x * 0.003 + this.time * 1.2 + seed.phase * 0.5) * amp * 0.4;
                const y = baseY + waveA + waveB - freq * 180;
                this.ctx.lineTo(x, y);
            }
            this.ctx.lineTo(this.width, this.height);
            this.ctx.closePath();

            const gradient = this.ctx.createLinearGradient(0, baseY - amp * 2.1, 0, this.height);
            gradient.addColorStop(0, `hsla(${hue}, 96%, 72%, ${0.18 + this.volume * 0.22})`);
            gradient.addColorStop(0.45, `hsla(${(hue + 45) % 360}, 90%, 66%, ${0.14 + this.mids * 0.28})`);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

            this.ctx.fillStyle = gradient;
            this.ctx.fill();
        }

        this.ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < frequencies.length; i += 2) {
            const freq = frequencies[i] || 0;
            const x = (i / frequencies.length) * this.width;
            const h = 30 + freq * this.height * 0.42;
            this.ctx.fillStyle = `rgba(120, 255, 192, ${0.05 + freq * 0.13})`;
            this.ctx.fillRect(x, this.height - h, this.width / frequencies.length + 1, h);
        }

        this.ctx.restore();
    }
}

window.VisualEngine = VisualEngine;
