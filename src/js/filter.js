/**
 * Gardian – Globaler Filter
 * filterState wird von app.js (Karte) und pflanzen.js (Liste) genutzt.
 */

const filterState = {
    types:  ['tree', 'shrub', 'flower', 's_flower'],
    groups: null // null = alle; sonst Set mit aktiven group_ids
};

function applyFilter() {
    // Typen auslesen
    filterState.types = Array.from(
        document.querySelectorAll('#filter-types input:checked')
    ).map(el => el.value);

    // Gruppen auslesen
    const groupCheckboxes = document.querySelectorAll('#filter-groups input');
    if (groupCheckboxes.length > 0) {
        filterState.groups = new Set(
            Array.from(groupCheckboxes)
                .filter(el => el.checked)
                .map(el => el.value)
        );
    }

    // Karte neu rendern falls aktiv
    if (typeof renderMarkers === 'function') renderMarkers();

    // Pflanzenliste neu rendern falls aktiv
    if (typeof renderPflanzenListeFiltered === 'function') renderPflanzenListeFiltered();
}

async function loadFilterGroups() {
    const container = document.getElementById('filter-groups');
    const res  = await fetch('backend/api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getPlantsList' })
    });
    const data = await res.json();
    if (!data.success || !data.groups.length) {
        container.innerHTML = '<p style="font-size:0.8rem;color:var(--text-muted);">Keine Gruppen.</p>';
        return;
    }

    container.innerHTML = data.groups.map(g => {
        const key = g.group_id ? String(g.group_id) : 'u' + g.id;
        return `
        <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; cursor:pointer;">
            <input type="checkbox" value="${key}" checked onchange="applyFilter()">
            ${g.name || '(Unbenannt)'}
        </label>`;
    }).join('');

    // Initialen filterState setzen
    filterState.groups = new Set(data.groups.map(g => g.group_id ? String(g.group_id) : 'u' + g.id));
}
