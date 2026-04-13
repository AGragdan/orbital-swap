const WindowManager = (function() {
    const TARGET_ASPECT = 9 / 16;
    let app = null, canvas = null;
    const resizeCallbacks = [];
    
    function init(containerId) {
        const container = document.getElementById(containerId);
        app = new PIXI.Application({ 
            backgroundColor: 0x6C5CE7, 
            antialias: true, 
            resolution: window.devicePixelRatio || 1, 
            autoDensity: true 
        });
        container.appendChild(app.view);
        canvas = app.view;
        canvas.style.position = 'absolute';
        resize();
        
        let timeout;
        window.addEventListener('resize', () => { 
            clearTimeout(timeout); 
            timeout = setTimeout(() => { 
                resize(); 
                resizeCallbacks.forEach(cb => cb(getWidth(), getHeight())); 
            }, 100); 
        });
        
        window.addEventListener('orientationchange', () => setTimeout(() => { 
            resize(); 
            resizeCallbacks.forEach(cb => cb(getWidth(), getHeight())); 
        }, 30));
        
        return app;
    }
    
function resize() {
    if (!app) return;
    
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const targetRatio = 9 / 16;
    
    let gameWidth, gameHeight;
    
    if (windowWidth / windowHeight > targetRatio) {
        gameHeight = windowHeight;
        gameWidth = gameHeight * targetRatio;
    } else {
        gameWidth = windowWidth;
        gameHeight = gameWidth / targetRatio;
    }
    
    gameWidth = Math.floor(gameWidth);
    gameHeight = Math.floor(gameHeight);
    
    app.renderer.resize(gameWidth, gameHeight);
    
    canvas.style.position = 'absolute';
    canvas.style.left = `${(windowWidth - gameWidth) / 2}px`;
    canvas.style.top = `${(windowHeight - gameHeight) / 2}px`;
    canvas.style.width = `${gameWidth}px`;
    canvas.style.height = `${gameHeight}px`;
    canvas.style.transform = 'none';
    
    resizeCallbacks.forEach(cb => cb(gameWidth, gameHeight));
}
    
    function onResize(cb) { 
        resizeCallbacks.push(cb); 
    }
    
    function getStage() { 
        return app ? app.stage : null; 
    }
    
    function getWidth() { 
        return app ? app.renderer.width : 0; 
    }
    
    function getHeight() { 
        return app ? app.renderer.height : 0; 
    }
    
    function getCanvas() { 
        return canvas; 
    }
    
    return { 
        init, 
        onResize, 
        getStage, 
        getWidth, 
        getHeight, 
        getCanvas 
    };
})();

const GameObjects = (function() {
    let circle1 = null, circle2 = null, stage = null;
    let distanceMultiplier = 1.50;
    let currentWidth = 0, currentHeight = 0;
    let circleRadius = 0, orbitRadius = 0, rotationAngle = 0;
    let pivotX = 0, pivotY = 0;
    let orbitingObject = 'circle2';
    const ANGULAR_SPEED = (2 * Math.PI) / 3;
    let lastTimestamp = 0, animationRunning = false, animationId = null;
    let isGameActive = true, onGameOverCallback = null;
    let score = 0, scoreInterval = null, onScoreUpdateCallback = null;
    
    function createCircle(baseColor, borderColor, radius) {
        const g = new PIXI.Graphics();
        g.beginFill(baseColor);
        g.drawCircle(0, 0, radius);
        g.endFill();
        g.lineStyle(Theme.circles.borderWidth, borderColor, Theme.circles.borderAlpha);
        g.drawCircle(0, 0, radius);
        if (radius > 4) {
            g.beginFill(0xFFFFFF, Theme.circles.highlightAlpha);
            g.drawCircle(
                -radius * Theme.circles.highlightOffsetX, 
                -radius * Theme.circles.highlightOffsetY, 
                radius * Theme.circles.highlightSize
            );
            g.endFill();
        }
        return g;
    }
    
    function recreateCircles() {
        if (!stage || circleRadius <= 0) return;
        
        const p1 = circle1 ? { x: circle1.x, y: circle1.y } : null;
        const p2 = circle2 ? { x: circle2.x, y: circle2.y } : null;
        
        if (circle1) stage.removeChild(circle1);
        if (circle2) stage.removeChild(circle2);
        
        circle1 = createCircle(Theme.circles.color1, Theme.circles.borderColor, circleRadius);
        circle2 = createCircle(Theme.circles.color2, Theme.circles.borderColor, circleRadius);
        
        if (p1 && circle1) { 
            circle1.x = p1.x; 
            circle1.y = p1.y; 
        }
        if (p2 && circle2) { 
            circle2.x = p2.x; 
            circle2.y = p2.y; 
        }
        
        if (circle1) stage.addChild(circle1);
        if (circle2) stage.addChild(circle2);
    }
    
    function updateGeometry() { 
        const bs = Reduktor.getBlockSize(); 
        circleRadius = bs / 2; 
        orbitRadius = bs * distanceMultiplier; 
    }
    
    function updatePositions() {
        if (!circle1 || !circle2) return;
        
        if (orbitingObject === 'circle2') {
            circle1.x = pivotX;
            circle1.y = pivotY;
            circle2.x = pivotX + Math.cos(rotationAngle) * orbitRadius;
            circle2.y = pivotY + Math.sin(rotationAngle) * orbitRadius;
        } else {
            circle2.x = pivotX;
            circle2.y = pivotY;
            circle1.x = pivotX + Math.cos(rotationAngle) * orbitRadius;
            circle1.y = pivotY + Math.sin(rotationAngle) * orbitRadius;
        }
    }
    
    function checkBlockCollision() {
        const blocks = Reduktor.getGameBlocks();
        if (!blocks.length) return false;
        
        for (const circ of [{ obj: circle1 }, { obj: circle2 }]) {
            const cx = circ.obj.x, cy = circ.obj.y;
            for (const b of blocks) {
                const cx2 = Math.max(b.x, Math.min(cx, b.x + b.width));
                const cy2 = Math.max(b.y, Math.min(cy, b.y + b.height));
                const dx = cx - cx2, dy = cy - cy2;
                if (Math.sqrt(dx*dx + dy*dy) < circleRadius) return true;
            }
        }
        return false;
    }
    
    function checkCollision() {
        if (!isGameActive || !circle1 || !circle2) return false;
        
        const bounds = [{ obj: circle1 }, { obj: circle2 }];
        for (const c of bounds) {
            const x = c.obj.x, y = c.obj.y;
            if (x - circleRadius <= 0 || x + circleRadius >= currentWidth || y + circleRadius >= currentHeight) {
                return true;
            }
        }
        if (checkBlockCollision()) return true;
        return false;
    }
    
    function updateOrbitPosition() {
        if (!circle1 || !circle2) return;
        
        if (orbitingObject === 'circle2') {
            circle2.x = pivotX + Math.cos(rotationAngle) * orbitRadius;
            circle2.y = pivotY + Math.sin(rotationAngle) * orbitRadius;
        } else {
            circle1.x = pivotX + Math.cos(rotationAngle) * orbitRadius;
            circle1.y = pivotY + Math.sin(rotationAngle) * orbitRadius;
        }
        if (checkCollision()) triggerGameOver();
    }
    
    function triggerGameOver() {
        if (!isGameActive) return;
        AudioManager.playCollision();
        isGameActive = false;
        stopAnimation();
        stopScoreCounter();
        Reduktor.stopFalling();
        Reduktor.hideBlocks();
        if (onGameOverCallback) onGameOverCallback(score);
    }
    
    function startScoreCounter() {
        stopScoreCounter();
        score = 0;
        if (onScoreUpdateCallback) onScoreUpdateCallback(0);
        scoreInterval = setInterval(() => {
            if (isGameActive) {
                score++;
                if (onScoreUpdateCallback) onScoreUpdateCallback(score);
            }
        }, 1000);
    }
    
    function stopScoreCounter() {
        if (scoreInterval) {
            clearInterval(scoreInterval);
            scoreInterval = null;
        }
    }
    
    function setOnScoreUpdate(cb) { 
        onScoreUpdateCallback = cb; 
    }
    
    function animationLoop(ts) {
        if (!animationRunning || !isGameActive) return;
        if (lastTimestamp) {
            const delta = ts - lastTimestamp;
            if (delta > 0 && delta < 100) {
                rotationAngle += ANGULAR_SPEED * (delta / 1000);
                if (rotationAngle > Math.PI * 2) rotationAngle -= Math.PI * 2;
                updateOrbitPosition();
            }
        }
        lastTimestamp = ts;
        animationId = requestAnimationFrame(animationLoop);
    }
    
    function startAnimation() {
        if (animationRunning) return;
        animationRunning = true;
        lastTimestamp = 0;
        animationId = requestAnimationFrame(animationLoop);
    }
    
    function stopAnimation() {
        animationRunning = false;
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
    }
    
    function resumeAnimation() {
        if (!animationRunning && isGameActive) {
            startAnimation();
        }
    }
    
    function restart() {
        isGameActive = true;
        distanceMultiplier = 1.50;
        updateGeometry();
        recreateCircles();
        orbitingObject = 'circle2';
        pivotX = currentWidth / 2;
        pivotY = currentHeight * Theme.gameStart.centerY;
        rotationAngle = 0;
        if (circle1 && circle2) {
            circle1.x = pivotX;
            circle1.y = pivotY;
            circle2.x = pivotX + orbitRadius;
            circle2.y = pivotY;
        }
        Reduktor.startFalling();
        startScoreCounter();
        startAnimation();
    }
    
    function swapRoles() {
        if (!isGameActive) return;
        if (!circle1 || !circle2) return;
        AudioManager.playTap();
        
        const was = orbitingObject;
        let newPivotX, newPivotY;
        
        if (was === 'circle2') {
            newPivotX = circle2.x;
            newPivotY = circle2.y;
            orbitingObject = 'circle1';
        } else {
            newPivotX = circle1.x;
            newPivotY = circle1.y;
            orbitingObject = 'circle2';
        }
        
        pivotX = newPivotX;
        pivotY = newPivotY;
        
        if (orbitingObject === 'circle1') {
            circle2.x = pivotX;
            circle2.y = pivotY;
        } else {
            circle1.x = pivotX;
            circle1.y = pivotY;
        }
        
        const moving = (was === 'circle2') ? circle1 : circle2;
        const dx = moving.x - pivotX, dy = moving.y - pivotY;
        rotationAngle = Math.atan2(dy, dx);
        if (rotationAngle < 0) rotationAngle += Math.PI * 2;
        updateOrbitPosition();
    }
    
    function onCanvasClick(e) {
        if (!isGameActive) return;
        if (!circle1 || !circle2) return;
        
        const canvas = WindowManager.getCanvas();
        if (!canvas) return;
        
        let cx, cy;
        if (e.touches) {
            cx = e.touches[0].clientX;
            cy = e.touches[0].clientY;
            e.preventDefault();
        } else {
            cx = e.clientX;
            cy = e.clientY;
        }
        
        const rect = canvas.getBoundingClientRect();
        const canvasX = (cx - rect.left) * (canvas.width / rect.width);
        const canvasY = (cy - rect.top) * (canvas.height / rect.height);
        
        if (canvasX >= 0 && canvasX <= canvas.width && canvasY >= 0 && canvasY <= canvas.height) {
            swapRoles();
        }
    }
    
    function initEventHandlers() {
        const canvas = WindowManager.getCanvas();
        if (canvas) {
            canvas.addEventListener('click', onCanvasClick);
            canvas.addEventListener('touchstart', onCanvasClick, { passive: false });
        }
    }
    
    function setOnGameOver(cb) { 
        onGameOverCallback = cb; 
    }
    
    function resize(w, h) {
        currentWidth = w;
        currentHeight = h;
        updateGeometry();
        if (isGameActive) updatePositions();
    }
    
    function hideCircles() {
        if (circle1) circle1.visible = false;
        if (circle2) circle2.visible = false;
    }
    
    function showCircles() {
        if (circle1) circle1.visible = true;
        if (circle2) circle2.visible = true;
    }
    
    function stopGameLogic() {
        isGameActive = false;
        stopAnimation();
        stopScoreCounter();
    }
    
    function resumeGameLogic() {
        if (!isGameActive) {
            isGameActive = true;
        }
        resumeAnimation();
    }
    
    function init(s) {
        stage = s;
        const w = WindowManager.getWidth(), h = WindowManager.getHeight();
        if (w && h) {
            currentWidth = w;
            currentHeight = h;
            updateGeometry();
            recreateCircles();
            orbitingObject = 'circle2';
            pivotX = currentWidth / 2;
            pivotY = currentHeight * Theme.gameStart.centerY;
            rotationAngle = 0;
            if (circle1 && circle2) {
                circle1.x = pivotX;
                circle1.y = pivotY;
                circle2.x = pivotX + orbitRadius;
                circle2.y = pivotY;
            }
        }
        initEventHandlers();
        hideCircles();
        return true;
    }
    
    function destroy() {
        stopAnimation();
        stopScoreCounter();
        const canvas = WindowManager.getCanvas();
        if (canvas) {
            canvas.removeEventListener('click', onCanvasClick);
            canvas.removeEventListener('touchstart', onCanvasClick);
        }
        if (circle1 && stage) stage.removeChild(circle1);
        if (circle2 && stage) stage.removeChild(circle2);
        circle1 = null;
        circle2 = null;
    }

    function fullResize(gameWidth, gameHeight) {
    currentWidth = gameWidth;
    currentHeight = gameHeight;
    
    // Пересчитываем размеры кругов
    updateGeometry();
    
    // Пересчитываем позиции кругов
    pivotX = currentWidth / 2;
    pivotY = currentHeight * Theme.gameStart.centerY;
    
    if (circle1 && circle2) {
        circle1.x = pivotX;
        circle1.y = pivotY;
        circle2.x = pivotX + orbitRadius;
        circle2.y = pivotY;
        updatePositions();
    }
    
    console.log(`🔄 GameObjects: размер ${currentWidth}x${currentHeight}, радиус ${circleRadius}`);
}
    
    return { 
        init, 
        resize,
        fullResize, 
        destroy, 
        restart, 
        resumeGameLogic,
        hideCircles, 
        showCircles, 
        stopGameLogic, 
        setOnGameOver, 
        setOnScoreUpdate 
    };
})();

const App = (function() {
    let isInitialized = false, isGameMode = false;
    let audioActivated = false;
    let isPaused = false;
    let isStartScreenVisible = true;
    
    function init() {
        if (isInitialized) return;
        
        UI.init();
        AudioManager.init();
        
        // Инициализация VK Bridge
        VKIntegration.init();
        
        // Загрузка рекорда из VK (если игра в VK)
        VKIntegration.loadRecord().then(vkRecord => {
            if (vkRecord > 0) {
                const currentRecord = UI.getRecord();
                if (vkRecord > currentRecord) {
                    localStorage.setItem('orbital_record', vkRecord);
                    console.log(`Рекорд синхронизирован с VK: ${vkRecord}`);
                }
            }
        });
        
        const pixi = WindowManager.init('gameContainer');
        const stage = WindowManager.getStage();
        
        BackgroundAndParticles.init(stage);
        GameObjects.init(stage);
        
        const w = WindowManager.getWidth(), h = WindowManager.getHeight();
        Reduktor.initEditor(stage, w, h);
        
        LevelManager.loadFromMaster().then(masterBlocks => {
            if (masterBlocks.length > 0) {
                Reduktor.clearBlocks();
                masterBlocks.forEach(block => {
                    Reduktor.addBlock(block.worldX, block.worldY, block.color);
                });
                console.log(`Загружен master уровень: ${masterBlocks.length} блоков`);
            }
        });
        
        GameObjects.setOnScoreUpdate(s => document.getElementById('scoreValue').textContent = s);
        GameObjects.setOnGameOver(s => UI.showGameOver(s));
        
        UI.setRestartCallback(() => { 
            if (!isGameMode) {
                startGame();
            } else {
                LevelManager.loadFromMaster().then(masterBlocks => {
                    Reduktor.clearGameBlocks();
                    Reduktor.clearBlocks();
                    GameObjects.stopGameLogic();
                    
                    if (masterBlocks.length > 0) {
                        masterBlocks.forEach(block => {
                            Reduktor.addBlock(block.worldX, block.worldY, block.color);
                        });
                        console.log(`🔄 Перезапуск: загружен master уровень (${masterBlocks.length} блоков)`);
                    }
                    
                    GameObjects.restart();
                    Reduktor.startFalling();
                });
            }
        });
        
        WindowManager.onResize((nw, nh) => {
            BackgroundAndParticles.resize(nw, nh);
            GameObjects.resize(nw, nh);
            Reduktor.resize(nw, nh);
            updateBottomPanelSize();
        });
        
        if (w && h) {
            BackgroundAndParticles.resize(w, h);
            GameObjects.resize(w, h);
            Reduktor.resize(w, h);
        }
        
        initEditorButtons();
        initControlButtons();
        initVisibilityHandlers();
        initStartScreen();
        
        isInitialized = true;
        console.log('✅ Приложение запущено!');
    }
    
    function initStartScreen() {
        const startOverlay = document.getElementById('startOverlay');
        const startPlayBtn = document.getElementById('startPlayBtn');
        const startEditorBtn = document.getElementById('startEditorBtn');
        
        document.getElementById('editorPanel').style.display = 'none';
        document.getElementById('topPanel').style.display = 'none';
        document.getElementById('bottomPanelWrapper').style.display = 'none';
        
        if (startPlayBtn) {
            startPlayBtn.addEventListener('click', () => {
                startGame();
            });
        }
        
        if (startEditorBtn) {
            startEditorBtn.addEventListener('click', () => {
                startEditor();
            });
        }
    }
    
    function startGame() {
        if (!isStartScreenVisible) return;
        isStartScreenVisible = false;
        
        const startOverlay = document.getElementById('startOverlay');
        if (startOverlay) {
            startOverlay.classList.add('hide');
            setTimeout(() => {
                startOverlay.style.display = 'none';
            }, 300);
        }
        
        isGameMode = true;
        isPaused = false;
        
        document.getElementById('editorPanel').style.display = 'none';
        document.getElementById('topPanel').style.display = 'flex';
        document.getElementById('bottomPanelWrapper').style.display = 'block';
        document.getElementById('modeIndicator').textContent = '🎮 РЕЖИМ: ИГРА';
        
        updateBottomPanelSize();
        
        const musicBtn = document.getElementById('musicBtn');
        const soundBtn = document.getElementById('soundBtn');
        
        if (musicBtn) {
            musicBtn.textContent = '🎵';
            musicBtn.classList.add('active');
        }
        if (soundBtn) {
            soundBtn.textContent = '🔊';
            soundBtn.classList.add('active');
        }
        
        if (!audioActivated) {
            AudioManager.activate();
            audioActivated = true;
        }
        
        AudioManager.setMusicEnabled(true);
        AudioManager.setSfxEnabled(true);
        
        GameObjects.showCircles();
        Reduktor.disableEditorMode();
        
        LevelManager.loadFromMaster().then(masterBlocks => {
            if (masterBlocks.length > 0) {
                Reduktor.clearBlocks();
                masterBlocks.forEach(block => {
                    Reduktor.addBlock(block.worldX, block.worldY, block.color);
                });
                console.log(`🎮 Загружен master уровень (${masterBlocks.length} блоков) для игры`);
            } else {
                Reduktor.clearBlocks();
            }
            Reduktor.startFalling();
            GameObjects.restart();
        });
    }
    
    function startEditor() {
        if (!isStartScreenVisible) return;
        isStartScreenVisible = false;
        
        const startOverlay = document.getElementById('startOverlay');
        if (startOverlay) {
            startOverlay.classList.add('hide');
            setTimeout(() => {
                startOverlay.style.display = 'none';
            }, 300);
        }
        
        isGameMode = false;
        
        document.getElementById('editorPanel').style.display = 'flex';
        document.getElementById('topPanel').style.display = 'none';
        document.getElementById('bottomPanelWrapper').style.display = 'none';
        document.getElementById('modeIndicator').textContent = '🎨 РЕЖИМ: РЕДАКТОР';
        
        AudioManager.setMusicEnabled(false);
        AudioManager.setSfxEnabled(false);
        
        GameObjects.hideCircles();
        GameObjects.stopGameLogic();
        Reduktor.enableEditorMode();
        Reduktor.resetGameBlocks();
    }
    
function updateBottomPanelSize() {
    const gameWidth = WindowManager.getWidth();
    const wrapper = document.getElementById('bottomPanelWrapper');
    const panel = document.getElementById('bottomPanel');
    
    if (wrapper && panel && gameWidth > 0) {
        wrapper.style.width = `${gameWidth}px`;
        panel.style.width = `${gameWidth}px`;
        wrapper.style.left = `${(window.innerWidth - gameWidth) / 2}px`;
        const radius = Math.min(20, gameWidth * 0.05);
        panel.style.borderRadius = `0 0 ${radius}px ${radius}px`;
    }
}
    
    function initControlButtons() {
        const musicBtn = document.getElementById('musicBtn');
        const soundBtn = document.getElementById('soundBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const resumeBtn = document.getElementById('resumeBtn');
        const pauseOverlay = document.getElementById('pauseOverlay');
        
        if (musicBtn) {
            musicBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isMusicOn = AudioManager.isMusicActive();
                if (isMusicOn) {
                    AudioManager.setMusicEnabled(false);
                    musicBtn.textContent = '🔇';
                    musicBtn.classList.remove('active');
                } else {
                    AudioManager.setMusicEnabled(true);
                    musicBtn.textContent = '🎵';
                    musicBtn.classList.add('active');
                }
            });
        }
        
        if (soundBtn) {
            soundBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isSfxOn = AudioManager.isSfxActive();
                if (isSfxOn) {
                    AudioManager.setSfxEnabled(false);
                    soundBtn.textContent = '🔇';
                    soundBtn.classList.remove('active');
                } else {
                    AudioManager.setSfxEnabled(true);
                    soundBtn.textContent = '🔊';
                    soundBtn.classList.add('active');
                }
            });
        }
        
        if (pauseBtn) {
            pauseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                pauseGame();
            });
        }
        
        if (resumeBtn) {
            resumeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                resumeGame();
            });
        }
        
        if (pauseOverlay) {
            pauseOverlay.addEventListener('click', (e) => {
                if (e.target === pauseOverlay) {
                    resumeGame();
                }
            });
        }
    }
    
    function initVisibilityHandlers() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && isGameMode && !isPaused) {
                pauseGame();
            }
        });
        
        window.addEventListener('pagehide', () => {
            if (isGameMode && !isPaused) {
                pauseGame();
            }
        });
        
        window.addEventListener('blur', () => {
            if (isGameMode && !isPaused) {
                pauseGame();
            }
        });
    }
    
    function pauseGame() {
        if (isPaused) return;
        if (!isGameMode) return;
        
        isPaused = true;
        
        GameObjects.stopGameLogic();
        Reduktor.pauseFalling();
        AudioManager.pauseGame();
        
        const pauseOverlay = document.getElementById('pauseOverlay');
        if (pauseOverlay) {
            pauseOverlay.classList.add('active');
        }
        
        console.log('⏸️ Игра на паузе');
    }
    
    function resumeGame() {
        if (!isPaused) return;
        if (!isGameMode) return;
        
        isPaused = false;
        
        const pauseOverlay = document.getElementById('pauseOverlay');
        if (pauseOverlay) {
            pauseOverlay.classList.remove('active');
        }
        
        GameObjects.resumeGameLogic();
        Reduktor.resumeFalling();
        AudioManager.resumeGame();
        
        console.log('▶️ Игра продолжена');
    }
    
    function initEditorButtons() {
        const saveLocalBtn = document.getElementById('saveLocalBtn');
        const saveMasterBtn = document.getElementById('saveMasterBtn');
        const exportBtn = document.getElementById('exportBtn');
        const importBtn = document.getElementById('importBtn');
        const playBtn = document.getElementById('playBtn');
        const editorBtn = document.getElementById('editorBtn');
        
        if (saveLocalBtn) {
            saveLocalBtn.addEventListener('click', () => {
                if (!isGameMode) Reduktor.saveBlocks();
            });
        }
        
        if (saveMasterBtn) {
            saveMasterBtn.addEventListener('click', async () => {
                if (!isGameMode) {
                    const blocks = Reduktor.getBlocks();
                    if (blocks.length === 0) {
                        alert('Нет блоков для сохранения!');
                        return;
                    }
                    await LevelManager.saveToMaster(blocks);
                    alert('Master уровень сохранён!');
                }
            });
        }
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                if (!isGameMode) {
                    const blocks = Reduktor.getBlocks();
                    LevelManager.exportLevel(blocks);
                }
            });
        }
        
        if (importBtn) {
            importBtn.addEventListener('click', async () => {
                if (!isGameMode) {
                    try {
                        const blocks = await LevelManager.importLevel();
                        if (blocks && blocks.length > 0) {
                            Reduktor.clearBlocks();
                            blocks.forEach(block => {
                                Reduktor.addBlock(block.worldX, block.worldY, block.color);
                            });
                            alert(`Загружено ${blocks.length} блоков!`);
                        } else {
                            alert('В файле нет блоков');
                        }
                    } catch (error) {
                        console.error('Ошибка импорта:', error);
                        alert('Ошибка загрузки файла');
                    }
                }
            });
        }
        
        if (playBtn) {
            playBtn.addEventListener('click', async () => {
                if (!isGameMode) {
                    startGame();
                }
            });
        }
        
        if (editorBtn) {
            editorBtn.addEventListener('click', () => {
                if (isGameMode) {
                    isGameMode = false;
                    document.getElementById('editorPanel').style.display = 'flex';
                    document.getElementById('topPanel').style.display = 'none';
                    document.getElementById('bottomPanelWrapper').style.display = 'none';
                    document.getElementById('modeIndicator').textContent = '🎨 РЕЖИМ: РЕДАКТОР';
                    
                    AudioManager.setMusicEnabled(false);
                    AudioManager.setSfxEnabled(false);
                    
                    GameObjects.hideCircles();
                    GameObjects.stopGameLogic();
                    Reduktor.enableEditorMode();
                    Reduktor.resetGameBlocks();
                }
            });
        }
    }
    
    function updateBottomPanelSize() {
        const gameWidth = WindowManager.getWidth();
        const wrapper = document.getElementById('bottomPanelWrapper');
        const panel = document.getElementById('bottomPanel');
        if (wrapper && panel && gameWidth > 0) {
            wrapper.style.width = `${gameWidth}px`;
            panel.style.width = `${gameWidth}px`;
            const radius = Math.min(20, gameWidth * 0.05);
            panel.style.borderRadius = `0 0 ${radius}px ${radius}px`;
        }
    }
    
    return { init };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}