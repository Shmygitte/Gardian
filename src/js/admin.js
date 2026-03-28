/**
 * Gardian – Admin-Bereich
 */

const GROUP_FIELDS_ADMIN = [
    { key: 'name',         label: 'Name',             type: 'text',   required: true },
    { key: 'type',         label: 'Typ',               type: 'select', options: ['tree','shrub','flower','s_flower'], labels: ['Baum','Strauch','Blume','Blümchen'], required: true },
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
    ['users','groups','care-types','icons','links'].forEach(t => {
        document.getElementById(`admin-panel-${t}`).style.display = tab === t ? 'block' : 'none';
        document.getElementById(`admin-tab-${t}`).className = 'c-btn ' + (tab === t ? 'c-btn--secondary' : 'c-btn--text');
    });
    if (tab === 'icons') loadAdminIcons();
    if (tab === 'links') loadAdminLinks();
}

async function loadAdminView() {
    switchAdminTab('users');
    await loadAdminUsers();
    loadAdminGroups();
    loadAdminCareTypes();
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
    if (!confirm(`User "${username}" wirklich löschen?`)) return;
    const res  = await fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'adminDeleteUser', id }) });
    const data = await res.json();
    if (data.success) loadAdminUsers();
    else alert(data.error || 'Fehler beim Löschen');
}

// ========================
// PFLANZENGRUPPEN
// ========================
async function loadAdminGroups() {
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
        ${groupsHtml}
        <div style="margin-top:16px; border:2px dashed var(--border); border-radius:var(--radius-md); padding:16px;">
            <p style="font-weight:600; margin-bottom:12px;">Neue Gruppe anlegen</p>
            ${renderGroupFormNice({}, 'gform-new', 'adminAddGroup()')}
        </div>`;
}

function renderGroupForm(data, onsubmit) {
    const formId = 'gform-' + (data.id || 'new');
    const fields = GROUP_FIELDS_ADMIN.map(f => {
        const val = data[f.key] ?? '';
        if (f.type === 'select') {
            const opts = f.options.map((o, i) => `<option value="${o}" ${val == o ? 'selected' : ''}>${f.labels[i]}</option>`).join('');
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
    const formData = { ...getGroupFormNiceData('gform-' + id), action: 'adminUpdateGroup', id };
    await fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(formData) });
    loadAdminGroups();
}

async function adminAddGroup() {
    const formData = { ...getGroupFormNiceData('gform-new'), action: 'adminAddGroup' };
    const res  = await fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(formData) });
    const data = await res.json();
    if (data.success) loadAdminGroups();
    else alert(data.error || 'Fehler');
}

async function adminDeleteGroup(id, name) {
    if (!confirm(`Gruppe "${name}" wirklich löschen?`)) return;
    const res  = await fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'adminDeleteGroup', id }) });
    const data = await res.json();
    if (data.success) loadAdminGroups();
    else alert(data.error || 'Fehler');
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
            <td style="padding:8px;">${t.icon || '—'}</td>
            <td style="padding:8px; font-weight:600;">${t.name}</td>
            <td style="padding:8px;">
                <button class="c-btn c-btn--text" style="font-size:0.8rem;" onclick="adminEditCareType(${t.id},'${t.name}','${t.icon||''}')">Bearbeiten</button>
                <button class="c-btn c-btn--text" style="font-size:0.8rem;color:var(--danger);" onclick="adminDeleteCareType(${t.id},'${t.name}')">Löschen</button>
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

function adminEditCareType(id, name, icon) {
    const newName = prompt('Name:', name);
    if (newName === null) return;
    const newIcon = prompt('Icon (Emoji):', icon);
    if (newIcon === null) return;
    fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'adminSaveCareTaskType', id, name: newName.trim(), icon: newIcon.trim() }) })
    .then(() => loadAdminCareTypes());
}

async function adminAddCareType() {
    const name = document.getElementById('ct-new-name').value.trim();
    const icon = document.getElementById('ct-new-icon').value.trim();
    if (!name) { alert('Bitte einen Namen eingeben.'); return; }
    const res  = await fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'adminSaveCareTaskType', name, icon }) });
    const data = await res.json();
    if (data.success) loadAdminCareTypes();
    else alert(data.error || 'Fehler');
}

async function adminDeleteCareType(id, name) {
    if (!confirm(`Typ "${name}" löschen? Bestehende Aufgaben dieses Typs behalten ihren Namen.`)) return;
    const res  = await fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'adminDeleteCareTaskType', id }) });
    const data = await res.json();
    if (data.success) loadAdminCareTypes();
    else alert(data.error || 'Fehler');
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
                        <div style="position:relative;border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px;display:flex;flex-direction:column;align-items:center;gap:4px;background:var(--bg-app);">
                            <img src="${icon.file_path}" style="width:40px;height:40px;object-fit:contain;" alt="${icon.name}">
                            <span style="font-size:0.7rem;color:var(--text-muted);text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%;">${icon.name}</span>
                            <div style="display:flex;gap:2px;">
                                <button class="c-btn c-btn--text" style="font-size:0.7rem;padding:2px 4px;" onclick="adminEditIcon(${icon.id},'${icon.name.replace(/'/g, "\\'")}','${(icon.category||'').replace(/'/g, "\\'")}')">Bearbeiten</button>
                                <button class="c-btn c-btn--text" style="font-size:0.7rem;color:var(--danger);padding:2px 4px;" onclick="adminDeleteIcon(${icon.id}, '${icon.name.replace(/'/g, "\\'")}')">Löschen</button>
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
                    <input type="text" id="admin-icon-category" class="c-input" placeholder="z.B. Blumen">
                </div>
                <div>
                    <label style="font-size:0.8rem;color:var(--text-muted);display:block;margin-bottom:4px;">SVG-Datei</label>
                    <input type="file" id="admin-icon-file" accept=".svg" class="c-input" style="padding:6px;">
                </div>
                <button class="c-btn c-btn--primary" onclick="adminUploadIcon()">Hochladen</button>
            </div>
        </div>`;
}

async function adminUploadIcon() {
    const fileInput = document.getElementById('admin-icon-file');
    const name      = document.getElementById('admin-icon-name').value.trim();
    const category  = document.getElementById('admin-icon-category').value.trim();
    const file      = fileInput.files[0];

    if (!file) { alert('Bitte eine SVG-Datei auswählen.'); return; }
    if (!file.name.toLowerCase().endsWith('.svg')) { alert('Nur SVG-Dateien erlaubt.'); return; }
    if (file.size > 51200) { alert('Datei zu groß (max. 50KB).'); return; }

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
        alert(data.error || 'Upload fehlgeschlagen');
    }
}

function adminEditIcon(id, name, category) {
    const newName = prompt('Name:', name);
    if (newName === null) return;
    const newCategory = prompt('Kategorie:', category);
    if (newCategory === null) return;
    fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'adminUpdateIcon', id, name: newName.trim(), category: newCategory.trim() }) })
    .then(r => r.json())
    .then(d => { if (d.success) loadAdminIcons(); else alert(d.error || 'Fehler'); });
}

async function adminDeleteIcon(id, name) {
    if (!confirm(`Icon "${name}" wirklich löschen?`)) return;
    const res  = await fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'deleteIcon', target:'library', id }) });
    const data = await res.json();
    if (data.success) {
        if (typeof _iconLibraryCache !== 'undefined' && _iconLibraryCache) {
            delete _iconLibraryCache[String(id)];
        }
        loadAdminIcons();
    } else {
        alert(data.error || 'Fehler beim Löschen');
    }
}

// ========================
// NÜTZLICHE LINKS
// ========================
async function loadAdminLinks() {
    const panel = document.getElementById('admin-panel-links');
    panel.innerHTML = '<p style="color:var(--text-muted)">Lade...</p>';
    const res  = await fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'adminGetLinks' }) });
    const data = await res.json();
    if (!data.success) { panel.innerHTML = '<p style="color:red">Fehler.</p>'; return; }

    const rows = data.links.map(l => `
        <tr id="link-row-${l.id}" style="border-bottom:1px solid var(--border);">
            <td style="padding:8px;">
                <span class="link-display" data-id="${l.id}">
                    <a href="${l.url}" target="_blank" rel="noopener" style="color:var(--primary);">${l.label}</a>
                </span>
                <span class="link-edit" data-id="${l.id}" style="display:none;">
                    <input type="text" class="c-input" value="${l.label.replace(/"/g, '&quot;')}" id="link-label-${l.id}" style="width:100%;">
                </span>
            </td>
            <td style="padding:8px;color:var(--text-muted);font-size:0.85rem;">
                <span class="link-display" data-id="${l.id}">${l.url}</span>
                <span class="link-edit" data-id="${l.id}" style="display:none;">
                    <input type="text" class="c-input" value="${l.url.replace(/"/g, '&quot;')}" id="link-url-${l.id}" style="width:100%;">
                </span>
            </td>
            <td style="padding:8px;white-space:nowrap;">
                <span class="link-display" data-id="${l.id}">
                    <button class="c-btn c-btn--text" style="font-size:0.8rem;" onclick="adminEditLinkToggle(${l.id})">Bearbeiten</button>
                    <button class="c-btn c-btn--text" style="font-size:0.8rem;color:var(--danger);" onclick="adminDeleteLink(${l.id},'${l.label.replace(/'/g, "\\'")}')">Löschen</button>
                </span>
                <span class="link-edit" data-id="${l.id}" style="display:none;">
                    <button class="c-btn c-btn--primary" style="font-size:0.8rem;" onclick="adminSaveLink(${l.id})">Speichern</button>
                    <button class="c-btn c-btn--text" style="font-size:0.8rem;" onclick="adminEditLinkToggle(${l.id})">Abbrechen</button>
                </span>
            </td>
        </tr>`).join('');

    panel.innerHTML = `
        <table style="width:100%;border-collapse:collapse;font-size:0.9rem;margin-bottom:20px;">
            <thead>
                <tr style="border-bottom:2px solid var(--border);">
                    <th style="text-align:left;padding:8px;">Bezeichnung</th>
                    <th style="text-align:left;padding:8px;">URL</th>
                    <th style="padding:8px;width:180px;"></th>
                </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="3" style="padding:12px;color:var(--text-muted);">Noch keine Links angelegt.</td></tr>'}</tbody>
        </table>
        <div style="border:2px dashed var(--border);border-radius:var(--radius-md);padding:16px;">
            <p style="font-weight:600;margin-bottom:12px;">Neuen Link anlegen</p>
            <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;">
                <div style="flex:1;min-width:160px;">
                    <label style="font-size:0.8rem;color:var(--text-muted);display:block;margin-bottom:4px;">Bezeichnung *</label>
                    <input type="text" id="link-new-label" class="c-input" placeholder="z.B. Pflanzendatenbank">
                </div>
                <div style="flex:1;min-width:200px;">
                    <label style="font-size:0.8rem;color:var(--text-muted);display:block;margin-bottom:4px;">URL *</label>
                    <input type="text" id="link-new-url" class="c-input" placeholder="https://...">
                </div>
                <button class="c-btn c-btn--primary" onclick="adminAddLink()">Hinzufügen</button>
            </div>
        </div>`;
}

function adminEditLinkToggle(id) {
    document.querySelectorAll(`.link-display[data-id="${id}"]`).forEach(el => el.style.display = el.style.display === 'none' ? '' : 'none');
    document.querySelectorAll(`.link-edit[data-id="${id}"]`).forEach(el => el.style.display = el.style.display === 'none' ? '' : 'none');
}

async function adminSaveLink(id) {
    const label = document.getElementById(`link-label-${id}`).value.trim();
    const url   = document.getElementById(`link-url-${id}`).value.trim();
    if (!label || !url) { alert('Bezeichnung und URL sind Pflichtfelder.'); return; }
    const res  = await fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'adminUpdateLink', id, label, url }) });
    const data = await res.json();
    if (data.success) loadAdminLinks();
    else alert(data.error || 'Fehler');
}

async function adminAddLink() {
    const label = document.getElementById('link-new-label').value.trim();
    const url   = document.getElementById('link-new-url').value.trim();
    if (!label || !url) { alert('Bitte Bezeichnung und URL eingeben.'); return; }
    const res  = await fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'adminAddLink', label, url }) });
    const data = await res.json();
    if (data.success) loadAdminLinks();
    else alert(data.error || 'Fehler');
}

async function adminDeleteLink(id, label) {
    if (!confirm(`Link "${label}" wirklich löschen?`)) return;
    const res  = await fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'adminDeleteLink', id }) });
    const data = await res.json();
    if (data.success) loadAdminLinks();
    else alert(data.error || 'Fehler');
}
