<?php
$pageId = 'tabelle';
$pageTitle = 'Gardian – Tabelle';
$headerRightExtra = '<span id="save-status" style="font-size:0.8rem;color:var(--text-muted);min-width:90px;text-align:right;"></span>';
$extraHeadStyles = '
        .tbl-scroll { overflow: auto; flex: 1; padding: 0 24px 24px; }
        .tbl { border-collapse: collapse; table-layout: fixed; font-size: 0.84rem; }
        .tbl th {
            position: sticky; top: 0; z-index: 10;
            background: var(--bg-card); border-bottom: 2px solid var(--border);
            padding: 8px 12px; text-align: left; white-space: nowrap; overflow: hidden;
            font-size: 0.7rem; font-weight: 700; color: var(--text-muted);
            letter-spacing: 0.06em; text-transform: uppercase;
        }
        .tbl td {
            padding: 7px 12px; border-bottom: 1px solid var(--border);
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .tbl td.ed { cursor: pointer; }
        .tbl td.ed:hover { background: var(--primary-light) !important; }
        .row-g td  { background: var(--bg-card); font-weight: 600; }
        .row-g:hover td { background: var(--primary-light) !important; }
        .row-p td  { background: var(--bg-app); }
        .row-p:hover td { background: var(--bg-card) !important; }
        .badge { display: inline-block; padding: 1px 8px; border-radius: 20px; font-size: 0.72rem; font-weight: 700; }
        .b-yes { background: rgba(76,175,80,0.15); color: var(--primary-dark); }
        .b-no  { background: rgba(0,0,0,0.07); color: var(--text-muted); }
        .c-inp { border: none; border-bottom: 2px solid var(--primary); background: transparent; font: inherit; color: var(--text-main); outline: none; width: 100%; box-sizing: border-box; }
        .c-sel { border: none; border-bottom: 2px solid var(--primary); background: var(--bg-app); font: inherit; color: var(--text-main); outline: none; width: 100%; box-sizing: border-box; }
        #bloom-pop {
            position: fixed; z-index: 700; background: var(--bg-card);
            border: 1px solid var(--border); border-radius: var(--radius-md);
            padding: 12px; box-shadow: var(--shadow-medium); min-width: 264px;
        }
        #bloom-pop .mb {
            width: 34px; height: 34px; border-radius: 6px; border: 1px solid var(--border);
            font-size: 0.72rem; font-weight: 600; cursor: pointer; margin: 2px;
        }';

include 'src/layout/head.php';
include 'src/layout/header.php';
?>

    <div class="l-app-body">
<?php include 'src/layout/sidebar.php'; ?>

        <div style="flex:1;overflow:hidden;display:flex;flex-direction:column;background:var(--bg-app);">
        <div style="padding:16px 24px 8px;display:flex;align-items:center;justify-content:space-between;">
            <h2 style="font-size:1.1rem;font-weight:700;color:var(--text-main);">Alle Pflanzen</h2>
            <span id="tbl-info" style="font-size:0.8rem;color:var(--text-muted);"></span>
        </div>
        <div class="tbl-scroll">
            <table class="tbl">
                <thead>
                    <tr>
                        <th style="width:36px;"></th>
                        <th style="width:155px;">Name</th>
                        <th style="width:90px;">Typ</th>
                        <th style="width:75px;">Höhe</th>
                        <th style="width:115px;">Standort</th>
                        <th style="width:80px;">Abstand</th>
                        <th style="width:80px;">Pflege</th>
                        <th style="width:80px;">Wasser</th>
                        <th style="width:80px;">Frostfest</th>
                        <th style="width:65px;">Duft</th>
                        <th style="width:105px;">Schnittblume</th>
                        <th style="width:80px;">Immergrün</th>
                        <th style="width:105px;">Lebensdauer</th>
                        <th style="width:140px;">Besonderheiten</th>
                        <th style="width:150px;">Blütezeit</th>
                        <th style="width:120px;">Marker-Farbe</th>
                        <th style="width:90px;">Marker-Größe</th>
                        <th style="width:90px;">Marker-Icon</th>
                        <th style="width:70px;">Pos X</th>
                        <th style="width:70px;">Pos Y</th>
                        <th style="width:110px;">Geplant</th>
                        <th style="width:110px;">Gepflanzt</th>
                        <th style="width:110px;">Verschwunden</th>
                        <th style="width:130px;">Grund</th>
                    </tr>
                </thead>
                <tbody id="tbl-body">
                    <tr><td colspan="23" style="text-align:center;padding:32px;color:var(--text-muted);">Lade…</td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<?php include 'src/layout/footer.php'; ?>
<div id="bloom-pop" style="display:none;"></div>

<script>
// ---- Config ----
const MONTHS = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
const OPTS = {
    type:        [{v:'',l:'—'}], // wird dynamisch befüllt
    location:    [{v:'',l:'—'},{v:'sonnig',l:'Sonnig'},{v:'halbschatten',l:'Halbschatten'},{v:'schatten',l:'Schatten'}],
    care:        [{v:'',l:'—'},{v:'gering',l:'Gering'},{v:'mittel',l:'Mittel'},{v:'hoch',l:'Hoch'}],
    water:       [{v:'',l:'—'},{v:'gering',l:'Gering'},{v:'mittel',l:'Mittel'},{v:'hoch',l:'Hoch'}],
    lifespan:    [{v:'',l:'—'},{v:'einjährig',l:'Einjährig'},{v:'zweijährig',l:'Zweijährig'},{v:'mehrjährig',l:'Mehrjährig'}],
    marker_size: [{v:'',l:'—'},{v:'s',l:'S – Klein'},{v:'m',l:'M – Mittel'},{v:'l',l:'L – Groß'}],
};
const BOOL_FIELDS   = new Set(['hardy','scented','cutflower','evergreen']);
const SELECT_FIELDS = new Set(Object.keys(OPTS));
const INHERIT_FIELDS = new Set(['height','location','spacing','care','water','hardy','scented',
    'cutflower','lifespan','features','evergreen','marker_icon','marker_color','marker_size','bloom_months']);

let tblData = null;
const expanded = new Set();

// ---- Init ----
async function init() {
    const auth = await api('getAvatar');
    if (!auth.success) { location.href = 'login.html'; return; }
    if (auth.avatar) document.getElementById('user-avatar').src = auth.avatar;
    if (auth.username) document.getElementById('user-name').textContent = auth.username;
    if (auth.role === 'admin') document.getElementById('nav-admin').style.display = 'flex';
    try {
        const cfg = await api('getGardenConfig');
        if (cfg.success && cfg.config) {
            const c = cfg.config;
            if (c.theme) document.documentElement.setAttribute('data-theme', c.theme);
            window.effectsEnabled = parseInt(c.effects_enabled) !== 0;
        }
    } catch(e) {}
    if (typeof EffectManager !== 'undefined') EffectManager.initFromUrl();
    // Plant-Types dynamisch laden
    try {
        const ptData = await api('getPlantTypes');
        if (ptData.success) {
            OPTS.type = [{v:'',l:'—'}, ...ptData.types.map(t => ({v: t.key, l: t.label}))];
        }
    } catch(e) {}
    await loadData();
}

async function loadData() {
    const r = await api('getPlantsList');
    if (!r.success) {
        document.getElementById('tbl-body').innerHTML =
            '<tr><td colspan="23" style="text-align:center;color:red;padding:24px;">Fehler beim Laden.</td></tr>';
        return;
    }
    tblData = r;
    const total = r.groups.reduce((s, g) => s + g.plants.length, 0);
    document.getElementById('tbl-info').textContent = `${r.groups.length} Gruppen · ${total} Pflanzen`;
    render();
}

// ---- Render ----
function render() {
    const rows = [];
    for (const g of tblData.groups) {
        rows.push(groupRow(g));
        if (expanded.has(g.id))
            for (const p of g.plants) rows.push(plantRow(p, g));
    }
    document.getElementById('tbl-body').innerHTML = rows.join('') ||
        '<tr><td colspan="23" style="padding:24px;text-align:center;color:var(--text-muted);">Keine Einträge.</td></tr>';
}

// ---- Display helpers ----
function esc(s) {
    return s == null ? '' : String(s)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function dash(v) {
    return (v !== null && v !== undefined && v !== '')
        ? esc(v) : '<span style="color:var(--text-muted)">—</span>';
}
function optLabel(key, v) {
    if (v === null || v === undefined || v === '')
        return '<span style="color:var(--text-muted)">—</span>';
    return OPTS[key]?.find(o => o.v === String(v))?.l ?? esc(v);
}
function bloomDisp(bitmask) {
    const b = parseInt(bitmask) || 0;
    const active = MONTHS.filter((_, i) => (b >> i) & 1);
    return active.length ? active.join(', ') : '<span style="color:var(--text-muted)">—</span>';
}
function boolBadge(v) {
    if (v === null || v === undefined || v === '')
        return '<span style="color:var(--text-muted)">—</span>';
    return v == 1
        ? '<span class="badge b-yes">Ja</span>'
        : '<span class="badge b-no">Nein</span>';
}
function colorDisp(c) {
    if (!c) return '<span style="color:var(--text-muted)">—</span>';
    return `<span style="display:inline-flex;align-items:center;gap:5px;">` +
           `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;` +
           `background:${esc(c)};border:1px solid var(--border);flex-shrink:0;"></span>${esc(c)}</span>`;
}
function posDisp(v) {
    return (v !== null && v !== undefined && v !== '')
        ? parseFloat(v).toFixed(1) + '%'
        : '<span style="color:var(--text-muted)">—</span>';
}
function plantedDisp(v) {
    if (!v) return '<span style="color:var(--text-muted)">—</span>';
    const [y, m] = v.split('-');
    const names = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
    return (names[parseInt(m, 10) - 1] || m) + ' ' + y;
}
const REMOVED_REASON_OPTS = [{v:'',l:'—'},{v:'manuell',l:'Manuell entfernt'},{v:'selbst',l:'Von selbst'}];
function removedReasonDisp(v) {
    if (!v) return '<span style="color:var(--text-muted)">—</span>';
    return REMOVED_REASON_OPTS.find(o => o.v === v)?.l ?? v;
}

function fieldDisp(field, v) {
    if (BOOL_FIELDS.has(field))                                    return boolBadge(v);
    if (field === 'bloom_months')                                  return bloomDisp(v);
    if (field === 'marker_color')                                  return colorDisp(v);
    if (SELECT_FIELDS.has(field))                                  return optLabel(field, v);
    if (field === 'pos_x' || field === 'pos_y')                    return posDisp(v);
    if (field === 'planned_month_year' || field === 'planted_month_year' || field === 'removed_month_year') return plantedDisp(v);
    if (field === 'removed_reason')                                return removedReasonDisp(v);
    return dash(v);
}

function plantCellDisp(p, g, field) {
    const own = p[field];
    const hasOwn = own !== null && own !== undefined && own !== '';
    if (hasOwn) return fieldDisp(field, own);
    const gVal = g[field];
    const hasGroup = gVal !== null && gVal !== undefined && gVal !== '';
    if (hasGroup)
        return `<span style="color:var(--text-muted);font-style:italic;" title="Von Gruppe vererbt">${fieldDisp(field, gVal)}</span>`;
    return '<span style="color:var(--text-muted)">—</span>';
}

function td(field, rt, id, html) {
    return `<td class="ed" data-f="${field}" data-rt="${rt}" data-id="${id}">${html}</td>`;
}

// ---- Row builders ----
function groupRow(g) {
    const accent = g.marker_color || 'var(--primary)';
    const isOpen  = expanded.has(g.id);
    return `<tr class="row-g" data-gid="${g.id}">
        <td style="text-align:center;cursor:pointer;border-left:4px solid ${esc(accent)};"
            onclick="toggleGroup(${g.id})">${isOpen ? '▼' : '▶'}</td>
        ${td('name','g',g.id,
            `<strong>${esc(g.name||'(Unbenannt)')}</strong>&nbsp;<span style="font-size:0.73rem;color:var(--text-muted);">${g.plants.length}&thinsp;Pfl.</span>`)}
        ${td('type','g',g.id,        optLabel('type', g.type))}
        ${td('height','g',g.id,      dash(g.height))}
        ${td('location','g',g.id,    optLabel('location', g.location))}
        ${td('spacing','g',g.id,     dash(g.spacing))}
        ${td('care','g',g.id,        optLabel('care', g.care))}
        ${td('water','g',g.id,       optLabel('water', g.water))}
        ${td('hardy','g',g.id,       boolBadge(g.hardy))}
        ${td('scented','g',g.id,     boolBadge(g.scented))}
        ${td('cutflower','g',g.id,   boolBadge(g.cutflower))}
        ${td('evergreen','g',g.id,   boolBadge(g.evergreen))}
        ${td('lifespan','g',g.id,    optLabel('lifespan', g.lifespan))}
        ${td('features','g',g.id,    dash(g.features))}
        ${td('bloom_months','g',g.id,bloomDisp(g.bloom_months))}
        ${td('marker_color','g',g.id,colorDisp(g.marker_color))}
        ${td('marker_size','g',g.id, optLabel('marker_size', g.marker_size))}
        ${td('marker_icon','g',g.id, dash(g.marker_icon))}
        <td style="color:var(--text-muted);">—</td>
        <td style="color:var(--text-muted);">—</td>
        <td style="color:var(--text-muted);">—</td>
        <td style="color:var(--text-muted);">—</td>
        <td style="color:var(--text-muted);">—</td>
    </tr>`;
}

function plantRow(p, g) {
    const accent = g.marker_color || 'var(--primary)';
    return `<tr class="row-p" data-pid="${p.id}" data-gid="${g.id}">
        <td style="text-align:center;border-left:4px solid ${esc(accent)};color:var(--text-muted);">└</td>
        ${td('name','p',p.id,         esc(p.plant_name || 'Pflanze #'+p.id))}
        <td style="color:var(--text-muted);font-style:italic;font-size:0.8rem;">${optLabel('type', g.type)}</td>
        ${td('height','p',p.id,       plantCellDisp(p, g, 'height'))}
        ${td('location','p',p.id,     plantCellDisp(p, g, 'location'))}
        ${td('spacing','p',p.id,      plantCellDisp(p, g, 'spacing'))}
        ${td('care','p',p.id,         plantCellDisp(p, g, 'care'))}
        ${td('water','p',p.id,        plantCellDisp(p, g, 'water'))}
        ${td('hardy','p',p.id,        plantCellDisp(p, g, 'hardy'))}
        ${td('scented','p',p.id,      plantCellDisp(p, g, 'scented'))}
        ${td('cutflower','p',p.id,    plantCellDisp(p, g, 'cutflower'))}
        ${td('evergreen','p',p.id,    plantCellDisp(p, g, 'evergreen'))}
        ${td('lifespan','p',p.id,     plantCellDisp(p, g, 'lifespan'))}
        ${td('features','p',p.id,     plantCellDisp(p, g, 'features'))}
        ${td('bloom_months','p',p.id, plantCellDisp(p, g, 'bloom_months'))}
        ${td('marker_color','p',p.id, plantCellDisp(p, g, 'marker_color'))}
        ${td('marker_size','p',p.id,  plantCellDisp(p, g, 'marker_size'))}
        ${td('marker_icon','p',p.id,  plantCellDisp(p, g, 'marker_icon'))}
        ${td('pos_x','p',p.id,              posDisp(p.pos_x))}
        ${td('pos_y','p',p.id,              posDisp(p.pos_y))}
        ${td('planned_month_year','p',p.id,  plantedDisp(p.planned_month_year))}
        ${td('planted_month_year','p',p.id,  plantedDisp(p.planted_month_year))}
        ${td('removed_month_year','p',p.id,  plantedDisp(p.removed_month_year))}
        ${td('removed_reason','p',p.id, removedReasonDisp(p.removed_reason))}
    </tr>`;
}

// ---- Toggle group ----
function toggleGroup(id) {
    expanded.has(id) ? expanded.delete(id) : expanded.add(id);
    render();
}

// ---- Data model helpers ----
function getPlantGroup(plantId) {
    for (const g of tblData.groups)
        if (g.plants.some(p => String(p.id) === String(plantId))) return g;
    return null;
}

function getOwnVal(rt, id, field) {
    if (rt === 'g') {
        const g = tblData.groups.find(g => String(g.id) === String(id));
        return g ? (g[field] ?? '') : '';
    }
    for (const g of tblData.groups) {
        const p = g.plants.find(p => String(p.id) === String(id));
        if (p) return field === 'name' ? (p.plant_name ?? '') : (p[field] ?? '');
    }
    return '';
}

function getEffective(rt, id, field) {
    const own = getOwnVal(rt, id, field);
    if (rt === 'p' && (own === null || own === undefined || own === '') && INHERIT_FIELDS.has(field)) {
        const g = getPlantGroup(id);
        return g ? (g[field] ?? '') : '';
    }
    return own;
}

function setVal(rt, id, field, value) {
    if (rt === 'g') {
        const g = tblData.groups.find(g => String(g.id) === String(id));
        if (g) g[field] = value;
    } else {
        for (const g of tblData.groups) {
            const p = g.plants.find(p => String(p.id) === String(id));
            if (p) { p[field === 'name' ? 'plant_name' : field] = value; break; }
        }
    }
}

// ---- Cell click delegation ----
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('tbl-body').addEventListener('click', e => {
        const cell = e.target.closest('td.ed');
        if (!cell) return;
        if (cell.querySelector('input,select')) return;
        const { f: field, rt, id } = cell.dataset;
        const effective = getEffective(rt, id, field);
        if (BOOL_FIELDS.has(field))                  doToggleBool(cell, rt, id, field, effective);
        else if (field === 'bloom_months')           doBloomPopup(cell, parseInt(effective) || 0);
        else if (field === 'marker_color')           doColor(cell, rt, id, field, effective);
        else if (SELECT_FIELDS.has(field))           doSelect(cell, rt, id, field, effective);
        else if (field === 'planned_month_year')     doMonth(cell, rt, id, field, effective);
        else if (field === 'planted_month_year')     doMonth(cell, rt, id, field, effective);
        else if (field === 'removed_month_year')     doMonth(cell, rt, id, field, effective);
        else if (field === 'removed_reason')         doRemovedReason(cell, rt, id, effective);
        else                                         doText(cell, rt, id, field, effective);
    });
    init();
});

// ---- Edit: text ----
function doText(cell, rt, id, field, cur) {
    const isPos = field === 'pos_x' || field === 'pos_y';
    const inp = document.createElement('input');
    inp.type  = isPos ? 'number' : 'text';
    if (isPos) { inp.min = 0; inp.max = 100; inp.step = 0.01; }
    inp.value = cur ?? '';
    inp.className = 'c-inp';
    cell.innerHTML = ''; cell.appendChild(inp);
    inp.focus(); inp.select();
    async function save() {
        const v = inp.value.trim() || null;
        await doSave(cell, rt, id, field, v);
    }
    inp.addEventListener('keydown', e => {
        if (e.key === 'Enter')  { e.preventDefault(); inp.blur(); }
        if (e.key === 'Escape') refreshCell(cell, rt, id, field);
    });
    inp.addEventListener('blur', save);
}

// ---- Edit: month ----
function doMonth(cell, rt, id, field, cur) {
    const inp = document.createElement('input');
    inp.type  = 'month';
    inp.value = cur ?? '';
    inp.className = 'c-inp';
    cell.innerHTML = ''; cell.appendChild(inp);
    inp.focus();
    async function save() {
        await doSave(cell, rt, id, field, inp.value || null);
    }
    inp.addEventListener('change', save);
    inp.addEventListener('keydown', e => {
        if (e.key === 'Enter')  { e.preventDefault(); inp.blur(); }
        if (e.key === 'Escape') refreshCell(cell, rt, id, field);
    });
    inp.addEventListener('blur', save);
}

// ---- Edit: removed_reason ----
function doRemovedReason(cell, rt, id, cur) {
    const sel = document.createElement('select');
    sel.className = 'c-sel';
    REMOVED_REASON_OPTS.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.v; opt.textContent = o.l;
        if (String(o.v) === String(cur)) opt.selected = true;
        sel.appendChild(opt);
    });
    cell.innerHTML = ''; cell.appendChild(sel);
    sel.focus();
    let changed = false;
    sel.addEventListener('change', async () => {
        changed = true;
        await doSave(cell, rt, id, 'removed_reason', sel.value || null);
    });
    sel.addEventListener('blur', () => { if (!changed) refreshCell(cell, rt, id, 'removed_reason'); });
    sel.addEventListener('keydown', e => { if (e.key === 'Escape') refreshCell(cell, rt, id, 'removed_reason'); });
}

// ---- Edit: select ----
function doSelect(cell, rt, id, field, cur) {
    const sel = document.createElement('select');
    sel.className = 'c-sel';
    (OPTS[field] || []).forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.v; opt.textContent = o.l;
        if (String(o.v) === String(cur)) opt.selected = true;
        sel.appendChild(opt);
    });
    cell.innerHTML = ''; cell.appendChild(sel);
    sel.focus();
    let changed = false;
    sel.addEventListener('change', async () => {
        changed = true;
        await doSave(cell, rt, id, field, sel.value || null);
    });
    sel.addEventListener('blur', () => { if (!changed) refreshCell(cell, rt, id, field); });
    sel.addEventListener('keydown', e => { if (e.key === 'Escape') refreshCell(cell, rt, id, field); });
}

// ---- Edit: color ----
function doColor(cell, rt, id, field, cur) {
    const inp = document.createElement('input');
    inp.type  = 'color';
    inp.value = cur || '#4CAF50';
    inp.style.cssText = 'width:40px;height:28px;border:none;cursor:pointer;background:transparent;padding:0;';
    cell.innerHTML = ''; cell.appendChild(inp);
    inp.click();
    let saved = false;
    const save = async () => {
        if (saved) return; saved = true;
        await doSave(cell, rt, id, field, inp.value);
    };
    inp.addEventListener('change', save);
    inp.addEventListener('blur', save);
}

// ---- Edit: bool toggle ----
async function doToggleBool(cell, rt, id, field, effective) {
    const newVal = (effective == '1') ? '0' : '1';
    await doSave(cell, rt, id, field, newVal);
}

// ---- Bloom popup ----
let _bCell = null, _bMask = 0;

function doBloomPopup(cell, mask) {
    _bCell = cell; _bMask = mask;
    const pop = document.getElementById('bloom-pop');
    pop.innerHTML =
        `<div style="font-size:0.7rem;font-weight:700;color:var(--text-muted);margin-bottom:8px;letter-spacing:0.06em;text-transform:uppercase;">Blütezeit</div>` +
        `<div style="display:flex;flex-wrap:wrap;">` +
        MONTHS.map((m, i) => {
            const on = (_bMask >> i) & 1;
            return `<button class="mb" data-i="${i}"
                style="background:${on?'var(--primary)':'var(--bg-app)'};color:${on?'white':'var(--text-main)'};">${m}</button>`;
        }).join('') +
        `</div><div style="text-align:right;margin-top:10px;">` +
        `<button onclick="closeBloom()" style="padding:4px 14px;border-radius:6px;border:1px solid var(--primary);cursor:pointer;font-size:0.8rem;background:var(--primary);color:white;font-family:inherit;">OK</button></div>`;

    pop.querySelectorAll('.mb').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const i = parseInt(btn.dataset.i);
            _bMask ^= (1 << i);
            const on = (_bMask >> i) & 1;
            btn.style.background = on ? 'var(--primary)' : 'var(--bg-app)';
            btn.style.color      = on ? 'white' : 'var(--text-main)';
        });
    });

    const rect = cell.getBoundingClientRect();
    pop.style.top  = Math.min(rect.bottom + 4, window.innerHeight - 200) + 'px';
    pop.style.left = Math.min(rect.left, window.innerWidth - 290) + 'px';
    pop.style.display = 'block';
    requestAnimationFrame(() => document.addEventListener('click', bloomOutside));
}

function bloomOutside(e) {
    if (!document.getElementById('bloom-pop').contains(e.target)) closeBloom();
}

async function closeBloom() {
    document.removeEventListener('click', bloomOutside);
    document.getElementById('bloom-pop').style.display = 'none';
    if (_bCell) await doSave(_bCell, _bCell.dataset.rt, _bCell.dataset.id, 'bloom_months', _bMask);
    _bCell = null;
}

// ---- Save ----
async function doSave(cell, rt, id, field, value) {
    const action = rt === 'g' ? 'updateUserGroup' : 'updatePlant';
    const r = await api(action, { id: parseInt(id), [field]: value });
    if (!r.success) {
        showStatus('Fehler: ' + (r.error || 'Unbekannt'));
        refreshCell(cell, rt, id, field);
        return;
    }
    setVal(rt, id, field, value);
    refreshCell(cell, rt, id, field);
    if (rt === 'g' && INHERIT_FIELDS.has(field)) refreshInheritedCells(id, field);
    showStatus('Gespeichert ✓');
}

// ---- Refresh single cell ----
function refreshCell(cell, rt, id, field) {
    if (rt === 'p') {
        const g = getPlantGroup(id);
        const p = g?.plants.find(p => String(p.id) === String(id));
        if (p && g) {
            if (field === 'name')
                cell.innerHTML = esc(p.plant_name || 'Pflanze #' + p.id);
            else if (field === 'pos_x' || field === 'pos_y')
                cell.innerHTML = posDisp(p[field]);
            else
                cell.innerHTML = plantCellDisp(p, g, field);
            return;
        }
    }
    const v = getOwnVal(rt, id, field);
    if (field === 'name') {
        const g = tblData.groups.find(g => String(g.id) === String(id));
        cell.innerHTML = `<strong>${esc(v||'(Unbenannt)')}</strong>&nbsp;<span style="font-size:0.73rem;color:var(--text-muted);">${g?.plants.length??0}&thinsp;Pfl.</span>`;
    } else {
        cell.innerHTML = fieldDisp(field, v);
    }
}

// ---- Refresh inherited plant cells after group change ----
function refreshInheritedCells(groupId, field) {
    const g = tblData.groups.find(g => String(g.id) === String(groupId));
    if (!g) return;
    document.querySelectorAll(`tr.row-p[data-gid="${groupId}"]`).forEach(row => {
        const p = g.plants.find(p => String(p.id) === String(row.dataset.pid));
        if (!p) return;
        const own = p[field];
        const hasOwn = own !== null && own !== undefined && own !== '';
        if (!hasOwn) {
            const cell = row.querySelector(`td[data-f="${field}"]`);
            if (cell) cell.innerHTML = plantCellDisp(p, g, field);
        }
    });
}

// ---- Status ----
function showStatus(msg) {
    const el = document.getElementById('save-status');
    el.textContent = msg;
    if (!msg.startsWith('Fehler')) setTimeout(() => { el.textContent = ''; }, 2000);
}

</script>
