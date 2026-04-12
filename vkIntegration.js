// ========================
// МОДУЛЬ: VK Integration
// Подключение к платформе VK Mini Apps (современная версия)
// ========================
const VKIntegration = (function() {
    let isVKPlatform = false;
    let userInfo = null;
    let initialized = false;
    
    // Проверка, запущено ли приложение внутри VK
    function checkVKPlatform() {
        isVKPlatform = window.location.hash === '#vk_platform' || 
                       (window.location.search.indexOf('vk_platform') !== -1) ||
                       (window.parent !== window);
        return isVKPlatform;
    }
    
    // Инициализация VK Bridge
    async function init() {
        if (initialized) return;
        
        if (!checkVKPlatform()) {
            console.log('🖥️ Игра запущена вне платформы VK');
            return;
        }
        
        console.log('🎮 Обнаружена платформа VK Mini Apps');
        
        // Проверяем, загружен ли VK Bridge (современная версия)
        if (typeof VKBridge === 'undefined') {
            console.warn('⚠️ VK Bridge не загружен. Пропускаем инициализацию VK, но игра продолжит работу.');
            return;
        }
        
        try {
            // Инициализация приложения
            await VKBridge.send('VKWebAppInit');
            console.log('✅ VK Bridge инициализирован');
            
            // Получение информации о пользователе
            userInfo = await VKBridge.send('VKWebAppGetUserInfo');
            console.log('👤 Пользователь VK:', userInfo.first_name, userInfo.last_name);
            
            // Настройка внешнего вида (опционально)
            await VKBridge.send('VKWebAppSetViewSettings', {
                status_bar_style: 'dark',
                action_bar_color: '#1a1a2e'
            });
            
            // Настройка шаринга (опционально)
            await VKBridge.send('VKWebAppSetShareSettings', {
                share_url: window.location.href
            });
            
            initialized = true;
            
        } catch (error) {
            console.error('Ошибка инициализации VK Bridge:', error);
        }
    }
    
    // Поделиться результатом
    async function shareResult(score) {
        if (!checkVKPlatform()) return;
        if (typeof VKBridge === 'undefined') return;
        
        try {
            await VKBridge.send('VKWebAppShare', {
                link: window.location.href,
                text: `Я набрал ${score} очков в игре Orbital Swap! Попробуй побить мой рекорд! 🎮`
            });
        } catch (error) {
            console.error('Ошибка при попытке поделиться:', error);
        }
    }
    
    // Показать рекламу (за вознаграждение)
    async function showRewardedAd() {
        if (!checkVKPlatform()) return false;
        if (typeof VKBridge === 'undefined') return false;
        
        try {
            const result = await VKBridge.send('VKWebAppShowNativeAds', { 
                ad_format: 'reward' 
            });
            return result.result === true;
        } catch (error) {
            console.error('Ошибка показа рекламы:', error);
            return false;
        }
    }
    
    // Сохранить рекорд в VK Storage
    async function saveRecord(score) {
        if (!checkVKPlatform()) return;
        if (typeof VKBridge === 'undefined') return;
        
        try {
            await VKBridge.send('VKWebAppStorageSet', {
                key: 'best_score',
                value: score.toString()
            });
            console.log('🏆 Рекорд сохранён в VK Storage');
        } catch (error) {
            console.error('Ошибка сохранения рекорда:', error);
        }
    }
    
    // Загрузить рекорд из VK Storage
    async function loadRecord() {
        if (!checkVKPlatform()) return 0;
        if (typeof VKBridge === 'undefined') return 0;
        
        try {
            const result = await VKBridge.send('VKWebAppStorageGet', {
                keys: ['best_score']
            });
            const record = parseInt(result.keys[0]?.value || '0');
            console.log('🏆 Загружен рекорд из VK Storage:', record);
            return record;
        } catch (error) {
            console.error('Ошибка загрузки рекорда:', error);
            return 0;
        }
    }
    
    // Закрыть приложение (выйти)
    function closeApp() {
        if (!checkVKPlatform()) return;
        if (typeof VKBridge === 'undefined') return;
        VKBridge.send('VKWebAppClose');
    }
    
    return {
        init,
        isVKPlatform: checkVKPlatform,
        getUserInfo: () => userInfo,
        shareResult,
        showRewardedAd,
        saveRecord,
        loadRecord,
        closeApp
    };
})();