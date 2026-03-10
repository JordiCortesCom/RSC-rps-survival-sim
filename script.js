const TYPES = {
    ROCK: 'rock',
    PAPER: 'paper',
    SCISSORS: 'scissors'
};

const CHART_COLORS = {
    [TYPES.ROCK]: '#94a3b8',
    [TYPES.PAPER]: '#f8fafc',
    [TYPES.SCISSORS]: '#ef4444'
};

const MAX_HISTORY = 300;
const SAMPLE_INTERVAL = 6;

const EMOJIS = {
    [TYPES.ROCK]: '🪨',
    [TYPES.PAPER]: '📄',
    [TYPES.SCISSORS]: '✂️'
};

// Define who beats who
const RULES = {
    [TYPES.ROCK]: TYPES.SCISSORS,
    [TYPES.PAPER]: TYPES.ROCK,
    [TYPES.SCISSORS]: TYPES.PAPER
};

class Entity {
    constructor(x, y, type, size) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.size = size;

        // Random velocity between -1.5 and 1.5
        const speed = 1.5;
        this.vx = (Math.random() - 0.5) * 2 * speed;
        this.vy = (Math.random() - 0.5) * 2 * speed;

        // Ensure minimum speed so they don't get stuck
        if (Math.abs(this.vx) < 0.2) this.vx = this.vx < 0 ? -0.2 : 0.2;
        if (Math.abs(this.vy) < 0.2) this.vy = this.vy < 0 ? -0.2 : 0.2;
    }

    update(width, height, speedMultiplier) {
        this.x += this.vx * speedMultiplier;
        this.y += this.vy * speedMultiplier;

        // Bounce off walls (accounting for roughly half the size)
        const radius = this.size / 2;

        if (this.x - radius < 0) {
            this.x = radius;
            this.vx *= -1;
        } else if (this.x + radius > width) {
            this.x = width - radius;
            this.vx *= -1;
        }

        if (this.y - radius < 0) {
            this.y = radius;
            this.vy *= -1;
        } else if (this.y + radius > height) {
            this.y = height - radius;
            this.vy *= -1;
        }
    }

    draw(ctx) {
        ctx.font = `${this.size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(EMOJIS[this.type], this.x, this.y);
    }
}

class Simulation {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.entities = [];
        this.animationId = null;

        // State
        this.speedMultiplier = 1;
        this.baseEntitySize = 24;

        // Population chart
        this.chartCanvas = document.getElementById('chartCanvas');
        this.chartCtx = this.chartCanvas.getContext('2d');
        this.chartCanvas.width = 220;
        this.chartCanvas.height = 130;
        this.populationHistory = [];
        this.frameCount = 0;

        // Resize canvas to match container
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // DOM Elements for UI
        this.rockStat = document.getElementById('rockCount');
        this.paperStat = document.getElementById('paperCount');
        this.scissorsStat = document.getElementById('scissorsCount');

        this.setupControls();
        this.start();
    }

    resize() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
    }

    setupControls() {
        document.getElementById('btnSpawnRock').addEventListener('click', () => this.spawnEntities(TYPES.ROCK, 10));
        document.getElementById('btnSpawnPaper').addEventListener('click', () => this.spawnEntities(TYPES.PAPER, 10));
        document.getElementById('btnSpawnScissors').addEventListener('click', () => this.spawnEntities(TYPES.SCISSORS, 10));

        document.getElementById('btnSpawnRandom').addEventListener('click', () => {
            this.spawnEntities(TYPES.ROCK, 10);
            this.spawnEntities(TYPES.PAPER, 10);
            this.spawnEntities(TYPES.SCISSORS, 10);
        });

        document.getElementById('btnReset').addEventListener('click', () => {
            this.entities = [];
            this.populationHistory = [];
            this.updateStats();
        });

        const speedSlider = document.getElementById('speedSlider');
        const speedValue = document.getElementById('speedValue');
        speedSlider.addEventListener('input', (e) => {
            this.speedMultiplier = parseFloat(e.target.value);
            speedValue.textContent = `${this.speedMultiplier.toFixed(1)}x`;
        });

        const sizeSlider = document.getElementById('sizeSlider');
        const sizeValue = document.getElementById('sizeValue');
        sizeSlider.addEventListener('input', (e) => {
            this.baseEntitySize = parseInt(e.target.value);
            sizeValue.textContent = `${this.baseEntitySize}px`;
            // Update existing entities
            this.entities.forEach(ent => ent.size = this.baseEntitySize);
        });
    }

    spawnEntities(type, count) {
        for (let i = 0; i < count; i++) {
            const x = this.canvas.width * 0.2 + Math.random() * (this.canvas.width * 0.6);
            const y = this.canvas.height * 0.2 + Math.random() * (this.canvas.height * 0.6);
            this.entities.push(new Entity(x, y, type, this.baseEntitySize));
        }
        this.updateStats();
    }

    checkCollisions() {
        const len = this.entities.length;

        for (let i = 0; i < len; i++) {
            for (let j = i + 1; j < len; j++) {
                const e1 = this.entities[i];
                const e2 = this.entities[j];

                const dx = e1.x - e2.x;
                const dy = e1.y - e2.y;
                const distanceSq = dx * dx + dy * dy;

                const collisionRadius = this.baseEntitySize * 0.4;
                const minDistanceSq = (collisionRadius * 2) * (collisionRadius * 2);

                if (distanceSq < minDistanceSq) {
                    this.resolveCollision(e1, e2, Math.sqrt(distanceSq) || 1);
                }
            }
        }
    }

    resolveCollision(e1, e2, distance) {
        // Push apart slightly
        const collisionRadius = this.baseEntitySize * 0.4;
        const overlap = (collisionRadius * 2) - distance;

        const dx = e1.x - e2.x;
        const dy = e1.y - e2.y;
        const nx = dx / distance;
        const ny = dy / distance;

        const pushX = (nx * overlap) / 2;
        const pushY = (ny * overlap) / 2;

        e1.x += pushX;
        e1.y += pushY;
        e2.x -= pushX;
        e2.y -= pushY;

        // Simple elastic collision response (swapping velocity along the normal)
        const p = 2 * (e1.vx * nx + e1.vy * ny - e2.vx * nx - e2.vy * ny) / 2;

        e1.vx -= p * nx;
        e1.vy -= p * ny;
        e2.vx += p * nx;
        e2.vy += p * ny;

        // Apply RPS rules
        if (e1.type !== e2.type) {
            let typeChanged = false;

            if (RULES[e1.type] === e2.type) {
                e2.type = e1.type;
                typeChanged = true;
            } else if (RULES[e2.type] === e1.type) {
                e1.type = e2.type;
                typeChanged = true;
            }

            if (typeChanged) {
                this.updateStats();
            }
        }
    }

    updateStats() {
        let rocks = 0;
        let papers = 0;
        let scissors = 0;

        for (const ent of this.entities) {
            if (ent.type === TYPES.ROCK) rocks++;
            else if (ent.type === TYPES.PAPER) papers++;
            else if (ent.type === TYPES.SCISSORS) scissors++;
        }

        this.rockStat.textContent = rocks;
        this.paperStat.textContent = papers;
        this.scissorsStat.textContent = scissors;
    }

    recordPopulation() {
        let rocks = 0, papers = 0, scissors = 0;
        for (const ent of this.entities) {
            if (ent.type === TYPES.ROCK) rocks++;
            else if (ent.type === TYPES.PAPER) papers++;
            else if (ent.type === TYPES.SCISSORS) scissors++;
        }
        this.populationHistory.push({ rock: rocks, paper: papers, scissors: scissors });
        if (this.populationHistory.length > MAX_HISTORY) {
            this.populationHistory.shift();
        }
    }

    drawChart() {
        const canvas = this.chartCanvas;
        const ctx = this.chartCtx;
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        const history = this.populationHistory;

        // Chart padding
        const pad = { top: 14, right: 10, bottom: 18, left: 28 };
        const chartW = w - pad.left - pad.right;
        const chartH = h - pad.top - pad.bottom;

        // Background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
        ctx.beginPath();
        ctx.roundRect(0, 0, w, h, 8);
        ctx.fill();

        // Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(0, 0, w, h, 8);
        ctx.stroke();

        // Title
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = 'bold 9px Outfit, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('POPULATION', pad.left, 3);

        if (history.length < 2) return;

        // Max value for Y scale (at least 1 to avoid division by zero)
        let maxVal = 1;
        for (const snap of history) {
            maxVal = Math.max(maxVal, snap.rock, snap.paper, snap.scissors);
        }

        // Subtle grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = pad.top + chartH - (i / 4) * chartH;
            ctx.beginPath();
            ctx.moveTo(pad.left, y);
            ctx.lineTo(pad.left + chartW, y);
            ctx.stroke();
        }

        // Y-axis labels
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.font = '8px Outfit, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(maxVal, pad.left - 3, pad.top);
        ctx.fillText(0, pad.left - 3, pad.top + chartH);

        // Draw lines
        const typeKeys = [
            { key: 'rock', color: CHART_COLORS[TYPES.ROCK] },
            { key: 'paper', color: CHART_COLORS[TYPES.PAPER] },
            { key: 'scissors', color: CHART_COLORS[TYPES.SCISSORS] }
        ];

        const n = history.length;
        for (const typeInfo of typeKeys) {
            ctx.beginPath();
            ctx.strokeStyle = typeInfo.color;
            ctx.lineWidth = 1.5;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            for (let i = 0; i < n; i++) {
                const x = pad.left + (i / (n - 1)) * chartW;
                const y = pad.top + chartH - (history[i][typeInfo.key] / maxVal) * chartH;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // Legend (top-right corner of chart area)
        const legendItems = [
            { label: 'Rock', color: CHART_COLORS[TYPES.ROCK] },
            { label: 'Paper', color: CHART_COLORS[TYPES.PAPER] },
            { label: 'Scissors', color: CHART_COLORS[TYPES.SCISSORS] }
        ];
        const legendX = pad.left + chartW - 50;
        let legendY = pad.top + 4;
        ctx.font = '8px Outfit, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        for (const item of legendItems) {
            ctx.strokeStyle = item.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(legendX, legendY);
            ctx.lineTo(legendX + 10, legendY);
            ctx.stroke();
            ctx.fillStyle = item.color;
            ctx.fillText(item.label, legendX + 13, legendY);
            legendY += 12;
        }
    }

    loop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.checkCollisions();

        for (const ent of this.entities) {
            ent.update(this.canvas.width, this.canvas.height, this.speedMultiplier);
            ent.draw(this.ctx);
        }

        this.frameCount = (this.frameCount + 1) % SAMPLE_INTERVAL;
        if (this.frameCount === 0) {
            this.recordPopulation();
        }
        this.drawChart();

        this.animationId = requestAnimationFrame(() => this.loop());
    }

    start() {
        this.spawnEntities(TYPES.ROCK, 20);
        this.spawnEntities(TYPES.PAPER, 20);
        this.spawnEntities(TYPES.SCISSORS, 20);

        if (!this.animationId) {
            this.loop();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Adding a slight delay to ensure fonts/layout are fully ready
    setTimeout(() => {
        window.simulation = new Simulation('simCanvas');
    }, 100);
});
