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

    // Pflege-Badges neu zeichnen falls Overlay aktiv
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
