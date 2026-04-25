// Leaderboard & Social Sharing System
class GameLeaderboard {
    constructor() {
        this.storageKey = 'youooo_leaderboard';
        this.games = ['chess', 'checkers', 'gems', 't2048', 'snake', 'fruit'];
        this.loadLeaderboards();
        this.initializeUI();
    }

    loadLeaderboards() {
        const stored = localStorage.getItem(this.storageKey);
        this.leaderboards = stored ? JSON.parse(stored) : this.initializeEmpty();
    }

    initializeEmpty() {
        const lb = {};
        this.games.forEach(game => {
            lb[game] = [];
        });
        return lb;
    }

    saveLeaderboards() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.leaderboards));
    }

    addScore(game, playerName, score, details = {}) {
        if (!this.leaderboards[game]) {
            this.leaderboards[game] = [];
        }

        const entry = {
            name: playerName || 'Anonymous',
            score: score,
            date: new Date().toISOString(),
            details: details
        };

        this.leaderboards[game].push(entry);
        this.leaderboards[game].sort((a, b) => b.score - a.score);
        this.leaderboards[game] = this.leaderboards[game].slice(0, 100); // Keep top 100

        this.saveLeaderboards();
        return entry;
    }

    getTopScores(game, limit = 10) {
        const scores = this.leaderboards[game] || [];
        return scores.slice(0, limit);
    }

    getPlayerStats(game, playerName) {
        const scores = this.leaderboards[game] || [];
        return scores.filter(s => s.name === playerName);
    }

    initializeUI() {
        const leaderBtn = document.getElementById('openLeaderBtn');
        if (leaderBtn) {
            leaderBtn.addEventListener('click', () => this.showLeaderboardModal());
        }
    }

    showLeaderboardModal() {
        const modal = document.createElement('div');
        modal.className = 'leaderboard-modal';
        modal.innerHTML = this.getLeaderboardHTML();
        document.body.appendChild(modal);

        modal.querySelector('.close-btn').addEventListener('click', () => {
            modal.remove();
        });

        // Game tab functionality
        modal.querySelectorAll('.game-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const game = e.target.dataset.game;
                modal.querySelectorAll('.game-tab').forEach(t => t.classList.remove('active'));
                modal.querySelectorAll('.game-scores').forEach(s => s.classList.add('hidden'));
                e.target.classList.add('active');
                modal.querySelector(`[data-scores="${game}"]`).classList.remove('hidden');
            });
        });
    }

    getLeaderboardHTML() {
        let html = `
            <div class="leaderboard-overlay">
                <div class="leaderboard-container">
                    <button class="close-btn">✕</button>
                    <h2>🏆 Global Leaderboards</h2>
                    <div class="leaderboard-tabs">
        `;

        this.games.forEach((game, idx) => {
            const icon = this.getGameIcon(game);
            const name = this.getGameName(game);
            const active = idx === 0 ? 'active' : '';
            html += `<button class="game-tab ${active}" data-game="${game}">${icon} ${name}</button>`;
        });

        html += '</div><div class="leaderboard-content">';

        this.games.forEach((game, idx) => {
            const hidden = idx === 0 ? '' : 'hidden';
            const scores = this.getTopScores(game, 20);
            html += `<div class="game-scores ${hidden}" data-scores="${game}">`;
            html += '<ol class="scores-list">';

            if (scores.length === 0) {
                html += '<li class="no-scores">No scores yet. Be the first!</li>';
            } else {
                scores.forEach((score, rank) => {
                    const date = new Date(score.date).toLocaleDateString();
                    html += `
                        <li class="score-entry">
                            <span class="rank">#${rank + 1}</span>
                            <span class="name">${this.escapeHtml(score.name)}</span>
                            <span class="score">${score.score.toLocaleString()}</span>
                            <span class="date">${date}</span>
                        </li>
                    `;
                });
            }

            html += '</ol></div>';
        });

        html += `
                    </div>
                </div>
            </div>
            <style>
                .leaderboard-modal { position: fixed; inset: 0; z-index: 2000; }
                .leaderboard-overlay {
                    position: fixed; inset: 0; background: rgba(0, 0, 0, 0.8);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 2001;
                }
                .leaderboard-container {
                    background: linear-gradient(135deg, #0a0e27 0%, #16213e 100%);
                    border: 2px solid rgba(100, 200, 255, 0.3);
                    border-radius: 20px;
                    padding: 30px;
                    max-width: 600px;
                    width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                    color: #fff;
                    font-family: 'Inter', sans-serif;
                }
                .leaderboard-container h2 {
                    text-align: center; margin-bottom: 20px;
                    background: linear-gradient(135deg, #00ff88 0%, #00bfff 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    font-size: 1.8em;
                }
                .close-btn {
                    position: absolute; top: 20px; right: 20px;
                    background: rgba(255, 0, 0, 0.2); border: 1px solid #ff6b6b;
                    color: #ff6b6b; width: 40px; height: 40px;
                    border-radius: 50%; cursor: pointer; font-size: 1.2em;
                    transition: all 0.3s ease;
                }
                .close-btn:hover { background: rgba(255, 0, 0, 0.4); }
                .leaderboard-tabs {
                    display: flex; gap: 10px; margin-bottom: 20px;
                    flex-wrap: wrap; justify-content: center;
                }
                .game-tab {
                    padding: 8px 16px; border: 1px solid rgba(100, 200, 255, 0.3);
                    background: rgba(100, 200, 255, 0.1); color: #aaa;
                    border-radius: 8px; cursor: pointer; transition: all 0.3s ease;
                    font-size: 0.9em;
                }
                .game-tab:hover { background: rgba(100, 200, 255, 0.2); }
                .game-tab.active {
                    background: linear-gradient(135deg, #00ff88 0%, #00bfff 100%);
                    color: #000; border-color: transparent;
                }
                .scores-list {
                    list-style: none; margin: 0; padding: 0;
                }
                .score-entry {
                    display: flex; gap: 15px; padding: 12px;
                    background: rgba(100, 200, 255, 0.05);
                    border-bottom: 1px solid rgba(100, 200, 255, 0.1);
                    align-items: center;
                }
                .score-entry:hover { background: rgba(100, 200, 255, 0.1); }
                .rank { font-weight: bold; color: #00ff88; min-width: 30px; }
                .name { flex: 1; }
                .score { font-weight: bold; color: #00bfff; min-width: 80px; text-align: right; }
                .date { color: #888; font-size: 0.85em; }
                .no-scores { text-align: center; color: #888; padding: 20px; }
                .hidden { display: none; }
                @media (max-width: 600px) {
                    .leaderboard-container { max-width: 95%; padding: 20px; }
                    .score-entry { flex-wrap: wrap; }
                    .date { width: 100%; order: 3; margin-top: 5px; }
                }
            </style>
        `;

        return html;
    }

    getGameIcon(game) {
        const icons = {
            chess: '♟',
            checkers: '⬡',
            gems: '💎',
            t2048: '🔢',
            snake: '🐍',
            fruit: '🍉'
        };
        return icons[game] || '🎮';
    }

    getGameName(game) {
        const names = {
            chess: 'Chess',
            checkers: 'Checkers',
            gems: 'Gems Crush',
            t2048: '2048',
            snake: 'Snake',
            fruit: 'Merge Fruit'
        };
        return names[game] || game;
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

// Social Sharing Functions
class GameSharing {
    static shareScore(game, score, playerName = 'Anonymous') {
        const messages = {
            chess: `I just scored ${score} in Chess! Can you beat me? 🎮♟️`,
            checkers: `Dominating at Checkers with a score of ${score}! 🎮⬡`,
            gems: `Just crushed Gems Crush with ${score} points! 💎✨`,
            t2048: `Reached ${score} in 2048! 🏆🔢`,
            snake: `Snake high score: ${score}! 🐍`,
            fruit: `I scored ${score} in Merge Fruit! 🍉`
        };

        const text = messages[game] || `Score: ${score}`;
        const url = 'https://game.youooo.com';

        return {
            twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${url}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
            whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
            telegram: `https://t.me/share/url?url=${url}&text=${encodeURIComponent(text)}`
        };
    }

    static copyShareLink(text) {
        navigator.clipboard.writeText(text).then(() => {
            alert('Link copied to clipboard!');
        });
    }
}

function submitLeaderScore(game, playerName, score, details = {}) {
    if (!window.gameLeaderboard) return;
    window.gameLeaderboard.addScore(game, playerName, score, details);
}

function openLeaderboard(game = 'snake') {
    const modal = document.getElementById('leaderModal');
    const list = document.getElementById('leaderList');
    if (!modal || !list || !window.gameLeaderboard) {
        if (window.gameLeaderboard) window.gameLeaderboard.showLeaderboardModal();
        return;
    }

    const tabs = [...modal.querySelectorAll('.leader-tab')];
    const targetGame = window.gameLeaderboard.games.includes(game) ? game : 'snake';

    const render = (selectedGame) => {
        tabs.forEach((tab) => {
            tab.classList.toggle('active', tab.dataset.ltab === selectedGame);
        });

        const scores = window.gameLeaderboard.getTopScores(selectedGame, 20);
        list.innerHTML = '';

        if (!scores.length) {
            const item = document.createElement('li');
            item.className = 'leader-loading';
            item.textContent = 'No scores yet. Be the first.';
            list.appendChild(item);
            return;
        }

        scores.forEach((entry, index) => {
            const item = document.createElement('li');
            item.className = 'leader-entry';
            item.innerHTML = `
                <span class="leader-rank">#${index + 1}</span>
                <span class="leader-name">${window.gameLeaderboard.escapeHtml(entry.name)}</span>
                <span class="leader-score">${Number(entry.score || 0).toLocaleString()}</span>
            `;
            list.appendChild(item);
        });
    };

    if (!modal.dataset.bound) {
        tabs.forEach((tab) => {
            tab.addEventListener('click', () => render(tab.dataset.ltab));
        });
        document.getElementById('closeLeaderModal')?.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
        modal.addEventListener('click', (event) => {
            if (event.target === modal) modal.classList.add('hidden');
        });
        modal.dataset.bound = 'true';
    }

    render(targetGame);
    modal.classList.remove('hidden');
}

window.submitLeaderScore = submitLeaderScore;
window.openLeaderboard = openLeaderboard;

// Initialize leaderboard when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.gameLeaderboard = new GameLeaderboard();
    });
} else {
    window.gameLeaderboard = new GameLeaderboard();
}
