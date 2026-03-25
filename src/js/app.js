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

// Blütezeit-Slider
const bloomState = {
    enabled: false,
    year:  'std', // 'std' oder Jahreszahl als String
    month: 0,     // 0–11 (Bit-Index)
};
let bloomObservations = []; // alle Beobachtungen des Users

let _saveConfigTimer = null;
function scheduleSaveConfig() {
    clearTimeout(_saveConfigTimer);
    _saveConfigTimer = setTimeout(() => {
        fetch('backend/api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'saveGardenConfig', zoom: state.zoom, pan_x: state.panX, pan_y: state.panY })
        });
    }, 800);
}

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
    await loadBloomObservationsAll();
    await loadPins();
    loadFilterGroups();
    initBloomSlider();

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
            if (config.zoom)  state.zoom = parseFloat(config.zoom);
            if (config.pan_x) state.panX = parseFloat(config.pan_x);
            if (config.pan_y) state.panY = parseFloat(config.pan_y);
            if (config.theme) document.documentElement.setAttribute('data-theme', config.theme);
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

async function loadBloomObservationsAll() {
    try {
        const res  = await fetch('backend/api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getAllBloomObservations' })
        });
        const data = await res.json();
        if (data.success) bloomObservations = data.observations;
    } catch (err) {
        console.error('Failed to load bloom observations', err);
    }
}

function getBloomBitmaskForPin(pin) {
    if (bloomState.year === 'std') {
        return parseInt(pin.bloom_months_resolved) || 0;
    }
    // Pflanze-spezifische Beobachtung
    const plantObs = bloomObservations.find(o => String(o.plant_id) === String(pin.id) && String(o.year) === bloomState.year);
    if (plantObs) return parseInt(plantObs.bloom_months);
    // Gruppen-Beobachtung als Fallback
    const groupObs = bloomObservations.find(o => {
        const matchGroup = pin.user_group_id
            ? String(o.user_group_id) === String(pin.user_group_id)   // eigene User-Gruppe
            : String(o.group_id)      === String(pin.group_id);       // Standard-Gruppe via group_id
        return matchGroup && String(o.year) === bloomState.year;
    });
    if (groupObs) return parseInt(groupObs.bloom_months);
    // Standard-Blühzeit als letzter Fallback
    return parseInt(pin.bloom_months_resolved) || 0;
}

// ========================
// BLOOM SLIDER STEUERUNG
// ========================
const MONTH_NAMES = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
let bloomAutoplayTimer = null;
let bloomAutoplaySpeed = 800;

function setBloomAll() {
    bloomState.enabled = false;
    document.getElementById('bloom-month-controls').style.display = 'none';
    document.querySelectorAll('.bloom-year-btn').forEach(b => {
        b.style.background = 'var(--bg-app)';
        b.style.color      = 'var(--text-main)';
    });
    document.getElementById('bloom-btn-all').className = 'c-btn c-btn--primary';
    renderMarkers();
}

function setBloomYear(year) {
    bloomState.enabled = true;
    bloomState.year    = String(year);
    document.getElementById('bloom-btn-all').className = 'c-btn c-btn--text';
    document.querySelectorAll('.bloom-year-btn').forEach(b => {
        const active = b.dataset.bloomYear === String(year);
        b.style.background = active ? 'var(--primary)' : 'var(--bg-app)';
        b.style.color      = active ? 'white'          : 'var(--text-main)';
    });
    document.getElementById('bloom-month-controls').style.display = 'flex';
    renderMarkers();
}

function setBloomMonth(value) {
    bloomState.month = parseInt(value);
    document.getElementById('bloom-month-label').textContent = MONTH_NAMES[bloomState.month];
    document.getElementById('bloom-month-input').value = bloomState.month;
    renderMarkers();
}

function setBloomSpeed(ms) {
    bloomAutoplaySpeed = parseInt(ms);
    if (bloomAutoplayTimer) {
        stopBloomAutoplay();
        startBloomAutoplay();
    }
}

function toggleBloomAutoplay() {
    if (bloomAutoplayTimer) {
        stopBloomAutoplay();
    } else {
        startBloomAutoplay();
    }
}

const BLOOM_YEARS = [2025, 2026, 2027, 2028, 2029, 2030];

function initBloomSlider() {
    const currentYear = new Date().getFullYear();
    document.querySelectorAll('.bloom-year-btn[data-bloom-year]').forEach(btn => {
        const year = parseInt(btn.dataset.bloomYear);
        if (!isNaN(year) && year > currentYear) {
            btn.style.display = 'none';
        }
    });
}

function isValidTimePoint(year, month) {
    const now = new Date();
    const y   = parseInt(year);
    if (y < now.getFullYear()) return true;
    if (y === now.getFullYear()) return month <= now.getMonth();
    return false;
}

function validMonthsForYear(year) {
    return Array.from({length: 12}, (_, i) => i).filter(m => isValidTimePoint(year, m));
}

function bloomAutoplayStep() {
    if (bloomState.year === 'std') {
        // Standard: einfach durch die Monate loopen
        setBloomMonth((bloomState.month + 1) % 12);
        return;
    }

    // Jahr-Modus: nächsten gültigen Monat im Jahr finden
    const validMonths   = validMonthsForYear(bloomState.year);
    const currentIdx    = validMonths.indexOf(bloomState.month);
    const hasNextMonth  = currentIdx >= 0 && currentIdx < validMonths.length - 1;

    if (hasNextMonth) {
        setBloomMonth(validMonths[currentIdx + 1]);
        return;
    }

    // Nächstes Jahr mit gültigen Monaten suchen
    const currentYearIdx = BLOOM_YEARS.indexOf(parseInt(bloomState.year));
    let nextIdx = currentYearIdx + 1;
    while (nextIdx < BLOOM_YEARS.length && validMonthsForYear(BLOOM_YEARS[nextIdx]).length === 0) nextIdx++;

    if (nextIdx >= BLOOM_YEARS.length) {
        // Von vorne: erstes Jahr mit gültigen Monaten
        nextIdx = 0;
        while (nextIdx < BLOOM_YEARS.length && validMonthsForYear(BLOOM_YEARS[nextIdx]).length === 0) nextIdx++;
    }

    if (nextIdx < BLOOM_YEARS.length) {
        const nextYear   = BLOOM_YEARS[nextIdx];
        const nextMonths = validMonthsForYear(nextYear);
        setBloomYear(nextYear);
        setBloomMonth(nextMonths[0]);
    }
}

function startBloomAutoplay() {
    document.getElementById('bloom-autoplay-btn').textContent = '⏸';
    bloomAutoplayTimer = setInterval(bloomAutoplayStep, bloomAutoplaySpeed);
}

function stopBloomAutoplay() {
    clearInterval(bloomAutoplayTimer);
    bloomAutoplayTimer = null;
    document.getElementById('bloom-autoplay-btn').textContent = '▶';
}

function setBloomAll() {
    stopBloomAutoplay();
    bloomState.enabled = false;
    document.getElementById('bloom-month-controls').style.display = 'none';
    document.querySelectorAll('.bloom-year-btn').forEach(b => {
        b.style.background = 'var(--bg-app)';
        b.style.color      = 'var(--text-main)';
    });
    document.getElementById('bloom-btn-all').className = 'c-btn c-btn--primary';
    renderMarkers();
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
        const pinGroupKey = pin.user_group_id ? `u${pin.user_group_id}` : String(pin.group_id);
        if (filterState.groups !== null && !filterState.groups.has(pinGroupKey)) return false;
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

        // Bloom-Filter: Farbe + Transparenz je nach Blühzustand
        let markerColor = pin.marker_color || '#4CAF50';
        if (bloomState.enabled) {
            const bitmask  = getBloomBitmaskForPin(pin);
            const blooming = (bitmask >> bloomState.month) & 1;
            if (blooming) {
                marker.style.opacity = '1';
            } else if (pin.evergreen == 1) {
                marker.style.opacity = '1';
                markerColor = '#4CAF50'; // grün außerhalb der Blütezeit
            } else {
                marker.style.opacity = '0.2';
            }
            marker.style.transition = 'opacity 0.3s ease';
        }

        marker.innerHTML = `
            <div style="background:${markerColor}; color:white; border-radius:50%; width:30px; height:30px; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.2);">
                <span>${getEmoji(pin.type)}</span>
            </div>
        `;

        marker.addEventListener('mousedown', (e) => handleMarkerMouseDown(e, String(pin.id)));
        marker.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); openPlantEditModal(pin); });
        overlay.appendChild(marker);
    });
}

function openPlantEditModal(pin) {
    document.getElementById('edit-plant-id').value      = pin.id;
    document.getElementById('modal-edit-title').textContent = `${pin.name} bearbeiten`;
    document.getElementById('edit-marker-color').value  = pin.marker_color || '#4CAF50';
    document.getElementById('edit-marker-size').value   = pin.marker_size  || '';
    document.getElementById('edit-marker-icon').value   = pin.marker_icon  || '';
    document.getElementById('modal-pflanze-edit').style.display = 'flex';
}

function closePlantEditModal() {
    document.getElementById('modal-pflanze-edit').style.display = 'none';
}

async function savePlantEdit() {
    const id = document.getElementById('edit-plant-id').value;
    const payload = {
        action:       'updatePlant',
        id:           parseInt(id),
        marker_color: document.getElementById('edit-marker-color').value,
        marker_size:  document.getElementById('edit-marker-size').value  || null,
        marker_icon:  document.getElementById('edit-marker-icon').value  || null,
    };
    const res  = await fetch('backend/api.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (data.success) {
        closePlantEditModal();
        await loadPins();
    } else {
        alert(data.error || 'Fehler beim Speichern');
    }
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

    if (state.isPanning && state.hasMoved) scheduleSaveConfig();
    state.isPanning = false;
    elements.mapCanvas.style.cursor = 'default';
    setTimeout(() => { state.hasMoved = false; }, 50);
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

    const rect = img.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;

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

    // Select zurücksetzen
    document.getElementById('modal-group-select').value = '';
}

function onGroupSelectChange() {
    const val = document.getElementById('modal-group-select').value;
    if (val === '__new__') {
        document.getElementById('modal-group-select').value = '';
        openNeueGruppeModal();
    }
}

function openNeueGruppeModal() {
    const body = document.getElementById('modal-neue-gruppe-body');
    body.innerHTML = renderGroupFormNice({}, 'form-neue-gruppe', 'saveNeueGruppe()');
    document.getElementById('modal-neue-gruppe').style.display = 'flex';
}

function closeNeueGruppeModal() {
    document.getElementById('modal-neue-gruppe').style.display = 'none';
}

async function saveNeueGruppe() {
    const groupData = getGroupFormNiceData('form-neue-gruppe');
    if (!groupData.name) { alert('Bitte einen Gruppennamen eingeben.'); return; }

    const res  = await fetch('backend/api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createUserGroup', ...groupData })
    });
    const data = await res.json();
    if (!data.success) { alert(data.error || 'Fehler beim Anlegen der Gruppe'); return; }

    closeNeueGruppeModal();

    if (state.pendingCoords) {
        const plantRes  = await fetch('backend/api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'addPlant', user_group_id: data.id, pos_x: state.pendingCoords.x, pos_y: state.pendingCoords.y })
        });
        const plantData = await plantRes.json();
        if (plantData.success) {
            closeModal();
            await loadFilterGroups();
            await loadPins();
        }
    } else {
        await loadFilterGroups();
        await openPlantModal();
    }
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
            await loadFilterGroups();
            await loadPins();
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
        await loadFilterGroups();
        await loadPins();
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
