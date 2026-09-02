/**
 * Visual Engine
 * Signal Theatre modes with a cinematic idle state.
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
        this.isLive = false;

        this.volume = 0;
        this.frequencies = [];
        this.waveform = [];
        this.isBeat = false;
        this.bass = 0;
        this.mids = 0;
        this.highs = 0;

        this.cloudParticles = [];
        this.auroraSeeds = [];
        this.dust = [];

        this.initCloudParticles();
        this.initAuroraSeeds();
        this.initDust();
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
                hue: 300 + Math.random() * 40
            });
        }
    }

    initAuroraSeeds() {
        this.auroraSeeds = [];
        for (let i = 0; i < 9; i++) {
            this.auroraSeeds.push({
                phase: Math.random() * Math.PI * 2,
                speed: 0.35 + Math.random() * 0.45,
                amplitude: 26 + Math.random() * 36,
                yOffset: 0.18 + i * 0.075,
                hue: 300 + i * 8
            });
        }
    }

    initDust() {
        this.dust = [];
        for (let i = 0; i < 70; i++) {
            this.dust.push({
                x: Math.random(),
                y: Math.random(),
                r: 0.4 + Math.random() * 1.4,
                speed: 0.03 + Math.random() * 0.08,
                alpha: 0.05 + Math.random() * 0.18
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

    setLive(isLive) {
        this.isLive = Boolean(isLive);
    }

    render(audioData) {
        const liveBoost = this.isLive ? 1 : 0.35;
        this.time += 0.016 * (1 + (audioData?.volume || 0) * 0.45) * (this.isLive ? 1 : 0.55);

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
        this.renderDust();

        if (!this.isLive) {
            this.renderIdleSignal();
            this.renderVignette(0.72);
            return;
        }

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

        this.renderVignette(0.56 * liveBoost + 0.2);
    }

    renderBackdrop() {
        const drift = Math.sin(this.time * 0.35) * 0.5 + 0.5;
        const grad = this.ctx.createLinearGradient(0, 0, this.width, this.height);
        grad.addColorStop(0, `rgba(${8 + Math.floor(10 * drift)}, ${4 + Math.floor(6 * this.highs)}, ${14 + Math.floor(18 * drift)}, 1)`);
        grad.addColorStop(0.45, `rgba(6, 3, ${12 + Math.floor(this.bass * 40)}, 1)`);
        grad.addColorStop(1, `rgba(4, 2, ${10 + Math.floor(this.mids * 28)}, 1)`);

        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.width, this.height);

        const glowA = this.ctx.createRadialGradient(
            this.centerX - this.width * 0.18,
            this.centerY + this.height * 0.08,
            this.radius * 0.05,
            this.centerX,
            this.centerY,
            this.radius * 1.15
        );
        const signalAlpha = this.isLive ? 0.1 + this.volume * 0.22 : 0.08 + Math.sin(this.time * 0.8) * 0.03;
        glowA.addColorStop(0, `rgba(255, 61, 154, ${signalAlpha})`);
        glowA.addColorStop(1, 'rgba(255, 61, 154, 0)');
        this.ctx.fillStyle = glowA;
        this.ctx.fillRect(0, 0, this.width, this.height);

        const glowB = this.ctx.createRadialGradient(
            this.centerX + this.width * 0.22,
            this.centerY - this.height * 0.18,
            this.radius * 0.08,
            this.centerX,
            this.centerY,
            this.radius
        );
        glowB.addColorStop(0, `rgba(155, 92, 255, ${this.isLive ? 0.08 + this.mids * 0.16 : 0.06})`);
        glowB.addColorStop(1, 'rgba(155, 92, 255, 0)');
        this.ctx.fillStyle = glowB;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    renderDust() {
        for (let i = 0; i < this.dust.length; i++) {
            const mote = this.dust[i];
            mote.y -= mote.speed * 0.0015;
            if (mote.y < -0.02) {
                mote.y = 1.02;
                mote.x = Math.random();
            }

            const x = mote.x * this.width;
            const y = mote.y * this.height;
            this.ctx.fillStyle = `rgba(246, 238, 254, ${mote.alpha * (this.isLive ? 0.7 : 1)})`;
            this.ctx.beginPath();
            this.ctx.arc(x, y, mote.r, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    renderIdleSignal() {
        const breath = 0.55 + Math.sin(this.time * 0.9) * 0.45;
        const layers = [
            { amp: 38 + breath * 22, alpha: 0.55, width: 2.2, phase: 0 },
            { amp: 24 + breath * 14, alpha: 0.28, width: 1.4, phase: 1.1 },
            { amp: 14 + breath * 10, alpha: 0.16, width: 1, phase: 2.2 }
        ];

        layers.forEach((layer, index) => {
            const gradient = this.ctx.createLinearGradient(0, 0, this.width, 0);
            gradient.addColorStop(0, `rgba(155, 92, 255, ${layer.alpha * 0.35})`);
            gradient.addColorStop(0.5, `rgba(255, 61, 154, ${layer.alpha})`);
            gradient.addColorStop(1, `rgba(155, 92, 255, ${layer.alpha * 0.35})`);

            this.ctx.beginPath();
            for (let x = 0; x <= this.width; x += 4) {
                const t = x / this.width;
                const y = this.centerY
                    + Math.sin(t * Math.PI * 2 * 1.5 + this.time * 1.2 + layer.phase) * layer.amp
                    + Math.sin(t * Math.PI * 6 + this.time * 0.55 + index) * (4 + breath * 3);

                if (x === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }

            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = layer.width;
            this.ctx.shadowColor = 'rgba(255, 61, 154, 0.45)';
            this.ctx.shadowBlur = 18 + breath * 10;
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
        });

        const ringPulse = 0.35 + breath * 0.4;
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.radius * (0.18 + breath * 0.03), 0, Math.PI * 2);
        this.ctx.strokeStyle = `rgba(255, 61, 154, ${0.12 + ringPulse * 0.12})`;
        this.ctx.lineWidth = 1.2;
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, 3 + breath * 2, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(255, 61, 154, ${0.35 + breath * 0.25})`;
        this.ctx.fill();
    }

    renderVignette(strength = 0.56) {
        const vignette = this.ctx.createRadialGradient(
            this.centerX,
            this.centerY,
            this.radius * 0.18,
            this.centerX,
            this.centerY,
            this.radius * 1.3
        );
        vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignette.addColorStop(1, `rgba(0, 0, 0, ${strength})`);
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

        for (let i = 0; i < 5; i++) {
            const y = (this.height / 5) * i;
            this.ctx.strokeStyle = `rgba(255, 61, 154, ${0.04 + this.volume * 0.05})`;
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
            const alpha = 0.9 - index * 0.22;

            gradient.addColorStop(0, `rgba(155, 92, 255, ${alpha})`);
            gradient.addColorStop(0.5, `rgba(255, 61, 154, ${alpha})`);
            gradient.addColorStop(1, `rgba(155, 92, 255, ${alpha})`);

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
            this.ctx.shadowColor = 'rgba(255, 61, 154, 0.55)';
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
        fill.addColorStop(0, `rgba(255, 61, 154, ${0.18 + this.volume * 0.2})`);
        fill.addColorStop(1, 'rgba(5, 3, 8, 0)');
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

            const mix = i / bars;
            const r = Math.round(255 - mix * 60);
            const g = Math.round(61 + mix * 30);
            const b = Math.round(154 + mix * 100);
            this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.18 + freq * 0.82})`;
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
        this.ctx.strokeStyle = `rgba(246, 238, 254, ${0.28 + this.volume * 0.5})`;
        this.ctx.lineWidth = 2.5;
        this.ctx.shadowColor = 'rgba(255, 61, 154, 0.8)';
        this.ctx.shadowBlur = 20;
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;

        const pulseRadius = innerRadius + 20 + this.beatPulse * 80;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, pulseRadius, 0, Math.PI * 2);
        this.ctx.strokeStyle = `rgba(255, 61, 154, ${this.beatPulse * 0.75})`;
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

            const hue = (300 + (p.hue % 40) + this.time * 12 + this.highs * 40) % 360;
            this.ctx.fillStyle = `hsla(${hue}, 92%, 68%, ${alpha})`;
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
        core.addColorStop(0, `rgba(255, 61, 154, ${0.2 + this.volume * 0.28})`);
        core.addColorStop(1, 'rgba(255, 61, 154, 0)');
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
            const hue = (seed.hue + this.time * 16 + this.highs * 40) % 360;
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
            gradient.addColorStop(0, `hsla(${hue}, 92%, 66%, ${0.16 + this.volume * 0.22})`);
            gradient.addColorStop(0.45, `hsla(${(hue + 28) % 360}, 88%, 62%, ${0.12 + this.mids * 0.26})`);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

            this.ctx.fillStyle = gradient;
            this.ctx.fill();
        }

        this.ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < frequencies.length; i += 2) {
            const freq = frequencies[i] || 0;
            const x = (i / frequencies.length) * this.width;
            const h = 30 + freq * this.height * 0.42;
            this.ctx.fillStyle = `rgba(255, 61, 154, ${0.04 + freq * 0.12})`;
            this.ctx.fillRect(x, this.height - h, this.width / frequencies.length + 1, h);
        }

        this.ctx.restore();
    }
}

window.VisualEngine = VisualEngine;
