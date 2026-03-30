/**
 * Gardian – Gemeinsamer Renderer für Pflanzengruppen-Formulare
 * Wird von admin.js und app.js genutzt
 */

const GF_TYPE_OPTIONS = [
    { v: 'tree',     l: '🌳 Baum' },
    { v: 'shrub',    l: '🌿 Strauch' },
    { v: 'flower',   l: '🌸 Blume' },
    { v: 'climber',  l: '🌱 Kletterpflanze' },
    { v: 's_flower', l: '🌼 Blümchen' },
];

const GF_STECKBRIEF = [
    { key: 'height',    label: 'Höhe',         icon: '📏', type: 'text',   placeholder: 'z.B. 1–2m' },
    { key: 'location',  label: 'Standort',      icon: '☀️', type: 'select', options: [{v:'sonnig',l:'Sonnig'},{v:'halbschatten',l:'Halbschatten'},{v:'schatten',l:'Schatten'}] },
    { key: 'spacing',   label: 'Abstand',       icon: '↔️', type: 'text',   placeholder: 'z.B. 40cm' },
    { key: 'care',      label: 'Pflege',        icon: '🔧', type: 'select', options: [{v:'gering',l:'Gering'},{v:'mittel',l:'Mittel'},{v:'hoch',l:'Hoch'}] },
    { key: 'water',     label: 'Wasser',        icon: '💧', type: 'select', options: [{v:'gering',l:'Gering'},{v:'mittel',l:'Mittel'},{v:'hoch',l:'Hoch'}] },
    { key: 'hardy',     label: 'Frostfest',     icon: '❄️', type: 'select', options: [{v:'1',l:'Ja'},{v:'0',l:'Nein'}] },
    { key: 'scented',   label: 'Duft',          icon: '🌺', type: 'select', options: [{v:'1',l:'Ja'},{v:'0',l:'Nein'}] },
    { key: 'cutflower', label: 'Schnittblume',  icon: '✂️', type: 'select', options: [{v:'1',l:'Ja'},{v:'0',l:'Nein'}] },
    { key: 'lifespan',  label: 'Lebensdauer',   icon: '📅', type: 'select', options: [{v:'einjährig',l:'Einjährig'},{v:'zweijährig',l:'Zweijährig'},{v:'mehrjährig',l:'Mehrjährig'}] },
];

// Fallback-Styles falls CSS nicht greift (Admin-Seite etc.)
const GF_INPUT_STYLE  = 'width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:4px;background:var(--bg-app);color:var(--text-main);font-size:0.82rem;font-family:inherit;box-sizing:border-box;outline:none;';
const GF_SELECT_STYLE = GF_INPUT_STYLE;
const GF_LABEL_STYLE  = 'font-size:0.75rem;color:var(--text-muted);font-weight:600;display:flex;align-items:center;gap:5px;margin-bottom:4px;';

function renderGroupFormNice(data = {}, formId, onSubmit) {
    const v = (key) => data[key] ?? '';

    // Accent-Border Styles für Sektionen
    const GF_SECTION = 'border-left:3px solid var(--primary);border-radius:6px;padding-left:10px;';
    const GF_SECTION_MUTED = 'border-left:3px solid var(--border);border-radius:6px;padding-left:10px;';
    const GF_SECTION_GREEN = 'border-left:3px solid #4CAF50;border-radius:6px;padding-left:10px;';

    // Linke Spalte: Name, Typ, Farbe, Blütezeit, Immergrün
    const leftCol = `
        <div style="display:flex;flex-direction:column;gap:12px;">
            <div style="${GF_SECTION}">
                <label class="c-gf__label" style="${GF_LABEL_STYLE}">Name der Pflanze</label>
                <input type="text" name="name" value="${v('name')}" placeholder="z.B. Pfirsich 'Red Haven'" style="${GF_INPUT_STYLE}" required>
            </div>
            <div style="${GF_SECTION}display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <div>
                    <label class="c-gf__label" style="${GF_LABEL_STYLE}">Pflanzenart</label>
                    <select name="type" style="${GF_SELECT_STYLE}">
                        <option value="">— Wählen</option>
                        ${GF_TYPE_OPTIONS.map(o => `<option value="${o.v}" ${v('type') === o.v ? 'selected' : ''}>${o.l}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="c-gf__label" style="${GF_LABEL_STYLE}">Marker-Farbe</label>
                    <input type="color" name="marker_color" value="${v('marker_color') || '#4CAF50'}"
                        style="width:100%;height:34px;padding:3px;cursor:pointer;border:1px solid var(--border);border-radius:4px;background:var(--bg-app);">
                </div>
            </div>
            <div style="${GF_SECTION_MUTED}">
                <label class="c-gf__label" style="${GF_LABEL_STYLE}">Marker-Icon</label>
                <input type="hidden" name="marker_icon" value="${v('marker_icon') || ''}">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                    <div id="${formId}-icon-preview" style="width:28px;height:28px;border-radius:4px;background:var(--bg-app);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:1rem;">
                        ${_gfResolveIcon(v('marker_icon'))}
                    </div>
                    <button type="button" onclick="gfResetIcon('${formId}')" style="font-size:0.65rem;color:var(--text-muted);background:none;border:none;cursor:pointer;padding:0;">Zurücksetzen</button>
                </div>
                <div id="${formId}-icon-grid" style="display:grid;grid-template-columns:repeat(8,1fr);gap:4px;max-height:200px;overflow-y:auto;"></div>
            </div>
            <div style="${GF_SECTION_GREEN}">
                <label class="c-gf__label" style="${GF_LABEL_STYLE}">Blütezeit</label>
                ${renderBloomToggle('', parseInt(v('bloom_months')) || 0, 'bloom_months')}
            </div>
            <label style="${GF_SECTION_GREEN}background:var(--bg-app);border:1px solid var(--border);border-left:3px solid #4CAF50;border-radius:6px;padding:8px 10px;padding-left:10px;display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.82rem;">
                <input type="checkbox" name="evergreen" id="${formId}-evergreen" ${v('evergreen') == 1 ? 'checked' : ''}
                    style="width:15px;height:15px;cursor:pointer;accent-color:var(--primary);">
                🌿 Immergrün <span style="color:var(--text-muted);font-size:0.75rem;">(außerhalb der Blütezeit sichtbar)</span>
            </label>
            <div style="${GF_SECTION_MUTED}">
                <label class="c-gf__label" style="${GF_LABEL_STYLE}">📷 Foto</label>
                <div id="${formId}-photo-container" style="margin-bottom:6px;"></div>
                <label style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border:1px dashed var(--border);border-radius:4px;cursor:pointer;font-size:0.78rem;color:var(--text-muted);transition:border-color 0.2s;"
                    onmouseenter="this.style.borderColor='var(--primary)'" onmouseleave="this.style.borderColor='var(--border)'">
                    📎 Foto hochladen
                    <input type="file" accept="image/*" style="display:none;"
                        onchange="gfUploadPhoto(this, '${formId}')">
                </label>
            </div>
        </div>`;

    // Rechte Spalte: Steckbrief
    const steckbriefFields = GF_STECKBRIEF.map(f => {
        const val = v(f.key);
        const input = f.type === 'select'
            ? `<select name="${f.key}" style="${GF_SELECT_STYLE}">
                <option value="">—</option>
                ${f.options.map(o => `<option value="${o.v}" ${String(val) === o.v ? 'selected' : ''}>${o.l}</option>`).join('')}
               </select>`
            : `<input type="text" name="${f.key}" value="${val}" placeholder="${f.placeholder || ''}" style="${GF_INPUT_STYLE}">`;
        return `<div>
            <label class="c-gf__label" style="${GF_LABEL_STYLE}">${f.icon} ${f.label}</label>
            ${input}
        </div>`;
    }).join('');

    const rightCol = `
        <div style="background:var(--bg-app);border:1px solid var(--border);border-left:3px solid var(--primary);border-radius:6px;padding:12px;">
            <div style="font-size:0.68rem;font-weight:700;color:var(--primary);letter-spacing:0.06em;margin-bottom:10px;">📋 STECKBRIEF</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                ${steckbriefFields}
            </div>
        </div>`;

    // Icon-Grid nach DOM-Insert befüllen
    setTimeout(() => gfRenderIconGrid(formId), 0);

    return `
        <form id="${formId}" class="c-group-form" onsubmit="event.preventDefault(); ${onSubmit}" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start;">
            ${leftCol}
            ${rightCol}
            <div style="grid-column:1/-1;display:flex;gap:8px;justify-content:flex-end;padding-top:8px;border-top:1px solid var(--border);">
                <button type="submit" class="c-btn c-btn--primary" style="font-size:0.78rem;padding:5px 16px;">Speichern</button>
            </div>
        </form>`;
}

function getGroupFormNiceData(formId) {
    const form = document.getElementById(formId);
    if (!form) return {};
    const obj = {};
    const fields = ['name','type','marker_color','marker_icon','bloom_months','evergreen','height','location','spacing','care','water','hardy','scented','cutflower','lifespan'];
    fields.forEach(key => {
        const el = form.querySelector(`[name="${key}"]`);
        if (!el) return;
        if (key === 'evergreen') { obj[key] = el.checked ? 1 : 0; return; }
        obj[key] = el.value || null;
    });
    return obj;
}

// Icon-Picker Funktionen für Gruppenformular
function _gfResolveIcon(val) {
    if (!val) return '<span style="color:var(--text-muted);font-size:0.7rem;">—</span>';
    if (val.startsWith('lib:') && typeof _iconLibraryCache !== 'undefined' && _iconLibraryCache) {
        const path = _iconLibraryCache[val.substring(4)];
        if (path) return `<img src="${path}" style="width:20px;height:20px;object-fit:contain;">`;
    }
    return `<span>${val}</span>`;
}

function gfSelectIcon(formId, iconId) {
    const form = document.getElementById(formId);
    if (!form) return;
    form.querySelector('[name="marker_icon"]').value = 'lib:' + iconId;
    const preview = document.getElementById(formId + '-icon-preview');
    if (preview) preview.innerHTML = _gfResolveIcon('lib:' + iconId);
    // Highlight
    const grid = document.getElementById(formId + '-icon-grid');
    if (grid) grid.querySelectorAll('button').forEach(b => {
        b.style.outline = b.dataset.iconId === iconId ? '2px solid var(--primary)' : 'none';
    });
}

function gfResetIcon(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    form.querySelector('[name="marker_icon"]').value = '';
    const preview = document.getElementById(formId + '-icon-preview');
    if (preview) preview.innerHTML = _gfResolveIcon('');
    const grid = document.getElementById(formId + '-icon-grid');
    if (grid) grid.querySelectorAll('button').forEach(b => b.style.outline = 'none');
}

function gfRenderIconGrid(formId) {
    const grid = document.getElementById(formId + '-icon-grid');
    if (!grid || typeof _iconLibraryCache === 'undefined' || !_iconLibraryCache) {
        if (grid) grid.innerHTML = '<span style="color:var(--text-muted);font-size:0.7rem;grid-column:1/-1;">Keine Icons</span>';
        return;
    }
    const currentVal = document.getElementById(formId)?.querySelector('[name="marker_icon"]')?.value || '';
    grid.innerHTML = Object.entries(_iconLibraryCache).map(([id, path]) => {
        const selected = currentVal === 'lib:' + id ? 'outline:2px solid var(--primary);' : '';
        return `<button type="button" data-icon-id="${id}" onclick="gfSelectIcon('${formId}','${id}')"
            style="width:100%;aspect-ratio:1;border:1px solid var(--border);border-radius:4px;background:var(--bg-app);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:4px;transition:transform 0.15s;${selected}"
            onmouseenter="this.style.transform='scale(1.8)';this.style.zIndex='10'" onmouseleave="this.style.transform='';this.style.zIndex=''">
            <img src="${path}" style="width:100%;height:100%;object-fit:contain;">
        </button>`;
    }).join('');
}

// ========================
// Gruppen-Foto Upload/Anzeige
// ========================

/** Lädt und zeigt Fotos für eine Gruppe im Formular an */
function gfLoadPhotos(formId, groupId) {
    const container = document.getElementById(formId + '-photo-container');
    if (!container || !groupId) return;
    // Speichere groupId am Container für spätere Uploads
    container.dataset.groupId = groupId;

    fetch('backend/api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getImages', type: 'default', group_id: groupId })
    })
    .then(r => r.json())
    .then(data => {
        if (!data.success || !data.images || !data.images.length) {
            container.innerHTML = '<p style="font-size:0.75rem;color:var(--text-muted);">Noch keine Fotos.</p>';
            return;
        }
        container.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${data.images.map(img => `
                <div style="position:relative;">
                    <img src="${img.file_path}" style="width:80px;height:60px;object-fit:cover;border-radius:6px;border:1px solid var(--border);">
                    <button type="button" onclick="gfDeletePhoto(${img.id}, '${formId}', ${groupId})"
                        style="position:absolute;top:-4px;right:-4px;width:18px;height:18px;border-radius:50%;background:var(--danger);color:white;border:none;font-size:0.65rem;cursor:pointer;line-height:1;">✕</button>
                </div>`).join('')}
        </div>`;
    });
}

/** Upload-Handler für Gruppen-Fotos (nutzt bestehenden Crop-Dialog) */
function gfUploadPhoto(input, formId) {
    const file = input.files[0];
    if (!file) return;
    const container = document.getElementById(formId + '-photo-container');
    const groupId = container?.dataset?.groupId;
    if (!groupId) {
        customAlert('Bitte speichere die Gruppe zuerst, bevor du ein Foto hochlädst.');
        input.value = '';
        return;
    }
    // Nutze bestehenden Crop-Dialog aus pflanzen.js
    uploadImage(input, 'default', groupId, null, formId + '-photo-container', null);
}

/** Löscht ein Gruppen-Foto */
async function gfDeletePhoto(imageId, formId, groupId) {
    if (!await customConfirm('Foto löschen?', { confirmLabel: 'Löschen', danger: true })) return;
    const res = await fetch('backend/api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteImage', id: imageId })
    });
    const data = await res.json();
    if (data.success) gfLoadPhotos(formId, groupId);
}
