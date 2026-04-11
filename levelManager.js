// ========================
// МОДУЛЬ: Управление уровнями (LevelManager)
// Сохранение и загрузка уровней в XML файлы
// ========================
const LevelManager = (function() {
    // Имя основного файла уровня для игры
    const MASTER_LEVEL = 'levelmaster';
    
    // Сохранение текущих блоков в XML файл
    function saveToXML(blocks, filename = 'level') {
        if (!blocks || blocks.length === 0) {
            alert('Нет блоков для сохранения!');
            return false;
        }
        
        const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
        
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<level name="${filename}" date="${date}" version="1.0">\n`;
        xml += `    <description>Уровень создан в редакторе</description>\n`;
        xml += `    <blocks>\n`;
        
        blocks.forEach(block => {
            xml += `        <block x="${block.worldX}" y="${block.worldY}" color="${block.color}"/>\n`;
        });
        
        xml += `    </blocks>\n`;
        xml += `</level>`;
        
        // Скачивание файла
        downloadXML(xml, `${filename}.xml`);
        console.log(`💾 Уровень сохранён как ${filename}.xml (${blocks.length} блоков)`);
        return true;
    }
    
    // Загрузка из XML файла
    function loadFromXML(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const xmlText = e.target.result;
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
                    
                    const parserError = xmlDoc.querySelector('parsererror');
                    if (parserError) {
                        reject(new Error('Ошибка парсинга XML'));
                        return;
                    }
                    
                    const blocks = [];
                    const blockElements = xmlDoc.querySelectorAll('block');
                    
                    for (let i = 0; i < blockElements.length; i++) {
                        const block = blockElements[i];
                        const x = parseInt(block.getAttribute('x'));
                        const y = parseInt(block.getAttribute('y'));
                        const color = block.getAttribute('color') ? parseInt(block.getAttribute('color')) : null;
                        
                        if (!isNaN(x) && !isNaN(y)) {
                            blocks.push({ worldX: x, worldY: y, color: color });
                        }
                    }
                    
                    resolve(blocks);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Ошибка чтения файла'));
            reader.readAsText(file);
        });
    }
    
    // Скачивание XML файла
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
    
    // Сохранение в MASTER_LEVEL (основной файл для игры)
    async function saveToMaster(blocks) {
        if (!blocks || blocks.length === 0) {
            console.log('Нет блоков для сохранения в master уровень');
            return false;
        }
        
        const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
        
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<level name="${MASTER_LEVEL}" date="${date}" version="1.0">\n`;
        xml += `    <description>Основной игровой уровень</description>\n`;
        xml += `    <blocks>\n`;
        
        blocks.forEach(block => {
            xml += `        <block x="${block.worldX}" y="${block.worldY}" color="${block.color}"/>\n`;
        });
        
        xml += `    </blocks>\n`;
        xml += `</level>`;
        
        // Сохраняем в localStorage как резервную копию
        localStorage.setItem('orbital_master_backup', xml);
        
        // Скачиваем как файл
        downloadXML(xml, `${MASTER_LEVEL}.xml`);
        console.log(`💾 Master уровень сохранён (${blocks.length} блоков)`);
        return true;
    }
    
    // Загрузка из MASTER_LEVEL
    async function loadFromMaster() {
        // Пытаемся загрузить из файла через fetch
        try {
            const response = await fetch(`levels/${MASTER_LEVEL}.xml`);
            if (response.ok) {
                const xmlText = await response.text();
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
                
                const blocks = [];
                const blockElements = xmlDoc.querySelectorAll('block');
                
                for (let i = 0; i < blockElements.length; i++) {
                    const block = blockElements[i];
                    const x = parseInt(block.getAttribute('x'));
                    const y = parseInt(block.getAttribute('y'));
                    const color = block.getAttribute('color') ? parseInt(block.getAttribute('color')) : null;
                    
                    if (!isNaN(x) && !isNaN(y)) {
                        blocks.push({ worldX: x, worldY: y, color: color });
                    }
                }
                
                if (blocks.length > 0) {
                    console.log(`📂 Загружен master уровень из файла: ${blocks.length} блоков`);
                    return blocks;
                }
            }
        } catch(e) {
            console.log('Файл master уровня не найден, проверяем резервную копию');
        }
        
        // Если файл не найден, пробуем загрузить из localStorage
        const backup = localStorage.getItem('orbital_master_backup');
        if (backup) {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(backup, 'text/xml');
            const blocks = [];
            const blockElements = xmlDoc.querySelectorAll('block');
            
            for (let i = 0; i < blockElements.length; i++) {
                const block = blockElements[i];
                const x = parseInt(block.getAttribute('x'));
                const y = parseInt(block.getAttribute('y'));
                const color = block.getAttribute('color') ? parseInt(block.getAttribute('color')) : null;
                
                if (!isNaN(x) && !isNaN(y)) {
                    blocks.push({ worldX: x, worldY: y, color: color });
                }
            }
            
            if (blocks.length > 0) {
                console.log(`📂 Загружен master уровень из резервной копии: ${blocks.length} блоков`);
                return blocks;
            }
        }
        
        console.log('Master уровень не найден, игра будет пустой');
        return [];
    }
    
    // Импорт уровня из выбранного файла
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
                
                try {
                    const blocks = await loadFromXML(file);
                    resolve(blocks);
                } catch (error) {
                    reject(error);
                }
            };
            input.click();
        });
    }
    
    // Экспорт текущих блоков
    function exportLevel(blocks) {
        if (!blocks || blocks.length === 0) {
            alert('Нет блоков для экспорта!');
            return false;
        }
        
        const filename = prompt('Введите имя уровня:', 'my_level');
        if (filename) {
            saveToXML(blocks, filename);
        }
        return true;
    }
    
    return {
        saveToMaster,
        loadFromMaster,
        importLevel,
        exportLevel,
        saveToXML
    };
})();

console.log('📁 LevelManager загружен');