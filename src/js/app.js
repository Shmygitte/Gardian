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
const bloomLayerFilter = { blooming: true, evergreen: true, resting: true };
let bloomObservations = []; // alle Beobachtungen des Users

const DEFAULT_MARKER = {
    tree:      { size: 44, fontSize: '1.5rem' },
    shrub:     { size: 34, fontSize: '1.2rem' },
    flower:    { size: 20, fontSize: '0.8rem' },
    climber:   { size: 20, fontSize: '0.8rem' },
    s_flower:  { size: 10, fontSize: '0.45rem' },
    _fallback: { size: 30, fontSize: '1rem' }
};

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
    initBloomSlider();

    // 2. Data
    await loadGardenConfig();
    await loadBloomObservationsAll();
    await loadIconCaches();
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
    const uploadLabel = document.getElementById('map-upload-label');
    const btnZoomWidth = document.getElementById('btn-zoom-width');
    const btnZoomHeight = document.getElementById('btn-zoom-height');
    if (img && placeholder) {
        img.src = url;
        img.style.display = 'block';
        placeholder.style.display = 'none';
        // Wrapper und Overlay an Bildgröße anpassen
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
            customAlert("Upload fehlgeschlagen: " + data.message);
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
    document.getElementById('bloom-layer-filters').style.display = 'none';
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
    document.getElementById('bloom-layer-filters').style.display = 'flex';
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

function toggleBloomLayer(layer) {
    bloomLayerFilter[layer] = !bloomLayerFilter[layer];
    const btn = document.querySelector(`[data-bloom-layer="${layer}"]`);
    if (btn) {
        btn.style.background = bloomLayerFilter[layer] ? 'var(--primary)' : 'var(--bg-app)';
        btn.style.color      = bloomLayerFilter[layer] ? 'white'          : 'var(--text-muted)';
        btn.style.opacity    = bloomLayerFilter[layer] ? '1'              : '0.5';
    }
    renderMarkers();
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
        if (filterState.careFilter && typeof getPinsWithCareTasks === 'function') {
            if (!getPinsWithCareTasks(filterState.careMonths).has(pin.id)) return false;
        }
        return true;
    });

    pins.forEach(pin => {
        const marker = document.createElement('div');
        marker.className = 'marker';
        marker.dataset.id = pin.id;
        marker.dataset.type = pin.type || 'flower';
        marker.style.left = `${pin.pos_x}%`;
        marker.style.top = `${pin.pos_y}%`;
        marker.style.position = 'absolute';
        marker.style.pointerEvents = 'auto';
        marker.style.transform = 'translate(-50%, -50%)';
        marker.style.cursor = 'grab';
        marker.title = '';

        // Ebene bestimmen: blühend > evergreen (nicht blühend) > ruhend
        const defaults = DEFAULT_MARKER[pin.type] || DEFAULT_MARKER._fallback;
        const effectiveSize = pin.marker_size || defaults.size;
        let markerLayer = 'blooming';
        let markerColor = pin.marker_color || '#4CAF50';

        if (bloomState.enabled) {
            const bitmask  = getBloomBitmaskForPin(pin);
            const isBlooming = !!((bitmask >> bloomState.month) & 1);
            if (isBlooming) {
                markerLayer = 'blooming';
                marker.style.opacity = '1';
            } else if (pin.evergreen == 1) {
                markerLayer = 'evergreen';
                marker.style.opacity = '1';
                markerColor = '#4CAF50';
            } else {
                markerLayer = 'resting';
                marker.style.opacity = '0.2';
            }
            marker.style.transition = 'opacity 0.3s ease';

            // Layer-Filter: ausblenden wenn Ebene deaktiviert
            if (!bloomLayerFilter[markerLayer]) {
                marker.style.display = 'none';
            }
        }

        // Z-Index: kleinere über größeren, höhere Ebene über niedrigerer
        const layerZ = { blooming: 300, evergreen: 200, resting: 100 };
        marker.style.zIndex = layerZ[markerLayer] - effectiveSize;
        marker.dataset.layer = markerLayer;

        const iconContent = resolveMarkerIcon(pin.marker_icon, pin.type, pin.marker_icon_color);
        const sizeStyle = `width:${effectiveSize}px;height:${effectiveSize}px;`;
        const fontStyle = pin.marker_size ? `font-size:${Math.max(pin.marker_size * 0.5, 8)}px;` : `font-size:${defaults.fontSize};`;
        marker.innerHTML = `
            <div class="marker__pin" style="background:${markerColor}; color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; border:1px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.2);${sizeStyle}${fontStyle}">
                ${iconContent}
            </div>
        `;

        marker.addEventListener('mousedown', (e) => handleMarkerMouseDown(e, String(pin.id)));
        marker.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); openPlantEditModal(pin); });
        marker.addEventListener('mouseenter', (e) => showHoverGallery(e, pin));
        marker.addEventListener('mouseleave', () => {
            _hoverHideTimeout = setTimeout(() => hideHoverGallery(), 200);
        });
        overlay.appendChild(marker);
    });

    // Pflege-Badges neu zeichnen falls Overlay aktiv
    if (typeof _careOverlayActive !== 'undefined' && _careOverlayActive &&
        typeof renderCareBadges === 'function') {
        renderCareBadges();
    }
}

function openPlantEditModal(pin) {
    // Aktuelle Pin-Daten aus state.pins holen (nicht aus der Closure)
    const p = state.pins.find(pp => String(pp.id) === String(pin.id)) || pin;

    // 1. ALLE Felder hart zurücksetzen
    document.getElementById('edit-plant-id').value = '';
    document.getElementById('edit-plant-name').value = '';
    document.getElementById('edit-marker-color').value = '#4CAF50';
    document.getElementById('edit-marker-size').value = '';
    document.getElementById('edit-marker-icon').value = '';
    document.getElementById('edit-marker-emoji').value = '';
    document.getElementById('edit-marker-icon-color').value = '#333333';

    // 2. Neue Werte setzen
    document.getElementById('edit-plant-id').value = p.id;
    document.getElementById('modal-edit-title').textContent = 'Pflanze';
    document.getElementById('edit-plant-name').value = p.plant_name || '';
    document.getElementById('edit-marker-color').value = p.marker_color || '#4CAF50';

    const defaultSize = (DEFAULT_MARKER[p.type] || DEFAULT_MARKER._fallback).size;
    document.getElementById('edit-marker-size').value = p.marker_size || '';
    document.getElementById('edit-marker-size').dataset.defaultSize = defaultSize;
    document.getElementById('edit-marker-size').dataset.pinType = p.type || 'flower';
    const iconColorEl = document.getElementById('edit-marker-icon-color');
    iconColorEl.value = p.marker_icon_color || '#ffffff';
    iconColorEl.dataset.original = p.marker_icon_color || '';

    // 3. Icon-Picker
    const iconVal = p.marker_icon || '';
    document.getElementById('edit-marker-icon').value = iconVal;
    if (iconVal && !iconVal.startsWith('lib:') && !iconVal.startsWith('user:')) {
        document.getElementById('edit-marker-emoji').value = iconVal;
        switchIconTab('emoji');
    } else if (iconVal.startsWith('lib:')) {
        switchIconTab('library');
    } else if (iconVal.startsWith('user:')) {
        switchIconTab('own');
    } else {
        switchIconTab('emoji');
    }

    // 4. Previews aktualisieren
    updateIconPreview(iconVal || null);
    updateMarkerSizeDisplay();
    updateMarkerPreview();

    // 5. Fotos laden und Modal öffnen
    loadPlantEditPhotos(p.id);
    document.getElementById('modal-pflanze-edit').style.display = 'flex';
}

function closePlantEditModal() {
    document.getElementById('modal-pflanze-edit').style.display = 'none';
}

async function loadPlantEditPhotos(plantId) {
    const grid = document.getElementById('edit-plant-photos-grid');
    grid.innerHTML = '';
    try {
        const res = await fetch('backend/api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getImages', type: 'plant', plant_id: plantId })
        });
        const data = await res.json();
        if (data.success && data.images.length) {
            grid.innerHTML = data.images.map(img =>
                `<div style="position:relative;">
                    <img src="${img.file_path}" style="width:48px;height:48px;object-fit:cover;border-radius:4px;border:1px solid var(--border);cursor:pointer;" onclick="showFullImage('${img.file_path_gallery || img.file_path}')">
                    <button onclick="deletePlantPhotoFromModal(${img.id})" style="position:absolute;top:-4px;right:-4px;width:16px;height:16px;border-radius:50%;background:var(--danger);color:white;border:none;font-size:0.6rem;cursor:pointer;line-height:1;padding:0;">✕</button>
                </div>`
            ).join('');
        }
    } catch (e) {}
}

function uploadPlantPhotoFromModal(input) {
    const plantId = document.getElementById('edit-plant-id').value;
    if (!plantId) return;
    uploadImage(input, 'plant', null, plantId, 'edit-plant-photos-grid');
}

async function deletePlantPhotoFromModal(imageId) {
    if (!await customConfirm('Foto löschen?', { confirmLabel: 'Löschen', danger: true })) return;
    const res = await fetch('backend/api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteImage', id: imageId })
    });
    const data = await res.json();
    if (data.success) {
        const plantId = document.getElementById('edit-plant-id').value;
        loadPlantEditPhotos(plantId);
    }
}

async function deletePlantFromModal() {
    const id = document.getElementById('edit-plant-id').value;
    if (!id) return;
    if (!await customConfirm('Pflanze wirklich löschen? Alle zugehörigen Fotos und Daten werden entfernt.', { confirmLabel: 'Löschen', danger: true })) return;
    try {
        const res = await fetch('backend/api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'deletePlant', plant_id: parseInt(id) })
        });
        const data = await res.json();
        if (data.success) {
            closePlantEditModal();
            await loadPins();
        } else {
            customAlert(data.error || 'Fehler beim Löschen');
        }
    } catch (e) {
        customAlert('Fehler beim Löschen');
    }
}

function adjustMarkerSize(delta) {
    const input = document.getElementById('edit-marker-size');
    const defaultSize = parseInt(input.dataset.defaultSize) || 30;
    const current = parseInt(input.value) || defaultSize;
    const newVal = Math.max(8, Math.min(80, current + delta));
    input.value = newVal === defaultSize ? '' : newVal;
    updateMarkerSizeDisplay();
    updateMarkerPreview();
}

function updateMarkerSizeDisplay() {
    // Größe wird jetzt direkt durch die Marker-Vorschau visualisiert
}

function updateMarkerPreview() {
    const preview = document.getElementById('edit-marker-preview');
    if (!preview) return;
    const input = document.getElementById('edit-marker-size');
    const defaultSize = parseInt(input.dataset.defaultSize) || 30;
    const size = parseInt(input.value) || defaultSize;
    const displaySize = Math.min(size, 48);
    const color = document.getElementById('edit-marker-color').value || '#4CAF50';
    const iconVal = document.getElementById('edit-marker-icon').value;
    const pinType = input.dataset.pinType || 'flower';
    const isSvg = iconVal && (iconVal.startsWith('lib:') || iconVal.startsWith('user:'));
    const iconColor = isSvg ? document.getElementById('edit-marker-icon-color').value : null;
    const iconContent = resolveMarkerIcon(iconVal || '', pinType, iconColor);
    const fontSize = displaySize < 20 ? '0.5rem' : displaySize < 30 ? '0.7rem' : displaySize < 40 ? '0.9rem' : '1.2rem';
    preview.style.width = displaySize + 'px';
    preview.style.height = displaySize + 'px';
    preview.style.background = color;
    preview.style.fontSize = fontSize;
    preview.style.color = 'white';
    preview.innerHTML = iconContent;
}

async function savePlantEdit() {
    const id = document.getElementById('edit-plant-id').value;
    const iconVal = document.getElementById('edit-marker-icon').value || null;
    const isSvgIcon = iconVal && (iconVal.startsWith('lib:') || iconVal.startsWith('user:'));
    const payload = {
        action:       'updatePlant',
        id:           parseInt(id),
        name:         document.getElementById('edit-plant-name').value  || null,
        marker_color: document.getElementById('edit-marker-color').value,
        marker_size:  document.getElementById('edit-marker-size').value  || null,
        marker_icon:  iconVal,
        marker_icon_color: isSvgIcon ? (function() {
            const el = document.getElementById('edit-marker-icon-color');
            const orig = el.dataset.original || '';
            // Nur speichern wenn User die Farbe tatsächlich geändert hat
            if (!orig && el.value === '#ffffff') return null;
            return el.value;
        })() : null,
    };
    const res  = await fetch('backend/api.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (data.success) {
        closePlantEditModal();
        await loadPins();
    } else {
        customAlert(data.error || 'Fehler beim Speichern');
    }
}

function getEmoji(type) {
    if (type === 'tree') return '🌳';
    if (type === 'shrub') return '🌿';
    if (type === 'climber') return '🌱';
    return '🌸';
}

// Icon-Caches für SVG-Pfade
let _iconLibraryCache = null;
let _userIconsCache = null;

async function loadIconCaches() {
    const [libRes, userRes] = await Promise.all([
        fetch('backend/api.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'getIconLibrary' }) }),
        fetch('backend/api.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'getUserIcons' }) })
    ]);
    const libData  = await libRes.json();
    const userData = await userRes.json();
    if (libData.success)  _iconLibraryCache = Object.fromEntries(libData.icons.map(i => [String(i.id), i.file_path]));
    if (userData.success) _userIconsCache   = Object.fromEntries(userData.icons.map(i => [String(i.id), i.file_path]));
}

function resolveMarkerIcon(markerIcon, type, iconColor) {
    if (!markerIcon) return `<span>${getEmoji(type)}</span>`;

    // SVG-Icon aus Bibliothek: "lib:123"
    if (markerIcon.startsWith('lib:')) {
        const iconId = markerIcon.substring(4);
        const path = _iconLibraryCache?.[iconId];
        if (path) {
            if (iconColor) {
                return `<div style="width:65%;height:65%;background:${iconColor};-webkit-mask:url(${path}) center/contain no-repeat;mask:url(${path}) center/contain no-repeat;"></div>`;
            }
            return `<img src="${path}" style="width:65%;height:65%;object-fit:contain;" alt="">`;
        }
        return `<span>${getEmoji(type)}</span>`;
    }
    // SVG-Icon vom User: "user:123"
    if (markerIcon.startsWith('user:')) {
        const iconId = markerIcon.substring(5);
        const path = _userIconsCache?.[iconId];
        if (path) {
            if (iconColor) {
                return `<div style="width:65%;height:65%;background:${iconColor};-webkit-mask:url(${path}) center/contain no-repeat;mask:url(${path}) center/contain no-repeat;"></div>`;
            }
            return `<img src="${path}" style="width:65%;height:65%;object-fit:contain;" alt="">`;
        }
        return `<span>${getEmoji(type)}</span>`;
    }
    // Emoji oder Text
    return `<span>${markerIcon}</span>`;
}

// ========================
// ICON PICKER
// ========================
function switchIconTab(tab) {
    // Radio-Buttons synchronisieren
    const radio = document.querySelector(`input[name="icon-source"][value="${tab}"]`);
    if (radio) radio.checked = true;
    // Panels umschalten
    document.querySelectorAll('.icon-tab-panel').forEach(p => p.style.display = 'none');
    document.getElementById('icon-tab-' + tab).style.display = 'block';
    if (tab === 'library') renderIconLibraryGrid();
    if (tab === 'own') renderUserIconGrid();
}

function updateIconPreview(value) {
    const preview = document.getElementById('icon-picker-current');
    const label   = document.getElementById('icon-picker-label');
    const colorWrap = document.getElementById('icon-color-picker-wrap');
    document.getElementById('edit-marker-icon').value = value || '';
    const isSvg = value && (value.startsWith('lib:') || value.startsWith('user:'));
    colorWrap.style.display = isSvg ? 'flex' : 'none';
    const iconColor = isSvg ? document.getElementById('edit-marker-icon-color').value : null;

    if (!value) {
        preview.innerHTML = getEmoji('flower');
        label.textContent = 'Standard-Emoji';
    } else if (value.startsWith('lib:')) {
        const path = _iconLibraryCache?.[value.substring(4)];
        if (path && iconColor) {
            preview.innerHTML = `<div style="width:22px;height:22px;background:${iconColor};-webkit-mask:url(${path}) center/contain no-repeat;mask:url(${path}) center/contain no-repeat;"></div>`;
        } else {
            preview.innerHTML = path ? `<img src="${path}" style="width:22px;height:22px;">` : '?';
        }
        label.textContent = 'Bibliothek';
    } else if (value.startsWith('user:')) {
        const path = _userIconsCache?.[value.substring(5)];
        if (path && iconColor) {
            preview.innerHTML = `<div style="width:22px;height:22px;background:${iconColor};-webkit-mask:url(${path}) center/contain no-repeat;mask:url(${path}) center/contain no-repeat;"></div>`;
        } else {
            preview.innerHTML = path ? `<img src="${path}" style="width:22px;height:22px;">` : '?';
        }
        label.textContent = 'Eigenes';
    } else {
        preview.innerHTML = `<span>${value}</span>`;
        label.textContent = 'Emoji';
    }
    updateMarkerPreview();
}

function selectEmojiIcon(val) {
    updateIconPreview(val.trim() || null);
}

function selectLibraryIcon(id) {
    updateIconPreview('lib:' + id);
}

function selectUserIcon(id) {
    updateIconPreview('user:' + id);
}

function resetMarkerIcon() {
    document.getElementById('edit-marker-emoji').value = '';
    updateIconPreview(null);
}

function resetAllMarkerSettings() {
    // Farbe auf Standard-Grün
    document.getElementById('edit-marker-color').value = '#4CAF50';
    // Größe zurücksetzen (leer = Typ-Standard)
    document.getElementById('edit-marker-size').value = '';
    // Icon zurücksetzen
    document.getElementById('edit-marker-emoji').value = '';
    document.getElementById('edit-marker-icon-color').value = '#333333';
    updateIconPreview(null);
    updateMarkerSizeDisplay();
    updateMarkerPreview();
}

function renderIconLibraryGrid() {
    const grid = document.getElementById('icon-library-grid');
    if (!_iconLibraryCache) { grid.innerHTML = '<span style="color:var(--text-muted);font-size:0.8rem;grid-column:1/-1;">Keine Icons vorhanden</span>'; return; }
    const currentVal = document.getElementById('edit-marker-icon').value;
    grid.innerHTML = Object.entries(_iconLibraryCache).map(([id, path]) =>
        `<button type="button" onclick="selectLibraryIcon('${id}')" title="Icon #${id}"
            style="width:100%;aspect-ratio:1;border:2px solid ${currentVal === 'lib:'+id ? 'var(--primary)' : 'var(--border)'};border-radius:var(--radius-sm);background:var(--bg-app);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:4px;transition:transform 0.15s;"
            onmouseenter="this.style.transform='scale(1.8)';this.style.zIndex='10'" onmouseleave="this.style.transform='';this.style.zIndex=''">
            <img src="${path}" style="width:100%;height:100%;object-fit:contain;">
        </button>`
    ).join('');
}

function renderUserIconGrid() {
    const grid = document.getElementById('icon-user-grid');
    if (!_userIconsCache || Object.keys(_userIconsCache).length === 0) {
        grid.innerHTML = '<span style="color:var(--text-muted);font-size:0.8rem;grid-column:1/-1;">Noch keine eigenen Icons</span>';
        return;
    }
    const currentVal = document.getElementById('edit-marker-icon').value;
    grid.innerHTML = Object.entries(_userIconsCache).map(([id, path]) =>
        `<div style="position:relative;">
            <button type="button" onclick="selectUserIcon('${id}')" title="Eigenes Icon #${id}"
                style="width:100%;aspect-ratio:1;border:2px solid ${currentVal === 'user:'+id ? 'var(--primary)' : 'var(--border)'};border-radius:var(--radius-sm);background:var(--bg-app);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:4px;transition:transform 0.15s;"
                onmouseenter="this.style.transform='scale(1.8)';this.style.zIndex='10'" onmouseleave="this.style.transform='';this.style.zIndex=''">
                <img src="${path}" style="width:100%;height:100%;object-fit:contain;">
            </button>
            <button type="button" onclick="deleteUserIcon('${id}')" title="Löschen"
                style="position:absolute;top:-4px;right:-4px;width:16px;height:16px;border-radius:50%;background:var(--danger);color:white;border:none;font-size:0.6rem;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;">✕</button>
        </div>`
    ).join('');
}

async function uploadUserIcon(input) {
    const file = input.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.svg')) { customAlert('Nur SVG-Dateien erlaubt.'); return; }
    if (file.size > 51200) { customAlert('Datei zu groß (max. 50KB).'); return; }

    const formData = new FormData();
    formData.append('action', 'uploadIcon');
    formData.append('target', 'user');
    formData.append('name', file.name.replace('.svg', ''));
    formData.append('icon', file);

    const res  = await fetch('backend/api.php', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.success) {
        _userIconsCache[String(data.id)] = data.file_path;
        selectUserIcon(String(data.id));
        renderUserIconGrid();
    } else {
        customAlert(data.error || 'Upload fehlgeschlagen');
    }
    input.value = '';
}

async function deleteUserIcon(id) {
    if (!await customConfirm('Icon wirklich löschen?', { confirmLabel: 'Löschen', danger: true })) return;
    const res  = await fetch('backend/api.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'deleteIcon', target: 'user', id }) });
    const data = await res.json();
    if (data.success) {
        delete _userIconsCache[id];
        const current = document.getElementById('edit-marker-icon').value;
        if (current === 'user:' + id) resetMarkerIcon();
        renderUserIconGrid();
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

function getOverlayCoords(clientX, clientY) {
    const overlay = elements.mapWrapper.querySelector('.map__markers-overlay');
    const rect = overlay.getBoundingClientRect();
    return {
        x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
        y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100))
    };
}

function handleMouseMove(e) {
    // Kein Panning/Dragging wenn keine Maustaste gedrückt oder Dashboard nicht sichtbar
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
        if (dist > 5) { state.hasMoved = true; hideHoverGallery(); }

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
                const addPayload = { action: 'addPlant', pos_x: finalX, pos_y: finalY };
                if (clone.user_group_id) addPayload.user_group_id = clone.user_group_id;
                else addPayload.group_id = clone.group_id;
                // Marker-Einstellungen vom Original übernehmen
                if (clone.marker_icon)       addPayload.marker_icon       = clone.marker_icon;
                if (clone.marker_color)      addPayload.marker_color      = clone.marker_color;
                if (clone.marker_size)       addPayload.marker_size       = clone.marker_size;
                if (clone.marker_icon_color) addPayload.marker_icon_color = clone.marker_icon_color;
                if (clone.plant_name)        addPayload.name              = clone.plant_name;
                const res = await fetch('backend/api.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(addPayload)
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
        setTimeout(() => {
            state.hasMoved = false;
            // Hover neu triggern falls Maus noch über einem Marker ist
            if (hoverSettings.galleryEnabled && !hoverSettings.locked) {
                const markerUnder = document.elementFromPoint(_mousePos.x, _mousePos.y)?.closest('.marker');
                if (markerUnder) {
                    const pinId = markerUnder.dataset.id;
                    const pin = state.pins.find(p => String(p.id) === pinId);
                    if (pin) showHoverGallery({ currentTarget: markerUnder }, pin);
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

function updateTransform() {
    if (elements.mapWrapper) {
        elements.mapWrapper.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
    }
}

function zoomFitWidth() {
    const img = elements.mapWrapper?.querySelector('.map__img');
    if (!img || img.style.display === 'none') return;
    const canvasRect = elements.mapCanvas.getBoundingClientRect();
    state.zoom = canvasRect.width / img.naturalWidth;
    state.panX = 0;
    state.panY = 0;
    updateTransform();
    scheduleSaveConfig();
}

function zoomFitHeight() {
    const img = elements.mapWrapper?.querySelector('.map__img');
    if (!img || img.style.display === 'none') return;
    const canvasRect = elements.mapCanvas.getBoundingClientRect();
    state.zoom = canvasRect.height / img.naturalHeight;
    state.panX = 0;
    state.panY = 0;
    updateTransform();
    scheduleSaveConfig();
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
    { key: 'type',         label: 'Typ *',             type: 'select',   options: [{v:'tree',l:'Baum'},{v:'shrub',l:'Strauch'},{v:'flower',l:'Blume'},{v:'climber',l:'Kletterpflanze'},{v:'s_flower',l:'Blümchen'}], required: true },
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
    document.getElementById('modal-neue-gruppe-title').textContent = 'Neue Pflanzengruppe anlegen';
    document.getElementById('modal-neue-gruppe').style.display = 'flex';
}

function closeNeueGruppeModal() {
    document.getElementById('modal-neue-gruppe').style.display = 'none';
}

async function saveNeueGruppe() {
    const groupData = getGroupFormNiceData('form-neue-gruppe');
    if (!groupData.name) { customAlert('Bitte einen Gruppennamen eingeben.'); return; }

    const res  = await fetch('backend/api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createUserGroup', ...groupData })
    });
    const data = await res.json();
    if (!data.success) { customAlert(data.error || 'Fehler beim Anlegen der Gruppe'); return; }

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
        } else {
            customAlert(plantData.error || 'Pflanze konnte nicht angelegt werden');
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
        if (!groupData.name) { customAlert('Bitte einen Gruppennamen eingeben.'); return; }

        const res  = await fetch('backend/api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'createUserGroup', ...groupData })
        });
        const data = await res.json();
        if (!data.success) { customAlert(data.error || 'Fehler beim Anlegen der Gruppe'); return; }

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

// =========================
// HOVER SETTINGS
// =========================
const hoverSettings = {
    galleryEnabled: true,
    locked: false,
    size: 'M'
};

const HOVER_SIZE_MAP = {
    S: { w: 64,  h: 48, maxW: 168 },
    M: { w: 96,  h: 72, maxW: 220 },
    L: { w: 128, h: 96, maxW: 300 }
};

function setHoverGallery(enabled) {
    hoverSettings.galleryEnabled = enabled;
    _updateHoverSizeVisibility();
}

function setHoverLock(locked) {
    hoverSettings.locked = locked;
    _updateHoverSizeVisibility();
}

function setHoverSize(size) {
    hoverSettings.size = size;
    document.querySelectorAll('.hover-size-btn').forEach(b => {
        const active = b.dataset.size === size;
        b.style.background = active ? 'var(--primary)' : 'var(--bg-app)';
        b.style.color = active ? 'white' : 'var(--text-main)';
    });
}

function _updateHoverSizeVisibility() {
    const el = document.getElementById('hover-size-controls');
    if (el) el.style.display = (hoverSettings.galleryEnabled && !hoverSettings.locked) ? 'flex' : 'none';
}

// =========================
// HOVER GALERIE
// =========================
let _hoverTimeout = null;
let _mousePos = { x: 0, y: 0 };
document.addEventListener('mousemove', e => { _mousePos.x = e.clientX; _mousePos.y = e.clientY; });

async function showHoverGallery(e, pin) {
    hideHoverGallery();
    if (hoverSettings.locked) return;

    const markerRect = e.currentTarget.getBoundingClientRect();
    const displayName = pin.plant_name
        ? `${pin.name} · ${pin.plant_name}`
        : pin.name;

    if (!hoverSettings.galleryEnabled) {
        // Nur Namens-Label, kein Fetch
        _hoverTimeout = setTimeout(() => {
            const popup = document.createElement('div');
            popup.id = 'hover-gallery-popup';
            popup.style.cssText = `
                position:fixed; z-index:9999; background:var(--bg-card);
                border:1px solid var(--border); border-radius:4px;
                box-shadow:var(--shadow-medium); padding:4px 7px; pointer-events:none;
            `;
            popup.innerHTML = `<p style="font-size:0.8rem;font-weight:600;margin:0;color:var(--text-main);white-space:nowrap;">${displayName}</p>`;
            document.body.appendChild(popup);
            positionHoverPopup(popup, markerRect);
        }, 300);
        return;
    }

    // Galerie-Hover mit Fetch
    _hoverTimeout = setTimeout(async () => {
        const res  = await fetch('backend/api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getImagesForPin', plant_id: pin.id, group_id: pin.group_id, user_group_id: pin.user_group_id || null })
        });
        const data = await res.json();

        const { w, h, maxW } = HOVER_SIZE_MAP[hoverSettings.size] || HOVER_SIZE_MAP.M;

        const popup = document.createElement('div');
        popup.id = 'hover-gallery-popup';
        popup.style.cssText = `
            position:fixed; z-index:9999; background:var(--bg-card);
            border:1px solid var(--border); border-radius:4px;
            box-shadow:var(--shadow-medium); padding:5px; width:fit-content;
            cursor:pointer;
        `;

        const hasImages = data.success && data.images.length;
        popup.innerHTML = `
            <p style="font-size:0.75rem;font-weight:600;margin:0${hasImages ? ' 0 4px' : ''};color:var(--text-muted);">${displayName}</p>
            ${hasImages ? `
            <div style="display:grid;grid-template-columns:repeat(2,${w}px);gap:2px;">
                ${data.images.slice(0, 6).map(img => {
                    const badgeColor = img.src === 'plant' ? 'rgba(34,197,94,0.9)' : img.src === 'default' ? 'rgba(156,163,175,0.9)' : 'rgba(99,102,241,0.9)';
                    const badgeText  = img.src === 'plant' ? 'Pflanze' : img.src === 'default' ? 'Standard' : 'Gruppe';
                    return `<div style="position:relative;">
                        <img src="${img.file_path}" style="width:${w}px;height:${h}px;object-fit:cover;border-radius:2px;display:block;">
                        <span style="position:absolute;bottom:2px;left:2px;background:${badgeColor};color:white;font-size:0.5rem;font-weight:700;padding:1px 4px;border-radius:4px;text-transform:uppercase;letter-spacing:0.03em;">${badgeText}</span>
                    </div>`;
                }).join('')}
            </div>
            <p style="font-size:0.65rem;color:var(--primary);font-weight:700;text-align:center;margin:4px 0 0;text-transform:uppercase;letter-spacing:0.03em;">🖼 Klick für Galerie</p>
            ` : ''}
        `;
        popup.addEventListener('mouseenter', () => clearTimeout(_hoverHideTimeout));
        popup.addEventListener('mouseleave', () => hideHoverGallery());
        if (hasImages) popup.addEventListener('click', () => { hideHoverGallery(); openGalleryModal(pin); });
        document.body.appendChild(popup);
        positionHoverPopup(popup, markerRect);
    }, 0);
}

function positionHoverPopup(popup, rect) {
    const pw = popup.offsetWidth  || 220;
    const ph = popup.offsetHeight || 200;
    // Kreis-Berührungspunkt rechts-unten: Mittelpunkt + Radius/√2
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    const r  = rect.width / 2;
    const edge = r / Math.SQRT2 - 4;
    let x = cx + edge;
    let y = cy + edge;
    // Viewport-Clipping: nach links/oben verschieben wenn nötig
    if (x + pw > window.innerWidth)  x = cx - edge - pw;
    if (y + ph > window.innerHeight) y = cy - edge - ph;
    popup.style.left = x + 'px';
    popup.style.top  = y + 'px';
}

let _hoverHideTimeout = null;

function hideHoverGallery() {
    clearTimeout(_hoverTimeout);
    clearTimeout(_hoverHideTimeout);
    const existing = document.getElementById('hover-gallery-popup');
    if (existing) existing.remove();
}

// =========================
// GALERIE MODAL + LIGHTBOX
// =========================
async function openGalleryModal(pin) {
    const modal = document.getElementById('gallery-modal');
    const grid  = document.getElementById('gallery-images-container');
    const title = document.getElementById('gallery-title');
    if (!modal || !grid || !title) return;

    title.textContent = pin.name;
    grid.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;">Lade Bilder…</p>';
    modal.style.display = 'flex';

    const [resPlant, resGroup] = await Promise.all([
        fetch('backend/api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getImages', type: 'plant', plant_id: pin.id })
        }),
        (pin.group_id || pin.user_group_id) ? fetch('backend/api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getImages', type: 'group', group_id: pin.group_id || null, user_group_id: pin.user_group_id || null })
        }) : Promise.resolve(null)
    ]);

    const dataPlant = await resPlant.json();
    const dataGroup = resGroup ? await resGroup.json() : { success: false, images: [] };

    const images = [
        ...(dataPlant.success ? dataPlant.images.map(i => ({ ...i, _src: 'plant' })) : []),
        ...(dataGroup.success ? dataGroup.images.map(i => ({ ...i, _src: i.type === 'default' ? 'default' : 'group' })) : [])
    ];

    if (!images.length) {
        grid.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;">Keine Bilder vorhanden.</p>';
        return;
    }

    grid.innerHTML = images.map(img => {
        const badgeColor = img._src === 'plant' ? 'rgba(34,197,94,0.9)' : img._src === 'default' ? 'rgba(156,163,175,0.9)' : 'rgba(99,102,241,0.9)';
        const badgeText  = img._src === 'plant' ? 'Pflanze' : img._src === 'default' ? 'Standard' : 'Gruppe';
        return `
        <div class="gallery-image-item" onclick="showFullImage('${img.file_path}')">
            <img src="${img.file_path}" alt="">
            <span style="position:absolute;top:10px;left:10px;background:${badgeColor};color:white;font-size:0.65rem;font-weight:700;padding:3px 8px;border-radius:20px;text-transform:uppercase;letter-spacing:0.03em;backdrop-filter:blur(4px);">${badgeText}</span>
        </div>`;
    }).join('');
}

function closeGalleryModal() {
    const modal = document.getElementById('gallery-modal');
    if (modal) modal.style.display = 'none';
}

function showFullImage(src) {
    const modal = document.getElementById('full-image-modal');
    const img   = document.getElementById('full-image-display');
    if (!modal || !img) return;
    img.src = src;
    modal.style.display = 'flex';
}

function closeFullImage() {
    const modal = document.getElementById('full-image-modal');
    if (modal) modal.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', init);
