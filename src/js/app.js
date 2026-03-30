/**
 * Gardian - App Entry Point (Bootstrapper)
 * Importiert alle Module und initialisiert die Anwendung.
 */

// Core
import { api } from './core/api.js';
import { state, elements } from './core/state.js';
import { setupMapStructure, setupEventListeners, loadGardenConfig, getOverlayCoords } from './core/map-engine.js';

// Modules
import { loadBloomObservationsAll, initBloomSlider } from './modules/bloom.js';
import { renderMarkers, handleMarkerMouseDown } from './modules/markers.js';
import { loadIconCaches } from './modules/icons.js';
import { openPlantModal } from './modules/plant-modal.js';
import './modules/hover-gallery.js';

// Init
async function init() {
    console.log("Gardian init...");

    elements.app = document.querySelector('.app');
    elements.map = document.querySelector('.map');
    elements.mapCanvas = document.querySelector('.map__canvas');
    elements.mapUploadInput = document.getElementById('map-upload-input');
    elements.mapWrapper = null;

    // 1. Structure
    setupMapStructure();
    initBloomSlider();

    // 2. Data
    await loadGardenConfig();
    await loadBloomObservationsAll();
    await loadIconCaches();
    await loadPins();
    window.loadFilterGroups?.();

    // 3. Events
    setupEventListeners(handleMapClick, handleMarkerMouseDown);
}

async function loadPins() {
    try {
        const data = await api('getPins');
        if (data.success) {
            state.pins = data.pins;
            renderMarkers();
        }
    } catch (err) {
        console.error("Failed to load pins", err);
    }
}

function handleMapClick(e) {
    if (state.hasMoved) return;
    if (e.target.closest('.marker')) return;
    if (e.target.closest('.map__controls')) return;

    const img = elements.mapWrapper.querySelector('.map__img');
    if (!img || img.style.display === 'none') return;

    const rect = img.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;

    const { x, y } = getOverlayCoords(e.clientX, e.clientY);
    state.pendingCoords = { x, y };
    openPlantModal();
}

// Bridge: Funktionen die andere Module brauchen
window.loadPins = loadPins;
window.openPlantModal = openPlantModal;

document.addEventListener('DOMContentLoaded', init);
