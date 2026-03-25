/**
 * Gardian – Gartengalerie
 */

const TYPE_ICONS = { tree: '🌳', shrub: '🌿', flower: '🌸', s_flower: '🌼' };
const TYPE_LABELS_GAL = { tree: 'Baum', shrub: 'Strauch', flower: 'Blume', s_flower: 'Saisonblume' };

let _galerieImages = [];

async function loadGalerie() {
    const grid = document.getElementById('galerie-grid');
    if (!grid) return;
    grid.innerHTML = '<p style="color:rgba(255,255,255,0.4); font-size:0.9rem;">Lade...</p>';

    const res  = await fetch('backend/api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getAllImages' })
    });
    const data = await res.json();

    if (!data.success || !data.images.length) {
        grid.innerHTML = '<p style="color:rgba(255,255,255,0.4); font-size:0.9rem; grid-column:1/-1; text-align:center; padding:60px 0;">Noch keine Fotos vorhanden.</p>';
        return;
    }

    _galerieImages = data.images;
    renderGalerie();
}

function renderGalerie() {
    const grid   = document.getElementById('galerie-grid');
    const sortBy = document.getElementById('galerie-sort')?.value || 'name';
    if (!grid) return;

    let images = [..._galerieImages];

    // Sidebar-Filter anwenden
    if (typeof filterState !== 'undefined') {
        if (filterState.types && filterState.types.length > 0) {
            images = images.filter(img => !img.group_type || filterState.types.includes(img.group_type));
        } else if (filterState.types && filterState.types.length === 0) {
            images = [];
        }
        if (filterState.groups !== null) {
            images = images.filter(img => {
                // Schlüssel gleich wie in filter.js: group_id → String, user_group_id → 'u' + id
                let key;
                if (img.plant_user_group_id) key = 'u' + img.plant_user_group_id;
                else if (img.plant_group_id)  key = String(img.plant_group_id);
                else if (img.group_id)        key = String(img.group_id);
                else                          key = null;
                return key === null || filterState.groups.has(key);
            });
        }
    }

    if (sortBy === 'name') {
        images.sort((a, b) => (a.group_name || '').localeCompare(b.group_name || ''));
    } else if (sortBy === 'type') {
        images.sort((a, b) => (a.group_type || '').localeCompare(b.group_type || ''));
    }

    if (!images.length) {
        grid.innerHTML = '<p style="color:rgba(255,255,255,0.4); font-size:0.9rem;">Keine Fotos gefunden.</p>';
        return;
    }

    grid.innerHTML = images.map(img => {
        const icon  = TYPE_ICONS[img.group_type]  || '🌿';
        const label = TYPE_LABELS_GAL[img.group_type] || img.group_type || '';
        return `
        <div class="galerie-card" onclick="showFullImage('${img.file_path}')">
            <img src="${img.file_path}" alt="${img.group_name}" loading="lazy">
            <div class="galerie-card__info">
                <div class="galerie-card__name">${icon} ${img.group_name}</div>
                ${label ? `<div class="galerie-card__type">${label}</div>` : ''}
            </div>
        </div>`;
    }).join('');
}
