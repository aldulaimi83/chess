// ChromaMaze - Color Puzzle Game Engine
class ChromaMaze {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.cellSize = 40;
        this.gridWidth = Math.floor(this.canvas.width / this.cellSize);
        this.gridHeight = Math.floor(this.canvas.height / this.cellSize);
        this.difficulty = 'easy';
        this.level = 1;
        this.moves = 0;
        this.bestScore = parseInt(localStorage.getItem('chromamaze_best') || '0');

        this.colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF', '#C7B3E5'];
        this.reset();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('playBtn').addEventListener('click', () => this.newGame());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.difficulty = e.target.dataset.difficulty;
                this.newGame();
            });
        });

        document.getElementById('nextLevelBtn').addEventListener('click', () => {
            document.getElementById('completeModal').classList.remove('active');
            this.level++;
            this.newGame();
        });

        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        document.addEventListener('keydown', (e) => this.handleKeypress(e));
    }

    generateLevel() {
        const width = this.gridWidth;
        const height = this.gridHeight;

        // Difficulty settings
        const settings = {
            easy: { colorCount: 2, pathLength: 6 },
            medium: { colorCount: 3, pathLength: 10 },
            hard: { colorCount: 4, pathLength: 15 }
        };

        const config = settings[this.difficulty];

        // Initialize grid
        this.grid = Array(height).fill(null).map(() => Array(width).fill(0));

        // Place starting position
        this.playerPos = { x: 1, y: 1 };
        this.goalPos = { x: width - 2, y: height - 2 };

        // Generate color sequence
        this.colorSequence = [];
        for (let i = 0; i < config.colorCount; i++) {
            this.colorSequence.push(i);
        }

        // Shuffle sequence for display
        this.colorSequence = this.colorSequence.sort(() => Math.random() - 0.5);

        // Place color nodes on maze
        this.colorNodes = [];
        let positions = this.generateRandomPath(this.playerPos, this.goalPos, config.pathLength);

        for (let i = 0; i < config.colorCount; i++) {
            if (i < positions.length) {
                this.colorNodes.push({
                    x: positions[i].x,
                    y: positions[i].y,
                    colorIndex: this.colorSequence[i]
                });
            }
        }

        this.collectedSequence = [];
        this.moves = 0;
        this.updateUI();
    }

    generateRandomPath(start, end, length) {
        const path = [start];
        let current = { x: start.x, y: start.y };

        for (let i = 0; i < length - 1; i++) {
            const directions = [
                { x: 1, y: 0 }, { x: -1, y: 0 },
                { x: 0, y: 1 }, { x: 0, y: -1 }
            ];

            const validDirs = directions.filter(d => {
                const nx = current.x + d.x;
                const ny = current.y + d.y;
                return nx > 0 && nx < this.gridWidth - 1 && ny > 0 && ny < this.gridHeight - 1;
            });

            if (validDirs.length > 0) {
                const dir = validDirs[Math.floor(Math.random() * validDirs.length)];
                current = { x: current.x + dir.x, y: current.y + dir.y };

                if (!path.some(p => p.x === current.x && p.y === current.y)) {
                    path.push({ ...current });
                }
            }
        }

        path.push(end);
        return path;
    }

    newGame() {
        this.generateLevel();
        this.draw();
    }

    reset() {
        this.newGame();
    }

    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const gridX = Math.floor(x / this.cellSize);
        const gridY = Math.floor(y / this.cellSize);

        this.movePlayer(gridX, gridY);
    }

    handleKeypress(e) {
        const moves = {
            'ArrowUp': { x: 0, y: -1 },
            'ArrowDown': { x: 0, y: 1 },
            'ArrowLeft': { x: -1, y: 0 },
            'ArrowRight': { x: 1, y: 0 }
        };

        if (moves[e.key]) {
            e.preventDefault();
            const newX = this.playerPos.x + moves[e.key].x;
            const newY = this.playerPos.y + moves[e.key].y;
            this.movePlayer(newX, newY);
        }
    }

    movePlayer(x, y) {
        // Check boundaries
        if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) return;

        // Check if valid move (adjacent only)
        const dx = Math.abs(x - this.playerPos.x);
        const dy = Math.abs(y - this.playerPos.y);
        if (dx + dy !== 1) return;

        this.playerPos = { x, y };
        this.moves++;

        // Check for color collection
        const colorNode = this.colorNodes.find(n => n.x === x && n.y === y);
        if (colorNode && !this.collectedSequence.includes(colorNode)) {
            const expectedColor = this.colorSequence[this.collectedSequence.length];
            if (colorNode.colorIndex === expectedColor) {
                this.collectedSequence.push(colorNode);
            }
        }

        // Check for goal
        if (x === this.goalPos.x && y === this.goalPos.y) {
            if (this.collectedSequence.length === this.colorSequence.length) {
                this.levelComplete();
            }
        }

        this.updateUI();
        this.draw();
    }

    levelComplete() {
        const levelScore = this.level * 100 - this.moves;
        if (levelScore > this.bestScore) {
            this.bestScore = levelScore;
            localStorage.setItem('chromamaze_best', this.bestScore);
        }

        document.getElementById('completeMessage').textContent =
            `Excellent! Completed Level ${this.level} in ${this.moves} moves!`;
        document.getElementById('completeModal').classList.add('active');
    }

    updateUI() {
        document.getElementById('levelDisplay').textContent = this.level;
        document.getElementById('movesDisplay').textContent = this.moves;
        document.getElementById('bestScore').textContent = this.bestScore || '—';

        const sequenceHtml = this.colorSequence.map((colorIdx, i) => {
            const isCollected = i < this.collectedSequence.length;
            const isNext = i === this.collectedSequence.length;
            const colorClass = isCollected ? 'collected' : (isNext ? 'next' : '');
            return `<div class="color-dot ${colorClass}" style="background: ${this.colors[colorIdx]}">${i + 1}</div>`;
        }).join('');
        document.getElementById('sequenceDisplay').innerHTML = sequenceHtml;
    }

    draw() {
        this.ctx.fillStyle = '#0a0e27';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid
        this.ctx.strokeStyle = 'rgba(100, 200, 255, 0.1)';
        this.ctx.lineWidth = 0.5;
        for (let x = 0; x <= this.gridWidth; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.cellSize, 0);
            this.ctx.lineTo(x * this.cellSize, this.canvas.height);
            this.ctx.stroke();
        }
        for (let y = 0; y <= this.gridHeight; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.cellSize);
            this.ctx.lineTo(this.canvas.width, y * this.cellSize);
            this.ctx.stroke();
        }

        // Draw color nodes
        this.colorNodes.forEach((node, idx) => {
            const x = node.x * this.cellSize + this.cellSize / 2;
            const y = node.y * this.cellSize + this.cellSize / 2;

            // Glow effect
            const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, this.cellSize / 2);
            gradient.addColorStop(0, this.colors[node.colorIndex] + '40');
            gradient.addColorStop(1, this.colors[node.colorIndex] + '00');
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(x, y, this.cellSize / 2 + 5, 0, Math.PI * 2);
            this.ctx.fill();

            // Node circle
            this.ctx.fillStyle = this.colors[node.colorIndex];
            this.ctx.beginPath();
            this.ctx.arc(x, y, this.cellSize / 3, 0, Math.PI * 2);
            this.ctx.fill();

            // Number
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 16px Inter';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            const seqIdx = this.colorSequence.indexOf(node.colorIndex);
            this.ctx.fillText(seqIdx + 1, x, y);
        });

        // Draw goal
        const goalX = this.goalPos.x * this.cellSize + this.cellSize / 2;
        const goalY = this.goalPos.y * this.cellSize + this.cellSize / 2;
        const pulseSize = this.cellSize / 2 + Math.sin(Date.now() / 200) * 3;

        this.ctx.strokeStyle = '#FFE66D';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(goalX, goalY, pulseSize, 0, Math.PI * 2);
        this.ctx.stroke();

        this.ctx.fillStyle = '#FFE66D';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('🏁', goalX, goalY);

        // Draw player
        const playerX = this.playerPos.x * this.cellSize + this.cellSize / 2;
        const playerY = this.playerPos.y * this.cellSize + this.cellSize / 2;

        // Player glow
        const playerGradient = this.ctx.createRadialGradient(playerX, playerY, 0, playerX, playerY, this.cellSize / 2);
        playerGradient.addColorStop(0, '#00ff8840');
        playerGradient.addColorStop(1, '#00ff8800');
        this.ctx.fillStyle = playerGradient;
        this.ctx.beginPath();
        this.ctx.arc(playerX, playerY, this.cellSize / 2, 0, Math.PI * 2);
        this.ctx.fill();

        // Player circle
        this.ctx.fillStyle = '#00FF88';
        this.ctx.beginPath();
        this.ctx.arc(playerX, playerY, this.cellSize / 3, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#000';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('●', playerX, playerY);
    }
}

// Initialize game
window.addEventListener('DOMContentLoaded', () => {
    const game = new ChromaMaze('gameCanvas');
    game.newGame();
});
