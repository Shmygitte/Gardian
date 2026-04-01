/**
 * Gardian – Admin-Bereich
 */
// ES Module – fetch-Aufrufe werden schrittweise auf api() migriert
import { plantTypesCache } from './core/state.js';

const GROUP_FIELDS_ADMIN = [
    { key: 'name',         label: 'Name',             type: 'text',   required: true },
    { key: 'type',         label: 'Typ',               type: 'select', dynamicOptions: true, required: true },
    { key: 'bloom_months', label: 'Blütezeit',         type: 'bloom_toggle' },
    { key: 'marker_icon',  label: 'Marker-Icon',       type: 'text' },
    { key: 'marker_color', label: 'Marker-Farbe',      type: 'color' },
    { key: 'marker_size',  label: 'Marker-Größe (px)', type: 'number' },
    { key: 'height',       label: 'Höhe',              type: 'text' },
    { key: 'location',     label: 'Standort',          type: 'text' },
    { key: 'spacing',      label: 'Pflanzabstand',     type: 'text' },
    { key: 'care',         label: 'Pflege',            type: 'textarea' },
    { key: 'water',        label: 'Wasser',            type: 'textarea' },
    { key: 'hardy',        label: 'Winterhart',        type: 'checkbox' },
    { key: 'scented',      label: 'Duftend',           type: 'checkbox' },
    { key: 'cutflower',    label: 'Schnittblume',      type: 'checkbox' },
    { key: 'lifespan',     label: 'Lebenszeit',        type: 'text' },
    { key: 'features',     label: 'Besonderheiten',    type: 'textarea' },
    { key: 'evergreen',    label: 'Immergrün',         type: 'checkbox' },
];

let adminCurrentTab = 'users';

function switchAdminTab(tab) {
    adminCurrentTab = tab;
    ['users','groups','plant-types','care-types','icons','links','system'].forEach(t => {
        document.getElementById(`admin-panel-${t}`).style.display = tab === t ? 'block' : 'none';
        document.getElementById(`admin-tab-${t}`).className = 'c-btn ' + (tab === t ? 'c-btn--secondary' : 'c-btn--text');
    });
    if (tab === 'groups') loadAdminGroups();
    if (tab === 'plant-types') loadAdminPlantTypes();
    if (tab === 'care-types') loadAdminCareTypes();
    if (tab === 'icons') loadAdminIcons();
    if (tab === 'links') loadAdminLinks();
    if (tab === 'system') loadSystemInfo();
}

async function loadAdminView() {
    switchAdminTab('users');
    await loadAdminUsers();
    loadAdminGroups();
    loadAdminCareTypes();
    loadAdminPlantTypes();
}

// ========================
// BENUTZER
// ========================
async function loadAdminUsers() {
    const panel = document.getElementById('admin-panel-users');
    panel.innerHTML = '<p style="color:var(--text-muted)">Lade...</p>';
    const res  = await fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'adminGetUsers' }) });
    const data = await res.json();
    if (!data.success) { panel.innerHTML = '<p style="color:red">Fehler.</p>'; return; }

    panel.innerHTML = `
        <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
            <thead>
                <tr style="border-bottom:2px solid var(--border);">
                    <th style="text-align:left; padding:8px;">Username</th>
                    <th style="text-align:left; padding:8px;">Email</th>
                    <th style="text-align:left; padding:8px;">Rolle</th>
                    <th style="text-align:left; padding:8px;">Letzter Login</th>
                    <th style="text-align:left; padding:8px;">Erstellt am</th>
                    <th style="padding:8px;"></th>
                </tr>
            </thead>
            <tbody>
                ${data.users.map(u => `
                <tr style="border-bottom:1px solid var(--border);">
                    <td style="padding:8px;">${u.username}</td>
                    <td style="padding:8px; color:var(--text-muted);">${u.email}</td>
                    <td style="padding:8px;">
                        <select onchange="adminUpdateRole(${u.id}, this.value)" style="padding:4px; border:1px solid var(--border); border-radius:var(--radius-sm);">
                            <option value="user"  ${u.role === 'user'  ? 'selected' : ''}>User</option>
                            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                    </td>
                    <td style="padding:8px; color:var(--text-muted);">${u.last_login ? new Date(u.last_login).toLocaleString('de-DE') : '—'}</td>
                    <td style="padding:8px; color:var(--text-muted);">${new Date(u.created_at).toLocaleDateString('de-DE')}</td>
                    <td style="padding:8px;">
                        <button class="c-btn c-btn--text" style="color:var(--danger); font-size:0.8rem;" onclick="adminDeleteUser(${u.id}, '${u.username}')">Löschen</button>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>`;
}

async function adminUpdateRole(id, role) {
    await fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'adminUpdateRole', id, role }) });
}

async function adminDeleteUser(id, username) {
    if (!await customConfirm(`User "${username}" wirklich löschen?`, { confirmLabel: 'Löschen', danger: true })) return;
    const res  = await fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'adminDeleteUser', id }) });
    const data = await res.json();
    if (data.success) loadAdminUsers();
    else customAlert(data.error || 'Fehler beim Löschen');
}

// ========================
// PFLANZENGRUPPEN
// ========================
async function loadAdminGroups(openEditId) {
    const panel = document.getElementById('admin-panel-groups');
    panel.innerHTML = '<p style="color:var(--text-muted)">Lade...</p>';
    const res  = await fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'adminGetGroups' }) });
    const data = await res.json();
    if (!data.success) { panel.innerHTML = '<p style="color:red">Fehler.</p>'; return; }

    const groupsHtml = data.groups.map(g => `
        <div style="border:1px solid var(--border); border-radius:var(--radius-md); margin-bottom:8px; overflow:hidden;">
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 16px; background:var(--bg-card);">
                <span style="font-weight:600;">${g.name} <span style="color:var(--text-muted); font-weight:400; font-size:0.85rem;">(${g.type})</span></span>
                <div style="display:flex; gap:8px;">
                    <button class="c-btn c-btn--text" style="font-size:0.8rem;" onclick="toggleAdminGroupEdit('edit-${g.id}')">Bearbeiten</button>
                    <button class="c-btn c-btn--text" style="color:var(--danger); font-size:0.8rem;" onclick="adminDeleteGroup(${g.id}, '${g.name}')">Löschen</button>
                </div>
            </div>
            <div id="edit-${g.id}" style="display:none; padding:16px; background:var(--bg-surface);">
                ${renderGroupFormNice(g, `gform-${g.id}`, `adminSaveGroup(${g.id})`)}
            </div>
        </div>`).join('');

    panel.innerHTML = `
        <div style="margin-bottom:16px; border:2px dashed var(--border); border-radius:var(--radius-md); padding:16px;">
            <p style="font-weight:600; margin-bottom:0; cursor:pointer; display:flex; align-items:center; gap:8px;" onclick="const b=document.getElementById('admin-new-group-body'); const a=this.querySelector('.toggle-arrow'); if(b.style.display==='none'){b.style.display='';a.textContent='▼';}else{b.style.display='none';a.textContent='▶';}">
                <span class="toggle-arrow" style="font-size:0.7rem;">▶</span> Neue Gruppe anlegen
            </p>
            <div id="admin-new-group-body" style="display:none; margin-top:12px;">
                ${renderGroupFormNice({}, 'gform-new', 'adminAddGroup()')}
            </div>
        </div>
        ${groupsHtml}`;

    // Fotos für jede bestehende Gruppe laden
    data.groups.forEach(g => gfLoadPhotos('gform-' + g.id, g.id));

    // Nach Save: bearbeitetes Formular wieder aufklappen
    if (openEditId) {
        const el = document.getElementById('edit-' + openEditId);
        if (el) el.style.display = 'block';
    }
}

function renderGroupForm(data, onsubmit) {
    const formId = 'gform-' + (data.id || 'new');
    const fields = GROUP_FIELDS_ADMIN.map(f => {
        const val = data[f.key] ?? '';
        if (f.type === 'select') {
            let opts;
            if (f.dynamicOptions) {
                opts = plantTypesCache.map(t => `<option value="${t.key}" ${val == t.key ? 'selected' : ''}>${t.icon || ''} ${t.label}</option>`).join('');
            } else {
                opts = f.options.map((o, i) => `<option value="${o}" ${val == o ? 'selected' : ''}>${f.labels[i]}</option>`).join('');
            }
            return `<div style="margin-bottom:8px;"><label style="font-size:0.8rem;color:var(--text-muted);">${f.label}${f.required ? ' *' : ''}</label><br><select name="${f.key}" style="width:100%;padding:6px;border:1px solid var(--border);border-radius:var(--radius-sm);"><option value="">—</option>${opts}</select></div>`;
        }
        if (f.type === 'checkbox') {
            return `<div style="margin-bottom:8px;display:flex;align-items:center;gap:8px;"><input type="checkbox" name="${f.key}" ${val == 1 ? 'checked' : ''}><label style="font-size:0.85rem;">${f.label}</label></div>`;
        }
        if (f.type === 'textarea') {
            return `<div style="margin-bottom:8px;"><label style="font-size:0.8rem;color:var(--text-muted);">${f.label}</label><br><textarea name="${f.key}" rows="2" style="width:100%;padding:6px;border:1px solid var(--border);border-radius:var(--radius-sm);">${val}</textarea></div>`;
        }
        if (f.type === 'bloom_toggle') {
            return renderBloomToggle(f.label, parseInt(val) || 0, 'bloom_months');
        }
        return `<div style="margin-bottom:8px;"><label style="font-size:0.8rem;color:var(--text-muted);">${f.label}${f.required ? ' *' : ''}</label><br><input type="${f.type}" name="${f.key}" value="${val}" style="width:100%;padding:6px;border:1px solid var(--border);border-radius:var(--radius-sm);box-sizing:border-box;"></div>`;
    }).join('');

    return `<form id="${formId}" onsubmit="event.preventDefault(); ${onsubmit}" style="display:grid; grid-template-columns:1fr 1fr; gap:0 16px;">${fields}<div style="grid-column:1/-1; margin-top:8px;"><button type="submit" class="c-btn c-btn--primary">Speichern</button></div></form>`;
}

function renderBloomToggle(label, bitmask, inputName) {
    const months = ['J','F','M','A','M','J','J','A','S','O','N','D'];
    const btns = months.map((m, i) => {
        const active = (bitmask >> i) & 1;
        return `<button type="button"
            onclick="toggleBloomMonth(this, ${i})"
            data-active="${active}"
            style="width:30px;height:30px;border-radius:6px;border:1px solid var(--border);font-size:0.75rem;font-weight:600;cursor:pointer;
                   background:${active ? 'var(--primary)' : 'var(--bg-app)'};
                   color:${active ? 'white' : 'var(--text-main)'};">${m}</button>`;
    }).join('');
    return `<div style="grid-column:1/-1; margin-bottom:8px;">
        <label style="font-size:0.8rem;color:var(--text-muted);">${label}</label>
        <div style="display:flex;gap:4px;margin-top:6px;">${btns}</div>
        <input type="hidden" name="${inputName}" value="${bitmask}">
    </div>`;
}

function toggleBloomMonth(btn, index) {
    const active = btn.dataset.active === '1';
    btn.dataset.active = active ? '0' : '1';
    btn.style.background = active ? 'var(--bg-app)' : 'var(--primary)';
    btn.style.color      = active ? 'var(--text-main)' : 'white';
    const hidden = btn.closest('div').parentElement.querySelector('input[type="hidden"]');
    let bitmask  = parseInt(hidden.value) || 0;
    hidden.value = active ? bitmask & ~(1 << index) : bitmask | (1 << index);
}

function getFormData(formId) {
    const form = document.getElementById(formId);
    const obj  = {};
    GROUP_FIELDS_ADMIN.forEach(f => {
        const el = form.querySelector(`[name="${f.key}"]`);
        if (!el) return;
        obj[f.key] = f.type === 'checkbox' ? (el.checked ? 1 : 0) : (el.value || null);
    });
    return obj;
}

function toggleAdminGroupEdit(id) {
    const el = document.getElementById(id);
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

async function adminSaveGroup(id) {
    const btn = document.querySelector(`#gform-${id} button[type="submit"]`);
    if (btn) { btn.disabled = true; btn.textContent = 'Speichern…'; }
    const formData = { ...getGroupFormNiceData('gform-' + id), action: 'adminUpdateGroup', id };
    try {
        const res  = await fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(formData) });
        const data = await res.json();
        if (data.success) {
            if (typeof EffectManager !== 'undefined') EffectManager.trigger('save-success');
            await loadAdminGroups(id);
        } else {
            customAlert(data.error || 'Fehler beim Speichern');
        }
    } catch (e) {
        customAlert('Netzwerkfehler beim Speichern');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Speichern'; }
    }
}

async function adminAddGroup() {
    const formData = { ...getGroupFormNiceData('gform-new'), action: 'adminAddGroup' };
    const res  = await fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(formData) });
    const data = await res.json();
    if (data.success) { if (typeof EffectManager !== 'undefined') EffectManager.trigger('save-success'); loadAdminGroups(); }
    else customAlert(data.error || 'Fehler');
}

async function adminDeleteGroup(id, name) {
    if (!await customConfirm(`Gruppe "${name}" wirklich löschen?`, { confirmLabel: 'Löschen', danger: true })) return;
    const res  = await fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'adminDeleteGroup', id }) });
    const data = await res.json();
    if (data.success) loadAdminGroups();
    else customAlert(data.error || 'Fehler');
}

// ========================
// AUFGABEN-TYPEN
// ========================
async function loadAdminCareTypes() {
    const panel = document.getElementById('admin-panel-care-types');
    panel.innerHTML = '<p style="color:var(--text-muted)">Lade...</p>';
    const res  = await fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'adminGetCareTaskTypes' }) });
    const data = await res.json();
    if (!data.success) { panel.innerHTML = '<p style="color:red">Fehler.</p>'; return; }

    const rows = data.types.map(t => `
        <tr style="border-bottom:1px solid var(--border);">
            <td style="padding:8px;">
                <span class="ct-display" data-id="${t.id}">${t.icon || '—'}</span>
                <span class="ct-edit" data-id="${t.id}" style="display:none;">
                    <input type="text" class="c-input" id="ct-icon-${t.id}" value="${(t.icon||'').replace(/"/g,'&quot;')}" style="width:48px;padding:4px 6px;font-size:0.9rem;text-align:center;">
                </span>
            </td>
            <td style="padding:8px;font-weight:600;">
                <span class="ct-display" data-id="${t.id}">${t.name}</span>
                <span class="ct-edit" data-id="${t.id}" style="display:none;">
                    <input type="text" class="c-input" id="ct-name-${t.id}" value="${t.name.replace(/"/g,'&quot;')}" style="width:100%;padding:4px 6px;font-size:0.9rem;box-sizing:border-box;">
                </span>
            </td>
            <td style="padding:8px;white-space:nowrap;">
                <span class="ct-display" data-id="${t.id}">
                    <button class="c-btn c-btn--text" style="font-size:0.85rem;padding:2px 4px;" title="Bearbeiten" onclick="adminEditCareTypeToggle(${t.id})">✏️</button>
                    <button class="c-btn c-btn--text" style="font-size:0.85rem;padding:2px 4px;" title="Löschen" onclick="adminDeleteCareType(${t.id},'${t.name.replace(/'/g,"\\'")}')">🗑️</button>
                </span>
                <span class="ct-edit" data-id="${t.id}" style="display:none;">
                    <button class="c-btn c-btn--primary" style="font-size:0.8rem;padding:4px 10px;" onclick="adminSaveCareType(${t.id})">OK</button>
                    <button class="c-btn c-btn--text" style="font-size:0.8rem;padding:4px 6px;" onclick="adminEditCareTypeToggle(${t.id})">✕</button>
                </span>
            </td>
        </tr>`).join('');

    panel.innerHTML = `
        <table style="width:100%;border-collapse:collapse;font-size:0.9rem;margin-bottom:20px;">
            <thead>
                <tr style="border-bottom:2px solid var(--border);">
                    <th style="text-align:left;padding:8px;width:48px;">Icon</th>
                    <th style="text-align:left;padding:8px;">Name</th>
                    <th style="padding:8px;width:160px;"></th>
                </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="3" style="padding:12px;color:var(--text-muted);">Noch keine Typen angelegt.</td></tr>'}</tbody>
        </table>
        <div style="border:2px dashed var(--border);border-radius:var(--radius-md);padding:16px;">
            <p style="font-weight:600;margin-bottom:12px;">Neuen Typ anlegen</p>
            <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;">
                <div>
                    <label style="font-size:0.8rem;color:var(--text-muted);display:block;margin-bottom:4px;">Icon (Emoji, optional)</label>
                    <input type="text" id="ct-new-icon" class="c-input" placeholder="🌿" style="width:80px;">
                </div>
                <div style="flex:1;min-width:160px;">
                    <label style="font-size:0.8rem;color:var(--text-muted);display:block;margin-bottom:4px;">Name *</label>
                    <input type="text" id="ct-new-name" class="c-input" placeholder="z.B. Düngen, Schneiden…">
                </div>
                <button class="c-btn c-btn--primary" onclick="adminAddCareType()">Hinzufügen</button>
            </div>
        </div>`;
}

function adminEditCareTypeToggle(id) {
    document.querySelectorAll(`.ct-display[data-id="${id}"]`).forEach(el => el.style.display = el.style.display === 'none' ? '' : 'none');
    document.querySelectorAll(`.ct-edit[data-id="${id}"]`).forEach(el => el.style.display = el.style.display === 'none' ? '' : 'none');
}

async function adminSaveCareType(id) {
    const name = document.getElementById(`ct-name-${id}`).value.trim();
    const icon = document.getElementById(`ct-icon-${id}`).value.trim();
    if (!name) { customAlert('Name darf nicht leer sein.'); return; }
    const res = await fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'adminSaveCareTaskType', id, name, icon }) });
    const data = await res.json();
    if (data.success) { if (typeof EffectManager !== 'undefined') EffectManager.trigger('save-success'); loadAdminCareTypes(); }
    else customAlert(data.error || 'Fehler');
}

async function adminAddCareType() {
    const name = document.getElementById('ct-new-name').value.trim();
    const icon = document.getElementById('ct-new-icon').value.trim();
    if (!name) { customAlert('Bitte einen Namen eingeben.'); return; }
    const res  = await fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'adminSaveCareTaskType', name, icon }) });
    const data = await res.json();
    if (data.success) { if (typeof EffectManager !== 'undefined') EffectManager.trigger('save-success'); loadAdminCareTypes(); }
    else customAlert(data.error || 'Fehler');
}

async function adminDeleteCareType(id, name) {
    if (!await customConfirm(`Typ "${name}" löschen? Bestehende Aufgaben dieses Typs behalten ihren Namen.`, { confirmLabel: 'Löschen', danger: true })) return;
    const res  = await fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'adminDeleteCareTaskType', id }) });
    const data = await res.json();
    if (data.success) loadAdminCareTypes();
    else customAlert(data.error || 'Fehler');
}

// ========================
// PFLANZENTYPEN (Admin)
// ========================
async function loadAdminPlantTypes() {
    const panel = document.getElementById('admin-panel-plant-types');
    if (!panel) return;
    panel.innerHTML = '<p style="color:var(--text-muted)">Lade...</p>';
    const res  = await fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'adminGetPlantTypes' }) });
    const data = await res.json();
    if (!data.success) { panel.innerHTML = '<p style="color:red">Fehler</p>'; return; }
    renderAdminPlantTypes(panel, data.types);
}

function renderAdminPlantTypes(panel, types) {
    const rows = types.map(t => `
        <tr style="border-bottom:1px solid var(--border);">
            <td style="padding:8px;width:48px;">
                <span class="pt-display" data-id="${t.id}">${t.icon || ''}</span>
                <input class="pt-edit c-input" data-id="${t.id}" id="pt-icon-${t.id}" value="${t.icon || ''}" style="display:none;width:50px;font-size:0.85rem;">
            </td>
            <td style="padding:8px;">
                <span class="pt-display" data-id="${t.id}">
                    ${t.label}
                    <span style="font-size:0.75rem;color:var(--text-muted);margin-left:8px;">${t.marker_size ? t.marker_size + 'px' : ''}</span>
                    ${t.marker_color ? `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${t.marker_color};border:1px solid var(--border);vertical-align:middle;margin-left:4px;"></span>` : ''}
                </span>
                <div class="pt-edit" data-id="${t.id}" style="display:none;">
                    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                        <input class="c-input" id="pt-label-${t.id}" value="${t.label}" style="width:140px;font-size:0.85rem;" placeholder="Name">
                        <input class="c-input" id="pt-size-${t.id}" type="number" value="${t.marker_size || ''}" style="width:60px;font-size:0.85rem;" placeholder="px">
                        <input id="pt-color-${t.id}" type="color" value="${t.marker_color || '#4a7c59'}" style="width:32px;height:28px;padding:0;border:1px solid var(--border);border-radius:4px;cursor:pointer;">
                    </div>
                </div>
                <input type="hidden" id="pt-key-${t.id}" value="${t.key}">
            </td>
            <td style="padding:8px;width:120px;text-align:right;">
                <span class="pt-display" data-id="${t.id}">
                    <button class="c-btn c-btn--text" style="font-size:0.8rem;padding:4px 6px;" onclick="adminEditPlantTypeToggle(${t.id})">✎</button>
                    <button class="c-btn c-btn--text" style="font-size:0.8rem;padding:4px 6px;color:var(--danger);" onclick="adminDeletePlantType(${t.id},'${t.label}')">✕</button>
                </span>
                <span class="pt-edit" data-id="${t.id}" style="display:none;">
                    <button class="c-btn c-btn--primary" style="font-size:0.8rem;padding:4px 8px;" onclick="adminSavePlantType(${t.id})">✓</button>
                    <button class="c-btn c-btn--text" style="font-size:0.8rem;padding:4px 6px;" onclick="adminEditPlantTypeToggle(${t.id})">✕</button>
                </span>
            </td>
        </tr>`).join('');

    panel.innerHTML = `
        <table style="width:100%;border-collapse:collapse;font-size:0.9rem;margin-bottom:20px;">
            <thead>
                <tr style="border-bottom:2px solid var(--border);">
                    <th style="text-align:left;padding:8px;width:48px;">Icon</th>
                    <th style="text-align:left;padding:8px;">Name</th>
                    <th style="padding:8px;width:120px;"></th>
                </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="3" style="padding:12px;color:var(--text-muted);">Noch keine Typen angelegt.</td></tr>'}</tbody>
        </table>
        <div style="border:2px dashed var(--border);border-radius:var(--radius-md);padding:16px;">
            <p style="font-weight:600;margin-bottom:12px;">Neuen Pflanzentyp anlegen</p>
            <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;">
                <div>
                    <label style="font-size:0.8rem;color:var(--text-muted);display:block;margin-bottom:4px;">Icon (Emoji)</label>
                    <input type="text" id="pt-new-icon" class="c-input" placeholder="🌳" style="width:60px;">
                </div>
                <div style="flex:1;min-width:120px;">
                    <label style="font-size:0.8rem;color:var(--text-muted);display:block;margin-bottom:4px;">Name *</label>
                    <input type="text" id="pt-new-label" class="c-input" placeholder="z.B. Kraut">
                </div>
                <button class="c-btn c-btn--primary" onclick="adminAddPlantType()">Hinzufügen</button>
            </div>
        </div>`;
}

function adminEditPlantTypeToggle(id) {
    document.querySelectorAll(`.pt-display[data-id="${id}"]`).forEach(el => el.style.display = el.style.display === 'none' ? '' : 'none');
    document.querySelectorAll(`.pt-edit[data-id="${id}"]`).forEach(el => el.style.display = el.style.display === 'none' ? '' : 'none');
}

function labelToKey(label) {
    return label.toLowerCase().replace(/[äÄ]/g,'ae').replace(/[öÖ]/g,'oe').replace(/[üÜ]/g,'ue').replace(/[ß]/g,'ss').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
}

async function adminSavePlantType(id) {
    const key   = document.getElementById(`pt-key-${id}`).value.trim();
    const label = document.getElementById(`pt-label-${id}`).value.trim();
    const icon  = document.getElementById(`pt-icon-${id}`).value.trim();
    const marker_size  = document.getElementById(`pt-size-${id}`).value;
    const marker_color = document.getElementById(`pt-color-${id}`).value;
    if (!label) { customAlert('Name darf nicht leer sein.'); return; }
    const res = await fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'adminSavePlantType', id, key, label, icon, marker_size, marker_color }) });
    const data = await res.json();
    if (data.success) { if (typeof EffectManager !== 'undefined') EffectManager.trigger('save-success'); loadAdminPlantTypes(); }
    else customAlert(data.error || 'Fehler');
}

async function adminAddPlantType() {
    const label = document.getElementById('pt-new-label').value.trim();
    const icon  = document.getElementById('pt-new-icon').value.trim();
    if (!label) { customAlert('Bitte einen Namen eingeben.'); return; }
    const key = labelToKey(label);
    const res  = await fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'adminSavePlantType', key, label, icon }) });
    const data = await res.json();
    if (data.success) { if (typeof EffectManager !== 'undefined') EffectManager.trigger('save-success'); loadAdminPlantTypes(); }
    else customAlert(data.error || 'Fehler');
}

async function adminDeletePlantType(id, label) {
    if (!await customConfirm(`Pflanzentyp "${label}" löschen?`, { confirmLabel: 'Löschen', danger: true })) return;
    const res  = await fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'adminDeletePlantType', id }) });
    const data = await res.json();
    if (data.success) loadAdminPlantTypes();
    else customAlert(data.error || 'Fehler');
}

// ========================
// ICON-BIBLIOTHEK (Admin)
// ========================
async function loadAdminIcons() {
    const panel = document.getElementById('admin-panel-icons');
    panel.innerHTML = '<p style="color:var(--text-muted)">Lade...</p>';
    const res  = await fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'getIconLibrary' }) });
    const data = await res.json();
    if (!data.success) { panel.innerHTML = '<p style="color:red">Fehler.</p>'; return; }

    const icons = data.icons;
    const categories = [...new Set(icons.map(i => i.category || 'Ohne Kategorie'))];

    let gridHtml = '';
    if (icons.length === 0) {
        gridHtml = '<p style="color:var(--text-muted);font-size:0.9rem;">Noch keine Icons in der Bibliothek.</p>';
    } else {
        categories.forEach(cat => {
            const catIcons = icons.filter(i => (i.category || 'Ohne Kategorie') === cat);
            gridHtml += `<div style="margin-bottom:16px;">
                <p style="font-size:0.75rem;font-weight:700;color:var(--primary);letter-spacing:0.06em;margin-bottom:8px;">${cat.toUpperCase()}</p>
                <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(80px, 1fr));gap:8px;">
                    ${catIcons.map(icon => `
                        <div id="icon-card-${icon.id}" style="position:relative;border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px;display:flex;flex-direction:column;align-items:center;gap:4px;background:var(--bg-app);">
                            <img src="${icon.file_path}" style="width:40px;height:40px;object-fit:contain;" alt="${icon.name}">
                            <span class="icon-display" data-id="${icon.id}" style="font-size:0.7rem;color:var(--text-muted);text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%;">${icon.name}</span>
                            <div class="icon-display" data-id="${icon.id}" style="display:flex;gap:6px;">
                                <button class="c-btn c-btn--text" style="font-size:0.75rem;padding:2px 4px;" title="Bearbeiten" onclick="adminEditIconToggle(${icon.id})">✏️</button>
                                <button class="c-btn c-btn--text" style="font-size:0.75rem;padding:2px 4px;" title="Löschen" onclick="adminDeleteIcon(${icon.id}, '${icon.name.replace(/'/g, "\\'")}')">🗑️</button>
                            </div>
                            <div class="icon-edit" data-id="${icon.id}" style="display:none;width:100%;text-align:center;">
                                <input type="text" class="c-input" id="icon-name-${icon.id}" value="${icon.name.replace(/"/g, '&quot;')}" placeholder="Name" style="width:100%;box-sizing:border-box;font-size:0.7rem;padding:4px 6px;margin-bottom:4px;">
                                <input type="text" class="c-input" id="icon-cat-${icon.id}" value="${(icon.category||'').replace(/"/g, '&quot;')}" placeholder="Kategorie" style="width:100%;box-sizing:border-box;font-size:0.7rem;padding:4px 6px;margin-bottom:4px;">
                                <div style="display:flex;gap:4px;justify-content:center;">
                                    <button class="c-btn c-btn--primary" style="font-size:0.65rem;padding:3px 8px;" onclick="adminSaveIcon(${icon.id})">OK</button>
                                    <button class="c-btn c-btn--text" style="font-size:0.65rem;padding:3px 6px;" onclick="adminEditIconToggle(${icon.id})">✕</button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
        });
    }

    panel.innerHTML = `
        ${gridHtml}
        <div style="margin-top:16px; border:2px dashed var(--border); border-radius:var(--radius-md); padding:16px;">
            <p style="font-weight:600; margin-bottom:12px;">Icon hochladen</p>
            <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;">
                <div style="flex:1;min-width:120px;">
                    <label style="font-size:0.8rem;color:var(--text-muted);display:block;margin-bottom:4px;">Name</label>
                    <input type="text" id="admin-icon-name" class="c-input" placeholder="z.B. Rose">
                </div>
                <div style="min-width:120px;">
                    <label style="font-size:0.8rem;color:var(--text-muted);display:block;margin-bottom:4px;">Kategorie (optional)</label>
                    <select id="admin-icon-category" class="c-input" onchange="adminIconCatChanged(this)">
                        <option value="">— Keine —</option>
                        ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                        <option value="__new__">+ Neue Kategorie…</option>
                    </select>
                    <input type="text" id="admin-icon-category-new" class="c-input" placeholder="Neue Kategorie" style="display:none;margin-top:4px;">
                </div>
                <div>
                    <label style="font-size:0.8rem;color:var(--text-muted);display:block;margin-bottom:4px;">SVG-Datei</label>
                    <input type="file" id="admin-icon-file" accept=".svg" class="c-input" style="padding:6px;">
                </div>
                <button class="c-btn c-btn--primary" onclick="adminUploadIcon()">Hochladen</button>
            </div>
        </div>`;
}

function adminIconCatChanged(sel) {
    const newInput = document.getElementById('admin-icon-category-new');
    newInput.style.display = sel.value === '__new__' ? '' : 'none';
    if (sel.value === '__new__') newInput.focus();
}

async function adminUploadIcon() {
    const fileInput = document.getElementById('admin-icon-file');
    const name      = document.getElementById('admin-icon-name').value.trim();
    const catSelect = document.getElementById('admin-icon-category').value;
    const category  = catSelect === '__new__' ? document.getElementById('admin-icon-category-new').value.trim() : catSelect;
    const file      = fileInput.files[0];

    if (!file) { customAlert('Bitte eine SVG-Datei auswählen.'); return; }
    if (!file.name.toLowerCase().endsWith('.svg')) { customAlert('Nur SVG-Dateien erlaubt.'); return; }
    if (file.size > 51200) { customAlert('Datei zu groß (max. 50KB).'); return; }

    const formData = new FormData();
    formData.append('action', 'uploadIcon');
    formData.append('target', 'library');
    formData.append('name', name || file.name.replace('.svg', ''));
    formData.append('category', category);
    formData.append('icon', file);

    const res  = await fetch('backend/api.php', { method:'POST', body: formData });
    const data = await res.json();
    if (data.success) {
        // Icon-Cache in app.js aktualisieren
        if (typeof _iconLibraryCache !== 'undefined' && _iconLibraryCache) {
            _iconLibraryCache[String(data.id)] = data.file_path;
        }
        loadAdminIcons();
    } else {
        customAlert(data.error || 'Upload fehlgeschlagen');
    }
}

function adminEditIconToggle(id) {
    document.querySelectorAll(`.icon-display[data-id="${id}"]`).forEach(el => el.style.display = el.style.display === 'none' ? '' : 'none');
    document.querySelectorAll(`.icon-edit[data-id="${id}"]`).forEach(el => el.style.display = el.style.display === 'none' ? '' : 'none');
}

async function adminSaveIcon(id) {
    const name = document.getElementById(`icon-name-${id}`).value.trim();
    const category = document.getElementById(`icon-cat-${id}`).value.trim();
    if (!name) { customAlert('Name darf nicht leer sein.'); return; }
    const res = await fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'adminUpdateIcon', id, name, category }) });
    const data = await res.json();
    if (data.success) { if (typeof EffectManager !== 'undefined') EffectManager.trigger('save-success'); loadAdminIcons(); }
    else customAlert(data.error || 'Fehler');
}

async function adminDeleteIcon(id, name) {
    if (!await customConfirm(`Icon "${name}" wirklich löschen?`, { confirmLabel: 'Löschen', danger: true })) return;
    const res  = await fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'deleteIcon', target:'library', id }) });
    const data = await res.json();
    if (data.success) {
        if (typeof _iconLibraryCache !== 'undefined' && _iconLibraryCache) {
            delete _iconLibraryCache[String(id)];
        }
        loadAdminIcons();
    } else {
        customAlert(data.error || 'Fehler beim Löschen');
    }
}

// ========================
// NÜTZLICHE LINKS
// ========================
let _linkDragId = null;

function _linkHostname(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

async function loadAdminLinks() {
    const panel = document.getElementById('admin-panel-links');
    panel.innerHTML = '<p style="color:var(--text-muted)">Lade...</p>';
    const res  = await fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'adminGetLinks' }) });
    const data = await res.json();
    if (!data.success) { panel.innerHTML = '<p style="color:red">Fehler.</p>'; return; }

    const cards = data.links.map(l => `
        <div class="link-card" draggable="true" data-id="${l.id}"
             ondragstart="adminLinkDragStart(event,${l.id})" ondragover="adminLinkDragOver(event)" ondrop="adminLinkDrop(event,${l.id})" ondragend="adminLinkDragEnd()"
             style="position:relative;border:1px solid var(--border);border-radius:var(--radius-md);padding:12px;background:var(--bg-app);cursor:grab;transition:box-shadow 0.15s,opacity 0.15s;">
            <div class="link-display" data-id="${l.id}">
                <div style="display:flex;justify-content:space-between;align-items:start;gap:8px;">
                    <a href="${l.url}" target="_blank" rel="noopener" style="color:var(--primary);font-weight:600;font-size:0.9rem;text-decoration:none;line-height:1.3;word-break:break-word;" onclick="event.stopPropagation();">${l.label}</a>
                    <div style="display:flex;gap:4px;flex-shrink:0;">
                        <button class="c-btn c-btn--text" style="font-size:0.75rem;padding:2px;" title="Bearbeiten" onclick="event.stopPropagation();adminEditLinkToggle(${l.id})">✏️</button>
                        <button class="c-btn c-btn--text" style="font-size:0.75rem;padding:2px;" title="Löschen" onclick="event.stopPropagation();adminDeleteLink(${l.id},'${l.label.replace(/'/g, "\\'")}')">🗑️</button>
                    </div>
                </div>
                <span style="display:block;font-size:0.7rem;color:var(--text-muted);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${_linkHostname(l.url)}</span>
            </div>
            <div class="link-edit" data-id="${l.id}" style="display:none;">
                <input type="text" class="c-input" id="link-label-${l.id}" value="${l.label.replace(/"/g,'&quot;')}" placeholder="Bezeichnung" style="width:100%;box-sizing:border-box;font-size:0.8rem;padding:6px 8px;margin-bottom:6px;">
                <input type="text" class="c-input" id="link-url-${l.id}" value="${l.url.replace(/"/g,'&quot;')}" placeholder="https://..." style="width:100%;box-sizing:border-box;font-size:0.8rem;padding:6px 8px;margin-bottom:6px;">
                <div style="display:flex;gap:4px;">
                    <button class="c-btn c-btn--primary" style="font-size:0.75rem;padding:4px 10px;flex:1;" onclick="event.stopPropagation();adminSaveLink(${l.id})">OK</button>
                    <button class="c-btn c-btn--text" style="font-size:0.75rem;padding:4px 6px;" onclick="event.stopPropagation();adminEditLinkToggle(${l.id})">✕</button>
                </div>
            </div>
        </div>`).join('');

    panel.innerHTML = `
        <div id="admin-links-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;margin-bottom:20px;">
            ${cards || ''}
        </div>
        ${!data.links.length ? '<p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:20px;">Noch keine Links angelegt.</p>' : ''}
        <div style="border:2px dashed var(--border);border-radius:var(--radius-md);padding:16px;">
            <p style="font-weight:600;margin-bottom:12px;">Neuen Link anlegen</p>
            <div style="display:grid;grid-template-columns:1fr 2fr auto;gap:10px;align-items:end;">
                <div>
                    <label class="c-label" style="font-size:0.8rem;color:var(--text-muted);margin-bottom:4px;">Bezeichnung *</label>
                    <input type="text" id="link-new-label" class="c-input" placeholder="z.B. Pflanzendatenbank" style="width:100%;box-sizing:border-box;">
                </div>
                <div>
                    <label class="c-label" style="font-size:0.8rem;color:var(--text-muted);margin-bottom:4px;">URL *</label>
                    <input type="text" id="link-new-url" class="c-input" placeholder="https://..." style="width:100%;box-sizing:border-box;">
                </div>
                <button class="c-btn c-btn--primary" style="height:fit-content;" onclick="adminAddLink()">Hinzufügen</button>
            </div>
        </div>`;
}

// Drag & Drop
function adminLinkDragStart(e, id) {
    _linkDragId = id;
    e.currentTarget.style.opacity = '0.4';
    e.dataTransfer.effectAllowed = 'move';
}
function adminLinkDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const card = e.currentTarget;
    card.style.boxShadow = '0 0 0 2px var(--primary)';
}
function adminLinkDragEnd() {
    document.querySelectorAll('.link-card').forEach(c => { c.style.opacity = '1'; c.style.boxShadow = ''; });
}
async function adminLinkDrop(e, targetId) {
    e.preventDefault();
    if (_linkDragId === null || _linkDragId === targetId) { adminLinkDragEnd(); return; }
    const grid = document.getElementById('admin-links-grid');
    const cards = [...grid.querySelectorAll('.link-card')];
    const ids = cards.map(c => parseInt(c.dataset.id));
    const fromIdx = ids.indexOf(_linkDragId);
    const toIdx = ids.indexOf(targetId);
    ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, _linkDragId);
    _linkDragId = null;
    adminLinkDragEnd();
    await fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'adminReorderLinks', order: ids }) });
    loadAdminLinks();
}

function adminEditLinkToggle(id) {
    document.querySelectorAll(`.link-display[data-id="${id}"]`).forEach(el => el.style.display = el.style.display === 'none' ? '' : 'none');
    document.querySelectorAll(`.link-edit[data-id="${id}"]`).forEach(el => el.style.display = el.style.display === 'none' ? '' : 'none');
}

async function adminSaveLink(id) {
    const label = document.getElementById(`link-label-${id}`).value.trim();
    const url   = document.getElementById(`link-url-${id}`).value.trim();
    if (!label || !url) { customAlert('Bezeichnung und URL sind Pflichtfelder.'); return; }
    const res = await fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'adminUpdateLink', id, label, url }) });
    const data = await res.json();
    if (data.success) { if (typeof EffectManager !== 'undefined') EffectManager.trigger('save-success'); loadAdminLinks(); }
    else customAlert(data.error || 'Fehler');
}

async function adminAddLink() {
    const label = document.getElementById('link-new-label').value.trim();
    const url   = document.getElementById('link-new-url').value.trim();
    if (!label || !url) { customAlert('Bitte Bezeichnung und URL eingeben.'); return; }
    const res  = await fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'adminAddLink', label, url }) });
    const data = await res.json();
    if (data.success) { if (typeof EffectManager !== 'undefined') EffectManager.trigger('save-success'); loadAdminLinks(); }
    else customAlert(data.error || 'Fehler');
}

async function adminDeleteLink(id, label) {
    if (!await customConfirm(`Link "${label}" wirklich löschen?`, { confirmLabel: 'Löschen', danger: true })) return;
    const res  = await fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'adminDeleteLink', id }) });
    const data = await res.json();
    if (data.success) loadAdminLinks();
    else customAlert(data.error || 'Fehler');
}

// ========================
// SYSTEM-INFO (Sub-Tabs: Farben, Typografie, Datenbank)
// ========================
let _systemSubTab = 'colors';

function switchSystemSub(tab) {
    _systemSubTab = tab;
    ['colors','typo','db','structure','about'].forEach(t => {
        const panel = document.getElementById('system-panel-' + t);
        const btn   = document.getElementById('system-sub-' + t);
        if (panel) panel.style.display = tab === t ? 'block' : 'none';
        if (btn)   btn.className = 'c-btn ' + (tab === t ? 'c-btn--secondary' : 'c-btn--text');
    });
    if (tab === 'db') loadMigrations();
    if (tab === 'structure') loadDbStructure();
    if (tab === 'about') renderAboutPanel();
}

function loadSystemInfo() {
    renderSystemColors();
    renderSystemTypo();
    switchSystemSub(_systemSubTab);
}

function renderAboutPanel() {
    const panel = document.getElementById('system-panel-about');
    if (!panel) return;
    const html = window.__ABOUT_HTML__ || '<p style="color:var(--text-muted);">Kein About-Inhalt verfuegbar.</p>';
    panel.innerHTML = `<div style="max-width:720px;padding:8px 0;">${html}</div>`;
}

function renderSystemColors() {
    const panel = document.getElementById('system-panel-colors');
    const colors = [
        { label: 'Hintergrund',     var: '--bg-app' },
        { label: 'Card',            var: '--bg-card' },
        { label: 'Surface',         var: '--bg-surface' },
        { label: 'Primary',         var: '--primary' },
        { label: 'Primary Light',   var: '--primary-light' },
        { label: 'Text Main',       var: '--text-main' },
        { label: 'Text Muted',      var: '--text-muted' },
        { label: 'Border',          var: '--border' },
        { label: 'Danger',          var: '--danger' },
        { label: 'Shadow',          var: '--shadow-soft' },
    ];
    const style = getComputedStyle(document.documentElement);
    const cards = colors.map(c => {
        const val = style.getPropertyValue(c.var).trim();
        return `<div style="border:1px solid var(--border);border-radius:6px;padding:10px;display:flex;align-items:center;gap:10px;">
            <div style="width:32px;height:32px;border-radius:4px;border:1px solid var(--border);background:${val};flex-shrink:0;"></div>
            <div>
                <div style="font-weight:600;font-size:0.85rem;">${c.label}</div>
                <div style="font-size:0.7rem;color:var(--text-muted);font-family:monospace;">${c.var}</div>
                <div style="font-size:0.7rem;color:var(--text-muted);">${val}</div>
            </div>
        </div>`;
    }).join('');

    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    panel.innerHTML = `
        <h4 style="font-size:0.9rem;font-weight:600;color:var(--primary);margin-bottom:12px;">CSS-Variablen (aktives Theme: ${theme})</h4>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;">${cards}</div>`;
}

function renderSystemTypo() {
    const panel = document.getElementById('system-panel-typo');
    const s = getComputedStyle(document.documentElement);
    const v = (name) => s.getPropertyValue(name).trim() || '–';
    const section = 'border-left:3px solid var(--primary);padding-left:12px;margin-bottom:24px;';

    // Font
    const fontHtml = `
        <div style="${section}">
            <h4 style="font-size:0.9rem;font-weight:600;color:var(--primary);margin-bottom:8px;">Font</h4>
            <div style="border:1px solid var(--border);border-radius:8px;padding:12px;font-family:var(--font-main);font-size:1rem;">
                ${v('--font-main')}
            </div>
        </div>`;

    // Spacing
    const spacings = [
        { var: '--space-xs', label: '4px' },
        { var: '--space-sm', label: '8px' },
        { var: '--space-md', label: '16px' },
        { var: '--space-lg', label: '24px' },
        { var: '--space-xl', label: '32px' },
    ];
    const spacingRows = spacings.map(sp => {
        const val = v(sp.var);
        return `<div style="display:flex;align-items:center;gap:12px;font-size:0.8rem;">
            <span style="font-family:monospace;color:var(--text-muted);min-width:90px;">${sp.var}</span>
            <div style="width:${val};height:${val};background:var(--primary-light);border-radius:2px;flex-shrink:0;border:1px solid var(--primary);opacity:0.6;"></div>
            <span style="font-weight:600;">${val}</span>
        </div>`;
    }).join('');
    const spacingHtml = `
        <div style="${section}">
            <h4 style="font-size:0.9rem;font-weight:600;color:var(--primary);margin-bottom:10px;">Spacing-Skala</h4>
            <div style="display:flex;flex-direction:column;gap:8px;">${spacingRows}</div>
        </div>`;

    // Border Radius
    const radii = [
        { var: '--radius-sm', label: 'SM' },
        { var: '--radius-md', label: 'MD' },
        { var: '--radius-lg', label: 'LG' },
    ];
    const radiusCards = radii.map(r => {
        const val = v(r.var);
        return `<div style="text-align:center;">
            <div style="width:60px;height:60px;border:2px solid var(--primary-light);border-radius:${val};margin:0 auto 6px;"></div>
            <div style="font-family:monospace;font-size:0.7rem;color:var(--text-muted);">${r.var}</div>
            <div style="font-size:0.75rem;font-weight:600;">${val}</div>
        </div>`;
    }).join('');
    const radiusHtml = `
        <div style="${section}">
            <h4 style="font-size:0.9rem;font-weight:600;color:var(--primary);margin-bottom:10px;">Border Radius</h4>
            <div style="display:flex;gap:20px;flex-wrap:wrap;">${radiusCards}</div>
        </div>`;

    // Shadows
    const shadows = [
        { var: '--shadow-soft',   label: 'Soft' },
        { var: '--shadow-medium', label: 'Medium' },
        { var: '--shadow-xl',     label: 'XL' },
    ];
    const shadowCards = shadows.map(sh => {
        const val = v(sh.var);
        return `<div style="text-align:center;">
            <div style="width:60px;height:60px;background:var(--bg-card);border-radius:var(--radius-md);box-shadow:${val};margin:0 auto 6px;"></div>
            <div style="font-family:monospace;font-size:0.7rem;color:var(--text-muted);">${sh.var}</div>
        </div>`;
    }).join('');
    const shadowHtml = `
        <div style="${section}">
            <h4 style="font-size:0.9rem;font-weight:600;color:var(--primary);margin-bottom:10px;">Shadows</h4>
            <div style="display:flex;gap:20px;flex-wrap:wrap;">${shadowCards}</div>
        </div>`;

    // Transitions
    const transitions = [
        { var: '--transition-fast', label: 'Fast' },
        { var: '--transition',      label: 'Normal' },
        { var: '--transition-base', label: 'Base' },
    ];
    const transCards = transitions.map(t => {
        const val = v(t.var);
        return `<div style="border:1px solid var(--border);border-radius:8px;padding:8px 14px;font-size:0.8rem;display:inline-flex;align-items:center;gap:8px;">
            <span style="font-family:monospace;color:var(--text-muted);">${t.var}</span>
            <span style="font-weight:600;">${val}</span>
        </div>`;
    }).join('');
    const transHtml = `
        <div style="${section}">
            <h4 style="font-size:0.9rem;font-weight:600;color:var(--primary);margin-bottom:10px;">Transitions</h4>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">${transCards}</div>
        </div>`;

    panel.innerHTML = fontHtml + spacingHtml + radiusHtml + shadowHtml + transHtml;
}

// ========================
// DATENBANK-MIGRATIONEN
// ========================
async function loadMigrations() {
    const panel = document.getElementById('system-panel-db');
    panel.innerHTML = '<p style="color:var(--text-muted)">Lade...</p>';
    try {
        const res  = await fetch('backend/migrate.php');
        const data = await res.json();
        if (!data.success) { panel.innerHTML = '<p style="color:red">Fehler beim Laden.</p>'; return; }
        renderMigrationPanel(data.pending, data.history);
    } catch (e) {
        panel.innerHTML = '<p style="color:red">Fehler: ' + e.message + '</p>';
    }
}

function renderMigrationPanel(pending, history) {
    const panel = document.getElementById('system-panel-db');

    const pendingHtml = pending.length
        ? pending.map(name => `<div style="padding:4px 8px;font-size:0.8rem;background:var(--bg-app);border:1px solid var(--border);border-left:3px solid var(--primary);border-radius:4px;">${name}</div>`).join('')
        : '<p style="color:var(--text-muted);font-size:0.85rem;">Alles aktuell – keine ausstehenden Migrationen.</p>';

    const historyRows = history.length
        ? history.map(h => {
            const icon = h.status === 'success' ? '✅' : '❌';
            const date = new Date(h.executed_at).toLocaleString('de-DE');
            return `<tr style="font-size:0.8rem;">
                <td style="padding:4px 8px;">${icon}</td>
                <td style="padding:4px 8px;font-family:monospace;">${h.name}</td>
                <td style="padding:4px 8px;">${h.executed_by}</td>
                <td style="padding:4px 8px;color:var(--text-muted);">${date}</td>
                <td style="padding:4px 8px;color:var(--danger);font-size:0.75rem;">${h.error_message || ''}</td>
            </tr>`;
        }).join('')
        : '<tr><td colspan="5" style="padding:8px;color:var(--text-muted);font-size:0.85rem;">Noch keine Migrationen ausgeführt.</td></tr>';

    panel.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
            <button class="c-btn c-btn--primary" onclick="runMigrations()" ${pending.length === 0 ? 'disabled style="opacity:0.5;font-size:0.85rem;padding:6px 16px;"' : 'style="font-size:0.85rem;padding:6px 16px;"'}>
                ▶ Datenbank aktualisieren
            </button>
            <span style="font-size:0.8rem;color:var(--text-muted);">${pending.length} ausstehend</span>
        </div>

        <div id="migration-results" style="display:none;margin-bottom:16px;"></div>

        ${pending.length ? `
        <div style="margin-bottom:20px;">
            <h4 style="font-size:0.85rem;font-weight:600;margin-bottom:8px;">Ausstehende Migrationen</h4>
            <div style="display:flex;flex-direction:column;gap:4px;">${pendingHtml}</div>
        </div>` : ''}

        <div>
            <h4 style="font-size:0.85rem;font-weight:600;margin-bottom:8px;">Verlauf</h4>
            <table style="width:100%;border-collapse:collapse;">
                <thead>
                    <tr style="font-size:0.75rem;color:var(--text-muted);text-align:left;border-bottom:1px solid var(--border);">
                        <th style="padding:4px 8px;width:30px;"></th>
                        <th style="padding:4px 8px;">Migration</th>
                        <th style="padding:4px 8px;">Benutzer</th>
                        <th style="padding:4px 8px;">Zeitpunkt</th>
                        <th style="padding:4px 8px;">Fehler</th>
                    </tr>
                </thead>
                <tbody>${historyRows}</tbody>
            </table>
        </div>`;
}

async function runMigrations() {
    if (!await customConfirm('Datenbank-Migrationen jetzt ausführen?', { confirmLabel: 'Ausführen' })) return;
    const resultsDiv = document.getElementById('migration-results');
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Migrationen werden ausgeführt...</p>';

    try {
        const res  = await fetch('backend/migrate.php', { method: 'POST' });
        const data = await res.json();
        if (!data.success) {
            resultsDiv.innerHTML = '<p style="color:var(--danger);">Fehler: ' + (data.error || 'Unbekannt') + '</p>';
            return;
        }
        const lines = data.results.map(r => {
            if (r.status === 'success')  return `<div style="padding:4px 8px;font-size:0.8rem;color:#16a34a;">✅ ${r.name}</div>`;
            if (r.status === 'skipped')  return `<div style="padding:4px 8px;font-size:0.8rem;color:var(--text-muted);">⏭ ${r.name}</div>`;
            return `<div style="padding:4px 8px;font-size:0.8rem;color:var(--danger);">❌ ${r.name} – ${r.error}</div>`;
        }).join('');
        resultsDiv.innerHTML = `
            <div style="border:1px solid var(--border);border-radius:4px;padding:8px;background:var(--bg-app);">
                <h4 style="font-size:0.85rem;font-weight:600;margin-bottom:6px;">Ergebnis</h4>
                ${lines}
            </div>`;
        loadMigrations();
    } catch (e) {
        resultsDiv.innerHTML = '<p style="color:var(--danger);">Fehler: ' + e.message + '</p>';
    }
}

// ========================
// DATENBANKSTRUKTUR
// ========================
async function loadDbStructure() {
    const panel = document.getElementById('system-panel-structure');
    panel.innerHTML = '<p style="color:var(--text-muted)">Lade Datenbankstruktur...</p>';
    try {
        const [structRes, migrateRes, commentsRes] = await Promise.all([
            fetch('backend/migrate.php?action=structure'),
            fetch('backend/migrate.php'),
            fetch('backend/migrate.php?action=comments')
        ]);
        const structData   = await structRes.json();
        const migrateData  = await migrateRes.json();
        const commentsData = await commentsRes.json();
        if (!structData.success) { panel.innerHTML = '<p style="color:red">Fehler beim Laden.</p>'; return; }

        const executed   = migrateData.success ? (migrateData.history || []).filter(h => h.status === 'success').length : 0;
        const pending    = migrateData.success ? (migrateData.pending || []).length : 0;
        const tableCount = structData.tables.length;
        const comments   = commentsData.success ? commentsData.comments : {};

        renderDbStructure(panel, structData.tables, executed, pending, tableCount, comments);
    } catch (e) {
        panel.innerHTML = '<p style="color:red">Fehler: ' + e.message + '</p>';
    }
}

function renderDbStructure(panel, tables, executed, pending, tableCount, comments) {
    const statCards = `
        <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
            <div style="padding:6px 14px;border-radius:6px;background:linear-gradient(135deg,#d4edda,#c3e6cb);border:1px solid #b1dfbb;display:flex;align-items:center;gap:6px;">
                <span style="font-size:0.9rem;font-weight:700;color:#155724;">${executed}</span>
                <span style="font-size:0.7rem;color:#155724;">Migrationen</span>
            </div>
            <div style="padding:6px 14px;border-radius:6px;background:var(--bg-surface);border:1px solid var(--border);display:flex;align-items:center;gap:6px;">
                <span style="font-size:0.9rem;font-weight:700;color:var(--text-muted);">${pending}</span>
                <span style="font-size:0.7rem;color:var(--text-muted);">ausstehend</span>
            </div>
            <div style="padding:6px 14px;border-radius:6px;background:linear-gradient(135deg,#fff3cd,#ffeeba);border:1px solid #ffc107;display:flex;align-items:center;gap:6px;">
                <span style="font-size:0.9rem;font-weight:700;color:#856404;">${tableCount}</span>
                <span style="font-size:0.7rem;color:#856404;">Tabellen</span>
            </div>
        </div>`;

    const keyBadge = (key) => {
        if (key === 'PRI') return '<span style="display:inline-block;padding:1px 6px;font-size:0.65rem;font-weight:600;border-radius:3px;background:#d4edda;color:#155724;">PK</span>';
        if (key === 'UNI') return '<span style="display:inline-block;padding:1px 6px;font-size:0.65rem;font-weight:600;border-radius:3px;background:#cce5ff;color:#004085;">UQ</span>';
        if (key === 'MUL') return '<span style="display:inline-block;padding:1px 6px;font-size:0.65rem;font-weight:600;border-radius:3px;background:#fff3cd;color:#856404;">IDX</span>';
        return '';
    };

    const tableItems = tables.map((t, i) => {
        const colRows = t.columns.map(c => `
            <tr style="font-size:0.8rem;border-bottom:1px solid var(--border);">
                <td style="padding:6px 12px;font-family:monospace;font-weight:500;">${c.COLUMN_NAME}</td>
                <td style="padding:6px 12px;color:var(--primary);font-family:monospace;font-size:0.75rem;">${c.COLUMN_TYPE}</td>
                <td style="padding:6px 12px;text-align:center;">${keyBadge(c.COLUMN_KEY)}</td>
                <td style="padding:6px 12px;color:var(--text-muted);font-size:0.75rem;">${c.EXTRA || ''}</td>
            </tr>`).join('');

        const existingComment = (comments[t.name] || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
        const hasComment = !!comments[t.name];

        return `
            <div class="db-table-item" style="border:1px solid var(--border);border-radius:8px;overflow:hidden;background:var(--bg-card);">
                <div class="db-table-header" onclick="toggleDbTable(${i})" style="padding:12px 16px;cursor:pointer;user-select:none;transition:background 0.15s;" onmouseover="this.style.background='var(--bg-surface)'" onmouseout="this.style.background='transparent'">
                    <div style="display:flex;align-items:center;justify-content:space-between;">
                        <div style="display:flex;align-items:center;gap:10px;">
                            <span style="font-size:0.9rem;font-weight:600;">${t.name}</span>
                            <span style="font-size:0.7rem;color:var(--text-muted);">${t.columns.length} Spalten · ${t.rows} Zeilen</span>
                        </div>
                        <span id="db-table-arrow-${i}" style="font-size:0.7rem;color:var(--text-muted);transition:transform 0.2s;">▶</span>
                    </div>
                    ${hasComment ? `<div id="db-comment-preview-${i}" style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${existingComment}</div>` : ''}
                </div>
                <div id="db-table-detail-${i}" style="display:none;border-top:1px solid var(--border);">
                    <div style="padding:8px 12px;background:var(--bg-surface);">
                        <textarea id="db-comment-${i}" data-table="${t.name}" onblur="saveDbComment(this)" placeholder="Notiz zu dieser Tabelle…" style="width:100%;min-height:36px;padding:6px 8px;font-size:0.8rem;border:1px solid var(--border);border-radius:4px;background:var(--bg-card);color:var(--text-main);resize:vertical;font-family:inherit;">${existingComment}</textarea>
                    </div>
                    <table style="width:100%;border-collapse:collapse;">
                        <thead>
                            <tr style="font-size:0.7rem;color:var(--text-muted);text-align:left;background:var(--bg-surface);">
                                <th style="padding:6px 12px;">Spalte</th>
                                <th style="padding:6px 12px;">Typ</th>
                                <th style="padding:6px 12px;text-align:center;">Key</th>
                                <th style="padding:6px 12px;">Extra</th>
                            </tr>
                        </thead>
                        <tbody>${colRows}</tbody>
                    </table>
                </div>
            </div>`;
    }).join('');

    panel.innerHTML = statCards + `<div style="display:flex;flex-direction:column;gap:8px;">${tableItems}</div>`;
}

async function saveDbComment(textarea) {
    const tableName = textarea.dataset.table;
    const comment   = textarea.value.trim();
    const index     = textarea.id.replace('db-comment-', '');
    try {
        await fetch('backend/migrate.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'save_comment', table_name: tableName, comment })
        });
        // Preview aktualisieren
        let preview = document.getElementById('db-comment-preview-' + index);
        if (comment) {
            if (!preview) {
                const header = textarea.closest('.db-table-item')?.querySelector('.db-table-header');
                if (header) {
                    header.insertAdjacentHTML('beforeend', `<div id="db-comment-preview-${index}" style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></div>`);
                    preview = document.getElementById('db-comment-preview-' + index);
                }
            }
            if (preview) preview.textContent = comment;
        } else if (preview) {
            preview.remove();
        }
    } catch (e) {
        console.error('Kommentar speichern fehlgeschlagen:', e);
    }
}

function toggleDbTable(index) {
    const detail = document.getElementById('db-table-detail-' + index);
    const arrow  = document.getElementById('db-table-arrow-' + index);
    if (!detail) return;
    const open = detail.style.display !== 'none';
    detail.style.display = open ? 'none' : 'block';
    arrow.style.transform = open ? 'rotate(0deg)' : 'rotate(90deg)';
    // Preview verstecken wenn offen
    const preview = document.getElementById('db-comment-preview-' + index);
    if (preview) preview.style.display = open ? '' : 'none';
}

// Bridge
window.switchAdminTab = switchAdminTab;
window.loadAdminView = loadAdminView;
window.switchSystemSub = switchSystemSub;
window.adminUpdateRole = adminUpdateRole;
window.adminDeleteUser = adminDeleteUser;
window.toggleAdminGroupEdit = toggleAdminGroupEdit;
window.adminSaveGroup = adminSaveGroup;
window.adminAddGroup = adminAddGroup;
window.adminDeleteGroup = adminDeleteGroup;
window.renderBloomToggle = renderBloomToggle;
window.toggleBloomMonth = toggleBloomMonth;
window.adminEditCareTypeToggle = adminEditCareTypeToggle;
window.adminSaveCareType = adminSaveCareType;
window.adminAddCareType = adminAddCareType;
window.adminDeleteCareType = adminDeleteCareType;
window.adminIconCatChanged = adminIconCatChanged;
window.adminUploadIcon = adminUploadIcon;
window.adminEditIconToggle = adminEditIconToggle;
window.adminSaveIcon = adminSaveIcon;
window.adminDeleteIcon = adminDeleteIcon;
window.adminEditPlantTypeToggle = adminEditPlantTypeToggle;
window.adminSavePlantType = adminSavePlantType;
window.adminAddPlantType = adminAddPlantType;
window.adminDeletePlantType = adminDeletePlantType;
window.adminLinkDragStart = adminLinkDragStart;
window.adminLinkDragOver = adminLinkDragOver;
window.adminLinkDragEnd = adminLinkDragEnd;
window.adminLinkDrop = adminLinkDrop;
window.adminEditLinkToggle = adminEditLinkToggle;
window.adminSaveLink = adminSaveLink;
window.adminAddLink = adminAddLink;
window.adminDeleteLink = adminDeleteLink;
window.runMigrations = runMigrations;
window.toggleDbTable = toggleDbTable;
window.saveDbComment = saveDbComment;
