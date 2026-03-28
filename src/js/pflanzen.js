/**
 * Gardian – Pflanzen-Liste
 */

const FIELD_LABELS = {
    type:               'Typ',
    bloom_months:       'Blütezeit (Standard)',
    marker_icon:        'Marker-Icon',
    marker_color:       'Marker-Farbe',
    marker_size:        'Marker-Größe',
    height:             'Höhe',
    location:           'Standort',
    spacing:            'Pflanzabstand',
    care:               'Pflege',
    water:              'Wasser',
    hardy:              'Winterhart',
    scented:            'Duftend',
    cutflower:          'Schnittblume',
    lifespan:           'Lebenszeit',
    features:           'Besonderheiten',
    evergreen:          'Immergrün',
    planned_month_year: 'Geplant',
    planted_month_year: 'Gepflanzt',
    removed_month_year: 'Verschwunden',
    removed_reason:     'Grund',
    pos_x:              'Position X (%)',
    pos_y:              'Position Y (%)',
    created_at:         'Erstellt am',
};

const TYPE_LABELS = { tree: 'Baum', shrub: 'Strauch', flower: 'Blume', s_flower: 'Blümchen' };

function formatValue(key, val) {
    if (val === null || val === undefined || val === '') return '—';
    if (key === 'type') return TYPE_LABELS[val] || val;
    if (key === 'hardy' || key === 'scented' || key === 'cutflower' || key === 'evergreen') return val == 1 ? 'Ja' : 'Nein';
    if (key === 'marker_color') return `<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${val};border:1px solid #ccc;vertical-align:middle;margin-right:4px;"></span>${val}`;
    if (key === 'pos_x' || key === 'pos_y') return parseFloat(val).toFixed(1) + '%';
    if (key === 'planned_month_year' || key === 'planted_month_year' || key === 'removed_month_year') {
        const [y, m] = val.split('-');
        const names = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
        return (names[parseInt(m, 10) - 1] || m) + ' ' + y;
    }
    if (key === 'removed_reason') return val === 'manuell' ? 'Manuell entfernt' : 'Von selbst';
    if (key === 'bloom_months') {
        const names = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
        const bitmask = parseInt(val) || 0;
        const active = names.filter((_, i) => (bitmask >> i) & 1);
        return active.length ? active.join(', ') : '—';
    }
    return val;
}

function renderFieldTable(obj, fields) {
    const rows = fields
        .filter(f => obj[f] !== null && obj[f] !== undefined && obj[f] !== '')
        .map(f => `<tr>
            <td style="padding:4px 12px 4px 0; color:var(--text-muted); white-space:nowrap; font-size:0.85rem;">${FIELD_LABELS[f] || f}</td>
            <td style="padding:4px 0; font-size:0.85rem;">${formatValue(f, obj[f])}</td>
        </tr>`).join('');
    if (!rows) return '<p style="color:var(--text-muted);font-size:0.85rem;">Keine Felder gesetzt.</p>';
    return `<table style="border-collapse:collapse;width:100%;">${rows}</table>`;
}

const GROUP_FIELDS = ['type','bloom_months','marker_icon','marker_color','marker_size','height','location','spacing','care','water','hardy','scented','cutflower','lifespan','features','evergreen'];
const PLANT_FIELDS = ['planned_month_year','planted_month_year','removed_month_year','removed_reason','bloom_months','marker_icon','marker_color','marker_size','height','location','spacing','care','water','hardy','scented','cutflower','lifespan','features','evergreen'];

let _pflanzenData = null;
const _bloomLoaded = new Set();

function renderPflanzenListeFiltered() {
    if (_pflanzenData) renderPflanzenListe(_pflanzenData);
}

async function loadPflanzenListe() {
    _bloomLoaded.clear();
    const container = document.getElementById('pflanzen-liste');
    container.innerHTML = '<p style="color:var(--text-muted)">Lade...</p>';

    const res = await fetch('backend/api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getPlantsList' })
    });
    const data = await res.json();

    if (!data.success) {
        container.innerHTML = '<p style="color:red">Fehler beim Laden.</p>';
        return;
    }

    _pflanzenData = data;
    renderPflanzenListe(data);
}

function renderPflanzenListe(data) {
    const container = document.getElementById('pflanzen-liste');
    if (!container) return;

    // Filter anwenden
    let groups = data.groups;
    if (typeof filterState !== 'undefined') {
        groups = groups.filter(g => {
            if (filterState.types.length && g.type && !filterState.types.includes(g.type)) return false;
            const groupKey = g.group_id ? String(g.group_id) : `u${g.id}`;
            if (filterState.groups !== null && !filterState.groups.has(groupKey)) return false;
            return true;
        });
    }

    if (!groups.length) {
        container.innerHTML = '<p style="color:var(--text-muted)">Keine Pflanzengruppen für aktiven Filter.</p>';
        return;
    }

    container.innerHTML = groups.map((group, gi) => {
        const groupId = `group-${gi}`;
        const plantsHtml = group.plants.length
            ? group.plants.map((plant, pi) => {
                const plantId = `plant-${gi}-${pi}`;
                return `
                <div style="margin:10px 0; padding:10px 14px; border-left:5px solid var(--primary); background:var(--bg-app); border-radius:0 var(--radius-sm) var(--radius-sm) 0; box-shadow:inset 0 0 0 1px var(--border), 0 2px 6px rgba(0,0,0,0.1);">
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0;">
                        <span id="plant-label-${plant.id}" onclick="toggleAccordion('${plantId}'); ensureBloomLoaded('plant', ${plant.id}, ${group.bloom_months_resolved || 0}); loadImages('plant', null, ${plant.id}, 'images-plant-${plant.id}')" ondblclick="event.stopPropagation(); startPlantRename(${plant.id})" style="cursor:pointer; font-size:0.9rem; font-weight:600; flex:1;" title="Doppelklick zum Umbenennen">${plant.plant_name || 'Pflanze #' + plant.id}</span>
                        <div style="display:flex; align-items:center; gap:6px;">
                            <button class="c-btn c-btn--text" style="font-size:0.75rem; color:var(--danger); padding:2px 6px;" onclick="deletePlant(${plant.id})">Löschen</button>
                            <span onclick="toggleAccordion('${plantId}'); ensureBloomLoaded('plant', ${plant.id}, ${group.bloom_months_resolved || 0})" id="${plantId}-icon" style="font-size:0.8rem; color:var(--text-muted); cursor:pointer;">▶</span>
                        </div>
                    </div>
                    <div id="${plantId}" style="display:none; padding-bottom:8px;">
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:12px;">
                            <div>
                                <div style="margin-top:8px; display:flex; flex-direction:column; gap:6px;">
                                    <div style="display:flex; align-items:center; gap:6px;">
                                        <label style="font-size:0.78rem; color:var(--text-muted); white-space:nowrap; width:90px;">Geplant:</label>
                                        <input type="month" value="${plant.planned_month_year || ''}"
                                            style="font-size:0.8rem; padding:3px 6px; border:1px solid var(--border); border-radius:var(--radius-sm); background:var(--bg-app); color:var(--text-main);"
                                            onchange="savePlantField(${plant.id}, 'planned_month_year', this.value || null)">
                                    </div>
                                    <div style="display:flex; align-items:center; gap:6px;">
                                        <label style="font-size:0.78rem; color:var(--text-muted); white-space:nowrap; width:90px;">Gepflanzt:</label>
                                        <input type="month" value="${plant.planted_month_year || ''}"
                                            style="font-size:0.8rem; padding:3px 6px; border:1px solid var(--border); border-radius:var(--radius-sm); background:var(--bg-app); color:var(--text-main);"
                                            onchange="savePlantField(${plant.id}, 'planted_month_year', this.value || null)">
                                    </div>
                                    <div style="display:flex; align-items:center; gap:6px;">
                                        <label style="font-size:0.78rem; color:var(--text-muted); white-space:nowrap; width:90px;">Verschwunden:</label>
                                        <input type="month" value="${plant.removed_month_year || ''}"
                                            id="removed-date-${plant.id}"
                                            style="font-size:0.8rem; padding:3px 6px; border:1px solid var(--border); border-radius:var(--radius-sm); background:var(--bg-app); color:var(--text-main);"
                                            onchange="savePlantField(${plant.id}, 'removed_month_year', this.value || null); toggleRemovedReason(${plant.id}, this.value)">
                                        <select id="removed-reason-${plant.id}"
                                            style="font-size:0.8rem; padding:3px 6px; border:1px solid var(--border); border-radius:var(--radius-sm); background:var(--bg-app); color:var(--text-main); display:${plant.removed_month_year ? 'block' : 'none'};"
                                            onchange="savePlantField(${plant.id}, 'removed_reason', this.value || null)">
                                            <option value="">— Grund</option>
                                            <option value="manuell" ${plant.removed_reason === 'manuell' ? 'selected' : ''}>Manuell entfernt</option>
                                            <option value="selbst"  ${plant.removed_reason === 'selbst'  ? 'selected' : ''}>Von selbst</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <p style="font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-bottom:6px;">FOTOS</p>
                                <div id="images-plant-${plant.id}"></div>
                                <input type="file" id="file-plant-${plant.id}" accept="image/*" style="position:absolute;opacity:0;width:0;height:0;" onchange="uploadImage(this,'plant',null,${plant.id},'images-plant-${plant.id}')">
                                <button class="c-btn c-btn--text" style="font-size:0.8rem;" onclick="document.getElementById('file-plant-${plant.id}').click()">+ Foto hochladen</button>
                            </div>
                        </div>
                        <div style="border-top:1px solid var(--border); padding-top:10px;">
                            <p style="font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-bottom:6px;">BLÜTEZEIT & BEOBACHTUNGEN</p>
                            <div id="bloom-plant-${plant.id}"><p style="font-size:0.8rem;color:var(--text-muted);">Lade...</p></div>
                        </div>
                    </div>
                </div>`;
            }).join('')
            : '<p style="margin:8px 0 0 16px; color:var(--text-muted); font-size:0.85rem;">Keine Pflanzen in dieser Gruppe.</p>';

        return `
        <div style="margin-bottom:4px; border:1px solid var(--border); border-radius:var(--radius-md); overflow:hidden;">
            <div style="padding:6px 12px; background:var(--bg-card); display:flex; justify-content:space-between; align-items:center;">
                <span onclick="toggleAccordion('${groupId}'); ensureBloomLoaded('group', ${group.id}, ${group.bloom_months_resolved || 0}); loadImages('group', ${group.group_id || null}, null, 'images-group-${group.id}', ${group.id})" style="cursor:pointer; font-weight:600; flex:1;">${group.name || '(Unbenannte Gruppe)'}</span>
                <div style="display:flex; align-items:center; gap:10px;">
                    <button class="c-btn c-btn--text" style="font-size:0.8rem;" onclick="openGruppeBearbeitenModal(${group.id})">Bearbeiten</button>
                    <button class="c-btn c-btn--text" style="font-size:0.8rem; color:var(--danger);" onclick="deleteUserGroup(${group.id}, ${group.plants.length})">Löschen</button>
                    <span onclick="toggleAccordion('${groupId}'); ensureBloomLoaded('group', ${group.id}, ${group.bloom_months_resolved || 0})" style="cursor:pointer; font-size:0.8rem; color:var(--text-muted);">${group.plants.length} Pflanze(n) &nbsp;<span id="${groupId}-icon">▼</span></span>
                </div>
            </div>
            <div id="${groupId}" style="display:none; padding:12px 16px; background:var(--bg-surface);">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:12px;">
                    <div>
                        <p style="font-size:0.85rem; font-weight:700; color:var(--text-main); margin-bottom:6px;">FOTOS</p>
                        <div id="images-group-${group.id}"></div>
                        <input type="file" id="file-group-${group.id}" accept="image/*" style="position:absolute;opacity:0;width:0;height:0;" onchange="uploadImage(this,'group',${group.group_id || null},null,'images-group-${group.id}',${group.id})">
                        <button class="c-btn c-btn--text" style="font-size:0.8rem;" onclick="document.getElementById('file-group-${group.id}').click()">+ Foto hochladen</button>
                    </div>
                </div>
                <div style="border-top:1px solid var(--border); padding-top:10px;">
                    <p style="font-size:0.85rem; font-weight:700; color:var(--text-main); margin-bottom:6px;">BLÜTEZEIT & BEOBACHTUNGEN</p>
                    <div id="bloom-group-${group.id}"><p style="font-size:0.8rem;color:var(--text-muted);">Lade...</p></div>
                </div>
                <p style="font-size:0.75rem; font-weight:600; color:var(--text-muted); margin:16px 0 4px; letter-spacing:0.05em; text-transform:uppercase;">Einzelpflanzen</p>
                ${plantsHtml}
            </div>
        </div>`;
    }).join('');
}

function startPlantRename(plantId) {
    const label = document.getElementById(`plant-label-${plantId}`);
    if (!label) return;
    const currentName = label.textContent.trim();
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName.startsWith('Pflanze #') ? '' : currentName;
    input.placeholder = `Pflanze #${plantId}`;
    input.style.cssText = 'font-size:0.9rem; font-weight:600; border:none; border-bottom:2px solid var(--primary); background:transparent; outline:none; width:180px;';

    const save = async () => {
        const newName = input.value.trim() || null;
        await fetch('backend/api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'updatePlant', id: plantId, name: newName })
        });
        label.textContent = newName || `Pflanze #${plantId}`;
        input.replaceWith(label);
    };

    input.addEventListener('keydown', e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') input.replaceWith(label); });
    input.addEventListener('blur', save);
    label.replaceWith(input);
    input.focus();
    input.select();
}

async function savePlantField(plantId, field, value) {
    await fetch('backend/api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updatePlant', id: plantId, [field]: value })
    });
    if (_pflanzenData) {
        for (const g of _pflanzenData.groups) {
            const p = g.plants.find(p => p.id === plantId);
            if (p) { p[field] = value; break; }
        }
    }
}

function toggleRemovedReason(plantId, dateValue) {
    const sel = document.getElementById(`removed-reason-${plantId}`);
    if (sel) sel.style.display = dateValue ? 'block' : 'none';
    if (!dateValue && sel) { sel.value = ''; savePlantField(plantId, 'removed_reason', null); }
}

function toggleAccordion(id) {
    const el = document.getElementById(id);
    const icon = document.getElementById(id + '-icon');
    if (!el) return;
    const open = el.style.display === 'block';
    el.style.display = open ? 'none' : 'block';
    if (icon) icon.textContent = open ? '▼' : '▲';
}

// ========================
// BLÜTEZEIT & BEOBACHTUNGEN
// ========================

async function ensureBloomLoaded(type, id, inheritedBitmask) {
    const key = `${type}-${id}`;
    if (_bloomLoaded.has(key)) return;
    _bloomLoaded.add(key);

    const container = document.getElementById(`bloom-${type}-${id}`);
    if (!container) return;

    const param = type === 'group' ? { user_group_id: id } : { plant_id: id };
    const res  = await fetch('backend/api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getBloomObservations', ...param })
    });
    const data = await res.json();
    const observations = data.success ? data.observations : [];
    renderBloomSection(container, type, id, inheritedBitmask, observations);
}

function renderBloomSection(container, type, id, inheritedBitmask, observations) {
    const months = ['J','F','M','A','M','J','J','A','S','O','N','D'];

    // Tab-Daten: Standard + sichtbare Jahre (1. Jan < heute) + weitere gespeicherte Jahre
    const currentYear  = new Date().getFullYear();
    const defaultYears = [2025, 2026, 2027, 2028, 2029, 2030].filter(y => y <= currentYear);
    const obsMap = Object.fromEntries(observations.map(o => [String(o.year), parseInt(o.bloom_months)]));
    const allYears = [...new Set([...defaultYears, ...observations.map(o => parseInt(o.year))])].sort();

    const tabs = [
        ...(type === 'group' ? [{ key: 'std', label: 'Standard', bitmask: inheritedBitmask, readonly: true }] : []),
        ...allYears.map(y => ({ key: String(y), label: String(y), bitmask: obsMap[y] ?? 0, readonly: false }))
    ];

    function tabsHtml(activeKey) {
        return tabs.map(t => `
            <button type="button" onclick="switchBloomTab('bloom-${type}-${id}', '${t.key}')"
                style="padding:4px 12px; border-radius:20px; border:1px solid var(--border); font-size:0.8rem; cursor:pointer;
                       background:${t.key === activeKey ? 'var(--primary)' : 'var(--bg-app)'};
                       color:${t.key === activeKey ? 'white' : 'var(--text-main)'};"
                data-tab-key="${t.key}">${t.label}</button>`).join('');
    }

    function togglesHtml(bitmask, readonly, tabKey) {
        return months.map((m, i) => {
            const active = (bitmask >> i) & 1;
            const onclick = readonly ? '' : `onclick="bloomToggleMonth(this, ${i}, '${type}', ${id}, '${tabKey}')"`;
            return `<button type="button" ${onclick} data-active="${active}"
                style="width:30px;height:30px;border-radius:6px;border:1px solid var(--border);font-size:0.75rem;font-weight:600;
                       cursor:${readonly ? 'default' : 'pointer'};
                       background:${active ? 'var(--primary)' : 'var(--bg-app)'};
                       color:${active ? 'white' : 'var(--text-main)'};">${m}</button>`;
        }).join('');
    }

    const firstTab = tabs[0];
    container.innerHTML = `
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:8px;">
            <div id="bloom-tabs-${type}-${id}" style="display:flex;gap:4px;flex-wrap:wrap;">${firstTab ? tabsHtml(firstTab.key) : ''}</div>
            <button type="button" onclick="addBloomYear('${type}', ${id})"
                style="padding:4px 10px;border-radius:20px;border:1px dashed var(--border);font-size:0.8rem;cursor:pointer;background:transparent;color:var(--text-muted);">+ Jahr</button>
        </div>
        <div id="bloom-toggles-${type}-${id}" style="display:flex;gap:4px;flex-wrap:wrap;">
            ${firstTab ? togglesHtml(firstTab.bitmask, firstTab.readonly, firstTab.key) : ''}
        </div>
        <input type="hidden" id="bloom-activekey-${type}-${id}" value="${firstTab ? firstTab.key : ''}">
        <script type="application/json" id="bloom-tabdata-${type}-${id}">${JSON.stringify(tabs)}</script>`;
}

function switchBloomTab(containerId, key) {
    const container   = document.getElementById(containerId);
    if (!container) return;
    const [,type, id] = containerId.split('-');
    const tabs        = JSON.parse(document.getElementById(`bloom-tabdata-${type}-${id}`).textContent);
    const tab         = tabs.find(t => t.key === key);
    if (!tab) return;

    const months = ['J','F','M','A','M','J','J','A','S','O','N','D'];
    document.getElementById(`bloom-toggles-${type}-${id}`).innerHTML = months.map((m, i) => {
        const active  = (tab.bitmask >> i) & 1;
        const onclick = tab.readonly ? '' : `onclick="bloomToggleMonth(this, ${i}, '${type}', ${id}, '${key}')"`;
        return `<button type="button" ${onclick} data-active="${active}"
            style="width:30px;height:30px;border-radius:6px;border:1px solid var(--border);font-size:0.75rem;font-weight:600;
                   cursor:${tab.readonly ? 'default' : 'pointer'};
                   background:${active ? 'var(--primary)' : 'var(--bg-app)'};
                   color:${active ? 'white' : 'var(--text-main)'};">${m}</button>`;
    }).join('');

    document.getElementById(`bloom-activekey-${type}-${id}`).value = key;

    // Tab-Buttons neu rendern
    document.getElementById(`bloom-tabs-${type}-${id}`).querySelectorAll('button').forEach(btn => {
        const isActive = btn.dataset.tabKey === key;
        btn.style.background = isActive ? 'var(--primary)' : 'var(--bg-app)';
        btn.style.color      = isActive ? 'white' : 'var(--text-main)';
    });
}

async function bloomToggleMonth(btn, index, type, id, year) {
    const active  = btn.dataset.active === '1';
    btn.dataset.active   = active ? '0' : '1';
    btn.style.background = active ? 'var(--bg-app)' : 'var(--primary)';
    btn.style.color      = active ? 'var(--text-main)' : 'white';

    // Bitmask aus Tab-Daten aktualisieren
    const tabs    = JSON.parse(document.getElementById(`bloom-tabdata-${type}-${id}`).textContent);
    const tab     = tabs.find(t => t.key === year);
    let bitmask   = tab ? tab.bitmask : 0;
    bitmask       = active ? bitmask & ~(1 << index) : bitmask | (1 << index);
    if (tab) { tab.bitmask = bitmask; document.getElementById(`bloom-tabdata-${type}-${id}`).textContent = JSON.stringify(tabs); }

    // Speichern
    const param = type === 'group' ? { user_group_id: id } : { plant_id: id };
    await fetch('backend/api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveBloomObservation', ...param, year: parseInt(year), bloom_months: bitmask })
    });
    // Karte aktualisieren
    if (typeof loadBloomObservationsAll === 'function') await loadBloomObservationsAll();
    if (typeof renderMarkers === 'function') renderMarkers();
}

async function addBloomYear(type, id) {
    const year = parseInt(prompt('Jahr eingeben (z.B. 2025):'));
    if (!year || year < 2000 || year > 2100) return;

    const tabs = JSON.parse(document.getElementById(`bloom-tabdata-${type}-${id}`).textContent);
    if (tabs.find(t => t.key === String(year))) {
        switchBloomTab(`bloom-${type}-${id}`, String(year));
        return;
    }

    // Leere Beobachtung anlegen
    const param = type === 'group' ? { user_group_id: id } : { plant_id: id };
    await fetch('backend/api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveBloomObservation', ...param, year, bloom_months: 0 })
    });

    // Tab hinzufügen und aktivieren
    tabs.push({ key: String(year), label: String(year), bitmask: 0, readonly: false });
    document.getElementById(`bloom-tabdata-${type}-${id}`).textContent = JSON.stringify(tabs);
    const tabsEl = document.getElementById(`bloom-tabs-${type}-${id}`);
    tabsEl.innerHTML += `<button type="button" onclick="switchBloomTab('bloom-${type}-${id}', '${year}')"
        style="padding:4px 12px;border-radius:20px;border:1px solid var(--border);font-size:0.8rem;cursor:pointer;background:var(--bg-app);color:var(--text-main);"
        data-tab-key="${year}">${year}</button>`;
    switchBloomTab(`bloom-${type}-${id}`, String(year));
}

// ========================
// PFLANZE LÖSCHEN
// ========================
async function deletePlant(plantId) {
    if (!confirm('Pflanze wirklich löschen? Alle Fotos und Beobachtungen werden entfernt.')) return;
    const res  = await fetch('backend/api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deletePlant', plant_id: plantId })
    });
    const data = await res.json();
    if (data.success) {
        await loadPflanzenListe();
        if (typeof loadPins === 'function') await loadPins();
    } else {
        alert(data.error || 'Fehler beim Löschen');
    }
}

// ========================
// GRUPPE LÖSCHEN
// ========================
async function deleteUserGroup(groupId, plantCount) {
    const warnung = plantCount > 0
        ? `Gruppe und alle ${plantCount} Pflanze(n) inkl. Fotos und Beobachtungen löschen?`
        : 'Gruppe wirklich löschen?';
    if (!confirm(warnung)) return;
    const res  = await fetch('backend/api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteUserGroup', group_id: groupId })
    });
    const data = await res.json();
    if (data.success) {
        await loadPflanzenListe();
        if (typeof loadPins === 'function') await loadPins();
        if (typeof loadFilterGroups === 'function') await loadFilterGroups();
    } else {
        alert(data.error || 'Fehler beim Löschen');
    }
}

// ========================
// GRUPPE BEARBEITEN
// ========================
function openGruppeBearbeitenModal(groupId) {
    const group = (_pflanzenData?.groups || []).find(g => String(g.id) === String(groupId));
    if (!group) return;

    const body = document.getElementById('modal-neue-gruppe-body');
    const formId = `form-edit-gruppe-${groupId}`;
    body.innerHTML = renderGroupFormNice(group, formId, `saveGruppeBearbeiten(${groupId}, '${formId}')`);
    document.getElementById('modal-neue-gruppe-title').textContent = 'Pflanzengruppe bearbeiten';
    document.getElementById('modal-neue-gruppe').style.display = 'flex';
}

async function saveGruppeBearbeiten(groupId, formId) {
    const formData = getGroupFormNiceData(formId);
    if (!formData.name) { alert('Bitte einen Namen eingeben.'); return; }

    const res  = await fetch('backend/api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateUserGroup', id: groupId, ...formData })
    });
    const data = await res.json();
    if (data.success) {
        if (typeof closeNeueGruppeModal === 'function') closeNeueGruppeModal();
        await loadPflanzenListe();
        if (typeof loadPins === 'function') await loadPins();
    } else {
        alert(data.error || 'Fehler beim Speichern');
    }
}

// =========================
// BILD-UPLOAD & GALERIE
// =========================
// Pflanzen-Foto Dual Cropper
let plantCropperThumb = null;
let plantCropperGallery = null;
let _plantCropUploadMeta = null;
let _plantCropObjectUrl = null;

function uploadImage(input, type, groupId, plantId, containerId, userGroupId) {
    const file = input.files[0];
    if (!file) return;
    input.value = '';
    _plantCropUploadMeta = { type, groupId, plantId, containerId, userGroupId };

    if (_plantCropObjectUrl) URL.revokeObjectURL(_plantCropObjectUrl);
    const objectUrl = URL.createObjectURL(file);
    _plantCropObjectUrl = objectUrl;
    const modal = document.getElementById('modal-plant-crop');
    const imgThumb = document.getElementById('plant-crop-thumb');
    const imgGallery = document.getElementById('plant-crop-gallery');
    imgThumb.src = objectUrl;
    imgGallery.src = objectUrl;
    modal.style.display = 'flex';

    if (plantCropperThumb) plantCropperThumb.destroy();
    if (plantCropperGallery) plantCropperGallery.destroy();

    const baseOpts = {
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 0.8,
        restore: false,
        guides: false,
        center: false,
        highlight: false,
        cropBoxMovable: false,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
        minContainerHeight: 280
    };

    plantCropperThumb = new Cropper(imgThumb, { ...baseOpts, aspectRatio: NaN });
    plantCropperGallery = new Cropper(imgGallery, { ...baseOpts, aspectRatio: NaN });
}

function closePlantCropModal() {
    const modal = document.getElementById('modal-plant-crop');
    modal.style.display = 'none';
    if (plantCropperThumb) { plantCropperThumb.destroy(); plantCropperThumb = null; }
    if (plantCropperGallery) { plantCropperGallery.destroy(); plantCropperGallery = null; }
    if (_plantCropObjectUrl) { URL.revokeObjectURL(_plantCropObjectUrl); _plantCropObjectUrl = null; }
    _plantCropUploadMeta = null;
}

async function saveCroppedPlantImage() {
    if (!plantCropperThumb || !plantCropperGallery || !_plantCropUploadMeta) return;
    const { type, groupId, plantId, containerId, userGroupId } = _plantCropUploadMeta;

    const canvasThumb = plantCropperThumb.getCroppedCanvas();
    const canvasGallery = plantCropperGallery.getCroppedCanvas();

    // Beide Blobs parallel erzeugen
    const [blobThumb, blobGallery] = await Promise.all([
        new Promise(resolve => canvasThumb.toBlob(resolve, 'image/jpeg', 0.92)),
        new Promise(resolve => canvasGallery.toBlob(resolve, 'image/jpeg', 0.92))
    ]);

    const formData = new FormData();
    formData.append('action', 'uploadImage');
    formData.append('type', type);
    formData.append('image', blobThumb, 'thumb.jpg');
    formData.append('image_gallery', blobGallery, 'gallery.jpg');
    if (groupId)     formData.append('group_id',      groupId);
    if (plantId)     formData.append('plant_id',      plantId);
    if (userGroupId) formData.append('user_group_id', userGroupId);

    const res  = await fetch('backend/api.php', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.success) {
        if (containerId === 'edit-plant-photos-grid' && typeof loadPlantEditPhotos === 'function') {
            loadPlantEditPhotos(plantId);
        } else if (containerId.endsWith('-photo-container') && type === 'default' && typeof gfLoadPhotos === 'function') {
            // Admin-Gruppenfotos: eigenen Renderer nutzen
            const formId = containerId.replace('-photo-container', '');
            gfLoadPhotos(formId, groupId);
        } else {
            loadImages(type, groupId, plantId, containerId, userGroupId);
        }
    } else {
        alert(data.error || 'Upload fehlgeschlagen');
    }
    closePlantCropModal();
}

async function loadImages(type, groupId, plantId, containerId, userGroupId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const payload = { action: 'getImages', type, group_id: groupId, plant_id: plantId };
    if (userGroupId) payload.user_group_id = userGroupId;
    const res  = await fetch('backend/api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.success || !data.images.length) {
        container.innerHTML = '<p style="font-size:0.8rem;color:var(--text-muted);">Noch keine Fotos.</p>';
        return;
    }
    const sorted = [...data.images].sort((a, b) => (a.type === 'plant' ? 0 : 1) - (b.type === 'plant' ? 0 : 1));
    container.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:4px;">
        ${sorted.map(img => {
            const isDefault = img.type === 'default';
            const badgeColor = img.type === 'plant' ? 'rgba(34,197,94,0.9)' : isDefault ? 'rgba(156,163,175,0.9)' : 'rgba(99,102,241,0.9)';
            const badgeText  = img.type === 'plant' ? 'Pflanze' : isDefault ? 'Standard' : 'Gruppe';
            const deleteBtn = isDefault ? '' : `<button onclick="deleteImage(${img.id}, '${type}', ${groupId||'null'}, ${plantId||'null'}, '${containerId}', ${userGroupId||'null'})"
                    style="position:absolute;top:-4px;right:-4px;width:18px;height:18px;border-radius:50%;background:var(--danger);color:white;border:none;font-size:0.65rem;cursor:pointer;line-height:1;">✕</button>`;
            return `
            <div style="position:relative;">
                <img src="${img.file_path}" style="width:80px;height:60px;object-fit:cover;border-radius:6px;border:1px solid var(--border);">
                <span style="position:absolute;bottom:3px;left:3px;background:${badgeColor};color:white;font-size:0.5rem;font-weight:700;padding:1px 5px;border-radius:10px;text-transform:uppercase;letter-spacing:0.03em;">${badgeText}</span>
                ${deleteBtn}
            </div>`;
        }).join('')}
    </div>`;
}

async function deleteImage(id, type, groupId, plantId, containerId, userGroupId) {
    if (!confirm('Foto löschen?')) return;
    const res  = await fetch('backend/api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteImage', id })
    });
    const data = await res.json();
    if (data.success) loadImages(type, groupId, plantId, containerId, userGroupId);
}
