/**
 * Gardian - Core Application Logic (Refactored)
 */

const state = {
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
    pendingCoords: null
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
    loadFilterGroups();

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
    elements.mapCanvas.addEventListener('click', handleMapClick);
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

    const pins = state.pins.filter(pin => {
        if (typeof filterState === 'undefined') return true;
        if (!filterState.types.includes(pin.type)) return false;
        if (filterState.groups !== null && !filterState.groups.has(String(pin.group_id))) return false;
        return true;
    });

    pins.forEach(pin => {
        const marker = document.createElement('div');
        marker.className = 'marker';
        marker.dataset.id = pin.id;
        marker.style.left = `${pin.pos_x}%`;
        marker.style.top = `${pin.pos_y}%`;
        marker.style.position = 'absolute';
        marker.style.pointerEvents = 'auto';
        marker.style.transform = 'translate(-50%, -50%)';
        marker.style.cursor = 'grab';
        marker.title = `${pin.name} (Alt+Drag = duplizieren)`;

        marker.innerHTML = `
            <div style="background:${pin.marker_color || '#4CAF50'}; color:white; border-radius:50%; width:30px; height:30px; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.2);">
                <span>${getEmoji(pin.type)}</span>
            </div>
        `;

        marker.addEventListener('mousedown', (e) => handleMarkerMouseDown(e, String(pin.id)));
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

function getOverlayCoords(clientX, clientY) {
    const overlay = elements.mapWrapper.querySelector('.map__markers-overlay');
    const rect = overlay.getBoundingClientRect();
    return {
        x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
        y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100))
    };
}

function handleMouseMove(e) {
    if (state.isDragging) {
        const dist = Math.sqrt(Math.pow(e.clientX - state.dragStartPos.x, 2) + Math.pow(e.clientY - state.dragStartPos.y, 2));
        if (dist > 5) state.hasMoved = true;

        if (state.hasMoved) {
            const { x, y } = getOverlayCoords(e.clientX, e.clientY);
            const el = document.querySelector(`.marker[data-id="${state.draggingPinId}"]`);
            if (el) { el.style.left = `${x}%`; el.style.top = `${y}%`; }
        }
        return;
    }

    if (state.isPanning) {
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
                const res = await fetch('backend/api.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'addPlant', group_id: clone.group_id, pos_x: finalX, pos_y: finalY })
                });
                const data = await res.json();
                if (data.success) {
                    state.pins = state.pins.map(p => p.id === id ? { ...p, id: String(data.id), pos_x: finalX, pos_y: finalY } : p);
                    renderMarkers();
                }
            }
        } else if (state.hasMoved) {
            await fetch('backend/api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'movePlant', id, pos_x: x, pos_y: y })
            });
            state.pins = state.pins.map(p => String(p.id) === id ? { ...p, pos_x: x, pos_y: y } : p);
        }

        state.isDragging = false;
        state.draggingPinId = null;
        setTimeout(() => { state.hasMoved = false; }, 50);
        return;
    }

    state.isPanning = false;
    elements.mapCanvas.style.cursor = 'default';
}

function updateTransform() {
    if (elements.mapWrapper) {
        elements.mapWrapper.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
    }
}

// =========================
// CLICK-TO-PLACE
// =========================
function handleMapClick(e) {
    if (state.hasMoved) return;
    if (e.target.closest('.marker')) return;
    if (e.target.closest('.map__controls')) return;

    const img = elements.mapWrapper.querySelector('.map__img');
    if (!img || img.style.display === 'none') return;

    const { x, y } = getOverlayCoords(e.clientX, e.clientY);
    state.pendingCoords = { x, y };
    openPlantModal();
}

const NEW_GROUP_FIELDS = [
    { key: 'name',         label: 'Name *',            type: 'text',     required: true },
    { key: 'type',         label: 'Typ *',             type: 'select',   options: [{v:'tree',l:'Baum'},{v:'shrub',l:'Strauch'},{v:'flower',l:'Blume'},{v:'s_flower',l:'Saisonblume'}], required: true },
    { key: 'bloom_start',  label: 'Blüte von (Monat)', type: 'number' },
    { key: 'bloom_end',    label: 'Blüte bis (Monat)', type: 'number' },
    { key: 'marker_color', label: 'Marker-Farbe',      type: 'color' },
    { key: 'height',       label: 'Höhe',              type: 'text' },
    { key: 'location',     label: 'Standort',          type: 'text' },
    { key: 'spacing',      label: 'Pflanzabstand',     type: 'text' },
    { key: 'care',         label: 'Pflege',            type: 'textarea' },
    { key: 'water',        label: 'Wasser',            type: 'textarea' },
    { key: 'hardy',        label: 'Winterhart',        type: 'checkbox' },
    { key: 'scented',      label: 'Duftend',           type: 'checkbox' },
    { key: 'cutflower',    label: 'Schnittblume',      type: 'checkbox' },
    { key: 'lifespan',     label: 'Lebenszeit',        type: 'text' },
    { key: 'features',     label: 'Besonderheiten',    type: 'textarea' },
    { key: 'evergreen',    label: 'Immergrün',         type: 'checkbox' },
];

async function openPlantModal() {
    const modal  = document.getElementById('modal-pflanze');
    const select = document.getElementById('modal-group-select');
    modal.style.display = 'flex';

    // Gruppen immer neu laden (könnten sich geändert haben)
    const res  = await fetch('backend/api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getGroups' })
    });
    const data = await res.json();

    // Select zurücksetzen (Optionen 0=leer, 1=neu bleiben erhalten)
    while (select.options.length > 2) select.remove(2);
    select.value = '';

    if (data.success) {
        data.groups.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.id;
            opt.dataset.source = g.source; // 'default' oder 'user'
            opt.textContent = g.name;
            select.appendChild(opt);
        });
    }

    // Formular zurücksetzen
    document.getElementById('modal-new-group-form').style.display = 'none';
    document.getElementById('modal-submit-btn').textContent = 'Hinzufügen';
}

function onGroupSelectChange() {
    const val  = document.getElementById('modal-group-select').value;
    const form = document.getElementById('modal-new-group-form');
    const btn  = document.getElementById('modal-submit-btn');

    if (val === '__new__') {
        form.style.display = 'block';
        btn.textContent = 'Gruppe anlegen & Pflanze platzieren';
        renderNewGroupForm();
    } else {
        form.style.display = 'none';
        btn.textContent = 'Hinzufügen';
    }
}

function renderNewGroupForm() {
    const container = document.getElementById('modal-new-group-fields');
    container.innerHTML = NEW_GROUP_FIELDS.map(f => {
        if (f.type === 'select') {
            const opts = f.options.map(o => `<option value="${o.v}">${o.l}</option>`).join('');
            return `<div style="margin-bottom:10px;"><label style="font-size:0.8rem;color:var(--text-muted);">${f.label}</label><br><select id="ngf-${f.key}" style="width:100%;padding:6px;border:1px solid var(--border);border-radius:var(--radius-sm);margin-top:2px;"><option value="">—</option>${opts}</select></div>`;
        }
        if (f.type === 'checkbox') {
            return `<div style="margin-bottom:10px;display:flex;align-items:center;gap:8px;"><input type="checkbox" id="ngf-${f.key}"><label for="ngf-${f.key}" style="font-size:0.85rem;">${f.label}</label></div>`;
        }
        if (f.type === 'textarea') {
            return `<div style="margin-bottom:10px;"><label style="font-size:0.8rem;color:var(--text-muted);">${f.label}</label><br><textarea id="ngf-${f.key}" rows="2" style="width:100%;padding:6px;border:1px solid var(--border);border-radius:var(--radius-sm);margin-top:2px;box-sizing:border-box;"></textarea></div>`;
        }
        return `<div style="margin-bottom:10px;"><label style="font-size:0.8rem;color:var(--text-muted);">${f.label}</label><br><input type="${f.type}" id="ngf-${f.key}" style="width:100%;padding:6px;border:1px solid var(--border);border-radius:var(--radius-sm);margin-top:2px;box-sizing:border-box;"></div>`;
    }).join('');
}

function getNewGroupFormData() {
    const obj = {};
    NEW_GROUP_FIELDS.forEach(f => {
        const el = document.getElementById('ngf-' + f.key);
        if (!el) return;
        obj[f.key] = f.type === 'checkbox' ? (el.checked ? 1 : 0) : (el.value || null);
    });
    return obj;
}

function closeModal() {
    document.getElementById('modal-pflanze').style.display = 'none';
    state.pendingCoords = null;
}

async function confirmAddPlant() {
    const selectVal = document.getElementById('modal-group-select').value;
    if (!selectVal || !state.pendingCoords) return;

    // Neue Gruppe anlegen
    if (selectVal === '__new__') {
        const groupData = getNewGroupFormData();
        if (!groupData.name) { alert('Bitte einen Gruppennamen eingeben.'); return; }

        const res  = await fetch('backend/api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'createUserGroup', ...groupData })
        });
        const data = await res.json();
        if (!data.success) { alert(data.error || 'Fehler beim Anlegen der Gruppe'); return; }

        // Pflanze in neuer Gruppe platzieren (group_id = null, da reine User-Gruppe)
        const plantRes  = await fetch('backend/api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'addPlant', group_id: null, user_group_id: data.id, pos_x: state.pendingCoords.x, pos_y: state.pendingCoords.y })
        });
        const plantData = await plantRes.json();
        if (plantData.success) {
            closeModal();
            await loadPins();
            await loadFilterGroups();
        }
        return;
    }

    const selectedOpt = document.getElementById('modal-group-select').selectedOptions[0];
    const isUserGroup  = selectedOpt?.dataset.source === 'user';

    const payload = {
        action: 'addPlant',
        pos_x: state.pendingCoords.x,
        pos_y: state.pendingCoords.y
    };
    if (isUserGroup) {
        payload.user_group_id = selectVal;
    } else {
        payload.group_id = selectVal;
    }

    const res = await fetch('backend/api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
        closeModal();
        await loadPins();
        await loadFilterGroups();
    }
}

// =========================
// MARKER DRAG
// =========================
function handleMarkerMouseDown(e, id) {
    e.stopPropagation();

    if (e.altKey) {
        const original = state.pins.find(p => String(p.id) === id);
        if (original) {
            const clone = { ...original, id: 'pending_' + Date.now() };
            state.pins.push(clone);
            renderMarkers();
            id = clone.id;
        }
    }

    state.isDragging = true;
    state.draggingPinId = id;
    state.hasMoved = false;
    state.dragStartPos = { x: e.clientX, y: e.clientY };

    const el = document.querySelector(`.marker[data-id="${id}"]`);
    if (el) el.classList.add('dragging');
}

document.addEventListener('DOMContentLoaded', init);
