/**
 * Gardian - Core Application Logic (Refactored)
 */

const state = {
    zoom: 1,
    panX: 0,
    panY: 0,
    isPanning: false,
    panStartPos: { x: 0, y: 0 },
    pins: []
};

let elements = {};

async function init() {
    console.log("Gardian init...");

    elements = {
        app: document.querySelector('.app'),
        map: document.querySelector('.map'),
        mapCanvas: document.querySelector('.map__canvas'),
        mapUploadInput: document.getElementById('map-upload-input'),
        mapWrapper: null 
    };
    
    // 1. Structure
    setupMapStructure();
    
    // 2. Data
    await loadGardenConfig();
    await loadPins();

    // 3. Events
    setupEventListeners();
}

function setupMapStructure() {
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

function setupEventListeners() {
    elements.mapCanvas.addEventListener('wheel', handleWheel, { passive: false });
    elements.mapCanvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    if (elements.mapUploadInput) {
        elements.mapUploadInput.addEventListener('change', handleMapUpload);
    }
}

async function loadGardenConfig() {
    try {
        const res = await fetch('backend/api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getGardenConfig' })
        });
        const data = await res.json();
        if (data.success && data.config) {
            const config = data.config;
            if (config.map_image_path) {
                updateMapBackground(config.map_image_path);
            }
            if (config.zoom_level) state.zoom = parseFloat(config.zoom_level);
            if (config.pan_x) state.panX = parseInt(config.pan_x);
            if (config.pan_y) state.panY = parseInt(config.pan_y);
            updateTransform();
        }
    } catch (err) {
        console.error("Failed to load map config", err);
    }
}

function updateMapBackground(url) {
    const img = elements.mapWrapper.querySelector('.map__img');
    const placeholder = elements.mapWrapper.querySelector('.map__placeholder-bg');
    const controls = document.getElementById('map-controls');
    if (img && placeholder) {
        img.src = url;
        img.style.display = 'block';
        placeholder.style.display = 'none';
    }
    if (controls) controls.style.display = 'none';
}

async function handleMapUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('action', 'uploadGardenPlan');
    formData.append('map', file);

    try {
        const res = await fetch('backend/api.php', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (data.success) {
            updateMapBackground(data.url);
        } else {
            alert("Upload fehlgeschlagen: " + data.message);
        }
    } catch (err) {
        console.error("Upload error", err);
    }
}

async function loadPins() {
    try {
        const res = await fetch('backend/api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getPins' })
        });
        const data = await res.json();
        if (data.success) {
            state.pins = data.pins;
            renderMarkers();
        }
    } catch (err) {
        console.error("Failed to load pins", err);
    }
}

function renderMarkers() {
    const overlay = elements.mapCanvas.querySelector('.map__markers-overlay');
    if (!overlay) return;
    overlay.innerHTML = '';
    
    state.pins.forEach(pin => {
        const marker = document.createElement('div');
        marker.className = 'marker';
        marker.style.left = `${pin.x}px`;
        marker.style.top = `${pin.y}px`;
        marker.style.position = 'absolute';
        marker.style.pointerEvents = 'auto';
        marker.style.transform = 'translate(-50%, -50%)';
        marker.style.cursor = 'pointer';
        
        marker.innerHTML = `
            <div style="background: #4CAF50; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                <span>${getEmoji(pin.type)}</span>
            </div>
        `;
        
        marker.title = pin.name;
        overlay.appendChild(marker);
    });
}

function getEmoji(type) {
    if (type === 'tree') return '🌳';
    if (type === 'shrub') return '🌿';
    return '🌸';
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
}

function handleMouseDown(e) {
    if (e.target.closest('.marker')) return;
    state.isPanning = true;
    state.panStartPos = { x: e.clientX - state.panX, y: e.clientY - state.panY };
    elements.mapCanvas.style.cursor = 'grabbing';
}

function handleMouseMove(e) {
    if (state.isPanning) {
        state.panX = e.clientX - state.panStartPos.x;
        state.panY = e.clientY - state.panStartPos.y;
        updateTransform();
    }
}

function handleMouseUp() {
    state.isPanning = false;
    elements.mapCanvas.style.cursor = 'default';
}

function updateTransform() {
    if (elements.mapWrapper) {
        elements.mapWrapper.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
    }
}

document.addEventListener('DOMContentLoaded', init);
