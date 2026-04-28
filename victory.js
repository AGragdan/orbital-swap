// ========================
// МОДУЛЬ: Победа (Victory)
// Добавляет механику победы в игру
// ========================

// Добавляем функцию проверки победы в GameObjects
(function() {
    if (typeof GameObjects === 'undefined') {
        console.error('GameObjects не найден');
        return;
    }
    
    // Сохраняем оригинальную функцию updateOrbitPosition
    const originalUpdateOrbitPosition = GameObjects.updateOrbitPosition;
    
    // Добавляем проверку победы
    GameObjects.checkVictory = function() {
        if (!GameObjects.isGameActive) return false;
        
        const activeBlocks = Reduktor.getActiveBlocks();
        if (!activeBlocks || activeBlocks.length === 0) return false;
        
        let lowestBlockY = -Infinity;
        for (const block of activeBlocks) {
            const blockBottom = block.sprite.y + block.height;
            if (blockBottom > lowestBlockY) lowestBlockY = blockBottom;
        }
        
        const circles = GameObjects.getCirclesPositions();
        const lowestCircleY = Math.max(circles.circle1.y + circles.radius, circles.circle2.y + circles.radius);
        
        if (lowestCircleY < lowestBlockY) {
            GameObjects.triggerVictory();
            return true;
        }
        return false;
    };
    
    GameObjects.triggerVictory = function() {
        if (!GameObjects.isGameActive) return;
        GameObjects.isGameActive = false;
        if (GameObjects.stopAnimation) GameObjects.stopAnimation();
        if (GameObjects.stopScoreCounter) GameObjects.stopScoreCounter();
        if (Reduktor.stopFalling) Reduktor.stopFalling();
        if (window.UI && window.UI.showVictory) {
            window.UI.showVictory(GameObjects.score);
        }
    };
    
    GameObjects.getCirclesPositions = function() {
        return {
            circle1: { x: GameObjects.circle1?.x, y: GameObjects.circle1?.y },
            circle2: { x: GameObjects.circle2?.x, y: GameObjects.circle2?.y },
            radius: GameObjects.circleRadius
        };
    };
    
    GameObjects.setOnVictory = function(callback) {
        GameObjects.victoryCallback = callback;
    };
    
    // Перехватываем updateOrbitPosition
    if (originalUpdateOrbitPosition) {
        GameObjects.updateOrbitPosition = function() {
            originalUpdateOrbitPosition();
            GameObjects.checkVictory();
        };
    }
})();

// Добавляем попап победы в UI
if (typeof UI !== 'undefined') {
    let victoryOverlay = null;
    
    UI.showVictory = function(score) {
        if (!victoryOverlay) {
            victoryOverlay = document.createElement('div');
            victoryOverlay.id = 'victoryOverlay';
            victoryOverlay.className = 'victory-overlay';
            victoryOverlay.innerHTML = `
                <div class="victory-popup">
                    <div class="victory-emoji">🏆✨🎉</div>
                    <div class="victory-title">ПОБЕДА!</div>
                    <div class="victory-score">${score}</div>
                    <div class="victory-label">очков</div>
                    <button class="victory-restart-btn" id="victoryRestartBtn">ИГРАТЬ ЗАНОВО ➡</button>
                </div>
            `;
            document.body.appendChild(victoryOverlay);
            
            const style = document.createElement('style');
            style.textContent = `
                .victory-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.75);
                    backdrop-filter: blur(8px);
                    z-index: 1001;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s;
                }
                .victory-overlay.active {
                    opacity: 1;
                    visibility: visible;
                }
                .victory-popup {
                    background: linear-gradient(135deg, #2D1B4E, #1A1A2E);
                    border-radius: 40px;
                    padding: 40px;
                    text-align: center;
                    border: 2px solid #FFD700;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.4);
                    transform: scale(0.9);
                    transition: transform 0.3s;
                }
                .victory-overlay.active .victory-popup {
                    transform: scale(1);
                }
                .victory-emoji { font-size: 64px; margin-bottom: 16px; }
                .victory-title { font-size: 36px; font-weight: 800; color: #FFD700; margin-bottom: 16px; }
                .victory-score { font-size: 56px; font-weight: 800; color: #FFD700; }
                .victory-label { font-size: 14px; color: rgba(255,255,255,0.7); margin-top: 8px; }
                .victory-restart-btn {
                    background: linear-gradient(135deg, #FFD700, #FFA500);
                    border: none;
                    border-radius: 40px;
                    padding: 12px 32px;
                    font-size: 16px;
                    font-weight: bold;
                    color: #1A1A2E;
                    cursor: pointer;
                    margin-top: 20px;
                }
                .victory-restart-btn:hover { transform: scale(1.02); }
            `;
            document.head.appendChild(style);
        }
        document.getElementById('victoryRestartBtn').onclick = () => {
            UI.hideVictory();
            if (UI.victoryRestartCallback) UI.victoryRestartCallback();
        };
        const scoreEl = victoryOverlay.querySelector('.victory-score');
        if (scoreEl) scoreEl.textContent = score;
        victoryOverlay.classList.add('active');
    };
    
    UI.hideVictory = function() {
        if (victoryOverlay) victoryOverlay.classList.remove('active');
    };
    
    UI.setVictoryRestartCallback = function(cb) {
        UI.victoryRestartCallback = cb;
    };
}

console.log('🎉 Victory module loaded');