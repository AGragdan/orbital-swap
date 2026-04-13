// ========================
// МОДУЛЬ: Управление уровнями (LevelManager)
// Хранение координат в ОТНОСИТЕЛЬНЫХ величинах (0-1)
// ========================
const LevelManager = (function() {
    const MASTER_LEVEL = 'levelmaster';
    
    // ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
    
    function getGameSize() {
        return {
            width: WindowManager.getWidth(),
            height: WindowManager.getHeight()
        };
    }
    
    function downloadXML(content, filename) {
        const blob = new Blob([content], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // ========== ПРЕОБРАЗОВАНИЕ КООРДИНАТ ==========
    
    // Абсолютные -> Относительные (для сохранения)
    function absoluteToRelative(absoluteBlocks) {
        const { width, height } = getGameSize();
        if (width === 0 || height === 0) return absoluteBlocks;
        
        return absoluteBlocks.map(block => ({
            relX: block.worldX / width,
            relY: block.worldY / height,
            color: block.color
        }));
    }
    
    // Относительные -> Абсолютные (для загрузки)
    function relativeToAbsolute(relativeBlocks) {
        const { width, height } = getGameSize();
        if (width === 0 || height === 0) return [];
        
        return relativeBlocks.map(block => ({
            worldX: block.relX * width,
            worldY: block.relY * height,
            color: block.color
        }));
    }
    
    // ========== ЗАГРУЗКА ИЗ ФАЙЛА ==========
    
async function loadFromMaster() {
    try {
        const response = await fetch(`levels/${MASTER_LEVEL}.xml`);
        if (!response.ok) {
            console.log('Файл master уровня не найден');
            return [];
        }
        
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
        // Эталонный размер, для которого созданы координаты в XML
        const REFERENCE_WIDTH = 540;
        const REFERENCE_HEIGHT = 960;
        
        const currentWidth = WindowManager.getWidth();
        const currentHeight = WindowManager.getHeight();
        
        const scaleX = currentWidth / REFERENCE_WIDTH;
        const scaleY = currentHeight / REFERENCE_HEIGHT;
        
        const blocks = [];
        const blockElements = xmlDoc.querySelectorAll('block');
        
        for (let i = 0; i < blockElements.length; i++) {
            const block = blockElements[i];
            const x = parseFloat(block.getAttribute('x'));
            const y = parseFloat(block.getAttribute('y'));
            const color = block.getAttribute('color') ? parseInt(block.getAttribute('color')) : null;
            
            if (!isNaN(x) && !isNaN(y)) {
                blocks.push({ 
                    worldX: x * scaleX, 
                    worldY: y * scaleY, 
                    color: color 
                });
            }
        }
        
        console.log(`📂 Загружен master уровень: ${blocks.length} блоков`);
        console.log(`   Масштаб: X=${scaleX.toFixed(2)}, Y=${scaleY.toFixed(2)}`);
        console.log(`   Размер экрана: ${currentWidth}x${currentHeight}`);
        
        return blocks;
        
    } catch (error) {
        console.error('Ошибка загрузки master уровня:', error);
        return [];
    }
}
    
    // ========== СОХРАНЕНИЕ В ФАЙЛ ==========
    
    async function saveToMaster(absoluteBlocks) {
        if (!absoluteBlocks || absoluteBlocks.length === 0) {
            console.log('Нет блоков для сохранения');
            return false;
        }
        
        // Преобразуем абсолютные координаты в относительные
        const relativeBlocks = absoluteToRelative(absoluteBlocks);
        const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
        
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<level name="${MASTER_LEVEL}" date="${date}" version="2.0">\n`;
        xml += `    <description>Основной игровой уровень (относительные координаты)</description>\n`;
        xml += `    <blocks>\n`;
        
        relativeBlocks.forEach(block => {
            xml += `        <block x="${block.relX.toFixed(4)}" y="${block.relY.toFixed(4)}" color="${block.color}"/>\n`;
        });
        
        xml += `    </blocks>\n`;
        xml += `</level>`;
        
        downloadXML(xml, `${MASTER_LEVEL}.xml`);
        console.log(`💾 Master уровень сохранён (${absoluteBlocks.length} блоков)`);
        return true;
    }
    
    // ========== ИМПОРТ ИЗ ЛЮБОГО XML ==========
    
    async function importLevel() {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.xml';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) {
                    reject('Файл не выбран');
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = function(evt) {
                    try {
                        const xmlText = evt.target.result;
                        const parser = new DOMParser();
                        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
                        
                        const relativeBlocks = [];
                        const blockElements = xmlDoc.querySelectorAll('block');
                        
                        // Пытаемся определить версию формата
                        const version = xmlDoc.querySelector('level')?.getAttribute('version') || '1.0';
                        
                        for (let i = 0; i < blockElements.length; i++) {
                            const block = blockElements[i];
                            let relX, relY, color;
                            
                            if (version === '2.0' || block.hasAttribute('x') && parseFloat(block.getAttribute('x')) <= 1) {
                                // Версия 2.0 — относительные координаты (0-1)
                                relX = parseFloat(block.getAttribute('x'));
                                relY = parseFloat(block.getAttribute('y'));
                            } else {
                                // Версия 1.0 — абсолютные координаты (нужно конвертировать)
                                const absX = parseFloat(block.getAttribute('x'));
                                const absY = parseFloat(block.getAttribute('y'));
                                const { width, height } = getGameSize();
                                relX = absX / width;
                                relY = absY / height;
                                console.log(`🔄 Конвертация абсолютных координат (${absX},${absY}) → (${relX.toFixed(4)},${relY.toFixed(4)})`);
                            }
                            
                            color = block.getAttribute('color') ? parseInt(block.getAttribute('color')) : null;
                            
                            if (!isNaN(relX) && !isNaN(relY)) {
                                relativeBlocks.push({ relX, relY, color });
                            }
                        }
                        
                        const absoluteBlocks = relativeToAbsolute(relativeBlocks);
                        console.log(`📂 Импортировано ${absoluteBlocks.length} блоков`);
                        resolve(absoluteBlocks);
                        
                    } catch (error) {
                        reject(error);
                    }
                };
                reader.onerror = () => reject('Ошибка чтения файла');
                reader.readAsText(file);
            };
            input.click();
        });
    }
    
    // ========== ЭКСПОРТ В XML ==========
    
    function exportLevel(absoluteBlocks) {
        if (!absoluteBlocks || absoluteBlocks.length === 0) {
            alert('Нет блоков для экспорта!');
            return false;
        }
        
        const relativeBlocks = absoluteToRelative(absoluteBlocks);
        const filename = prompt('Введите имя уровня:', 'my_level');
        if (!filename) return false;
        
        const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
        
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<level name="${filename}" date="${date}" version="2.0">\n`;
        xml += `    <description>Экспортированный уровень (относительные координаты)</description>\n`;
        xml += `    <blocks>\n`;
        
        relativeBlocks.forEach(block => {
            xml += `        <block x="${block.relX.toFixed(4)}" y="${block.relY.toFixed(4)}" color="${block.color}"/>\n`;
        });
        
        xml += `    </blocks>\n`;
        xml += `</level>`;
        
        downloadXML(xml, `${filename}.xml`);
        console.log(`💾 Уровень экспортирован как ${filename}.xml`);
        return true;
    }

    // Нормализация координат (преобразование абсолютных в относительные)
function normalizeBlocks(blocks, width, height) {
    if (!blocks || blocks.length === 0) return [];
    if (width === 0 || height === 0) return blocks;
    
    return blocks.map(block => ({
        relX: block.worldX / width,
        relY: block.worldY / height,
        color: block.color
    }));
}

// Денормализация (преобразование относительных в абсолютные)
function denormalizeBlocks(normalizedBlocks, width, height) {
    if (!normalizedBlocks || normalizedBlocks.length === 0) return [];
    if (width === 0 || height === 0) return [];
    
    return normalizedBlocks.map(block => ({
        worldX: block.relX * width,
        worldY: block.relY * height,
        color: block.color
    }));
}
    // ========== ПЕРЕСЧЁТ БЛОКОВ ПРИ РЕСАЙЗЕ ==========
    
    function resizeBlocks(blocks, oldWidth, oldHeight, newWidth, newHeight) {
        if (!blocks || blocks.length === 0) return [];
        
        return blocks.map(block => ({
            ...block,
            worldX: (block.worldX / oldWidth) * newWidth,
            worldY: (block.worldY / oldHeight) * newHeight
        }));
    }
    
    function updateBlocksForNewSize(blocks, oldWidth, oldHeight, newWidth, newHeight) {
    if (!blocks || blocks.length === 0) return [];
    if (oldWidth === 0 || oldHeight === 0) return blocks;
    
    const scaleX = newWidth / oldWidth;
    const scaleY = newHeight / oldHeight;
    
    return blocks.map(block => ({
        worldX: block.worldX * scaleX,
        worldY: block.worldY * scaleY,
        color: block.color
    }));
}
    // ========== ПУБЛИЧНОЕ API ==========
    
    return {
        loadFromMaster,
        saveToMaster,
        importLevel,
        exportLevel,
        resizeBlocks,
        updateBlocksForNewSize,
        getGameSize
    };
})();

console.log('📁 LevelManager загружен (версия 2.0 — относительные координаты)');