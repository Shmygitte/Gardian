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
                animation: `effectBubbleFly ${duration}s linear ${delay}s both`,
                '--bubble-drift': drift + 'px'
            });

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

        // Inject/update keyframes
        let styleEl = document.getElementById('effect-bubble-keyframes');
        if (styleEl) styleEl.remove();
        {
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
