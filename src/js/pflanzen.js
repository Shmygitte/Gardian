/**
 * Gardian – Pflanzen-Liste
 */

const FIELD_LABELS = {
    type:         'Typ',
    bloom_start:  'Blüte von (Monat)',
    bloom_end:    'Blüte bis (Monat)',
    marker_icon:  'Marker-Icon',
    marker_color: 'Marker-Farbe',
    marker_size:  'Marker-Größe',
    height:       'Höhe',
    location:     'Standort',
    spacing:      'Pflanzabstand',
    care:         'Pflege',
    water:        'Wasser',
    hardy:        'Winterhart',
    scented:      'Duftend',
    cutflower:    'Schnittblume',
    lifespan:     'Lebenszeit',
    features:     'Besonderheiten',
    evergreen:    'Immergrün',
    pos_x:        'Position X (%)',
    pos_y:        'Position Y (%)',
    created_at:   'Erstellt am',
};

const TYPE_LABELS = { tree: 'Baum', shrub: 'Strauch', flower: 'Blume', s_flower: 'Saisonblume' };

function formatValue(key, val) {
    if (val === null || val === undefined || val === '') return '—';
    if (key === 'type') return TYPE_LABELS[val] || val;
    if (key === 'hardy' || key === 'scented' || key === 'cutflower' || key === 'evergreen') return val == 1 ? 'Ja' : 'Nein';
    if (key === 'marker_color') return `<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${val};border:1px solid #ccc;vertical-align:middle;margin-right:4px;"></span>${val}`;
    if (key === 'pos_x' || key === 'pos_y') return parseFloat(val).toFixed(1) + '%';
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

const GROUP_FIELDS = ['type','bloom_start','bloom_end','marker_icon','marker_color','marker_size','height','location','spacing','care','water','hardy','scented','cutflower','lifespan','features','evergreen'];
const PLANT_FIELDS = ['pos_x','pos_y','bloom_start','bloom_end','marker_icon','marker_color','marker_size','height','location','spacing','care','water','hardy','scented','cutflower','lifespan','features','evergreen','created_at'];

let _pflanzenData = null;

function renderPflanzenListeFiltered() {
    if (_pflanzenData) renderPflanzenListe(_pflanzenData);
}

async function loadPflanzenListe() {
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
            if (filterState.groups !== null && !filterState.groups.has(String(g.group_id || g.id))) return false;
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
                <div style="margin:8px 0 0 16px; border-left:3px solid var(--primary-light); padding-left:12px;">
                    <div onclick="toggleAccordion('${plantId}')" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center; padding:6px 0;">
                        <span style="font-size:0.9rem; font-weight:600;">Pflanze #${plant.id} <span style="color:var(--text-muted); font-weight:400;">(${plant.pos_x !== null ? parseFloat(plant.pos_x).toFixed(1) + '% / ' + parseFloat(plant.pos_y).toFixed(1) + '%' : 'keine Position'})</span></span>
                        <span id="${plantId}-icon" style="font-size:0.8rem; color:var(--text-muted);">▶</span>
                    </div>
                    <div id="${plantId}" style="display:none; padding-bottom:8px;">
                        ${renderFieldTable(plant, PLANT_FIELDS)}
                    </div>
                </div>`;
            }).join('')
            : '<p style="margin:8px 0 0 16px; color:var(--text-muted); font-size:0.85rem;">Keine Pflanzen in dieser Gruppe.</p>';

        return `
        <div style="margin-bottom:12px; border:1px solid var(--border); border-radius:var(--radius-md); overflow:hidden;">
            <div onclick="toggleAccordion('${groupId}')" style="cursor:pointer; padding:12px 16px; background:var(--bg-card); display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:600;">${group.name || '(Unbenannte Gruppe)'}</span>
                <span style="font-size:0.8rem; color:var(--text-muted);">${group.plants.length} Pflanze(n) &nbsp;<span id="${groupId}-icon">▼</span></span>
            </div>
            <div id="${groupId}" style="display:none; padding:12px 16px; background:var(--bg-surface);">
                <p style="font-size:0.8rem; font-weight:600; color:var(--text-muted); margin-bottom:8px;">GRUPPENFELDER</p>
                ${renderFieldTable(group, GROUP_FIELDS)}
                <p style="font-size:0.8rem; font-weight:600; color:var(--text-muted); margin:12px 0 4px;">PFLANZEN</p>
                ${plantsHtml}
            </div>
        </div>`;
    }).join('');
}

function toggleAccordion(id) {
    const el = document.getElementById(id);
    const icon = document.getElementById(id + '-icon');
    if (!el) return;
    const open = el.style.display === 'block';
    el.style.display = open ? 'none' : 'block';
    if (icon) icon.textContent = open ? '▼' : '▲';
}
