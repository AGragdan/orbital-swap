const Theme = (function() {
    // ========== БАЗОВЫЕ НАСТРОЙКИ ==========
    // Базовая ширина экрана, относительно которой считаются все размеры
    const BASE_WIDTH = 540;
    
    // ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
    function getScale() {
        const currentWidth = WindowManager.getWidth();
        if (currentWidth === 0) return 1;
        return currentWidth / BASE_WIDTH;
    }
    
    // ========== ЦВЕТА ФОНА ==========
    const background = {
        gradient: {
            colors: ['#6C5CE7', '#A367E6', '#FF6B9D', '#FFB347', '#00D2FF'],
            angle: 0.6
        },
        solidColor: 0x6C5CE7
    };
    
    // ========== ЧАСТИЦЫ ==========
    const particles = {
        colors: [0xFFD700, 0xFF6B9D, 0x6C5CE7, 0x00D2FF, 0xFFB347],
        sizeMin: 1.5,
        sizeMax: 3.5,
        alphaMin: 0.4,
        alphaMax: 0.9,
        twinkleSpeed: 2.5,
        scaleSpeed: 3.0,
        density: 7000,
        fallSpeed: 35,
        fallSpeedVariation: 15
    };
    
    // ========== БЛОКИ ==========
    const blocksColors = [0xFF6B9D, 0x00D2FF, 0xFFD700, 0x6C5CE7, 0xFFB347, 0x4ECDC4];
    
    // Динамические размеры блоков
    function getBlockSize() {
        const scale = getScale();
        return Math.max(20, Math.floor(36 * scale));
    }
    
    function getBlockCornerRadius() {
        const scale = getScale();
        return Math.max(4, Math.floor(8 * scale));
    }
    
    const blocks = {
        colors: blocksColors,
        borderWidth: 2,
        borderColor: 0xFFFFFF,
        borderAlpha: 0.5,
        highlightAlpha: 0,
        cornerRadius: getBlockCornerRadius,
        getSize: getBlockSize
    };
    
    // ========== ИГРОВЫЕ КРУГИ ==========
    function getCircleRadius() {
        const scale = getScale();
        return Math.max(12, Math.floor(18 * scale));
    }
    
    function getOrbitDistance() {
        const scale = getScale();
        return Math.max(36, Math.floor(54 * scale));
    }
    
    function getCircleBorderWidth() {
        const scale = getScale();
        return Math.max(2, Math.floor(4 * scale));
    }
    
    const circles = {
        color1: 0xFF6B9D,
        color2: 0x00D2FF,
        borderColor: 0x8B4513,
        borderAlpha: 1.0,
        highlightAlpha: 0.3,
        highlightSize: 0.3,
        highlightOffsetX: -0.25,
        highlightOffsetY: -0.25,
        getRadius: getCircleRadius,
        getOrbitDistance: getOrbitDistance,
        getBorderWidth: getCircleBorderWidth
    };
    
    // ========== СТАРТОВАЯ ПОЗИЦИЯ ==========
    const gameStart = {
        centerY: 0.7
    };
    
    // ========== СКРОЛЛБАР ==========
    const scrollbar = {
        width: 8,
        margin: 4,
        trackColor: 0x2a2a3e,
        trackAlpha: 0.6,
        thumbColor: 0xFFD700,
        thumbAlpha: 0.9,
        thumbMinHeight: 30
    };
    
    // ========== ПАНЕЛИ ИНТЕРФЕЙСА ==========
    const ui = {
        topPanel: {
            background: 'rgba(255, 255, 255, 0.12)',
            blur: '20px',
            borderRadius: '60px',
            borderColor: 'rgba(255, 255, 255, 0.25)',
            icon: '⭐',
            labelColor: 'rgba(255, 255, 255, 0.8)',
            scoreGradient: ['#FFD700', '#FFA500']
        },
        editorPanel: {
            background: 'rgba(0, 0, 0, 0.8)',
            blur: '20px',
            borderRadius: '40px',
            borderColor: 'rgba(255, 215, 0, 0.4)'
        },
        buttons: {
            save: { gradient: ['#00D2FF', '#6C5CE7'], textColor: 'white' },
            play: { gradient: ['#FFD700', '#FFA500'], textColor: '#1A1A2E' },
            editor: { gradient: ['#6C5CE7', '#FF6B9D'], textColor: 'white' }
        }
    };
    
    // ========== ПОПАП GAME OVER ==========
    const gameOverPopup = {
        backgroundGradient: ['#FF6B9D', '#FFB347', '#FFD700'],
        borderColor: 'rgba(255, 255, 255, 0.5)',
        borderWidth: '4px',
        borderRadius: '60px',
        emoji: '🎉✨💥',
        title: 'GAME OVER',
        titleColor: '#FFFFFF',
        titleShadow: '#FF6B9D',
        scoreColor: '#FFD700',
        scoreShadow: '#FF6B9D',
        recordColor: '#FFFFFF',
        recordShadow: '#FF6B9D',
        recordLabelColor: 'rgba(255, 255, 255, 0.9)',
        newRecordColor: '#00FF00',
        newRecordShadow: '#006600',
        buttonGradient: ['#6C5CE7', '#00D2FF'],
        buttonTextColor: 'white',
        buttonText: 'ИГРАТЬ СНОВА ➡'
    };
    
    // ========== КЛЮЧИ ХРАНЕНИЯ ==========
    const STORAGE_RECORD_KEY = 'orbital_record';
    
    // ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ ГРАДИЕНТОВ ==========
    function createLinearGradient(ctx, x, y, width, height, colors, angle = 0.6) {
        const gradient = ctx.createLinearGradient(0, 0, width * angle, height);
        colors.forEach((color, index) => {
            gradient.addColorStop(index / (colors.length - 1), color);
        });
        return gradient;
    }
    
    function createCanvasGradient(width, height, colors, angle = 0.6) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        const gradient = createLinearGradient(ctx, 0, 0, width, height, colors, angle);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        return canvas;
    }
    
    // ========== ПУБЛИЧНОЕ API ==========
    return {
        // Статические конфиги
        background,
        particles,
        blocks,
        circles,
        scrollbar,
        ui,
        gameOverPopup,
        gameStart,
        STORAGE_RECORD_KEY,
        
        // Динамические функции
        getScale,
        getBlockSize,
        getBlockCornerRadius,
        getCircleRadius,
        getOrbitDistance,
        getCircleBorderWidth,
        
        // Цвета
        getRandomBlockColor: () => blocksColors[Math.floor(Math.random() * blocksColors.length)],
        getRandomParticleColor: () => [0xFFD700, 0xFF6B9D, 0x6C5CE7, 0x00D2FF, 0xFFB347][Math.floor(Math.random() * 5)],
        
        // Вспомогательные
        createLinearGradient,
        createCanvasGradient
    };
})();