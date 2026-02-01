/**
 * Visual Engine - Voice Visualizer
 * Handles all canvas rendering and visual modes
 */

class VisualEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = 0;
        this.height = 0;
        this.centerX = 0;
        this.centerY = 0;
        
        this.mode = 'particles';
        this.colorTheme = 'neon';
        this.bgStyle = 'dark';
        
        // Animation state
        this.time = 0;
        this.particles = [];
        this.geometryRotation = 0;
        this.fireworks = [];
        this.stars = [];
        
        // Audio data references
        this.volume = 0;
        this.frequencies = [];
        this.waveform = [];
        this.isBeat = false;
        this.bass = 0;
        this.mids = 0;
        this.highs = 0;
        
        // Color palettes
        this.palettes = {
            neon: ['#ff00ff', '#00ffff', '#9d00ff', '#0066ff', '#00ff66'],
            sunset: ['#ff0000', '#ff6600', '#ff9900', '#ffcc00', '#ffff00'],
            ocean: ['#0033ff', '#0066ff', '#0099ff', '#00ccff', '#00ffff'],
            forest: ['#003300', '#006600', '#00ff00', '#66ff66', '#99ff99'],
            rainbow: ['#ff0000', '#ff9900', '#ffff00', '#00ff00', '#0099ff', '#9900ff']
        };
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // Initialize particles
        this.initParticles();
        this.initStars();
    }
    
    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
    }
    
    getColors() {
        return this.palettes[this.colorTheme] || this.palettes.neon;
    }
    
    getColor(index) {
        const colors = this.getColors();
        return colors[index % colors.length];
    }
    
    // ================================
    // PARTICLES MODE
    // ================================
    initParticles() {
        this.particles = [];
        for (let i = 0; i < 200; i++) {
            this.particles.push(this.createParticle());
        }
    }
    
    createParticle(x, y) {
        return {
            x: x ?? Math.random() * this.width,
            y: y ?? Math.random() * this.height,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            size: Math.random() * 3 + 1,
            color: this.getColor(Math.floor(Math.random() * 5)),
            life: 1,
            decay: Math.random() * 0.01 + 0.005
        };
    }
    
    renderParticles() {
        const colors = this.getColors();
        
        // Update and draw particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            // Apply audio influence
            p.vx += (Math.random() - 0.5) * this.volume * 0.5;
            p.vy += (Math.random() - 0.5) * this.volume * 0.5;
            
            // Move
            p.x += p.vx * (1 + this.bass * 3);
            p.y += p.vy * (1 + this.bass * 3);
            
            // Bounce off edges
            if (p.x < 0 || p.x > this.width) p.vx *= -1;
            if (p.y < 0 || p.y > this.height) p.vy *= -1;
            
            // Size pulsing with audio
            const size = p.size * (1 + this.volume * 3);
            
            // Draw glow
            const gradient = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 4);
            gradient.addColorStop(0, p.color);
            gradient.addColorStop(0.5, p.color + '88');
            gradient.addColorStop(1, 'transparent');
            
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, size * 4, 0, Math.PI * 2);
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
            
            // Draw core
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fill();
        }
        
        // Add particles on beat
        if (this.isBeat) {
            for (let i = 0; i < 20; i++) {
                this.particles.push(this.createParticle(this.centerX, this.centerY));
            }
        }
        
        // Draw connections between close particles
        this.ctx.strokeStyle = colors[0] + '40';
        this.ctx.lineWidth = 0.5;
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const dx = this.particles[i].x - this.particles[j].x;
                const dy = this.particles[i].y - this.particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 100 * (1 + this.volume)) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
                    this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
                    this.ctx.stroke();
                }
            }
        }
        
        // Keep particle count in check
        while (this.particles.length > 300) {
            this.particles.shift();
        }
    }
    
    // ================================
    // WAVES MODE
    // ================================
    renderWaves() {
        const colors = this.getColors();
        const numWaves = 5;
        
        for (let w = 0; w < numWaves; w++) {
            this.ctx.beginPath();
            
            const waveOffset = (w / numWaves) * Math.PI;
            const amplitude = (50 + this.volume * 150) * ((numWaves - w) / numWaves);
            const frequency = 0.01 + this.bass * 0.02;
            
            this.ctx.moveTo(0, this.centerY);
            
            for (let x = 0; x <= this.width; x += 5) {
                // Combine multiple wave functions
                let y = this.centerY;
                y += Math.sin(x * frequency + this.time * 2 + waveOffset) * amplitude;
                y += Math.sin(x * frequency * 2 + this.time * 3) * amplitude * 0.5 * this.mids;
                y += Math.sin(x * frequency * 0.5 + this.time) * amplitude * 0.3;
                
                // Add waveform data
                const waveIndex = Math.floor((x / this.width) * this.waveform.length);
                if (this.waveform[waveIndex]) {
                    y += this.waveform[waveIndex] * 100;
                }
                
                this.ctx.lineTo(x, y);
            }
            
            // Create gradient stroke
            const gradient = this.ctx.createLinearGradient(0, 0, this.width, 0);
            gradient.addColorStop(0, colors[w % colors.length]);
            gradient.addColorStop(0.5, colors[(w + 1) % colors.length]);
            gradient.addColorStop(1, colors[(w + 2) % colors.length]);
            
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 3 + this.volume * 5;
            this.ctx.lineCap = 'round';
            this.ctx.shadowColor = colors[w % colors.length];
            this.ctx.shadowBlur = 20 + this.volume * 30;
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
        }
        
        // Add frequency bars as vertical waves
        const barWidth = this.width / this.frequencies.length;
        for (let i = 0; i < this.frequencies.length; i++) {
            const barHeight = this.frequencies[i] * this.height * 0.3;
            const x = i * barWidth;
            
            const gradient = this.ctx.createLinearGradient(x, this.height, x, this.height - barHeight);
            gradient.addColorStop(0, colors[i % colors.length] + '00');
            gradient.addColorStop(1, colors[i % colors.length]);
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x, this.height - barHeight, barWidth - 1, barHeight);
        }
    }
    
    // ================================
    // GEOMETRIC MODE
    // ================================
    renderGeometric() {
        const colors = this.getColors();
        this.geometryRotation += 0.01 + this.volume * 0.05;
        
        // Draw sacred geometry patterns
        this.ctx.save();
        this.ctx.translate(this.centerX, this.centerY);
        this.ctx.rotate(this.geometryRotation);
        
        // Flower of Life pattern
        const baseRadius = 100 + this.volume * 100;
        const numCircles = 6;
        
        for (let layer = 0; layer < 3; layer++) {
            const layerRadius = baseRadius * (layer + 1) * 0.5;
            const alpha = 1 - layer * 0.3;
            
            // Center circle
            this.ctx.beginPath();
            this.ctx.arc(0, 0, layerRadius, 0, Math.PI * 2);
            this.ctx.strokeStyle = colors[layer % colors.length] + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            this.ctx.lineWidth = 2 + this.bass * 3;
            this.ctx.shadowColor = colors[layer % colors.length];
            this.ctx.shadowBlur = 20;
            this.ctx.stroke();
            
            // Surrounding circles
            for (let i = 0; i < numCircles; i++) {
                const angle = (i / numCircles) * Math.PI * 2;
                const x = Math.cos(angle) * layerRadius;
                const y = Math.sin(angle) * layerRadius;
                
                this.ctx.beginPath();
                this.ctx.arc(x, y, layerRadius, 0, Math.PI * 2);
                this.ctx.strokeStyle = colors[(i + layer) % colors.length] + Math.floor(alpha * 200).toString(16).padStart(2, '0');
                this.ctx.stroke();
            }
        }
        
        // Draw polygon based on frequency bands
        const numSides = 6 + Math.floor(this.mids * 6);
        const polygonRadius = 150 + this.highs * 200;
        
        this.ctx.beginPath();
        for (let i = 0; i <= numSides; i++) {
            const angle = (i / numSides) * Math.PI * 2 - Math.PI / 2;
            const freqIndex = i % this.frequencies.length;
            const r = polygonRadius + (this.frequencies[freqIndex] || 0) * 100;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.closePath();
        
        const gradient = this.ctx.createLinearGradient(-polygonRadius, -polygonRadius, polygonRadius, polygonRadius);
        gradient.addColorStop(0, colors[0] + '88');
        gradient.addColorStop(0.5, colors[1] + '88');
        gradient.addColorStop(1, colors[2] + '88');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Rotating lines
        const numLines = 12;
        for (let i = 0; i < numLines; i++) {
            const angle = (i / numLines) * Math.PI * 2 + this.geometryRotation * 2;
            const length = 200 + (this.frequencies[i * 4] || 0) * 300;
            
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
            this.ctx.strokeStyle = colors[i % colors.length];
            this.ctx.lineWidth = 1 + this.bass * 3;
            this.ctx.stroke();
        }
        
        this.ctx.restore();
        this.ctx.shadowBlur = 0;
    }
    
    // ================================
    // ABSTRACT MODE
    // ================================
    renderAbstract() {
        const colors = this.getColors();
        
        // Organic blob shapes
        const numBlobs = 5;
        
        for (let b = 0; b < numBlobs; b++) {
            const blobTime = this.time + b * 100;
            const blobX = this.centerX + Math.sin(blobTime * 0.5) * 200;
            const blobY = this.centerY + Math.cos(blobTime * 0.3) * 150;
            const baseSize = 100 + this.volume * 150 + b * 30;
            
            // Draw blob using bezier curves
            this.ctx.beginPath();
            const numPoints = 8;
            const points = [];
            
            for (let i = 0; i < numPoints; i++) {
                const angle = (i / numPoints) * Math.PI * 2;
                const freqInfluence = this.frequencies[i * 8] || 0;
                const r = baseSize + Math.sin(blobTime + i) * 30 + freqInfluence * 100;
                points.push({
                    x: blobX + Math.cos(angle) * r,
                    y: blobY + Math.sin(angle) * r
                });
            }
            
            // Draw smooth curve through points
            this.ctx.moveTo(points[0].x, points[0].y);
            
            for (let i = 0; i < points.length; i++) {
                const p0 = points[i];
                const p1 = points[(i + 1) % points.length];
                const midX = (p0.x + p1.x) / 2;
                const midY = (p0.y + p1.y) / 2;
                this.ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
            }
            
            this.ctx.closePath();
            
            // Gradient fill
            const gradient = this.ctx.createRadialGradient(blobX, blobY, 0, blobX, blobY, baseSize * 1.5);
            gradient.addColorStop(0, colors[b % colors.length] + 'aa');
            gradient.addColorStop(0.7, colors[(b + 1) % colors.length] + '44');
            gradient.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
        }
        
        // Add flowing lines
        for (let l = 0; l < 10; l++) {
            this.ctx.beginPath();
            const startY = (l / 10) * this.height;
            
            this.ctx.moveTo(0, startY);
            
            for (let x = 0; x <= this.width; x += 20) {
                const noise = Math.sin(x * 0.01 + this.time + l) * 50;
                const audioNoise = (this.frequencies[Math.floor(x / 20) % this.frequencies.length] || 0) * 100;
                const y = startY + noise + audioNoise * Math.sin(this.time * 2);
                this.ctx.lineTo(x, y);
            }
            
            this.ctx.strokeStyle = colors[l % colors.length] + '60';
            this.ctx.lineWidth = 2 + this.volume * 3;
            this.ctx.stroke();
        }
    }
    
    // ================================
    // FIREWORKS MODE
    // ================================
    renderFireworks() {
        const colors = this.getColors();
        
        // Launch fireworks on beat
        if (this.isBeat) {
            const x = Math.random() * this.width;
            this.launchFirework(x, this.height, colors[Math.floor(Math.random() * colors.length)]);
        }
        
        // Also launch based on volume
        if (Math.random() < this.volume * 0.1) {
            const x = Math.random() * this.width;
            this.launchFirework(x, this.height, colors[Math.floor(Math.random() * colors.length)]);
        }
        
        // Update and draw fireworks
        for (let i = this.fireworks.length - 1; i >= 0; i--) {
            const fw = this.fireworks[i];
            
            if (!fw.exploded) {
                // Rising
                fw.y += fw.vy;
                fw.vy += 0.2; // gravity
                
                // Trail
                this.ctx.beginPath();
                this.ctx.arc(fw.x, fw.y, 3, 0, Math.PI * 2);
                this.ctx.fillStyle = fw.color;
                this.ctx.fill();
                
                // Explode at peak
                if (fw.vy >= 0) {
                    fw.exploded = true;
                    this.createExplosion(fw);
                }
            } else {
                // Draw explosion particles
                let allDead = true;
                
                for (const particle of fw.particles) {
                    particle.x += particle.vx;
                    particle.y += particle.vy;
                    particle.vy += 0.1; // gravity
                    particle.life -= particle.decay;
                    
                    if (particle.life > 0) {
                        allDead = false;
                        
                        // Draw particle
                        const gradient = this.ctx.createRadialGradient(
                            particle.x, particle.y, 0,
                            particle.x, particle.y, particle.size * 2
                        );
                        gradient.addColorStop(0, fw.color);
                        gradient.addColorStop(0.5, fw.color + Math.floor(particle.life * 255).toString(16).padStart(2, '0'));
                        gradient.addColorStop(1, 'transparent');
                        
                        this.ctx.beginPath();
                        this.ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
                        this.ctx.fillStyle = gradient;
                        this.ctx.fill();
                    }
                }
                
                if (allDead) {
                    this.fireworks.splice(i, 1);
                }
            }
        }
        
        // Draw frequency-reactive ring
        this.ctx.save();
        this.ctx.translate(this.centerX, this.centerY);
        
        const numBars = 64;
        const innerRadius = 100;
        
        for (let i = 0; i < numBars; i++) {
            const angle = (i / numBars) * Math.PI * 2 - Math.PI / 2;
            const freqValue = this.frequencies[i] || 0;
            const barLength = 50 + freqValue * 200;
            
            const x1 = Math.cos(angle) * innerRadius;
            const y1 = Math.sin(angle) * innerRadius;
            const x2 = Math.cos(angle) * (innerRadius + barLength);
            const y2 = Math.sin(angle) * (innerRadius + barLength);
            
            const gradient = this.ctx.createLinearGradient(x1, y1, x2, y2);
            gradient.addColorStop(0, colors[i % colors.length]);
            gradient.addColorStop(1, colors[(i + 1) % colors.length] + '00');
            
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 4;
            this.ctx.lineCap = 'round';
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    launchFirework(x, y, color) {
        this.fireworks.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 2,
            vy: -15 - Math.random() * 5 - this.volume * 5,
            color: color,
            exploded: false,
            particles: []
        });
    }
    
    createExplosion(firework) {
        const numParticles = 50 + Math.floor(this.volume * 50);
        
        for (let i = 0; i < numParticles; i++) {
            const angle = (i / numParticles) * Math.PI * 2;
            const speed = 2 + Math.random() * 4 + this.volume * 3;
            
            firework.particles.push({
                x: firework.x,
                y: firework.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2 + Math.random() * 2,
                life: 1,
                decay: 0.01 + Math.random() * 0.02
            });
        }
    }
    
    // ================================
    // STARS BACKGROUND
    // ================================
    initStars() {
        this.stars = [];
        for (let i = 0; i < 200; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 2,
                twinkle: Math.random() * Math.PI * 2
            });
        }
    }
    
    renderStars() {
        for (const star of this.stars) {
            star.twinkle += 0.05;
            const alpha = 0.5 + Math.sin(star.twinkle) * 0.5;
            const size = star.size * (1 + this.volume * 0.5);
            
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            this.ctx.fill();
        }
    }
    
    // ================================
    // BACKGROUND RENDERING
    // ================================
    renderBackground() {
        const colors = this.getColors();
        
        switch (this.bgStyle) {
            case 'dark':
                // Pure dark with subtle vignette
                this.ctx.fillStyle = '#0a0a0f';
                this.ctx.fillRect(0, 0, this.width, this.height);
                
                // Vignette
                const vignette = this.ctx.createRadialGradient(
                    this.centerX, this.centerY, 0,
                    this.centerX, this.centerY, Math.max(this.width, this.height) * 0.7
                );
                vignette.addColorStop(0, 'transparent');
                vignette.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
                this.ctx.fillStyle = vignette;
                this.ctx.fillRect(0, 0, this.width, this.height);
                break;
                
            case 'gradient':
                // Animated gradient based on audio
                const bgGradient = this.ctx.createLinearGradient(
                    0, 0, this.width, this.height
                );
                bgGradient.addColorStop(0, colors[0] + '20');
                bgGradient.addColorStop(0.5, '#0a0a0f');
                bgGradient.addColorStop(1, colors[1] + '20');
                this.ctx.fillStyle = bgGradient;
                this.ctx.fillRect(0, 0, this.width, this.height);
                break;
                
            case 'stars':
                this.ctx.fillStyle = '#050510';
                this.ctx.fillRect(0, 0, this.width, this.height);
                this.renderStars();
                break;
        }
    }
    
    // ================================
    // MAIN RENDER LOOP
    // ================================
    render(audioData) {
        this.time += 0.016;
        
        // Update audio data
        if (audioData) {
            this.volume = audioData.volume || 0;
            this.frequencies = audioData.frequencies || [];
            this.waveform = audioData.waveform || [];
            this.isBeat = audioData.isBeat || false;
            this.bass = audioData.bass || 0;
            this.mids = audioData.mids || 0;
            this.highs = audioData.highs || 0;
        }
        
        // Clear and draw background
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.renderBackground();
        
        // Render current mode
        switch (this.mode) {
            case 'particles':
                this.renderParticles();
                break;
            case 'waves':
                this.renderWaves();
                break;
            case 'geometric':
                this.renderGeometric();
                break;
            case 'abstract':
                this.renderAbstract();
                break;
            case 'fireworks':
                this.renderFireworks();
                break;
        }
    }
    
    setMode(mode) {
        this.mode = mode;
        // Reset mode-specific state
        if (mode === 'particles') {
            this.initParticles();
        } else if (mode === 'fireworks') {
            this.fireworks = [];
        }
    }
    
    setColorTheme(theme) {
        this.colorTheme = theme;
    }
    
    setBgStyle(style) {
        this.bgStyle = style;
        if (style === 'stars') {
            this.initStars();
        }
    }
}

// Export
window.VisualEngine = VisualEngine;
