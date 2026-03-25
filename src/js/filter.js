/**
 * Gardian – Globaler Filter
 * filterState wird von app.js (Karte) und pflanzen.js (Liste) genutzt.
 */

const filterState = {
    types:  ['tree', 'shrub', 'flower', 's_flower'],
    groups: null // null = alle; sonst Set mit aktiven group_ids
};

function applyFilter() {
    // Typen aus Pill-Buttons
    filterState.types = Array.from(
        document.querySelectorAll('#filter-types .filter-item.active')
    ).map(el => el.dataset.value);

    // Gruppen aus filter-item Buttons
    const groupPills = document.querySelectorAll('#filter-groups .filter-item');
    if (groupPills.length > 0) {
        filterState.groups = new Set(
            Array.from(groupPills)
                .filter(el => el.classList.contains('active'))
                .map(el => el.dataset.value)
        );
    }

    if (typeof renderMarkers === 'function') renderMarkers();
    if (typeof renderPflanzenListeFiltered === 'function') renderPflanzenListeFiltered();
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

    container.innerHTML = data.groups.map(g => {
        const key = g.group_id ? String(g.group_id) : 'u' + g.id;
        return `<button class="filter-item active" data-value="${key}" onclick="toggleFilterPill(this)">${g.name || '(Unbenannt)'}</button>`;
    }).join('');
    container.style.flexDirection = 'column';
    container.style.gap = '2px';

    filterState.groups = new Set(data.groups.map(g => g.group_id ? String(g.group_id) : 'u' + g.id));
}
