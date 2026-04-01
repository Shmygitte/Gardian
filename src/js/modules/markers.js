/**
 * Gardian - Marker Manager
 * Rendering, Positionierung und Events der Karten-Marker
 */
import { state, bloomState, bloomLayerFilter, filterState, DEFAULT_MARKER, elements } from '../core/state.js';
import { getBloomBitmaskForPin } from './bloom.js';
import { resolveMarkerIcon } from './icons.js';

export function renderMarkers() {
    const overlay = elements.mapCanvas?.querySelector('.map__markers-overlay');
    if (!overlay) return;
    overlay.innerHTML = '';

    const pins = state.pins.filter(pin => {
        if (!filterState.types.includes(pin.type)) return false;
        const pinGroupKey = pin.user_group_id ? `u${pin.user_group_id}` : String(pin.group_id);
        if (filterState.groups !== null && !filterState.groups.has(pinGroupKey)) return false;
        if (filterState.careFilter && typeof window.getPinsWithCareTasks === 'function') {
            if (!window.getPinsWithCareTasks(filterState.careMonths).has(pin.id)) return false;
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

        const defaults = DEFAULT_MARKER[pin.type] || DEFAULT_MARKER._fallback;
        const effectiveSize = pin.marker_size || defaults.size;
        let markerLayer = 'blooming';
        let markerColor = pin.marker_color || '#4CAF50';

        if (bloomState.enabled) {
            const bitmask = getBloomBitmaskForPin(pin);
            const isBlooming = !!((bitmask >> bloomState.month) & 1);
            let targetOpacity = '1';
            if (isBlooming) {
                markerLayer = 'blooming';
            } else if (pin.evergreen == 1) {
                markerLayer = 'evergreen';
                markerColor = '#4CAF50';
            } else {
                markerLayer = 'resting';
                targetOpacity = '0.2';
            }
            marker.style.opacity = '0';
            marker.style.transition = 'opacity 0.5s ease';
            marker._targetOpacity = targetOpacity;
            if (!bloomLayerFilter[markerLayer]) {
                marker.style.display = 'none';
            }
        }

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
        marker.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); window.openPlantEditModal(pin); });
        marker.addEventListener('mouseenter', (e) => window.showHoverGallery?.(e, pin));
        marker.addEventListener('mouseleave', () => {
            window._hoverHideTimeout = setTimeout(() => window.hideHoverGallery?.(), 400);
        });
        overlay.appendChild(marker);
    });

    // Bloom-Fade: Opacity per rAF setzen damit CSS-Transition greift
    if (bloomState.enabled) {
        requestAnimationFrame(() => {
            overlay.querySelectorAll('.marker').forEach(m => {
                if (m._targetOpacity !== undefined) m.style.opacity = m._targetOpacity;
            });
        });
    }

    // Pflege-Badges neu zeichnen falls Overlay aktiv
}

/**
 * Aktualisiert nur Bloom-Opacity bestehender Marker (ohne DOM-Rebuild).
 * Wird beim Monatswechsel aufgerufen fuer sanftes Fading.
 */
export function updateBloomOpacity() {
    const overlay = elements.mapCanvas?.querySelector('.map__markers-overlay');
    if (!overlay || !bloomState.enabled) return;

    overlay.querySelectorAll('.marker').forEach(marker => {
        const id = marker.dataset.id;
        const pin = state.pins.find(p => String(p.id) === id);
        if (!pin) return;

        const bitmask = getBloomBitmaskForPin(pin);
        const isBlooming = !!((bitmask >> bloomState.month) & 1);
        let markerLayer, targetOpacity, markerColor;

        if (isBlooming) {
            markerLayer = 'blooming';
            targetOpacity = '1';
            markerColor = pin.marker_color || '#4CAF50';
        } else if (pin.evergreen == 1) {
            markerLayer = 'evergreen';
            targetOpacity = '1';
            markerColor = '#4CAF50';
        } else {
            markerLayer = 'resting';
            targetOpacity = '0.2';
            markerColor = pin.marker_color || '#4CAF50';
        }

        marker.style.transition = 'opacity 0.5s ease';
        marker.style.opacity = targetOpacity;
        marker.dataset.layer = markerLayer;

        // Farbe updaten
        const pinEl = marker.querySelector('.marker__pin');
        if (pinEl) pinEl.style.background = markerColor;

        // Layer-Filter
        if (!bloomLayerFilter[markerLayer]) {
            marker.style.display = 'none';
        } else {
            marker.style.display = '';
        }
    });
    if (window._careOverlayActive && typeof window.renderCareBadges === 'function') {
        window.renderCareBadges();
    }
}

export function handleMarkerMouseDown(e, id) {
    e.stopPropagation();

    if (e.altKey) {
        const original = state.pins.find(p => String(p.id) === id);
        if (original) {
            state._duplicateOriginId = id;
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

// Bridge
window.renderMarkers = renderMarkers;
