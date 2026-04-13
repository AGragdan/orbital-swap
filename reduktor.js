const Reduktor = (function() {
    let stage = null;
    let blocks = [];
    let blockSize = 0;
    let currentWidth = 0;
    let currentHeight = 0;
    let currentSector = 0;
    let blocksContainer = null;
    let isDragging = false;
    let draggedBlock = null;
    let dragStartX = 0, dragStartY = 0;
    let dragStartBlockX = 0, dragStartBlockY = 0;
    let lastClickTime = 0;
    let gameBlocks = [];
    let gameBlocksSpawned = [];
    let isFallingEnabled = false;
    let isFallingPaused = false;
    let fallAnimationId = null;
    let lastFallTimestamp = 0;
    let onBlocksUpdateCallback = null;
    let isEditorMode = true;
    let scrollOffset = 0;
    
    const FALL_SPEED = 1;
    const DOUBLE_CLICK_DELAY = 300;
    const STORAGE_KEY = 'orbital_swap_blocks';
    
    function getSectorOffset(sector) {
        return -sector * currentHeight;
    }
    
    function getCurrentOffset() {
        return getSectorOffset(currentSector);
    }
    
    function screenToWorld(screenY) {
        return screenY + getCurrentOffset();
    }
    
    function worldToScreen(worldY) {
        return worldY - getCurrentOffset();
    }
    
    function createBlockSprite(x, y, color) {
        const g = new PIXI.Graphics();
        const blockColor = color || Theme.getRandomBlockColor();
        g.beginFill(blockColor);
        g.drawRoundedRect(0, 0, blockSize, blockSize, Theme.blocks.cornerRadius);
        g.endFill();
        g.lineStyle(Theme.blocks.borderWidth, Theme.blocks.borderColor, Theme.blocks.borderAlpha);
        g.drawRoundedRect(0, 0, blockSize, blockSize, Theme.blocks.cornerRadius);
        g.x = x;
        g.y = y;
        g.interactive = true;
        g.buttonMode = true;
        return g;
    }
    
    function snapToNeighbors(x, y, draggingBlock) {
        let newX = x, newY = y;
        const threshold = blockSize * 0.3;
        
        for (const block of blocks) {
            if (draggingBlock && block.sprite === draggingBlock) continue;
            const bx = block.sprite.x;
            const by = block.sprite.y;
            
            if (Math.abs(newX - (bx - blockSize)) <= threshold) newX = bx - blockSize;
            if (Math.abs(newX - (bx + blockSize)) <= threshold) newX = bx + blockSize;
            if (Math.abs(newY - (by - blockSize)) <= threshold) newY = by - blockSize;
            if (Math.abs(newY - (by + blockSize)) <= threshold) newY = by + blockSize;
        }
        
        newX = Math.max(0, Math.min(currentWidth - blockSize, newX));
        newY = Math.max(0, Math.min(currentHeight - blockSize, newY));
        return { x: newX, y: newY };
    }
    
    function updateBlockSize() {
        if (currentWidth) blockSize = currentWidth / 15;
    }
    
    function setBlockSize(newSize) {
        if (newSize && newSize > 0) {
            blockSize = newSize;
            const blockData = blocks.map(b => ({ x: b.worldX, y: b.worldY, color: b.color }));
            if (blocksContainer) {
                blocksContainer.removeChildren();
                blocks = [];
                blockData.forEach(d => addBlock(d.x, d.y, d.color));
            }
            console.log('🔧 Размер блока установлен:', blockSize);
        }
    }
    
    function setSector(sector) {
        if (!isEditorMode) return;
        if (sector === currentSector) return;
        currentSector = Math.min(9, Math.max(0, sector));
        
        blocks.forEach(block => {
            block.sprite.y = worldToScreen(block.worldY);
        });
        
        document.querySelectorAll('.sector-btn').forEach(btn => {
            const btnSector = parseInt(btn.dataset.sector);
            btn.classList.toggle('active', btnSector === currentSector);
        });
        
        console.log(`Сектор ${currentSector}, смещение = ${getCurrentOffset()}`);
    }
    
    function addBlock(worldX, worldY, color = null) {
        if (!blocksContainer) return;
        
        const screenY = worldToScreen(worldY);
        const sprite = createBlockSprite(worldX, screenY, color);
        const finalColor = color || Theme.getRandomBlockColor();
        
        blocksContainer.addChild(sprite);
        blocks.push({
            sprite: sprite,
            worldX: worldX,
            worldY: worldY,
            screenY: screenY,
            color: finalColor
        });
        
        attachBlockEvents();
        if (onBlocksUpdateCallback) onBlocksUpdateCallback(blocks.length);
    }
    
    function attachBlockEvents() {
        blocks.forEach(block => {
            const s = block.sprite;
            s.off('pointerdown');
            s.off('pointerup');
            s.off('pointermove');
            s.off('pointertap');
            
            s.on('pointerdown', onBlockPointerDown);
            s.on('pointerup', onBlockPointerUp);
            s.on('pointermove', onBlockPointerMove);
            s.on('pointertap', onBlockTap);
        });
    }
    
    function onBlockPointerDown(e) {
        if (!isEditorMode) return;
        isDragging = true;
        draggedBlock = this;
        const pos = e.data.getLocalPosition(stage);
        dragStartX = pos.x;
        dragStartY = pos.y;
        dragStartBlockX = draggedBlock.x;
        dragStartBlockY = draggedBlock.y;
        this.alpha = 0.7;
        e.stopPropagation();
    }
    
    function onBlockPointerUp(e) {
        if (!isEditorMode) return;
        if (!isDragging) return;
        isDragging = false;
        if (draggedBlock) {
            draggedBlock.alpha = 1;
            
            const blockIndex = blocks.findIndex(b => b.sprite === draggedBlock);
            if (blockIndex !== -1) {
                const newWorldY = screenToWorld(draggedBlock.y);
                blocks[blockIndex].worldY = newWorldY;
                blocks[blockIndex].screenY = draggedBlock.y;
                blocks[blockIndex].worldX = draggedBlock.x;
            }
            draggedBlock = null;
        }
        e.stopPropagation();
    }
    
    function onBlockPointerMove(e) {
        if (!isEditorMode) return;
        if (!isDragging || !draggedBlock) return;
        const pos = e.data.getLocalPosition(stage);
        let newX = dragStartBlockX + (pos.x - dragStartX);
        let newY = dragStartBlockY + (pos.y - dragStartY);
        const snapped = snapToNeighbors(newX, newY, draggedBlock);
        draggedBlock.x = snapped.x;
        draggedBlock.y = snapped.y;
        e.stopPropagation();
    }
    
    function onBlockTap(e) {
        if (!isEditorMode) return;
        const now = Date.now();
        if (now - lastClickTime < DOUBLE_CLICK_DELAY) {
            const blockIndex = blocks.findIndex(b => b.sprite === this);
            if (blockIndex !== -1) {
                blocksContainer.removeChild(this);
                blocks.splice(blockIndex, 1);
                if (onBlocksUpdateCallback) onBlocksUpdateCallback(blocks.length);
            }
        }
        lastClickTime = now;
        e.stopPropagation();
    }
    
    function onStageDoubleClick(e) {
        if (!isEditorMode) return;
        
        const now = Date.now();
        if (now - lastClickTime < DOUBLE_CLICK_DELAY) {
            const pos = e.data.getLocalPosition(stage);
            const worldX = Math.round(pos.x / blockSize) * blockSize;
            const worldY = Math.round(screenToWorld(pos.y) / blockSize) * blockSize;
            
            if (worldX >= 0 && worldX <= currentWidth - blockSize) {
                addBlock(worldX, worldY);
                console.log(`Блок создан: мир (${worldX}, ${worldY})`);
            }
        }
        lastClickTime = now;
        e.stopPropagation();
    }
    
function clearBlocks() {
    console.log('🧹 clearBlocks вызван, блоков до удаления:', blocks.length);
    if (blocksContainer) blocksContainer.removeChildren();
    blocks = [];
    if (onBlocksUpdateCallback) onBlocksUpdateCallback(0);
}
    
function clearGameBlocks() {
    console.log('🧹 clearGameBlocks вызван, игровых блоков до удаления:', gameBlocksSpawned.length);
    for (const b of gameBlocksSpawned) {
        if (b.sprite && !b.sprite.destroyed) stage.removeChild(b.sprite);
    }
    gameBlocks = [];
    gameBlocksSpawned = [];
}
    
    function saveBlocks() {
        const data = blocks.map(b => ({
            x: b.worldX,
            y: b.worldY,
            color: b.color
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        console.log(`Сохранено ${blocks.length} блоков`);
        alert(`Сохранено ${blocks.length} блоков`);
    }
    
function loadBlocks() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    console.log('📂 loadBlocks: загрузка блоков из localStorage');
    clearBlocks();
    const data = JSON.parse(saved);
    data.forEach(b => addBlock(b.x, b.y, b.color));
    console.log(`📂 Загружено ${blocks.length} блоков`);
}
    
    function getGameBlocks() {
        return gameBlocksSpawned.map(b => ({
            x: b.sprite.x,
            y: b.sprite.y,
            width: blockSize,
            height: blockSize,
            sprite: b.sprite
        }));
    }
    
    function prepareGameBlocks() {
        for (const b of gameBlocksSpawned) {
            if (b.sprite && !b.sprite.destroyed) stage.removeChild(b.sprite);
        }
        gameBlocks = [];
        gameBlocksSpawned = [];
        
        for (const b of blocks) {
            gameBlocks.push({
                x: b.worldX,
                y: b.worldY,
                width: blockSize,
                height: blockSize,
                color: b.color,
                sprite: null,
                active: false
            });
        }
        
        gameBlocks.sort((a, b) => a.y - b.y);
        
        console.log(`Подготовлено ${gameBlocks.length} блоков для игры`);
        const negativeBlocks = gameBlocks.filter(b => b.y < 0).length;
        console.log(`Блоков выше экрана (Y<0): ${negativeBlocks}`);
    }
    
    function updateGameBlocks(delta) {
        if (!isFallingEnabled) return;
        
        for (const b of gameBlocks) {
            if (!b.active && b.y < currentHeight) {
                const s = createBlockSprite(b.x, b.y, b.color);
                s.interactive = false;
                stage.addChild(s);
                b.sprite = s;
                b.active = true;
                gameBlocksSpawned.push(b);
            }
        }
        
        const fall = blockSize * FALL_SPEED * delta;
        const toRemove = [];
        for (const b of gameBlocksSpawned) {
            let ny = b.sprite.y + fall;
            if (ny + blockSize >= currentHeight) {
                toRemove.push(b);
            } else {
                b.sprite.y = ny;
                b.y = ny;
            }
        }
        for (const b of toRemove) {
            stage.removeChild(b.sprite);
            const idx = gameBlocksSpawned.indexOf(b);
            if (idx !== -1) gameBlocksSpawned.splice(idx, 1);
        }
    }
    
    function startFalling() {
        if (isFallingEnabled) return;
        if (isFallingPaused) {
            isFallingPaused = false;
            isFallingEnabled = true;
            lastFallTimestamp = performance.now() / 1000;
            loop();
            return;
        }
        
        isFallingEnabled = true;
        prepareGameBlocks();
        lastFallTimestamp = performance.now() / 1000;
        
        function loop() {
            if (!isFallingEnabled) return;
            const now = performance.now() / 1000;
            let delta = Math.min(0.033, now - lastFallTimestamp);
            if (delta < 0) delta = 0.016;
            lastFallTimestamp = now;
            updateGameBlocks(delta);
            fallAnimationId = requestAnimationFrame(loop);
        }
        fallAnimationId = requestAnimationFrame(loop);
    }
    
    function stopFalling() {
        isFallingEnabled = false;
        isFallingPaused = false;
        if (fallAnimationId) {
            cancelAnimationFrame(fallAnimationId);
            fallAnimationId = null;
        }
        console.log('⏸️ Падение блоков остановлено (Game Over)');
    }
    
    function pauseFalling() {
        if (!isFallingEnabled) return;
        isFallingEnabled = false;
        isFallingPaused = true;
        if (fallAnimationId) {
            cancelAnimationFrame(fallAnimationId);
            fallAnimationId = null;
        }
        console.log('⏸️ Падение блоков приостановлено');
    }
    
    function resumeFalling() {
        if (!isFallingPaused) return;
        startFalling();
        console.log('▶️ Падение блоков возобновлено');
    }
    
    function resetGameBlocks() {
        clearGameBlocks();
        stopFalling();
    }
    
    function getBlocks() {
        return blocks;
    }
    
    function getBlockSize() {
        return blockSize;
    }
    
    function setOnBlocksUpdate(cb) {
        onBlocksUpdateCallback = cb;
    }
    
    function initEditor(s, w, h) {
        stage = s;
        currentWidth = w;
        currentHeight = h;
        updateBlockSize();
        
        blocksContainer = new PIXI.Container();
        stage.addChild(blocksContainer);
        
        stage.interactive = true;
        stage.on('pointertap', onStageDoubleClick);
        
        loadBlocks();
        
        const sectorNav = document.getElementById('sectorNav');
        if (sectorNav) {
            sectorNav.querySelectorAll('.sector-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const sector = parseInt(btn.dataset.sector);
                    setSector(sector);
                    e.stopPropagation();
                });
            });
        }
        
        setSector(0);
        console.log('Редактор инициализирован');
        console.log(`Высота экрана: ${currentHeight}`);
    }
    
    function disableEditorMode() {
        isEditorMode = false;
        if (blocksContainer) blocksContainer.visible = false;
        const sectorNav = document.getElementById('sectorNav');
        if (sectorNav) sectorNav.style.display = 'none';
    }
    
    function enableEditorMode() {
        isEditorMode = true;
        if (blocksContainer) blocksContainer.visible = true;
        const sectorNav = document.getElementById('sectorNav');
        if (sectorNav) sectorNav.style.display = 'flex';
        blocks.forEach(block => {
            block.sprite.y = worldToScreen(block.worldY);
        });
    }
    
    function hideBlocks() {
        if (blocksContainer) blocksContainer.visible = false;
    }
    
    function showBlocks() {
        if (blocksContainer) blocksContainer.visible = true;
    }
    
function resize(w, h) {
    if (currentWidth === 0 || currentHeight === 0) {
        currentWidth = w;
        currentHeight = h;
        updateBlockSize();
        return;
    }
    
    const oldWidth = currentWidth;
    const oldHeight = currentHeight;
    
    currentWidth = w;
    currentHeight = h;
    updateBlockSize();
    
    if (blocks.length === 0) return;
    
    const scaleX = w / oldWidth;
    const scaleY = h / oldHeight;
    
    blocks.forEach(block => {
        block.worldX = block.worldX * scaleX;
        block.worldY = block.worldY * scaleY;
        block.sprite.x = block.worldX;
        block.sprite.y = worldToScreen(block.worldY);
    });
    
    console.log(`📏 Блоки пересчитаны: ${oldWidth}x${oldHeight} → ${w}x${h}`);
}
    
    function destroy() {
        stopFalling();
        clearBlocks();
        if (blocksContainer && stage) stage.removeChild(blocksContainer);
    }

    function fullResize(gameWidth, gameHeight) {
    if (currentWidth === 0 || currentHeight === 0) {
        currentWidth = gameWidth;
        currentHeight = gameHeight;
        updateBlockSize();
        return;
    }
    
    const oldWidth = currentWidth;
    const oldHeight = currentHeight;
    
    currentWidth = gameWidth;
    currentHeight = gameHeight;
    updateBlockSize();
    
    if (blocks.length === 0) return;
    
    // Масштабируем координаты всех блоков
    const scaleX = gameWidth / oldWidth;
    const scaleY = gameHeight / oldHeight;
    
    blocks.forEach(block => {
        block.worldX = block.worldX * scaleX;
        block.worldY = block.worldY * scaleY;
        block.sprite.x = block.worldX;
        block.sprite.y = worldToScreen(block.worldY);
    });
    
    console.log(`🔄 Reduktor: блоки пересчитаны, масштаб X=${scaleX.toFixed(2)}, Y=${scaleY.toFixed(2)}`);
}
    
    return {
        initEditor,
        disableEditorMode,
        enableEditorMode,
        getBlocks,
        getGameBlocks,
        saveBlocks,
        loadBlocks,
        clearBlocks,
        clearGameBlocks,
        hideBlocks,
        showBlocks,
        getBlockSize,
        startFalling,
        stopFalling,
        pauseFalling,
        resumeFalling,
        resetGameBlocks,
        resize,
        destroy,
        setOnBlocksUpdate,
        setBlockSize,
        fullResize,
        addBlock
    };
})();