/**
 * Gardian – Gemeinsamer Renderer für Pflanzengruppen-Formulare
 * Wird von admin.js und app.js genutzt
 */

const GF_TYPE_OPTIONS = [
    { v: 'tree',     l: '🌳 Baum' },
    { v: 'shrub',    l: '🌿 Strauch' },
    { v: 'flower',   l: '🌸 Blume' },
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

    // Linke Spalte: Name, Typ, Farbe, Blütezeit, Immergrün
    const leftCol = `
        <div style="display:flex;flex-direction:column;gap:12px;">
            <div>
                <label class="c-gf__label" style="${GF_LABEL_STYLE}">Name der Pflanze</label>
                <input type="text" name="name" value="${v('name')}" placeholder="z.B. Pfirsich 'Red Haven'" style="${GF_INPUT_STYLE}" required>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
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
                        style="height:34px;padding:3px;cursor:pointer;">
                </div>
            </div>
            <div>
                <label class="c-gf__label" style="${GF_LABEL_STYLE}">Blütezeit</label>
                ${renderBloomToggle('', parseInt(v('bloom_months')) || 0, 'bloom_months')}
            </div>
            <label style="background:var(--bg-app);border:1px solid var(--border);border-radius:4px;padding:8px 10px;display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.82rem;">
                <input type="checkbox" name="evergreen" id="${formId}-evergreen" ${v('evergreen') == 1 ? 'checked' : ''}
                    style="width:15px;height:15px;cursor:pointer;accent-color:var(--primary);">
                🌿 Immergrün <span style="color:var(--text-muted);font-size:0.75rem;">(außerhalb der Blütezeit sichtbar)</span>
            </label>
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
        <div style="background:var(--bg-app);border:1px solid var(--border);border-radius:4px;padding:12px;">
            <div style="font-size:0.68rem;font-weight:700;color:var(--primary);letter-spacing:0.06em;margin-bottom:10px;">📋 STECKBRIEF</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                ${steckbriefFields}
            </div>
        </div>`;

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
    const fields = ['name','type','marker_color','bloom_months','evergreen','height','location','spacing','care','water','hardy','scented','cutflower','lifespan'];
    fields.forEach(key => {
        const el = form.querySelector(`[name="${key}"]`);
        if (!el) return;
        if (key === 'evergreen') { obj[key] = el.checked ? 1 : 0; return; }
        obj[key] = el.value || null;
    });
    return obj;
}
