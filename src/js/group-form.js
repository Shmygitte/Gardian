/**
 * Gardian – Gemeinsamer Renderer für Pflanzengruppen-Formulare
 * Wird von admin.js und app.js genutzt
 */
import { api } from './core/api.js';
import { iconLibraryCache, plantTypesCache } from './core/state.js';

function getTypeOptions() {
    return plantTypesCache.map(t => ({ v: t.key, l: `${t.icon || ''} ${t.label}`.trim() }));
}

const GF_STECKBRIEF = [
    { key: 'height',    label: 'Höhe',         icon: '📏', type: 'text',   placeholder: 'z.B. 1–2m' },
    { key: 'location',  label: 'Standort',      icon: '☀️', type: 'select', options: [{v:'sonnig',l:'Sonnig'},{v:'Sonne bis Halbschatten',l:'Sonne bis Halbschatten'},{v:'halbschatten',l:'Halbschatten'},{v:'schatten',l:'Schatten'}] },
    { key: 'spacing',   label: 'Abstand',       icon: '↔️', type: 'text',   placeholder: 'z.B. 40cm' },
    { key: 'care',      label: 'Pflege',        icon: '🔧', type: 'select', options: [{v:'gering',l:'Gering'},{v:'mittel',l:'Mittel'},{v:'hoch',l:'Hoch'}] },
    { key: 'water',     label: 'Wasser',        icon: '💧', type: 'select', options: [{v:'gering',l:'Gering'},{v:'mittel',l:'Mittel'},{v:'hoch',l:'Hoch'}] },
    { key: 'hardy',     label: 'Frostfest',     icon: '❄️', type: 'select', options: [{v:'1',l:'Ja'},{v:'0',l:'Nein'}] },
    { key: 'scented',   label: 'Duft',          icon: '🌺', type: 'select', options: [{v:'1',l:'Ja'},{v:'0',l:'Nein'}] },
    { key: 'cutflower', label: 'Schnittblume',  icon: '✂️', type: 'select', options: [{v:'1',l:'Ja'},{v:'0',l:'Nein'}] },
    { key: 'lifespan',  label: 'Lebensdauer',   icon: '📅', type: 'select', options: [{v:'einjährig',l:'Einjährig'},{v:'zweijährig',l:'Zweijährig'},{v:'mehrjährig',l:'Mehrjährig'}] },
    { key: 'features',  label: 'Besonderheiten', icon: '⭐', type: 'text',   placeholder: 'z.B. bienenfreundlich' },
];

// Fallback-Styles falls CSS nicht greift (Admin-Seite etc.)
const GF_INPUT_STYLE  = 'width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:4px;background:var(--bg-app);color:var(--text-main);font-size:0.82rem;font-family:inherit;box-sizing:border-box;outline:none;';
const GF_SELECT_STYLE = GF_INPUT_STYLE;
const GF_LABEL_STYLE  = 'font-size:0.75rem;color:var(--text-muted);font-weight:600;display:flex;align-items:center;gap:5px;margin-bottom:4px;';

function renderGroupFormNice(data = {}, formId, onSubmit, resetConfig = null) {
    // resetConfig am window speichern, damit onclick darauf zugreifen kann
    if (resetConfig) window._gfResetConfig = resetConfig;
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
                <label class="c-gf__label" style="${GF_LABEL_STYLE}margin-top:8px;">Botanischer Name</label>
                <input type="text" name="botanical_name" value="${v('botanical_name')}" placeholder="z.B. Wisteria sinensis" style="${GF_INPUT_STYLE}font-style:italic;">
            </div>
            <div style="${GF_SECTION}display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <div>
                    <label class="c-gf__label" style="${GF_LABEL_STYLE}">Pflanzenart</label>
                    <select name="type" style="${GF_SELECT_STYLE}">
                        <option value="">— Wählen</option>
                        ${getTypeOptions().map(o => `<option value="${o.v}" ${v('type') === o.v ? 'selected' : ''}>${o.l}</option>`).join('')}
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
                ${renderBloomToggle('', parseInt(v('bloom_months_resolved') || v('bloom_months')) || 0, 'bloom_months')}
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
    const resetBtnStyle = 'background:none;border:none;cursor:pointer;font-size:0.7rem;color:var(--text-muted);padding:0 2px;opacity:0.5;transition:opacity 0.2s;';
    const steckbriefFields = GF_STECKBRIEF.map(f => {
        const val = v(f.key);
        const resetBtn = resetConfig
            ? `<button type="button" title="Zurücksetzen auf vererbten Wert" style="${resetBtnStyle}" onmouseenter="this.style.opacity='1'" onmouseleave="this.style.opacity='0.5'" onclick="gfResetField('${formId}','${f.key}')">↩</button>`
            : '';
        const input = f.type === 'select'
            ? `<select name="${f.key}" style="${GF_SELECT_STYLE}">
                <option value="">—</option>
                ${f.options.map(o => `<option value="${o.v}" ${String(val) === o.v ? 'selected' : ''}>${o.l}</option>`).join('')}
               </select>`
            : `<input type="text" name="${f.key}" value="${val}" placeholder="${f.placeholder || ''}" style="${GF_INPUT_STYLE}">`;
        return `<div>
            <label class="c-gf__label" style="${GF_LABEL_STYLE}"><span>${f.icon} ${f.label}</span>${resetBtn}</label>
            ${input}
        </div>`;
    }).join('');

    const resetAllBtn = resetConfig
        ? `<button type="button" onclick="gfResetAllFields('${formId}')" style="font-size:0.68rem;color:var(--text-muted);background:none;border:1px solid var(--border);border-radius:4px;padding:3px 8px;cursor:pointer;transition:all 0.2s;" onmouseenter="this.style.borderColor='var(--primary)';this.style.color='var(--primary)'" onmouseleave="this.style.borderColor='var(--border)';this.style.color='var(--text-muted)'">↩ Alle zurücksetzen</button>`
        : '';

    const rightCol = `
        <div style="background:var(--bg-app);border:1px solid var(--border);border-left:3px solid var(--primary);border-radius:6px;padding:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <span style="font-size:0.68rem;font-weight:700;color:var(--primary);letter-spacing:0.06em;">📋 STECKBRIEF</span>
                <div style="display:flex;gap:6px;align-items:center;">
                    <button type="button" onclick="gfFillFromAI('${formId}')" style="font-size:0.68rem;color:white;background:var(--primary);border:1px solid var(--primary);border-radius:4px;padding:3px 8px;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;gap:4px;" onmouseenter="this.style.opacity='0.85'" onmouseleave="this.style.opacity='1'">🤖 KI ausfüllen</button>
                    ${resetAllBtn}
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                ${steckbriefFields}
            </div>
        </div>
        <div id="${formId}-pest-info" style="display:none;background:var(--bg-app);border:1px solid var(--border);border-left:3px solid #e67e22;border-radius:6px;padding:12px;margin-top:12px;">
            <span style="font-size:0.68rem;font-weight:700;color:#e67e22;letter-spacing:0.06em;" id="${formId}-pest-title"></span>
            <div id="${formId}-pest-content" style="margin-top:8px;font-size:0.82rem;color:var(--text-main);display:flex;flex-direction:column;gap:10px;"></div>
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
    const fields = ['name','botanical_name','type','marker_color','marker_icon','bloom_months','evergreen','height','location','spacing','care','water','hardy','scented','cutflower','lifespan','features'];
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
    if (val.startsWith('lib:') && iconLibraryCache) {
        const path = iconLibraryCache[val.substring(4)];
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
    if (!grid || !iconLibraryCache) {
        if (grid) grid.innerHTML = '<span style="color:var(--text-muted);font-size:0.7rem;grid-column:1/-1;">Keine Icons</span>';
        return;
    }
    const currentVal = document.getElementById(formId)?.querySelector('[name="marker_icon"]')?.value || '';
    grid.innerHTML = Object.entries(iconLibraryCache).map(([id, path]) => {
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

    api('getImages', { type: 'default', group_id: groupId })
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
        window.customAlert('Bitte speichere die Gruppe zuerst, bevor du ein Foto hochlädst.');
        input.value = '';
        return;
    }
    // Nutze bestehenden Crop-Dialog aus pflanzen.js
    window.uploadImage(input, 'default', groupId, null, formId + '-photo-container', null);
}

/** Löscht ein Gruppen-Foto */
async function gfDeletePhoto(imageId, formId, groupId) {
    if (!await window.customConfirm('Foto löschen?', { confirmLabel: 'Löschen', danger: true })) return;
    const data = await api('deleteImage', { id: imageId });
    if (data.success) gfLoadPhotos(formId, groupId);
}

// ========================
// Reset-Funktionen
// ========================

/** Setzt ein einzelnes Feld auf den vererbten Wert zurück */
async function gfResetField(formId, fieldKey) {
    const rc = window._gfResetConfig;
    if (!rc) return;
    const label = GF_STECKBRIEF.find(f => f.key === fieldKey)?.label || fieldKey;
    if (!await window.customConfirm(`„${label}" auf vererbten Wert zurücksetzen?`, { confirmLabel: 'Zurücksetzen' })) return;
    const result = await api(rc.action, { id: rc.id, fields: [fieldKey] });
    if (result.success) {
        if (window._gfResetCallback) window._gfResetCallback();
    } else {
        window.customAlert('Reset fehlgeschlagen: ' + (result.error || 'Unbekannter Fehler'));
    }
}

/** Setzt alle Steckbrief-Felder auf vererbte Werte zurück */
async function gfResetAllFields(formId) {
    const rc = window._gfResetConfig;
    if (!rc) return;
    if (!await window.customConfirm('Alle Steckbrief-Felder auf vererbte Werte zurücksetzen?', { confirmLabel: 'Alle zurücksetzen', danger: true })) return;
    const result = await api(rc.action, { id: rc.id });
    if (result.success) {
        if (window._gfResetCallback) window._gfResetCallback();
    } else {
        window.customAlert('Reset fehlgeschlagen: ' + (result.error || 'Unbekannter Fehler'));
    }
}

// ========================
// Pest Info (KI-generiert, read-only)
// ========================
const MONATSNAMEN = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

function _gfParseMd(text) {
    const lines = text.split('\n');
    let html = '', inList = false;
    for (const line of lines) {
        const trimmed = line.trim();
        const listMatch = trimmed.match(/^[-*]\s+(.+)/);
        if (listMatch) {
            if (!inList) { html += '<ul style="margin:4px 0 8px 16px;padding:0;">'; inList = true; }
            html += `<li style="margin-bottom:2px;">${trimmed.substring(2)}</li>`;
        } else {
            if (inList) { html += '</ul>'; inList = false; }
            if (/^### /.test(trimmed)) html += `<h4 style="font-size:0.85rem;margin:8px 0 4px;color:var(--text-main);">${trimmed.substring(4)}</h4>`;
            else if (/^## /.test(trimmed)) html += `<h3 style="font-size:0.9rem;margin:10px 0 4px;color:var(--text-main);">${trimmed.substring(3)}</h3>`;
            else if (/^# /.test(trimmed)) html += `<h2 style="font-size:0.95rem;margin:10px 0 6px;color:var(--text-main);">${trimmed.substring(2)}</h2>`;
            else if (trimmed === '') html += '<br>';
            else html += `<p style="margin:2px 0;">${trimmed}</p>`;
        }
    }
    if (inList) html += '</ul>';
    return html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function gfLoadPestInfo(formId, groupId) {
    const container = document.getElementById(formId + '-pest-info');
    if (!container || !groupId) return;
    const monat = new Date().getMonth() + 1;
    api('getPestInfo', { group_id: groupId, monat })
    .then(data => {
        if (!data.success || !data.pest_info) {
            container.style.display = 'none';
            return;
        }
        const info = data.pest_info;
        const title = document.getElementById(formId + '-pest-title');
        const content = document.getElementById(formId + '-pest-content');
        title.textContent = `🐛 Aktuell im ${MONATSNAMEN[monat - 1]}`;
        let html = '';
        if (info.pflegetipps) {
            const pt = _gfParseMd(info.pflegetipps);
            html += `<div><span style="font-weight:600;font-size:0.75rem;">🌱 Pflegetipps</span><div style="margin:4px 0 0;line-height:1.5;">${pt}</div></div>`;
        }
        if (info.schaedlinge) {
            const sc = _gfParseMd(info.schaedlinge);
            html += `<div><span style="font-weight:600;font-size:0.75rem;">🐛 Schädlinge & Krankheiten</span><div style="margin:4px 0 0;line-height:1.5;">${sc}</div></div>`;
        }
        content.innerHTML = html;
        container.style.display = '';
    });
}

// ========================
// KI-Steckbrief ausfüllen
// ========================

async function gfFillFromAI(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    const nameEl = form.querySelector('[name="name"]');
    const plantName = nameEl?.value?.trim();
    if (!plantName) {
        window.customAlert('Bitte zuerst einen Pflanzennamen eingeben.');
        return;
    }

    const btn = form.querySelector('[onclick*="gfFillFromAI"]');
    const origText = btn?.innerHTML;
    if (btn) { btn.innerHTML = '⏳ Lade…'; btn.disabled = true; }

    try {
        const res = await fetch('http://localhost:5678/webhook/steckbrief-ki', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: plantName })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.json();
        const data = raw.output || raw;

        // Einfache Felder mappen
        const fieldMap = {
            lat_name: 'botanical_name',
            type: 'type',
            height: 'height',
            location: 'location',
            spacing: 'spacing',
            hardy: 'hardy',
            scented: 'scented',
            care: 'care',
            water: 'water'
        };
        for (const [src, target] of Object.entries(fieldMap)) {
            if (data[src] == null) continue;
            const el = form.querySelector(`[name="${target}"]`);
            if (el) el.value = String(data[src]);
        }

        // Evergreen-Checkbox
        if (data.evergreen != null) {
            const eg = form.querySelector('[name="evergreen"]');
            if (eg) eg.checked = !!Number(data.evergreen);
        }

        // Blütezeit: bloom_start/bloom_end → Bitmask + Toggle-Buttons aktualisieren
        if (data.bloom_start != null && data.bloom_end != null) {
            let bitmask = 0;
            const start = Number(data.bloom_start);
            const end = Number(data.bloom_end);
            for (let m = start; m <= end; m++) {
                bitmask |= (1 << (m - 1));
            }
            const hidden = form.querySelector('[name="bloom_months"]');
            if (hidden) hidden.value = bitmask;
            // Toggle-Buttons visuell aktualisieren
            const btns = hidden?.closest('div')?.querySelectorAll('button[data-active]');
            if (btns) btns.forEach((b, i) => {
                const active = (bitmask >> i) & 1;
                b.dataset.active = String(active);
                b.style.background = active ? 'var(--primary)' : 'var(--bg-app)';
                b.style.color = active ? 'white' : 'var(--text-main)';
            });
        }
    } catch (err) {
        window.customAlert?.('KI-Abfrage fehlgeschlagen: ' + err.message) || alert('KI-Abfrage fehlgeschlagen: ' + err.message);
    } finally {
        if (btn) { btn.innerHTML = origText; btn.disabled = false; }
    }
}

// Bridge
window.gfFillFromAI = gfFillFromAI;
window.gfLoadPestInfo = gfLoadPestInfo;
window.renderGroupFormNice = renderGroupFormNice;
window.getGroupFormNiceData = getGroupFormNiceData;
window.gfSelectIcon = gfSelectIcon;
window.gfResetField = gfResetField;
window.gfResetAllFields = gfResetAllFields;
window.gfResetIcon = gfResetIcon;
window.gfRenderIconGrid = gfRenderIconGrid;
window.gfLoadPhotos = gfLoadPhotos;
window.gfUploadPhoto = gfUploadPhoto;
window.gfDeletePhoto = gfDeletePhoto;
