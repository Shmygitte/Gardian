/**
 * Effect Manager
 * Centralized system to trigger interaction feedback.
 */
const EffectManager = {
    /**
     * Executes the effects for a given event, if enabled
     * @param {string} event - The name of the event (e.g., 'sidebar-click')
     * @param {HTMLElement} [element] - The element that triggered the effect
     */
    trigger: function(event, element) {
        // 1. Check if effects are enabled globally by user preference
        const effectsToggle = document.getElementById('settings-effects-toggle');
        let isEnabled = window.effectsEnabled !== undefined ? window.effectsEnabled : true;
        
        if (effectsToggle) {
            isEnabled = effectsToggle.checked;
        }
        
        if (!isEnabled) return;

        // 2. Identify active theme
        let activeTheme = document.documentElement.getAttribute('data-theme') || 'light';
        activeTheme = activeTheme.toLowerCase();
        
        // 3. Find effects for theme + event
        const effectsForEvent = THEME_EFFECTS_CONFIG[activeTheme] 
            ? THEME_EFFECTS_CONFIG[activeTheme][event] 
            : null;

        if (!effectsForEvent || !Array.isArray(effectsForEvent)) return;

        // 4. Run each registered effect
        effectsForEvent.forEach(effectName => {
            if (typeof EffectLibrary[effectName] === 'function') {
                try {
                    EffectLibrary[effectName](element);
                } catch (e) {
                    console.error(`EffectManager: Error running effect ${effectName}:`, e);
                }
            }
        });
    },

    /**
     * Checks the URL for an 'fx' parameter and triggers the effect if found.
     * Useful for persisting effects across page loads.
     */
    initFromUrl: function() {
        const params = new URLSearchParams(window.location.search);
        const effectTriggerId = params.get('fx');
        if (effectTriggerId) {
            const element = document.getElementById(effectTriggerId);
            // Trigger the effect after a short delay to ensure the page is visually ready
            setTimeout(() => {
                this.trigger('sidebar-click', element);
            }, 50);
            
            // Clean up the URL without reloading the page
            const newUrl = window.location.pathname + window.location.hash;
            window.history.replaceState({}, document.title, newUrl);
        }
    }
};
