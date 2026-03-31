/**
 * Gardian – Globaler Filter
 * filterState wird von markers.js (Karte), pflanzen.js (Liste) und galerie.js genutzt.
 */
import { api } from './core/api.js';
import { filterState, plantTypesCache } from './core/state.js';

export function applyFilter() {
    filterState.types = Array.from(
        document.querySelectorAll('#filter-types input[type="checkbox"]:checked')
    ).map(el => el.dataset.type).filter(Boolean);

    const groupBoxes = document.querySelectorAll('#filter-groups input[type="checkbox"]:not(#filter-groups-all)');
    if (groupBoxes.length > 0) {
        filterState.groups = new Set(
            Array.from(groupBoxes).filter(el => el.checked).map(el => el.value)
        );
    }

    if (typeof window.renderMarkers === 'function') window.renderMarkers();
    if (typeof window.renderPflanzenListeFiltered === 'function') window.renderPflanzenListeFiltered();
    if (typeof window.renderGalerie === 'function') window.renderGalerie();
}

export function toggleAllTypes(cb) {
    document.querySelectorAll('#filter-types input[type="checkbox"]:not(#filter-types-all)').forEach(el => el.checked = cb.checked);
    applyFilter();
}

export function syncAllTypes() {
    const boxes = Array.from(document.querySelectorAll('#filter-types input[type="checkbox"]:not(#filter-types-all)'));
    const all = document.getElementById('filter-types-all');
    const count = boxes.filter(el => el.checked).length;
    if (count === 0) { all.checked = false; all.indeterminate = false; }
    else if (count === boxes.length) { all.checked = true; all.indeterminate = false; }
    else { all.indeterminate = true; }
}

export function toggleAllGroups(cb) {
    document.querySelectorAll('#filter-groups input[type="checkbox"]:not(#filter-groups-all)').forEach(el => el.checked = cb.checked);
    applyFilter();
}

export function syncAllGroups() {
    const boxes = Array.from(document.querySelectorAll('#filter-groups input[type="checkbox"]:not(#filter-groups-all)'));
    const all = document.getElementById('filter-groups-all');
    if (!all) return;
    const count = boxes.filter(el => el.checked).length;
    if (count === 0) { all.checked = false; all.indeterminate = false; }
    else if (count === boxes.length) { all.checked = true; all.indeterminate = false; }
    else { all.indeterminate = true; }
}

export function toggleFilterAccordion(btn) {
    const body = btn.nextElementSibling;
    const arrow = btn.querySelector('.filter-accordion__arrow');
    const isOpen = body.style.display !== 'none';
    body.style.display = isOpen ? 'none' : 'flex';
    arrow.textContent = isOpen ? '▸' : '▾';
    _saveAccordionState();
}

function _saveAccordionState() {
    const st = {};
    document.querySelectorAll('.filter-accordion').forEach((acc, i) => {
        const body = acc.querySelector('.filter-accordion__body');
        if (body) st[i] = body.style.display !== 'none';
    });
    sessionStorage.setItem('filterAccordionState', JSON.stringify(st));
}

export function _restoreAccordionState() {
    const raw = sessionStorage.getItem('filterAccordionState');
    if (!raw) return;
    const st = JSON.parse(raw);
    document.querySelectorAll('.filter-accordion').forEach((acc, i) => {
        if (st[i] === undefined) return;
        const body = acc.querySelector('.filter-accordion__body');
        const arrow = acc.querySelector('.filter-accordion__arrow');
        if (body) body.style.display = st[i] ? 'flex' : 'none';
        if (arrow) arrow.textContent = st[i] ? '▾' : '▸';
    });
}

export function toggleFilterPill(el) {
    el.classList.toggle('active');
    applyFilter();
}

export function setCareFilterActive(active) {
    filterState.careFilter = active;
    if (active && typeof window.ensureCareTasksLoaded === 'function') {
        window.ensureCareTasksLoaded().then(() => {
            if (typeof window.renderMarkers === 'function') window.renderMarkers();
            if (typeof window.renderCareBadges === 'function' && window._careOverlayActive) window.renderCareBadges();
        });
    } else {
        if (typeof window.renderMarkers === 'function') window.renderMarkers();
    }
}

export function toggleCareMonth(month) {
    if (filterState.careMonths.has(month)) filterState.careMonths.delete(month);
    else filterState.careMonths.add(month);
    _updateCareMonthButtons();
    _onCareMonthsChanged();
}

export function setAllCareMonths() {
    filterState.careMonths.clear();
    _updateCareMonthButtons();
    _onCareMonthsChanged();
}

export function setCareOverlayMonth(month) {
    filterState.careMonths.clear();
    filterState.careMonths.add(month);
    _updateCareMonthButtons();
}

export function setCareFilterMonth(month) {
    // Sidebar-Monats-Buttons initial setzen
    filterState.careMonths.clear();
    filterState.careMonths.add(month);
    _updateCareMonthButtons();
}

function _updateCareMonthButtons() {
    const allActive = filterState.careMonths.size === 0;
    const allBtn = document.getElementById('sidebar-care-all-btn');
    if (allBtn) {
        allBtn.style.background = allActive ? 'var(--primary)' : 'var(--bg-app)';
        allBtn.style.color = allActive ? 'white' : 'var(--text-main)';
        allBtn.style.borderColor = allActive ? 'var(--primary)' : 'var(--border)';
    }
    document.querySelectorAll('.sidebar-care-month-btn').forEach(btn => {
        const active = !allActive && filterState.careMonths.has(parseInt(btn.dataset.month));
        btn.style.background = active ? 'var(--primary)' : 'var(--bg-app)';
        btn.style.color = active ? 'white' : 'var(--text-main)';
        btn.style.borderColor = active ? 'var(--primary)' : 'var(--border)';
    });
}

function _onCareMonthsChanged() {
    if (filterState.careFilter && typeof window.renderMarkers === 'function') window.renderMarkers();
    if (window._careOverlayActive && typeof window.renderCareBadges === 'function') window.renderCareBadges();
}

export async function loadFilterGroups() {
    const container = document.getElementById('filter-groups');
    if (!container) return;
    const data = await api('getPlantsList');
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

export function renderTypeFilters() {
    const container = document.getElementById('filter-types');
    if (!container) return;
    const allLabel = container.querySelector('#filter-types-all')?.parentElement;
    const checkboxes = plantTypesCache.map(t =>
        `<label style="display:flex;align-items:center;gap:8px;font-size:0.85rem;cursor:pointer;padding:3px 0;"><input type="checkbox" checked onchange="syncAllTypes();applyFilter()" data-type="${t.key}"> ${t.icon || ''} ${t.label}</label>`
    ).join('');
    if (allLabel) {
        container.innerHTML = '';
        container.appendChild(allLabel);
        container.insertAdjacentHTML('beforeend', checkboxes);
    } else {
        container.innerHTML = checkboxes;
    }
}

// Bridge
window.applyFilter = applyFilter;
window.toggleAllTypes = toggleAllTypes;
window.syncAllTypes = syncAllTypes;
window.toggleAllGroups = toggleAllGroups;
window.syncAllGroups = syncAllGroups;
window.toggleFilterAccordion = toggleFilterAccordion;
window._restoreAccordionState = _restoreAccordionState;
window.toggleFilterPill = toggleFilterPill;
window.setCareFilterActive = setCareFilterActive;
window.toggleCareMonth = toggleCareMonth;
window.setAllCareMonths = setAllCareMonths;
window.setCareOverlayMonth = setCareOverlayMonth;
window.setCareFilterMonth = setCareFilterMonth;
window.loadFilterGroups = loadFilterGroups;
window.renderTypeFilters = renderTypeFilters;
