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

const GF_INPUT_STYLE  = 'width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-app);color:var(--text-main);font-size:0.9rem;box-sizing:border-box;';
const GF_SELECT_STYLE = 'width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-app);color:var(--text-main);font-size:0.9rem;';
const GF_LABEL_STYLE  = 'font-size:0.75rem;color:var(--text-muted);font-weight:600;margin-bottom:4px;display:flex;align-items:center;gap:5px;';

function renderGroupFormNice(data = {}, formId, onSubmit) {
    const v = (key) => data[key] ?? '';

    // Linke Spalte: Name, Typ, Farbe, Blütezeit, Immergrün
    const leftCol = `
        <div style="display:flex;flex-direction:column;gap:16px;">
            <div>
                <div style="${GF_LABEL_STYLE}">Name der Pflanze</div>
                <input type="text" name="name" value="${v('name')}" placeholder="z.B. Pfirsich 'Red Haven'"
                    style="${GF_INPUT_STYLE} font-size:1rem;" required>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div>
                    <div style="${GF_LABEL_STYLE}">Pflanzenart</div>
                    <select name="type" style="${GF_SELECT_STYLE}">
                        <option value="">— Wählen</option>
                        ${GF_TYPE_OPTIONS.map(o => `<option value="${o.v}" ${v('type') === o.v ? 'selected' : ''}>${o.l}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <div style="${GF_LABEL_STYLE}">Marker-Farbe</div>
                    <input type="color" name="marker_color" value="${v('marker_color') || '#4CAF50'}"
                        style="width:100%;height:42px;padding:4px 8px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-app);cursor:pointer;">
                </div>
            </div>
            <div>
                <div style="${GF_LABEL_STYLE}">Blütezeit</div>
                ${renderBloomToggle('', parseInt(v('bloom_months')) || 0, 'bloom_months')}
            </div>
            <div style="background:var(--bg-app);border:1px solid var(--border);border-radius:var(--radius-md);padding:12px 14px;display:flex;align-items:center;gap:10px;">
                <input type="checkbox" name="evergreen" id="${formId}-evergreen" ${v('evergreen') == 1 ? 'checked' : ''}
                    style="width:16px;height:16px;cursor:pointer;accent-color:var(--primary);">
                <label for="${formId}-evergreen" style="font-size:0.9rem;cursor:pointer;">🌿 Immergrün <span style="color:var(--text-muted);font-size:0.8rem;">(außerhalb der Blütezeit sichtbar)</span></label>
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
            <div style="${GF_LABEL_STYLE}">${f.icon} ${f.label}</div>
            ${input}
        </div>`;
    }).join('');

    const rightCol = `
        <div style="background:var(--bg-app);border:1px solid var(--border);border-radius:var(--radius-md);padding:16px;">
            <div style="font-size:0.7rem;font-weight:700;color:var(--primary);letter-spacing:0.08em;margin-bottom:14px;">📋 STECKBRIEF</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                ${steckbriefFields}
            </div>
        </div>`;

    return `
        <form id="${formId}" onsubmit="event.preventDefault(); ${onSubmit}" style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start;">
            ${leftCol}
            ${rightCol}
            <div style="grid-column:1/-1;display:flex;gap:8px;justify-content:flex-end;padding-top:8px;border-top:1px solid var(--border);margin-top:4px;">
                <button type="submit" class="c-btn c-btn--primary">Speichern</button>
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
