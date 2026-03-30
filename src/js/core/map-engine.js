/**
 * Gardian - Map Engine
 * Zoom, Pan, Transform, Karten-Upload
 */
import { api, apiUpload } from './api.js';
import { state, elements } from './state.js';

let _saveConfigTimer = null;

function scheduleSaveConfig() {
    clearTimeout(_saveConfigTimer);
    _saveConfigTimer = setTimeout(() => {
        api('saveGardenConfig', { zoom: state.zoom, pan_x: state.panX, pan_y: state.panY });
    }, 800);
}

export function setupMapStructure() {
    elements.mapCanvas.innerHTML = `
        <div class="map__wrapper" style="position: relative; transform-origin: 0 0; width: 100%; height: 100%;">
            <img class="map__img" src="" style="display: none; pointer-events: none; -webkit-user-drag: none;">
            <div class="map__placeholder-bg" style="width: 2000px; height: 1500px; background: #eee; display: flex; align-items: center; justify-content: center; font-size: 2rem; color: #ccc; border: 4px dashed #ddd;">
                Gartenplan (Platzhalter)
            </div>
            <div class="map__markers-overlay" style="position: absolute; top:0; left:0; width:100%; height:100%; pointer-events: none;"></div>
        </div>
    `;
    elements.mapWrapper = elements.mapCanvas.querySelector('.map__wrapper');
}

export function setupEventListeners(handleMapClick, handleMarkerMouseDown) {
    elements.mapCanvas.addEventListener('wheel', handleWheel, { passive: false });
    elements.mapCanvas.addEventListener('mousedown', handleMouseDown);
    elements.mapCanvas.addEventListener('click', handleMapClick);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', (e) => handleMouseUp(e));

    if (elements.mapUploadInput) {
        elements.mapUploadInput.addEventListener('change', handleMapUpload);
    }

    // Store handleMarkerMouseDown for use in markers
    window._handleMarkerMouseDown = handleMarkerMouseDown;
}

export function updateMapBackground(url) {
    const img = elements.mapWrapper.querySelector('.map__img');
    const placeholder = elements.mapWrapper.querySelector('.map__placeholder-bg');
    const uploadLabel = document.getElementById('map-upload-label');
    const btnZoomWidth = document.getElementById('btn-zoom-width');
    const btnZoomHeight = document.getElementById('btn-zoom-height');
    if (img && placeholder) {
        img.src = url;
        img.style.display = 'block';
        placeholder.style.display = 'none';
        img.onload = () => {
            elements.mapWrapper.style.width = img.naturalWidth + 'px';
            elements.mapWrapper.style.height = img.naturalHeight + 'px';
        };
    }
    if (uploadLabel) uploadLabel.style.display = 'none';
    if (btnZoomWidth) btnZoomWidth.style.display = '';
    if (btnZoomHeight) btnZoomHeight.style.display = '';
    const sep = document.getElementById('zoom-btn-separator');
    if (sep) sep.style.display = '';
}

export async function loadGardenConfig() {
    try {
        const data = await api('getGardenConfig');
        if (data.success && data.config) {
            const config = data.config;
            if (config.map_image_path) updateMapBackground(config.map_image_path);
            if (config.zoom) state.zoom = parseFloat(config.zoom);
            if (config.pan_x) state.panX = parseFloat(config.pan_x);
            if (config.pan_y) state.panY = parseFloat(config.pan_y);
            if (config.theme) document.documentElement.setAttribute('data-theme', config.theme);
            updateTransform();
        }
    } catch (err) {
        console.error("Failed to load map config", err);
    }
}

async function handleMapUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('action', 'uploadGardenPlan');
    formData.append('map', file);
    try {
        const data = await apiUpload(formData);
        if (data.success) {
            updateMapBackground(data.url);
        } else {
            window.customAlert("Upload fehlgeschlagen: " + data.message);
        }
    } catch (err) {
        console.error("Upload error", err);
    }
}

function handleWheel(e) {
    e.preventDefault();
    const zoomSpeed = 0.1;
    const direction = e.deltaY > 0 ? -1 : 1;
    let newZoom = state.zoom + direction * zoomSpeed;
    newZoom = Math.max(0.2, Math.min(newZoom, 5));

    const rect = elements.mapCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomRatio = newZoom / state.zoom;
    state.panX = mouseX - (mouseX - state.panX) * zoomRatio;
    state.panY = mouseY - (mouseY - state.panY) * zoomRatio;
    state.zoom = newZoom;
    updateTransform();
    scheduleSaveConfig();
}

function handleMouseDown(e) {
    if (e.target.closest('.marker')) return;
    state.isPanning = true;
    state.hasMoved = false;
    state.dragStartPos = { x: e.clientX, y: e.clientY };
    state.panStartPos = { x: e.clientX - state.panX, y: e.clientY - state.panY };
    elements.mapCanvas.style.cursor = 'grabbing';
}

export function getOverlayCoords(clientX, clientY) {
    const overlay = elements.mapWrapper.querySelector('.map__markers-overlay');
    const rect = overlay.getBoundingClientRect();
    return {
        x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
        y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100))
    };
}

function handleMouseMove(e) {
    if (!(e.buttons & 1)) {
        if (state.isPanning || state.isDragging) {
            state.isPanning = false;
            state.isDragging = false;
            elements.mapCanvas.style.cursor = 'default';
        }
        return;
    }
    const dashboard = document.getElementById('view-dashboard');
    if (dashboard && dashboard.style.display === 'none') {
        state.isPanning = false;
        state.isDragging = false;
        return;
    }
    if (state.isDragging) {
        const dist = Math.sqrt(Math.pow(e.clientX - state.dragStartPos.x, 2) + Math.pow(e.clientY - state.dragStartPos.y, 2));
        if (dist > 5) { state.hasMoved = true; window.hideHoverGallery?.(); }

        if (state.hasMoved) {
            const { x, y } = getOverlayCoords(e.clientX, e.clientY);
            const el = document.querySelector(`.marker[data-id="${state.draggingPinId}"]`);
            if (el) { el.style.left = `${x}%`; el.style.top = `${y}%`; }
        }
        return;
    }

    if (state.isPanning) {
        if (!state.hasMoved && state.dragStartPos) {
            const dist = Math.sqrt(Math.pow(e.clientX - state.dragStartPos.x, 2) + Math.pow(e.clientY - state.dragStartPos.y, 2));
            if (dist > 5) state.hasMoved = true;
        }
        state.panX = e.clientX - state.panStartPos.x;
        state.panY = e.clientY - state.panStartPos.y;
        updateTransform();
    }
}

async function handleMouseUp(e) {
    if (state.isDragging) {
        const id = state.draggingPinId;
        const el = document.querySelector(`.marker[data-id="${id}"]`);
        if (el) el.classList.remove('dragging');

        const { x, y } = getOverlayCoords(e.clientX, e.clientY);
        const isPending = id.startsWith('pending_');

        if (isPending) {
            const clone = state.pins.find(p => p.id === id);
            if (clone) {
                const finalX = state.hasMoved ? x : clone.pos_x;
                const finalY = state.hasMoved ? y : clone.pos_y;
                const addPayload = { pos_x: finalX, pos_y: finalY };
                if (clone.user_group_id) addPayload.user_group_id = clone.user_group_id;
                else addPayload.group_id = clone.group_id;
                if (clone.marker_icon) addPayload.marker_icon = clone.marker_icon;
                if (clone.marker_color) addPayload.marker_color = clone.marker_color;
                if (clone.marker_size) addPayload.marker_size = clone.marker_size;
                if (clone.marker_icon_color) addPayload.marker_icon_color = clone.marker_icon_color;
                if (clone.plant_name) addPayload.name = clone.plant_name;
                const data = await api('addPlant', addPayload);
                if (data.success) {
                    state.pins = state.pins.map(p => p.id === id ? { ...p, id: String(data.id), pos_x: finalX, pos_y: finalY } : p);
                    window.renderMarkers();
                    if (state._duplicateOriginId && typeof EffectManager !== 'undefined') {
                        const origMarker = document.querySelector(`.marker[data-id="${state._duplicateOriginId}"]`);
                        const cloneMarker = document.querySelector(`.marker[data-id="${data.id}"]`);
                        if (origMarker && cloneMarker) EffectManager.trigger('plant-duplicate', origMarker, cloneMarker);
                    }
                    state._duplicateOriginId = null;
                }
            }
        } else if (state.hasMoved) {
            await api('movePlant', { id, pos_x: x, pos_y: y });
            state.pins = state.pins.map(p => String(p.id) === id ? { ...p, pos_x: x, pos_y: y } : p);
            const movedMarker = document.querySelector(`.marker[data-id="${id}"]`);
            if (movedMarker && typeof EffectManager !== 'undefined') EffectManager.trigger('plant-drop', movedMarker);
        }

        state.isDragging = false;
        state.draggingPinId = null;
        setTimeout(() => {
            state.hasMoved = false;
            const { galleryEnabled, locked } = window._hoverSettings || {};
            if (galleryEnabled && !locked) {
                const markerUnder = document.elementFromPoint(window._mousePos?.x || 0, window._mousePos?.y || 0)?.closest('.marker');
                if (markerUnder) {
                    const pinId = markerUnder.dataset.id;
                    const pin = state.pins.find(p => String(p.id) === pinId);
                    if (pin) window.showHoverGallery?.({ currentTarget: markerUnder }, pin);
                }
            }
        }, 50);
        return;
    }

    if (state.isPanning && state.hasMoved) scheduleSaveConfig();
    state.isPanning = false;
    elements.mapCanvas.style.cursor = 'default';
    setTimeout(() => { state.hasMoved = false; }, 50);
}

export function updateTransform() {
    if (elements.mapWrapper) {
        elements.mapWrapper.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
    }
}

export function zoomFitWidth() {
    const img = elements.mapWrapper?.querySelector('.map__img');
    if (!img || img.style.display === 'none') return;
    const canvasRect = elements.mapCanvas.getBoundingClientRect();
    state.zoom = canvasRect.width / img.naturalWidth;
    state.panX = 0;
    state.panY = 0;
    updateTransform();
    scheduleSaveConfig();
}

export function zoomFitHeight() {
    const img = elements.mapWrapper?.querySelector('.map__img');
    if (!img || img.style.display === 'none') return;
    const canvasRect = elements.mapCanvas.getBoundingClientRect();
    state.zoom = canvasRect.height / img.naturalHeight;
    state.panX = 0;
    state.panY = 0;
    updateTransform();
    scheduleSaveConfig();
}

// Bridge
window.updateTransform = updateTransform;
window.zoomFitWidth = zoomFitWidth;
window.zoomFitHeight = zoomFitHeight;
