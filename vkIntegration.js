// ========================
// МОДУЛЬ: VK Integration
// Подключение к платформе VK Mini Apps
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
        
        try {
            // Инициализация приложения
            await vkBridge.send('VKWebAppInit');
            console.log('✅ VK Bridge инициализирован');
            
            // Получение информации о пользователе
            userInfo = await vkBridge.send('VKWebAppGetUserInfo');
            console.log('👤 Пользователь VK:', userInfo.first_name, userInfo.last_name);
            
            // Настройка внешнего вида
            await vkBridge.send('VKWebAppSetViewSettings', {
                status_bar_style: 'dark',
                action_bar_color: '#1a1a2e'
            });
            
            // Скрываем кнопку "Поделиться" по умолчанию (если нужно)
            await vkBridge.send('VKWebAppSetShareSettings', {
                share_url: window.location.href
            });
            
            initialized = true;
            
            // Можно показать приветствие с именем пользователя
            showGreeting();
            
        } catch (error) {
            console.error('Ошибка инициализации VK Bridge:', error);
        }
    }
    
    // Показать приветствие (опционально)
    function showGreeting() {
        if (!userInfo) return;
        
        // Небольшое приветствие в консоли или можно добавить временный тост
        console.log(`👋 Привет, ${userInfo.first_name}! Добро пожаловать в Orbital Swap`);
        
        // Можно добавить событие для UI
        const greetingEvent = new CustomEvent('vkUserReady', { 
            detail: { firstName: userInfo.first_name, lastName: userInfo.last_name }
        });
        window.dispatchEvent(greetingEvent);
    }
    
    // Поделиться результатом
    async function shareResult(score) {
        if (!isVKPlatform) return;
        
        try {
            await vkBridge.send('VKWebAppShare', {
                link: window.location.href,
                text: `Я набрал ${score} очков в игре Orbital Swap! Попробуй побить мой рекорд! 🎮`
            });
        } catch (error) {
            console.error('Ошибка при попытке поделиться:', error);
        }
    }
    
    // Показать рекламу (за вознаграждение)
    async function showRewardedAd() {
        if (!isVKPlatform) return false;
        
        try {
            const result = await vkBridge.send('VKWebAppShowNativeAds', { 
                ad_format: 'reward' 
            });
            return result.result === true;
        } catch (error) {
            console.error('Ошибка показа рекламы:', error);
            return false;
        }
    }
    
    // Показать баннерную рекламу
    function showBannerAd() {
        if (!isVKPlatform) return;
        
        // Создаём контейнер для баннера
        let bannerContainer = document.getElementById('vkBannerContainer');
        if (!bannerContainer) {
            bannerContainer = document.createElement('div');
            bannerContainer.id = 'vkBannerContainer';
            bannerContainer.style.cssText = `
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                z-index: 300;
                display: flex;
                justify-content: center;
            `;
            document.body.appendChild(bannerContainer);
        }
        
        // Показываем нативный баннер (если поддерживается)
        vkBridge.send('VKWebAppShowNativeAds', { ad_format: 'banner' })
            .catch(e => console.log('Баннерная реклама не поддерживается'));
    }
    
    // Сохранить рекорд в VK (опционально)
    async function saveRecord(score) {
        if (!isVKPlatform) return;
        
        try {
            await vkBridge.send('VKWebAppStorageSet', {
                key: 'best_score',
                value: score.toString()
            });
            console.log('🏆 Рекорд сохранён в VK Storage');
        } catch (error) {
            console.error('Ошибка сохранения рекорда:', error);
        }
    }
    
    // Загрузить рекорд из VK
    async function loadRecord() {
        if (!isVKPlatform) return 0;
        
        try {
            const result = await vkBridge.send('VKWebAppStorageGet', {
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
        if (!isVKPlatform) return;
        vkBridge.send('VKWebAppClose');
    }
    
    return {
        init,
        isVKPlatform: checkVKPlatform,
        getUserInfo: () => userInfo,
        shareResult,
        showRewardedAd,
        showBannerAd,
        saveRecord,
        loadRecord,
        closeApp
    };
})();