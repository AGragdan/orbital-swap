const UI = (function() {
    let overlay = null, popup = null, scoreEl = null, recordEl = null, badge = null, restartBtn = null;
    let callback = null;
    const RECORD_KEY = 'orbital_record';
    
    function getRecord() { return parseInt(localStorage.getItem(RECORD_KEY)) || 0; }
    function saveRecord(score) { const cur = getRecord(); if (score > cur) { localStorage.setItem(RECORD_KEY, score); return true; } return false; }
    
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .game-over-overlay { position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); backdrop-filter:blur(5px); z-index:1000; display:flex; align-items:center; justify-content:center; opacity:0; visibility:hidden; transition:opacity 0.3s, visibility 0.3s; }
            .game-over-overlay.active { opacity:1; visibility:visible; }
            .game-over-popup { background:linear-gradient(135deg, #FF6B9D, #FFB347, #FFD700); border-radius:28px; padding:32px 28px; text-align:center; max-width:340px; width:85%; border:1px solid rgba(255,255,255,0.4); box-shadow:0 20px 40px rgba(0,0,0,0.3); transform:scale(0.9); transition:transform 0.3s; animation:popFadeIn 0.3s ease; }
            .game-over-overlay.active .game-over-popup { transform:scale(1); }
            @keyframes popFadeIn { 0% { opacity:0; transform:scale(0.85); } 100% { opacity:1; transform:scale(1); } }
            .game-over-emoji { font-size:56px; margin-bottom:8px; animation:bounce 0.4s ease; }
            @keyframes bounce { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-10px); } }
            .game-over-title { font-size:26px; font-weight:800; color:#FFF; text-shadow:2px 2px 0 #FF6B9D; margin-bottom:20px; }
            .game-over-score-wrapper { background:rgba(0,0,0,0.25); border-radius:20px; padding:14px 20px; margin:16px 0; }
            .game-over-score { font-size:56px; font-weight:800; color:#FFD700; text-shadow:3px 3px 0 #FF6B9D; }
            .game-over-label { font-size:12px; font-weight:600; color:rgba(255,255,255,0.85); text-transform:uppercase; margin-top:6px; }
            .game-over-record-wrapper { background:rgba(0,0,0,0.2); border-radius:16px; padding:10px 16px; margin:12px 0; display:flex; align-items:center; justify-content:center; gap:10px; flex-wrap:wrap; }
            .game-over-record-label { font-size:12px; font-weight:600; color:rgba(255,255,255,0.9); }
            .game-over-record-value { font-size:24px; font-weight:800; color:#FFF; text-shadow:1px 1px 0 #FF6B9D; }
            .new-record-badge { background:linear-gradient(135deg,#00FF00,#009900); border-radius:20px; padding:4px 12px; font-size:11px; font-weight:800; color:white; animation:pulse 0.6s infinite; display:inline-block; }
            @keyframes pulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.05); } }
            .restart-button { background:linear-gradient(135deg,#6C5CE7,#00D2FF); border:none; border-radius:40px; padding:12px 32px; font-size:18px; font-weight:700; color:white; cursor:pointer; margin-top:16px; transition:transform 0.2s; }
            .restart-button:hover { transform:translateY(-2px); }
            @media (max-width:600px) { .game-over-popup { padding:24px 20px; } .game-over-score { font-size:44px; } }
        `;
        document.head.appendChild(style);
    }
    
    function createElements() {
        overlay = document.createElement('div'); overlay.className = 'game-over-overlay';
        popup = document.createElement('div'); popup.className = 'game-over-popup';
        const emoji = document.createElement('div'); emoji.className = 'game-over-emoji'; emoji.textContent = '🎉✨💥';
        const title = document.createElement('div'); title.className = 'game-over-title'; title.textContent = 'GAME OVER';
        const scoreWrap = document.createElement('div'); scoreWrap.className = 'game-over-score-wrapper';
        scoreEl = document.createElement('div'); scoreEl.className = 'game-over-score';
        const label = document.createElement('div'); label.className = 'game-over-label'; label.textContent = 'твой счёт';
        scoreWrap.appendChild(scoreEl); scoreWrap.appendChild(label);
        const recordWrap = document.createElement('div'); recordWrap.className = 'game-over-record-wrapper';
        const recordLabel = document.createElement('span'); recordLabel.className = 'game-over-record-label'; recordLabel.textContent = '🏆 РЕКОРД';
        recordEl = document.createElement('span'); recordEl.className = 'game-over-record-value';
        badge = document.createElement('span'); badge.className = 'new-record-badge'; badge.textContent = 'НОВЫЙ!'; badge.style.display = 'none';
        recordWrap.appendChild(recordLabel); recordWrap.appendChild(recordEl); recordWrap.appendChild(badge);
        restartBtn = document.createElement('button'); restartBtn.className = 'restart-button'; restartBtn.textContent = 'ИГРАТЬ СНОВА ➡';
        popup.appendChild(emoji); popup.appendChild(title); popup.appendChild(scoreWrap); popup.appendChild(recordWrap); popup.appendChild(restartBtn);
        overlay.appendChild(popup); document.body.appendChild(overlay);
        restartBtn.addEventListener('click', () => { hideGameOver(); if (callback) callback(); });
    }
    
    function showGameOver(score) {
        if (!overlay) createElements();
        const isNew = saveRecord(score);
        scoreEl.textContent = score;
        recordEl.textContent = Math.max(getRecord(), score);
        if (isNew && score > 0) { badge.style.display = 'inline-block'; recordEl.style.color = '#00FF00'; recordEl.style.textShadow = '1px 1px 0 #006600'; AudioManager.playNewRecord(); }
        else { badge.style.display = 'none'; recordEl.style.color = '#FFF'; recordEl.style.textShadow = '1px 1px 0 #FF6B9D'; }
        overlay.classList.add('active');
    }
    function hideGameOver() { if (overlay) overlay.classList.remove('active'); }
    function setRestartCallback(cb) { callback = cb; }
    function init() { injectStyles(); createElements(); console.log('🎨 UI init'); }
    
    return { init, showGameOver, hideGameOver, setRestartCallback };
})();
