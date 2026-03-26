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
