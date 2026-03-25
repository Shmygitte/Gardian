/**
 * Gardian – Globaler Filter
 * filterState wird von app.js (Karte) und pflanzen.js (Liste) genutzt.
 */

const filterState = {
    types:  ['tree', 'shrub', 'flower', 's_flower'],
    groups: null // null = alle; sonst Set mit aktiven group_ids
};

function applyFilter() {
    // Typen aus Checkboxen (ohne "Alle"-Checkbox)
    filterState.types = Array.from(
        document.querySelectorAll('#filter-types input[type="checkbox"]:checked')
    ).map(el => el.dataset.type).filter(Boolean);

    // Gruppen aus Checkboxen (ohne "Alle"-Checkbox)
    const groupBoxes = document.querySelectorAll('#filter-groups input[type="checkbox"]:not(#filter-groups-all)');
    if (groupBoxes.length > 0) {
        filterState.groups = new Set(
            Array.from(groupBoxes).filter(el => el.checked).map(el => el.value)
        );
    }

    if (typeof renderMarkers === 'function') renderMarkers();
    if (typeof renderPflanzenListeFiltered === 'function') renderPflanzenListeFiltered();
}

function toggleAllTypes(cb) {
    document.querySelectorAll('#filter-types input[type="checkbox"]:not(#filter-types-all)').forEach(el => el.checked = cb.checked);
    applyFilter();
}

function syncAllTypes() {
    const boxes = Array.from(document.querySelectorAll('#filter-types input[type="checkbox"]:not(#filter-types-all)'));
    const all = document.getElementById('filter-types-all');
    const count = boxes.filter(el => el.checked).length;
    if (count === 0) { all.checked = false; all.indeterminate = false; }
    else if (count === boxes.length) { all.checked = true; all.indeterminate = false; }
    else { all.indeterminate = true; }
}

function toggleAllGroups(cb) {
    document.querySelectorAll('#filter-groups input[type="checkbox"]:not(#filter-groups-all)').forEach(el => el.checked = cb.checked);
    applyFilter();
}

function syncAllGroups() {
    const boxes = Array.from(document.querySelectorAll('#filter-groups input[type="checkbox"]:not(#filter-groups-all)'));
    const all = document.getElementById('filter-groups-all');
    if (!all) return;
    const count = boxes.filter(el => el.checked).length;
    if (count === 0) { all.checked = false; all.indeterminate = false; }
    else if (count === boxes.length) { all.checked = true; all.indeterminate = false; }
    else { all.indeterminate = true; }
}

function toggleFilterAccordion(btn) {
    const body = btn.nextElementSibling;
    const arrow = btn.querySelector('.filter-accordion__arrow');
    const isOpen = body.style.display !== 'none';
    body.style.display = isOpen ? 'none' : 'flex';
    arrow.textContent = isOpen ? '▸' : '▾';
}

function toggleFilterPill(el) {
    el.classList.toggle('active');
    applyFilter();
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

    const alleLabel = `<label style="display:flex;align-items:center;gap:8px;font-size:0.85rem;cursor:pointer;padding:3px 0;border-bottom:1px solid var(--border);margin-bottom:2px;font-weight:600;">
        <input type="checkbox" id="filter-groups-all" checked onchange="toggleAllGroups(this)"> Alle
    </label>`;

    container.innerHTML = alleLabel + data.groups.map(g => {
        const key = g.group_id ? String(g.group_id) : 'u' + g.id;
        return `<label style="display:flex;align-items:center;gap:8px;font-size:0.85rem;cursor:pointer;padding:3px 0;">
            <input type="checkbox" value="${key}" checked onchange="syncAllGroups();applyFilter()">
            ${g.name || '(Unbenannt)'}
        </label>`;
    }).join('');

    filterState.groups = new Set(data.groups.map(g => g.group_id ? String(g.group_id) : 'u' + g.id));
}
