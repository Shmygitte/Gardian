/**
 * Gardian – Gartengalerie
 */
import { api } from './core/api.js';
import { filterState } from './core/state.js';

const TYPE_ICONS = { tree: '🌳', shrub: '🌿', flower: '🌸', climber: '🌱', s_flower: '🌼' };
const TYPE_LABELS_GAL = { tree: 'Baum', shrub: 'Strauch', flower: 'Blume', climber: 'Kletterpflanze', s_flower: 'Blümchen' };

let _galerieImages = [];
let _adminFilterActive = false;

export async function loadGalerie() {
    const grid = document.getElementById('galerie-grid');
    if (!grid) return;
    grid.innerHTML = '<p style="color:rgba(255,255,255,0.4); font-size:0.9rem;">Lade...</p>';

    const data = await api('getAllImages');

    if (!data.success || !data.images.length) {
        grid.innerHTML = '<p style="color:rgba(255,255,255,0.4); font-size:0.9rem; grid-column:1/-1; text-align:center; padding:60px 0;">Noch keine Fotos vorhanden.</p>';
        return;
    }

    _galerieImages = data.images;
    populateGalerieFilters();

    const btn = document.getElementById('galerie-filter-admin');
    if (btn) {
        const hasDefaults = _galerieImages.some(img => img.type === 'default');
        btn.style.display = hasDefaults ? '' : 'none';
    }

    renderGalerie();
}

function populateGalerieFilters() {
    const selPflanze = document.getElementById('galerie-filter-pflanze');
    if (selPflanze) {
        const pflanzen = new Map();
        _galerieImages.forEach(img => {
            if (img.type === 'plant' && img.plant_id) {
                if (!pflanzen.has(img.plant_id)) {
                    pflanzen.set(img.plant_id, img.plant_name || img.group_name || '(Unbenannt)');
                }
            }
        });
        const sorted = [...pflanzen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
        selPflanze.innerHTML = '<option value="">Alle Einzelpflanzen</option>' +
            sorted.map(([id, name]) => `<option value="${id}">${name}</option>`).join('');
    }

    const selGruppe = document.getElementById('galerie-filter-gruppe');
    if (selGruppe) {
        const gruppen = new Map();
        _galerieImages.forEach(img => {
            const key = img.plant_user_group_id ? 'u' + img.plant_user_group_id
                : img.plant_group_id ? String(img.plant_group_id)
                    : img.group_id ? String(img.group_id)
                        : null;
            if (key && !gruppen.has(key)) {
                gruppen.set(key, img.group_name || '(Unbenannt)');
            }
        });
        const sorted = [...gruppen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
        selGruppe.innerHTML = '<option value="">Alle Gruppen</option>' +
            sorted.map(([key, name]) => `<option value="${key}">${name}</option>`).join('');
    }
}

export function toggleAdminFilter() {
    _adminFilterActive = !_adminFilterActive;
    const btn = document.getElementById('galerie-filter-admin');
    if (btn) btn.classList.toggle('active', _adminFilterActive);
    renderGalerie();
}

export function renderGalerie() {
    const grid = document.getElementById('galerie-grid');
    const sortBy = document.getElementById('galerie-sort')?.value || 'name';
    if (!grid) return;

    let images = [..._galerieImages];

    const gruppeFilter = document.getElementById('galerie-filter-gruppe')?.value || '';
    const pflanzeFilter = document.getElementById('galerie-filter-pflanze')?.value || '';

    if (gruppeFilter) {
        images = images.filter(img => {
            const key = img.plant_user_group_id ? 'u' + img.plant_user_group_id
                : img.plant_group_id ? String(img.plant_group_id)
                    : img.group_id ? String(img.group_id) : null;
            return key === gruppeFilter;
        });
    }

    if (pflanzeFilter) {
        images = images.filter(img => img.type === 'plant' && String(img.plant_id) === pflanzeFilter);
    }

    if (_adminFilterActive) {
        images = images.filter(img => img.type === 'default');
    }

    if (filterState.types && filterState.types.length > 0) {
        images = images.filter(img => !img.group_type || filterState.types.includes(img.group_type));
    } else if (filterState.types && filterState.types.length === 0) {
        images = [];
    }
    if (filterState.groups !== null) {
        images = images.filter(img => {
            let key;
            if (img.plant_user_group_id) key = 'u' + img.plant_user_group_id;
            else if (img.plant_group_id) key = String(img.plant_group_id);
            else if (img.group_id) key = String(img.group_id);
            else key = null;
            return key === null || filterState.groups.has(key);
        });
    }

    if (sortBy === 'name') {
        images.sort((a, b) => (a.group_name || '').localeCompare(b.group_name || '') || (a.type === 'plant' ? -1 : 1) - (b.type === 'plant' ? -1 : 1));
    } else if (sortBy === 'type') {
        images.sort((a, b) => (a.group_type || '').localeCompare(b.group_type || '') || (a.type === 'plant' ? -1 : 1) - (b.type === 'plant' ? -1 : 1));
    }

    if (!images.length) {
        grid.innerHTML = '<p style="color:rgba(255,255,255,0.4); font-size:0.9rem;">Keine Fotos gefunden.</p>';
        return;
    }

    grid.innerHTML = images.map(img => {
        const icon = TYPE_ICONS[img.group_type] || '🌿';
        const label = TYPE_LABELS_GAL[img.group_type] || img.group_type || '';
        const isPlant = img.type === 'plant';
        const isDefault = img.type === 'default';
        const badge = isPlant
            ? '<span class="galerie-badge galerie-badge--plant">Pflanze</span>'
            : isDefault
                ? '<span class="galerie-badge galerie-badge--default">Standard</span>'
                : '<span class="galerie-badge galerie-badge--group">Gruppe</span>';
        return `
        <div class="galerie-card" onclick="showFullImage('${img.file_path_gallery || img.file_path}')">
            ${badge}
            <img src="${img.file_path_gallery || img.file_path}" alt="${img.group_name}" loading="lazy">
            <div class="galerie-card__info">
                <div class="galerie-card__name">${icon} ${img.group_name}</div>
                ${label ? `<div class="galerie-card__type">${label}</div>` : ''}
            </div>
        </div>`;
    }).join('');
}

// Bridge
window.loadGalerie = loadGalerie;
window.toggleAdminFilter = toggleAdminFilter;
window.renderGalerie = renderGalerie;
