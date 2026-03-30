/**
 * Gardian - Hover Gallery & Gallery Modal & Lightbox
 */
import { api } from '../core/api.js';
import { state, hoverSettings, HOVER_SIZE_MAP } from '../core/state.js';

let _hoverTimeout = null;
let _mousePos = { x: 0, y: 0 };
let _hoverHideTimeout = null;

document.addEventListener('mousemove', e => { _mousePos.x = e.clientX; _mousePos.y = e.clientY; });

// Expose für map-engine.js
window._mousePos = _mousePos;
window._hoverSettings = hoverSettings;

export function setHoverGallery(enabled) {
    hoverSettings.galleryEnabled = enabled;
    _updateHoverSizeVisibility();
}

export function setHoverLock(locked) {
    hoverSettings.locked = locked;
    _updateHoverSizeVisibility();
}

export function setHoverSize(size) {
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

export async function showHoverGallery(e, pin) {
    hideHoverGallery();
    if (hoverSettings.locked) return;

    const markerRect = e.currentTarget.getBoundingClientRect();
    const displayName = pin.plant_name
        ? `${pin.name} · ${pin.plant_name}`
        : pin.name;

    if (!hoverSettings.galleryEnabled) {
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

    _hoverTimeout = setTimeout(async () => {
        const data = await api('getImagesForPin', { plant_id: pin.id, group_id: pin.group_id, user_group_id: pin.user_group_id || null });
        const { w, h } = HOVER_SIZE_MAP[hoverSettings.size] || HOVER_SIZE_MAP.M;

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
                    const badgeText = img.src === 'plant' ? 'Pflanze' : img.src === 'default' ? 'Standard' : 'Gruppe';
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
    const pw = popup.offsetWidth || 220;
    const ph = popup.offsetHeight || 200;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const r = rect.width / 2;
    const edge = r / Math.SQRT2 - 4;
    let x = cx + edge;
    let y = cy + edge;
    if (x + pw > window.innerWidth) x = cx - edge - pw;
    if (y + ph > window.innerHeight) y = cy - edge - ph;
    popup.style.left = x + 'px';
    popup.style.top = y + 'px';
}

export function hideHoverGallery() {
    clearTimeout(_hoverTimeout);
    clearTimeout(_hoverHideTimeout);
    const existing = document.getElementById('hover-gallery-popup');
    if (existing) existing.remove();
}

// === Gallery Modal & Lightbox ===

export async function openGalleryModal(pin) {
    const modal = document.getElementById('gallery-modal');
    const grid = document.getElementById('gallery-images-container');
    const title = document.getElementById('gallery-title');
    if (!modal || !grid || !title) return;

    title.textContent = pin.name;
    grid.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;">Lade Bilder…</p>';
    modal.style.display = 'flex';

    const [dataPlant, dataGroup] = await Promise.all([
        api('getImages', { type: 'plant', plant_id: pin.id }),
        (pin.group_id || pin.user_group_id)
            ? api('getImages', { type: 'group', group_id: pin.group_id || null, user_group_id: pin.user_group_id || null })
            : Promise.resolve({ success: false, images: [] })
    ]);

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
        const badgeText = img._src === 'plant' ? 'Pflanze' : img._src === 'default' ? 'Standard' : 'Gruppe';
        return `
        <div class="gallery-image-item" onclick="showFullImage('${img.file_path}')">
            <img src="${img.file_path}" alt="">
            <span style="position:absolute;top:10px;left:10px;background:${badgeColor};color:white;font-size:0.65rem;font-weight:700;padding:3px 8px;border-radius:20px;text-transform:uppercase;letter-spacing:0.03em;backdrop-filter:blur(4px);">${badgeText}</span>
        </div>`;
    }).join('');
}

export function closeGalleryModal() {
    const modal = document.getElementById('gallery-modal');
    if (modal) modal.style.display = 'none';
}

export function showFullImage(src) {
    const modal = document.getElementById('full-image-modal');
    const img = document.getElementById('full-image-display');
    if (!modal || !img) return;
    img.src = src;
    modal.style.display = 'flex';
}

export function closeFullImage() {
    const modal = document.getElementById('full-image-modal');
    if (modal) modal.style.display = 'none';
}

// Bridge
window.setHoverGallery = setHoverGallery;
window.setHoverLock = setHoverLock;
window.setHoverSize = setHoverSize;
window.showHoverGallery = showHoverGallery;
window.hideHoverGallery = hideHoverGallery;
window.openGalleryModal = openGalleryModal;
window.closeGalleryModal = closeGalleryModal;
window.showFullImage = showFullImage;
window.closeFullImage = closeFullImage;
window._hoverHideTimeout = _hoverHideTimeout;
