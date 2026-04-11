const AudioManager = (function() {
    let audioContext = null;
    let isAudioEnabled = false;
    let isMusicEnabled = true;
    let isSfxEnabled = true;
    let musicSource = null;
    let musicGainNode = null;
    let musicBuffer = null;
    let tapBuffer = null, collisionBuffer = null, newRecordBuffer = null;
    let isInitialized = false;
    let isLoading = false;
    
    const MUSIC_VOLUME = 0.4;
    const SFX_VOLUME = 0.6;
    
    const AUDIO_PATHS = {
        tap: 'audio/tap.mp3',
        collision: 'audio/collision.mp3',
        newRecord: 'audio/newrecord.mp3',
        music: 'audio/music.mp3'
    };
    
    function ensureAudioContext() {
        if (!audioContext) {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch(e) { 
                console.error('Web Audio API не поддерживается'); 
            }
        }
        return audioContext;
    }
    
    // ========== СИНТЕТИЧЕСКИЕ ЗВУКИ (FALLBACK) ==========
    function generateTapSound() {
        const ctx = ensureAudioContext();
        if (!ctx) return null;
        const duration = 0.12, sampleRate = 44100, samples = Math.floor(duration * sampleRate);
        const buffer = ctx.createBuffer(1, samples, sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < samples; i++) {
            const t = i / sampleRate;
            const freq = 600 + 400 * Math.sin(t * Math.PI * 20);
            let value = Math.sin(2 * Math.PI * freq * t);
            value *= Math.exp(-t * 25);
            value += 0.3 * Math.sin(2 * Math.PI * 1200 * t) * Math.exp(-t * 30);
            data[i] = value * 0.5;
        }
        return buffer;
    }
    
    function generateCollisionSound() {
        const ctx = ensureAudioContext();
        if (!ctx) return null;
        const duration = 0.35, sampleRate = 44100, samples = Math.floor(duration * sampleRate);
        const buffer = ctx.createBuffer(1, samples, sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < samples; i++) {
            const t = i / sampleRate;
            const freq = 200 * Math.exp(-t * 12);
            let value = Math.sin(2 * Math.PI * freq * t);
            value += (Math.random() - 0.5) * 0.4 * Math.exp(-t * 15);
            value *= Math.exp(-t * 8);
            data[i] = value * 0.7;
        }
        return buffer;
    }
    
    function generateNewRecordSound() {
        const ctx = ensureAudioContext();
        if (!ctx) return null;
        const duration = 0.9, sampleRate = 44100, samples = Math.floor(duration * sampleRate);
        const buffer = ctx.createBuffer(1, samples, sampleRate);
        const data = buffer.getChannelData(0);
        const notes = [523.25, 659.25, 783.99, 1046.50];
        const noteDuration = duration / notes.length;
        for (let i = 0; i < samples; i++) {
            const t = i / sampleRate;
            let noteIndex = Math.floor(t / noteDuration);
            if (noteIndex >= notes.length) noteIndex = notes.length - 1;
            const freq = notes[noteIndex];
            const noteT = (t % noteDuration) / noteDuration;
            const envelope = Math.sin(noteT * Math.PI) * Math.exp(-t * 5);
            let value = Math.sin(2 * Math.PI * freq * t) * envelope;
            value += 0.4 * Math.sin(2 * Math.PI * freq * 2 * t) * envelope;
            data[i] = value * 0.6;
        }
        return buffer;
    }
    
    function generateMusic() {
        const ctx = ensureAudioContext();
        if (!ctx) return null;
        const duration = 8.0, sampleRate = 44100, samples = Math.floor(duration * sampleRate);
        const buffer = ctx.createBuffer(1, samples, sampleRate);
        const data = buffer.getChannelData(0);
        const melody = [
            { note: 0, duration: 0.4 }, { note: 2, duration: 0.4 }, { note: 4, duration: 0.4 },
            { note: 5, duration: 0.4 }, { note: 4, duration: 0.4 }, { note: 2, duration: 0.4 },
            { note: 0, duration: 0.8 }, { note: 5, duration: 0.4 }, { note: 4, duration: 0.4 },
            { note: 2, duration: 0.4 }, { note: 0, duration: 0.4 }, { note: -2, duration: 0.8 }
        ];
        const notes_freq = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88];
        let time = 0;
        for (const segment of melody) {
            const freq = notes_freq[segment.note + 3] || 261.63;
            const segDuration = segment.duration;
            const segSamples = Math.floor(segDuration * sampleRate);
            const startIdx = Math.floor(time * sampleRate);
            for (let i = 0; i < segSamples && startIdx + i < samples; i++) {
                const t = i / sampleRate;
                const envelope = Math.sin((t / segDuration) * Math.PI) * Math.exp(-t * 2);
                let value = Math.sin(2 * Math.PI * freq * t) * envelope;
                value += 0.3 * Math.sin(2 * Math.PI * freq * 2 * t) * envelope;
                if (segment.note === 0 || segment.note === 4) value += 0.2 * Math.sin(2 * Math.PI * 130.81 * t) * envelope;
                data[startIdx + i] += value * 0.25;
            }
            time += segDuration;
        }
        let max = 0;
        for (let i = 0; i < samples; i++) if (Math.abs(data[i]) > max) max = Math.abs(data[i]);
        if (max > 0) for (let i = 0; i < samples; i++) data[i] /= max;
        return buffer;
    }
    
    // ========== ЗАГРУЗКА MP3 ФАЙЛОВ ==========
    function loadAudioFile(url, onSuccess, onError) {
        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.arrayBuffer();
            })
            .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
            .then(buffer => {
                console.log(`✅ Загружен: ${url}`);
                onSuccess(buffer);
            })
            .catch(error => {
                console.warn(`⚠️ Не удалось загрузить ${url}:`, error.message);
                onError(error);
            });
    }
    
    function loadAllSounds() {
        if (isLoading) return;
        isLoading = true;
        
        const ctx = ensureAudioContext();
        if (!ctx) {
            console.error('Невозможно создать аудиоконтекст');
            isLoading = false;
            return;
        }
        
        let loadedCount = 0;
        const totalSounds = 4;
        
        function onLoadComplete() {
            loadedCount++;
            if (loadedCount === totalSounds) {
                isInitialized = true;
                isLoading = false;
                console.log('🎵 Все аудиофайлы загружены');
                if (isAudioEnabled && isMusicEnabled && musicBuffer) {
                    startMusic();
                }
            }
        }
        
        loadAudioFile(AUDIO_PATHS.tap,
            (buffer) => { tapBuffer = buffer; onLoadComplete(); },
            () => { tapBuffer = generateTapSound(); onLoadComplete(); }
        );
        
        loadAudioFile(AUDIO_PATHS.collision,
            (buffer) => { collisionBuffer = buffer; onLoadComplete(); },
            () => { collisionBuffer = generateCollisionSound(); onLoadComplete(); }
        );
        
        loadAudioFile(AUDIO_PATHS.newRecord,
            (buffer) => { newRecordBuffer = buffer; onLoadComplete(); },
            () => { newRecordBuffer = generateNewRecordSound(); onLoadComplete(); }
        );
        
        loadAudioFile(AUDIO_PATHS.music,
            (buffer) => { musicBuffer = buffer; onLoadComplete(); },
            () => { musicBuffer = generateMusic(); onLoadComplete(); }
        );
    }
    
    function init() {
        if (isInitialized || isLoading) return;
        setTimeout(() => {
            try {
                loadAllSounds();
            } catch(e) { 
                console.error('Ошибка аудио:', e); 
            }
        }, 100);
    }
    
    function activate() {
        if (!isInitialized && !isLoading) {
            init();
        }
        if (isAudioEnabled) return;
        
        const ctx = ensureAudioContext();
        if (ctx && ctx.state === 'suspended') {
            ctx.resume().then(() => {
                isAudioEnabled = true;
                console.log('🎵 Аудио активировано');
                if (isMusicEnabled && musicBuffer && isInitialized) {
                    startMusic();
                }
            }).catch(e => console.error('Ошибка активации:', e));
        } else if (ctx) {
            isAudioEnabled = true;
            console.log('🎵 Аудио уже активно');
            if (isMusicEnabled && musicBuffer && isInitialized) {
                startMusic();
            }
        }
    }
    
    function startMusic() {
        if (!isInitialized || !isAudioEnabled || !musicBuffer || !isMusicEnabled) return;
        const ctx = ensureAudioContext();
        if (!ctx) return;
        
        try {
            // Останавливаем предыдущий источник
            if (musicSource) {
                try { musicSource.stop(); } catch(e) {}
                musicSource = null;
            }
            
            musicGainNode = ctx.createGain();
            musicGainNode.gain.value = isMusicEnabled ? MUSIC_VOLUME : 0;
            musicGainNode.connect(ctx.destination);
            
            musicSource = ctx.createBufferSource();
            musicSource.buffer = musicBuffer;
            musicSource.loop = true;
            musicSource.connect(musicGainNode);
            musicSource.start();
            console.log('🎵 Музыка запущена, громкость:', musicGainNode.gain.value);
        } catch(e) {
            console.error('Ошибка запуска музыки:', e);
        }
    }
    
    function stopMusic() {
        if (musicSource) {
            try { musicSource.stop(); } catch(e) {}
            musicSource = null;
        }
        if (musicGainNode) {
            musicGainNode.disconnect();
            musicGainNode = null;
        }
        console.log('🎵 Музыка остановлена');
    }
    
    function playBuffer(buffer, volume) {
        if (!buffer || !isAudioEnabled) return;
        const ctx = ensureAudioContext();
        if (!ctx) return;
        try {
            const s = ctx.createBufferSource();
            s.buffer = buffer;
            const g = ctx.createGain();
            // Если звуки выключены, ставим громкость 0
            g.gain.value = isSfxEnabled ? volume : 0;
            s.connect(g);
            g.connect(ctx.destination);
            s.start();
        } catch(e) {}
    }
    
    function playTap() {
        if (tapBuffer) playBuffer(tapBuffer, 0.35);
    }
    
    function playCollision() {
        if (collisionBuffer) playBuffer(collisionBuffer, 0.55);
    }
    
    function playNewRecord() {
        if (newRecordBuffer) playBuffer(newRecordBuffer, 0.65);
    }
    
    // Управление музыкой через громкость (не останавливая поток)
 function setMusicEnabled(enabled) {
    console.log('🎵 setMusicEnabled:', enabled);
    isMusicEnabled = enabled;
    if (musicGainNode) {
        musicGainNode.gain.value = enabled ? MUSIC_VOLUME : 0;
    }
}

function setSfxEnabled(enabled) {
    console.log('🔊 setSfxEnabled:', enabled);
    isSfxEnabled = enabled;
}

function isMusicActive() {
    return isMusicEnabled && isAudioEnabled;
}

function isSfxActive() {
    return isSfxEnabled && isAudioEnabled;
}

function pauseGame() {
    if (musicGainNode) {
        musicGainNode.gain.value = 0;
    }
}

function resumeGame() {
    if (musicGainNode && isMusicEnabled) {
        musicGainNode.gain.value = MUSIC_VOLUME;
    }
}
    
    return {
        init,
        activate,
        playTap,
        playCollision,
        playNewRecord,
        setMusicEnabled,
        setSfxEnabled,
        isMusicActive,
        isSfxActive,
        pauseGame,
        resumeGame
    };
})();

console.log('✅ AudioManager загружен');