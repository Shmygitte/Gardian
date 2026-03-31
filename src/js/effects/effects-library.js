/**
 * Effect Library
 * Independent, reusable effect functions.
 */
const EffectLibrary = {
    /**
     * Triggers a colorful confetti burst.
     * If an element is provided, the confetti originates from its center.
     */
    triggerConfetti: function(element) {
        if (typeof confetti !== 'function') return;

        let origin = { y: 0.7 }; // Fallback
        if (element && typeof element.getBoundingClientRect === 'function') {
            const rect = element.getBoundingClientRect();
            origin = {
                x: (rect.left + rect.width / 2) / window.innerWidth,
                y: (rect.top + rect.height / 2) / window.innerHeight
            };
        }

        const count = 150;
        const defaults = {
            origin: origin,
            colors: ['#d946ef', '#7c3aed', '#fce7f3', '#ec4899', '#fef9c3'],
            ticks: 200,
            gravity: 1.2,
            decay: 0.94,
            startVelocity: 30,
            shapes: ['circle', 'square'],
            scalar: 0.75
        };

        function fire(particleRatio, opts) {
            confetti({
                ...defaults,
                ...opts,
                particleCount: Math.floor(count * particleRatio)
            });
        }

        fire(0.25, { spread: 26, startVelocity: 55 });
        fire(0.2, { spread: 60 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
        fire(0.1, { spread: 120, startVelocity: 45 });
    },

    /**
     * Placeholder for future haptic/pulse effect
     */
    /**
     * Triggers soap bubbles rising from an element.
     */
    triggerBubbles: function(element) {
        // Keyframes sicherstellen bevor Bubbles erzeugt werden
        if (!document.getElementById('effect-bubble-keyframes')) {
            const style = document.createElement('style');
            style.id = 'effect-bubble-keyframes';
            style.textContent = `
                @keyframes effectBubbleFly {
                    from { transform: translateY(0) translateX(0) scale(0.6); }
                    to   { transform: translateY(-280px) translateX(var(--bubble-drift, 0px)) scale(1.05); }
                }
            `;
            document.head.appendChild(style);
        }

        const count = 6 + Math.floor(Math.random() * 3); // 6-8 bubbles
        let originX = window.innerWidth / 2;
        let originY = window.innerHeight / 2;

        if (element && typeof element.getBoundingClientRect === 'function') {
            const rect = element.getBoundingClientRect();
            originX = rect.left + rect.width / 2;
            originY = rect.top;
        }

        for (let i = 0; i < count; i++) {
            const bubble = document.createElement('div');
            const size = 10 + Math.random() * 20; // 10-30px
            const drift = (Math.random() - 0.5) * 260; // horizontal drift
            const duration = 2 + Math.random() * 1.2; // 2-3.2s
            const delay = Math.random() * 0.1; // fast start

            const popAfter = 1 + Math.random() * 1.5; // platzt nach 1-2.5s

            Object.assign(bubble.style, {
                position: 'fixed',
                left: (originX - size / 2 + (Math.random() - 0.5) * 30) + 'px',
                top: originY + 'px',
                width: size + 'px',
                height: size + 'px',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8), rgba(217,70,239,0.15) 40%, rgba(124,58,237,0.1) 70%, transparent)',
                border: '1px solid rgba(255,255,255,0.4)',
                boxShadow: 'inset 0 -2px 4px rgba(217,70,239,0.15), 0 0 6px rgba(217,70,239,0.1)',
                pointerEvents: 'none',
                zIndex: '99999',
                opacity: '0.9',
                animation: `effectBubbleFly ${duration}s linear ${delay}s both`
            });
            bubble.style.setProperty('--bubble-drift', drift + 'px');

            document.body.appendChild(bubble);

            // Platzen nach Zeit
            setTimeout(() => {
                bubble.style.transition = 'transform 0.08s ease-out, opacity 0.08s';
                bubble.style.transform = bubble.style.transform || '';
                bubble.style.opacity = '0';
                bubble.style.scale = '0';
                setTimeout(() => bubble.remove(), 100);
            }, (delay + popAfter) * 1000);
        }

    },

    /**
     * Sprout-Puls: mehrere grüne Ringe + schwebendes Emoji
     */
    triggerSprout: function(element) {
        if (!element) return;
        const rect = element.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        // 3 Ringe mit Staffelung
        for (let i = 0; i < 3; i++) {
            const ring = document.createElement('div');
            const delay = i * 250;
            const maxSize = 100 + i * 30;
            Object.assign(ring.style, {
                position: 'fixed',
                left: (cx - 6) + 'px',
                top: (cy - 6) + 'px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                border: '3px solid rgba(76, 175, 80, 0.9)',
                boxShadow: '0 0 12px rgba(76, 175, 80, 0.6), inset 0 0 8px rgba(76, 175, 80, 0.2)',
                pointerEvents: 'none',
                zIndex: '99999',
                opacity: '1'
            });
            document.body.appendChild(ring);
            setTimeout(() => {
                ring.style.transition = `all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
                ring.style.width = maxSize + 'px';
                ring.style.height = maxSize + 'px';
                ring.style.left = (cx - maxSize / 2) + 'px';
                ring.style.top = (cy - maxSize / 2) + 'px';
                ring.style.opacity = '0';
                ring.style.borderColor = 'rgba(76, 175, 80, 0)';
                ring.style.boxShadow = '0 0 30px rgba(76, 175, 80, 0)';
            }, delay);
            setTimeout(() => ring.remove(), delay + 1200);
        }

        // Grüner Glow hinter dem Marker
        const glow = document.createElement('div');
        Object.assign(glow.style, {
            position: 'fixed',
            left: (cx - 25) + 'px',
            top: (cy - 25) + 'px',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(76,175,80,0.5) 0%, rgba(76,175,80,0) 70%)',
            pointerEvents: 'none',
            zIndex: '99998',
            opacity: '1',
            transition: 'all 1.5s ease-out'
        });
        document.body.appendChild(glow);
        requestAnimationFrame(() => requestAnimationFrame(() => {
            glow.style.width = '120px';
            glow.style.height = '120px';
            glow.style.left = (cx - 60) + 'px';
            glow.style.top = (cy - 60) + 'px';
            glow.style.opacity = '0';
        }));
        setTimeout(() => glow.remove(), 1600);

        // Emoji schwebt hoch
        const leaf = document.createElement('div');
        Object.assign(leaf.style, {
            position: 'fixed',
            left: (cx - 10) + 'px',
            top: (cy - 10) + 'px',
            fontSize: '22px',
            pointerEvents: 'none',
            zIndex: '99999',
            opacity: '0',
            transform: 'translateY(0) scale(0.3)',
            transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
        });
        leaf.textContent = '🌱';
        document.body.appendChild(leaf);
        requestAnimationFrame(() => requestAnimationFrame(() => {
            leaf.style.opacity = '1';
            leaf.style.transform = 'translateY(-35px) scale(1.2)';
        }));
        setTimeout(() => {
            leaf.style.transition = 'all 0.6s ease-in';
            leaf.style.opacity = '0';
            leaf.style.transform = 'translateY(-60px) scale(0.6)';
            setTimeout(() => leaf.remove(), 700);
        }, 1000);

        // Kleine grüne Partikel die nach oben steigen
        for (let i = 0; i < 8; i++) {
            const p = document.createElement('div');
            const size = 4 + Math.random() * 6;
            const xOff = (Math.random() - 0.5) * 60;
            const delay = Math.random() * 400;
            Object.assign(p.style, {
                position: 'fixed',
                left: (cx + xOff) + 'px',
                top: cy + 'px',
                width: size + 'px',
                height: size + 'px',
                borderRadius: '50%',
                background: Math.random() > 0.5 ? '#4ade80' : '#a3e635',
                boxShadow: `0 0 6px ${Math.random() > 0.5 ? '#4ade80' : '#a3e635'}`,
                pointerEvents: 'none',
                zIndex: '99999',
                opacity: '0.9'
            });
            document.body.appendChild(p);
            setTimeout(() => {
                p.style.transition = `all ${0.8 + Math.random() * 0.6}s ease-out`;
                p.style.top = (cy - 40 - Math.random() * 50) + 'px';
                p.style.left = (cx + xOff + (Math.random() - 0.5) * 40) + 'px';
                p.style.opacity = '0';
                p.style.transform = 'scale(0)';
            }, delay);
            setTimeout(() => p.remove(), delay + 1500);
        }
    },

    /**
     * Samen-Partikel die vom Original zum Klon fliegen
     */
    triggerSeedFly: function(fromElement, toElement) {
        if (!fromElement) return;
        const fromRect = fromElement.getBoundingClientRect();
        const fx = fromRect.left + fromRect.width / 2;
        const fy = fromRect.top + fromRect.height / 2;

        let tx = fx + 50, ty = fy + 50;
        if (toElement) {
            const toRect = toElement.getBoundingClientRect();
            tx = toRect.left + toRect.width / 2;
            ty = toRect.top + toRect.height / 2;
        }

        // Leuchtender Burst am Ursprung
        const burst = document.createElement('div');
        Object.assign(burst.style, {
            position: 'fixed',
            left: (fx - 20) + 'px',
            top: (fy - 20) + 'px',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(217,70,239,0.6) 0%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: '99999',
            opacity: '1',
            transition: 'all 0.6s ease-out'
        });
        document.body.appendChild(burst);
        requestAnimationFrame(() => requestAnimationFrame(() => {
            burst.style.width = '80px';
            burst.style.height = '80px';
            burst.style.left = (fx - 40) + 'px';
            burst.style.top = (fy - 40) + 'px';
            burst.style.opacity = '0';
        }));
        setTimeout(() => burst.remove(), 700);

        // Größere, leuchtende Samen
        const seeds = 8 + Math.floor(Math.random() * 4);
        for (let i = 0; i < seeds; i++) {
            const seed = document.createElement('div');
            const size = 5 + Math.random() * 7;
            const delay = i * 80;
            const colors = ['#a3e635', '#4ade80', '#fbbf24', '#d946ef', '#7c3aed', '#f472b6'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            Object.assign(seed.style, {
                position: 'fixed',
                left: fx + 'px',
                top: fy + 'px',
                width: size + 'px',
                height: size + 'px',
                borderRadius: '50%',
                background: color,
                boxShadow: `0 0 8px ${color}, 0 0 16px ${color}40`,
                pointerEvents: 'none',
                zIndex: '99999',
                opacity: '1'
            });
            document.body.appendChild(seed);

            // Phase 1: Bogen nach oben
            const midX = (fx + tx) / 2 + (Math.random() - 0.5) * 120;
            const midY = Math.min(fy, ty) - 40 - Math.random() * 60;
            setTimeout(() => {
                seed.style.transition = `all ${0.5 + Math.random() * 0.3}s cubic-bezier(0.25, 0.1, 0.25, 1)`;
                seed.style.left = midX + 'px';
                seed.style.top = midY + 'px';
                seed.style.opacity = '0.9';
            }, delay);

            // Phase 2: Zum Ziel fallen
            setTimeout(() => {
                seed.style.transition = `all ${0.4 + Math.random() * 0.3}s cubic-bezier(0.55, 0.085, 0.68, 0.53)`;
                seed.style.left = (tx + (Math.random() - 0.5) * 20) + 'px';
                seed.style.top = (ty + (Math.random() - 0.5) * 20) + 'px';
                seed.style.opacity = '0';
                seed.style.transform = 'scale(0.3)';
                setTimeout(() => seed.remove(), 600);
            }, delay + 550);
        }

        // Sprout am Ziel nach Ankunft
        setTimeout(() => {
            if (toElement) this.triggerSprout(toElement);
        }, seeds * 80 + 500);
    },

    /**
     * Einpflanz-Effekt: deutlicher Bounce + Erdstaub-Wolke
     */
    triggerPlantDrop: function(element) {
        if (!element) return;
        const rect = element.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        // Kräftiger Bounce
        element.style.transition = 'transform 0.15s ease-in';
        element.style.transform = 'translate(-50%, -50%) scale(0.5) translateY(-15px)';
        setTimeout(() => {
            element.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
            element.style.transform = 'translate(-50%, -50%) scale(1.25)';
            setTimeout(() => {
                element.style.transition = 'transform 0.2s ease-out';
                element.style.transform = 'translate(-50%, -50%) scale(0.95)';
                setTimeout(() => {
                    element.style.transition = 'transform 0.15s ease-out';
                    element.style.transform = 'translate(-50%, -50%) scale(1)';
                    setTimeout(() => { element.style.transition = ''; }, 200);
                }, 200);
            }, 300);
        }, 150);

        // Erdstaub-Partikel – mehr und größer
        const dustCount = 10 + Math.floor(Math.random() * 5);
        for (let i = 0; i < dustCount; i++) {
            const dust = document.createElement('div');
            const size = 4 + Math.random() * 8;
            const angle = (Math.PI * 2 / dustCount) * i + (Math.random() - 0.5) * 0.5;
            const distance = 25 + Math.random() * 35;
            const colors = ['#92400e', '#a16207', '#78716c', '#4ade80', '#a3e635', '#d4a574'];
            Object.assign(dust.style, {
                position: 'fixed',
                left: cx + 'px',
                top: (cy + rect.height * 0.3) + 'px',
                width: size + 'px',
                height: size + 'px',
                borderRadius: '50%',
                background: colors[Math.floor(Math.random() * colors.length)],
                boxShadow: '0 0 3px rgba(0,0,0,0.2)',
                pointerEvents: 'none',
                zIndex: '99998',
                opacity: '0.9'
            });
            document.body.appendChild(dust);
            // Verzögert starten (synchron mit Bounce-Aufprall)
            setTimeout(() => {
                dust.style.transition = `all ${0.5 + Math.random() * 0.4}s cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
                dust.style.left = (cx + Math.cos(angle) * distance) + 'px';
                dust.style.top = (cy + rect.height * 0.3 + Math.sin(angle) * distance * 0.6 - Math.random() * 10) + 'px';
                dust.style.opacity = '0';
                dust.style.transform = `scale(0.2)`;
            }, 300); // startet wenn Marker aufprallt
            setTimeout(() => dust.remove(), 1200);
        }

        // Kurzer Schatten-Ring am Boden
        const shadow = document.createElement('div');
        Object.assign(shadow.style, {
            position: 'fixed',
            left: (cx - 5) + 'px',
            top: (cy + rect.height * 0.3) + 'px',
            width: '10px',
            height: '5px',
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.2)',
            pointerEvents: 'none',
            zIndex: '99997',
            opacity: '1',
            transition: 'all 0.5s ease-out'
        });
        document.body.appendChild(shadow);
        setTimeout(() => {
            shadow.style.width = '50px';
            shadow.style.height = '15px';
            shadow.style.left = (cx - 25) + 'px';
            shadow.style.opacity = '0';
        }, 300);
        setTimeout(() => shadow.remove(), 900);
    },

    /**
     * Glitzer-Partikel beim Zoomen – steigen auf (rein) oder schweben weg (raus)
     */
    triggerZoomSparkle: function(element, _el2, direction) {
        // Mausposition nutzen
        const cx = EffectManager._mouseX ?? window.innerWidth / 2;
        const cy = EffectManager._mouseY ?? window.innerHeight / 2;
        const count = 8 + Math.floor(Math.random() * 5);
        const colors = ['#d946ef', '#a78bfa', '#f9a8d4', '#fbbf24', '#7dd3fc', '#ffffff'];

        for (let i = 0; i < count; i++) {
            const spark = document.createElement('div');
            const size = 3 + Math.random() * 5;
            const angle = Math.random() * Math.PI * 2;
            const dist = 40 + Math.random() * 100;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const startDist = direction === 'in' ? (80 + Math.random() * 120) : (Math.random() * 40);
            const startX = cx + Math.cos(angle) * startDist + (Math.random() - 0.5) * 20;
            const startY = cy + Math.sin(angle) * startDist + (Math.random() - 0.5) * 20;

            Object.assign(spark.style, {
                position: 'fixed',
                left: startX + 'px',
                top: startY + 'px',
                width: size + 'px',
                height: size + 'px',
                borderRadius: '50%',
                background: color,
                boxShadow: `0 0 ${size + 2}px ${color}`,
                pointerEvents: 'none',
                zIndex: '99999',
                opacity: '0.9'
            });
            document.body.appendChild(spark);

            const delay = Math.random() * 80;
            setTimeout(() => {
                if (direction === 'in') {
                    // Reinzoomen: von außen zum Cursor – erst sichtbar fliegen, dann verblassen
                    spark.style.transition = `left 0.5s ease-in, top 0.5s ease-in, opacity 0.3s ease-in 0.35s, transform 0.3s ease-in 0.35s`;
                    spark.style.left = (cx + (Math.random() - 0.5) * 6) + 'px';
                    spark.style.top = (cy + (Math.random() - 0.5) * 6) + 'px';
                    spark.style.opacity = '0';
                    spark.style.transform = 'scale(0.3)';
                } else {
                    // Rauszoomen: vom Cursor nach außen
                    const dur = 0.5 + Math.random() * 0.4;
                    spark.style.transition = `all ${dur}s ease-out`;
                    spark.style.left = (startX + Math.cos(angle) * dist) + 'px';
                    spark.style.top = (startY + Math.sin(angle) * dist) + 'px';
                    spark.style.opacity = '0';
                    spark.style.transform = 'scale(0)';
                }
            }, delay);
            setTimeout(() => spark.remove(), 800);
        }
    },

    /**
     * Leuchtende Spur beim Pannen der Karte
     */
    triggerPanTrail: function(x, y) {
        const count = 3 + Math.floor(Math.random() * 2);
        const colors = ['#d946ef', '#a78bfa', '#f9a8d4', '#7dd3fc', '#fbbf24'];

        for (let i = 0; i < count; i++) {
            const dot = document.createElement('div');
            const size = 3 + Math.random() * 5;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const offsetX = (Math.random() - 0.5) * 50;
            const offsetY = (Math.random() - 0.5) * 50;

            Object.assign(dot.style, {
                position: 'fixed',
                left: (x + offsetX - size / 2) + 'px',
                top: (y + offsetY - size / 2) + 'px',
                width: size + 'px',
                height: size + 'px',
                borderRadius: '50%',
                background: color,
                boxShadow: `0 0 ${size + 4}px ${color}80`,
                pointerEvents: 'none',
                zIndex: '99999',
                opacity: String(0.5 + Math.random() * 0.4),
                transition: `all ${0.4 + Math.random() * 0.4}s ease-out`
            });
            document.body.appendChild(dot);

            requestAnimationFrame(() => requestAnimationFrame(() => {
                dot.style.opacity = '0';
                dot.style.transform = 'scale(0.2)';
            }));
            setTimeout(() => dot.remove(), 800);
        }
    },

    triggerSubtlePulse: function() {
        const main = document.querySelector('.l-main-content');
        if (main) {
            main.style.transition = 'transform 0.1s ease-out';
            main.style.transform = 'scale(0.998)';
            setTimeout(() => {
                main.style.transform = 'scale(1)';
            }, 100);
        }
    }
};
