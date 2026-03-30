/**
 * Effect Configuration
 * Global mapping: Theme -> Event -> Array of Effect Names
 */
const THEME_EFFECTS_CONFIG = {
    "unicorn": {
        "sidebar-click": ["triggerConfetti"],
        "save-success": ["triggerConfetti"],
        "save-click": ["triggerBubbles"],
        "plant-place": ["triggerSprout"],
        "plant-duplicate": ["triggerSeedFly"],
        "plant-drop": ["triggerPlantDrop"]
    },
    "dark": {
        "sidebar-click": ["triggerSubtlePulse"]
    },
    "light": {
        "sidebar-click": []
    }
};
