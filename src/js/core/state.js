/**
 * Gardian - Zentraler State Store
 * Alle geteilten Zustandsobjekte an einem Ort.
 */

export const state = {
    zoom: 1,
    panX: 0,
    panY: 0,
    isPanning: false,
    panStartPos: { x: 0, y: 0 },
    pins: [],
    // Drag
    isDragging: false,
    draggingPinId: null,
    hasMoved: false,
    dragStartPos: { x: 0, y: 0 },
    // Click-to-place
    pendingCoords: null,
    // Duplicate-Tracking
    _duplicateOriginId: null,
    // View-Save (beim Verlassen des Dashboards)
    _savedPanX: undefined,
    _savedPanY: undefined,
    _savedZoom: undefined,
};

export const bloomState = {
    enabled: false,
    year: 'std',
    month: 0,
};

export const bloomLayerFilter = { blooming: true, evergreen: true, resting: true };

export let bloomObservations = [];
export function setBloomObservations(obs) { bloomObservations = obs; }

export const filterState = {
    types: [],
    groups: null,
    careFilter: false,
    careMonths: new Set(),
};

export const DEFAULT_MARKER = {
    tree:      { size: 44, fontSize: '1.5rem' },
    shrub:     { size: 34, fontSize: '1.2rem' },
    flower:    { size: 20, fontSize: '0.8rem' },
    climber:   { size: 20, fontSize: '0.8rem' },
    s_flower:  { size: 10, fontSize: '0.45rem' },
    _fallback: { size: 30, fontSize: '1rem' }
};

export const hoverSettings = {
    galleryEnabled: true,
    locked: false,
    size: 'M'
};

export const HOVER_SIZE_MAP = {
    S: { w: 64,  h: 48, maxW: 168 },
    M: { w: 96,  h: 72, maxW: 220 },
    L: { w: 128, h: 96, maxW: 300 }
};

export const MONTH_NAMES = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];

// Plant-Types Cache (dynamisch aus DB geladen)
export let plantTypesCache = [];
export function setPlantTypesCache(types) {
    plantTypesCache = types;
    filterState.types = types.map(t => t.key);
    // DEFAULT_MARKER dynamisch aus Plant-Types befüllen
    Object.keys(DEFAULT_MARKER).forEach(k => { if (k !== '_fallback') delete DEFAULT_MARKER[k]; });
    types.forEach(t => {
        if (t.marker_size) {
            const size = parseInt(t.marker_size);
            DEFAULT_MARKER[t.key] = { size, fontSize: Math.max(0.4, size / 28).toFixed(1) + 'rem' };
        }
    });
}
export function getTypeLabel(key) { return plantTypesCache.find(t => t.key === key)?.label || key; }
export function getTypeIcon(key) { return plantTypesCache.find(t => t.key === key)?.icon || '🌸'; }
export function getTypeLabelMap() { return Object.fromEntries(plantTypesCache.map(t => [t.key, t.label])); }
export function getTypeIconMap() { return Object.fromEntries(plantTypesCache.map(t => [t.key, t.icon || '🌸'])); }

// Icon-Caches (geteilt zwischen app.js und group-form.js)
export let iconLibraryCache = null;
export let userIconsCache = null;
export function setIconLibraryCache(val) { iconLibraryCache = val; }
export function setUserIconsCache(val) { userIconsCache = val; }

// DOM-Element-Cache
export const elements = {};

// Bridge: state + filterState für Nicht-Module
window.state = state;
window.filterState = filterState;
window.bloomState = bloomState;
