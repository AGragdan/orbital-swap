const Theme = (function() {
    const blocksColors = [0xFF6B9D, 0x00D2FF, 0xFFD700, 0x6C5CE7, 0xFFB347, 0x4ECDC4];
    
    return {
        background: {
            gradient: { colors: ['#6C5CE7', '#A367E6', '#FF6B9D', '#FFB347', '#00D2FF'], angle: 0.6 }
        },
        particles: {
            colors: [0xFFD700, 0xFF6B9D, 0x6C5CE7, 0x00D2FF, 0xFFB347],
            sizeMin: 1.5, sizeMax: 3.5,
            alphaMin: 0.4, alphaMax: 0.9,
            twinkleSpeed: 2.5, scaleSpeed: 3.0,
            density: 7000, fallSpeed: 35, fallSpeedVariation: 15
        },
        blocks: {
            colors: blocksColors,
            cornerRadius: 8,
            borderWidth: 2,
            borderColor: 0xFFFFFF,
            borderAlpha: 0.5,
            highlightAlpha: 0
        },
        circles: {
            color1: 0xFF6B9D,
            color2: 0x00D2FF,
            borderColor: 0x8B4513,
            borderWidth: 4,
            borderAlpha: 1.0,
            highlightAlpha: 0.3,
            highlightSize: 0.3,
            highlightOffsetX: -0.25,
            highlightOffsetY: -0.25
        },
        scrollbar: { width: 8, margin: 4, trackColor: 0x2a2a3e, trackAlpha: 0.6, thumbColor: 0xFFD700, thumbAlpha: 0.9, thumbMinHeight: 30 },
        gameStart: { centerY: 0.7 },
        
        getRandomBlockColor: () => blocksColors[Math.floor(Math.random() * blocksColors.length)],
        getRandomParticleColor: () => [0xFFD700, 0xFF6B9D, 0x6C5CE7, 0x00D2FF, 0xFFB347][Math.floor(Math.random() * 5)]
    };
})();