const BackgroundAndParticles = (function() {
    let stage = null, gradientSprite = null, particlesContainer = null;
    let animId = null, running = false;
    let width = 0, height = 0, lastTime = 0;
    
    function createGradientTexture(w, h) {
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, w * 0.6, h);
        const colors = Theme.background.gradient.colors;
        colors.forEach((c, i) => grad.addColorStop(i / (colors.length - 1), c));
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 8;
            data[i] = Math.min(255, Math.max(0, data[i] + noise));
            data[i+1] = Math.min(255, Math.max(0, data[i+1] + noise));
            data[i+2] = Math.min(255, Math.max(0, data[i+2] + noise));
        }
        ctx.putImageData(imgData, 0, 0);
        return PIXI.Texture.from(canvas);
    }
    
    function updateGradient(w, h) { if (!stage) return; const tex = createGradientTexture(w, h); if (gradientSprite) { const old = gradientSprite.texture; gradientSprite.texture = tex; if (old) old.destroy(true); } else { gradientSprite = new PIXI.Sprite(tex); gradientSprite.position.set(0, 0); stage.addChildAt(gradientSprite, 0); } }
    
    function createParticles(w, h) {
        if (!stage) return;
        if (particlesContainer) { stage.removeChild(particlesContainer); particlesContainer.destroy({ children: true }); }
        if (w === 0 || h === 0) return;
        particlesContainer = new PIXI.Container();
        const count = Math.min(250, Math.max(120, Math.floor(w * h / Theme.particles.density)));
        for (let i = 0; i < count; i++) {
            const p = new PIXI.Graphics();
            const size = Theme.particles.sizeMin + Math.random() * (Theme.particles.sizeMax - Theme.particles.sizeMin);
            const color = Theme.getRandomParticleColor();
            p.beginFill(color, Theme.particles.alphaMin + Math.random() * (Theme.particles.alphaMax - Theme.particles.alphaMin));
            p.drawCircle(0, 0, size);
            p.endFill();
            p.x = Math.random() * w;
            p.y = Math.random() * h;
            p._baseAlpha = Theme.particles.alphaMin + Math.random() * (Theme.particles.alphaMax - Theme.particles.alphaMin);
            p._phase = Math.random() * Math.PI * 2;
            p._originalScale = 0.7 + Math.random() * 0.8;
            p._fallSpeed = Theme.particles.fallSpeed + (Math.random() - 0.5) * Theme.particles.fallSpeedVariation;
            p.scale.set(p._originalScale);
            particlesContainer.addChild(p);
        }
        stage.addChild(particlesContainer);
    }
    
    function updateParticles(delta) { if (!particlesContainer) return; for (let p of particlesContainer.children) { p.y += p._fallSpeed * delta; if (p.y - p.height > height) { p.y = -p.height; p.x = Math.random() * width; } if (p.y + p.height < 0) { p.y = height + p.height; p.x = Math.random() * width; } } }
    
    function animateParticles(delta) { if (!particlesContainer) return; const now = Date.now() / 1000; for (let p of particlesContainer.children) { const af = 0.6 + 0.4 * Math.sin(now * Theme.particles.twinkleSpeed + p._phase); p.alpha = p._baseAlpha * (0.5 + af * 0.5); const sv = p._originalScale * (0.9 + 0.1 * Math.sin(now * Theme.particles.scaleSpeed + p._phase)); p.scale.set(sv); } updateParticles(delta); }
    
    function startAnim() { if (running) return; running = true; lastTime = performance.now() / 1000; function loop() { if (!running) return; const now = performance.now() / 1000; let delta = Math.min(0.033, now - lastTime); if (delta < 0) delta = 0.016; lastTime = now; animateParticles(delta); animId = requestAnimationFrame(loop); } animId = requestAnimationFrame(loop); }
    function stopAnim() { running = false; if (animId) { cancelAnimationFrame(animId); animId = null; } }
    
    function init(s) { stage = s; startAnim(); return true; }
    function resize(w, h) { width = w; height = h; updateGradient(w, h); createParticles(w, h); }
    function destroy() { stopAnim(); if (gradientSprite && stage) stage.removeChild(gradientSprite); if (particlesContainer && stage) stage.removeChild(particlesContainer); gradientSprite = null; particlesContainer = null; }
    
    return { init, resize, destroy };
})();