<?php
$pageId = 'kalender';
$pageTitle = 'Gardian – Gartenkalender';
$extraHeadStyles = '
        .kal-toolbar {
            background: var(--bg-card); border-bottom: 1px solid var(--border);
            padding: 10px 24px; display: flex; align-items: center; gap: 10px;
            flex-wrap: wrap; flex-shrink: 0; position: sticky; top: 0; z-index: 50;
        }
        .kal-month-btn {
            padding: 5px 10px; border-radius: 20px; border: 1px solid var(--border);
            font-size: 0.8rem; cursor: pointer; background: var(--bg-app);
            color: var(--text-main); font-family: inherit;
        }
        .kal-month-btn.active {
            background: var(--primary); color: white; border-color: var(--primary);
        }
        .task-card {
            background: var(--bg-card); border: 1px solid var(--border);
            border-radius: var(--radius-md); padding: 12px 16px;
            display: flex; align-items: flex-start; gap: 12px;
        }
        .task-card.done { opacity: 0.55; }
        .task-card__check {
            width: 20px; height: 20px; border-radius: 6px;
            border: 2px solid var(--border); cursor: pointer;
            flex-shrink: 0; margin-top: 2px; display: flex;
            align-items: center; justify-content: center;
            transition: background 0.15s;
        }
        .task-card__check.checked {
            background: var(--primary); border-color: var(--primary); color: white;
        }
        .year-grid { border-collapse: collapse; font-size: 0.8rem; width: 100%; }
        .year-grid th {
            padding: 6px 8px; text-align: left; font-size: 0.7rem;
            font-weight: 700; color: var(--text-muted); text-transform: uppercase;
            letter-spacing: 0.05em; border-bottom: 2px solid var(--border);
            position: sticky; top: 0; background: var(--bg-card); white-space: nowrap;
        }
        .year-grid td {
            padding: 7px 8px; border-bottom: 1px solid var(--border);
            text-align: center; white-space: nowrap;
        }
        .year-grid td.yg-name { text-align: left; font-weight: 600; max-width: 160px; overflow: hidden; text-overflow: ellipsis; }
        .year-grid td.yg-sub  { text-align: left; color: var(--text-muted); font-size: 0.75rem; }
        .yg-done    { color: #22c55e; font-weight: 700; }
        .yg-pending { color: var(--text-muted); }
        .yg-na      { color: var(--border); }
        #care-modal-backdrop {
            display: none; position: fixed; inset: 0;
            background: rgba(0,0,0,0.4); z-index: 1000;
            align-items: center; justify-content: center;
        }';

include 'src/layout/head.php';
include 'src/layout/header.php';
?>

    <div class="l-app-body">
<?php include 'src/layout/sidebar.php'; ?>

        <div style="flex:1;overflow:hidden;display:flex;flex-direction:column;background:var(--bg-app);">

        <!-- Toolbar -->
        <div class="kal-toolbar">
            <!-- Jahr -->
            <button onclick="changeYear(-1)" style="padding:4px 10px;border-radius:6px;border:1px solid var(--border);background:var(--bg-app);cursor:pointer;font-size:0.9rem;">◀</button>
            <span id="kal-year-label" style="font-weight:700;font-size:1rem;min-width:48px;text-align:center;"></span>
            <button onclick="changeYear(+1)" style="padding:4px 10px;border-radius:6px;border:1px solid var(--border);background:var(--bg-app);cursor:pointer;font-size:0.9rem;">▶</button>
            <div style="width:1px;height:22px;background:var(--border);margin:0 4px;"></div>
            <!-- Monate -->
            <div id="kal-month-tabs" style="display:flex;gap:4px;flex-wrap:wrap;"></div>
            <div style="width:1px;height:22px;background:var(--border);margin:0 4px;"></div>
            <!-- Ansicht -->
            <button id="kal-view-month-btn" onclick="setView('month')"
                style="padding:5px 12px;border-radius:20px;border:1px solid var(--primary);font-size:0.8rem;cursor:pointer;background:var(--primary);color:white;font-family:inherit;">Monat</button>
            <button id="kal-view-year-btn" onclick="setView('year')"
                style="padding:5px 12px;border-radius:20px;border:1px solid var(--border);font-size:0.8rem;cursor:pointer;background:var(--bg-app);color:var(--text-main);font-family:inherit;">Jahr</button>
            <div style="flex:1;"></div>
            <button onclick="openTaskModal()" class="c-btn c-btn--primary" style="font-size:0.85rem;">+ Aufgabe</button>
        </div>

        <!-- Content -->
        <div style="flex:1;overflow-y:auto;padding:20px 24px;" id="kal-content">
            <p style="color:var(--text-muted);">Lade…</p>
        </div>
    </div>
</div>

<!-- Modal: Aufgabe anlegen/bearbeiten -->
<div id="care-modal-backdrop" class="c-modal">
    <div class="c-card">
        <div class="c-modal__header">
            <span class="c-modal__title" id="care-modal-title">Aufgabe anlegen</span>
            <button class="c-btn c-btn--text c-modal__close" onclick="closeTaskModal()">✕</button>
        </div>
        <div class="c-modal__body" style="display:flex;flex-direction:column;gap:10px;">
            <input type="hidden" id="cm-id">
            <div>
                <label class="c-modal__label">Aufgaben-Typ</label>
                <select id="cm-type" class="c-input" onchange="updateNameField()"></select>
            </div>
            <div id="cm-custom-name-wrap" style="display:none;">
                <label class="c-modal__label">Eigener Name</label>
                <input type="text" id="cm-name" class="c-input" placeholder="z.B. Mein Spezialschnitt…">
            </div>
            <div>
                <label class="c-modal__label">Zuordnung</label>
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                    <label class="c-modal__radio">
                        <input type="radio" name="cm-scope" value="general" checked onchange="updateScopeUI()"> Gesamter Garten
                    </label>
                    <label class="c-modal__radio">
                        <input type="radio" name="cm-scope" value="group" onchange="updateScopeUI()"> Gruppe
                    </label>
                    <label class="c-modal__radio">
                        <input type="radio" name="cm-scope" value="plant" onchange="updateScopeUI()"> Pflanze
                    </label>
                </div>
                <div id="cm-scope-select" style="margin-top:6px;display:none;">
                    <select id="cm-target" class="c-input"></select>
                </div>
            </div>
            <div>
                <label class="c-modal__label">Fällig in folgenden Monaten</label>
                <div id="cm-months" style="display:flex;gap:3px;flex-wrap:wrap;"></div>
            </div>
            <div>
                <label class="c-modal__label">Notizen (optional)</label>
                <textarea id="cm-notes" class="c-input" rows="2" placeholder="z.B. Kali-Dünger verwenden" style="resize:vertical;"></textarea>
            </div>
        </div>
        <div class="c-modal__footer">
            <span class="c-modal__spacer"></span>
            <button class="c-btn c-btn--text" onclick="closeTaskModal()">Abbrechen</button>
            <button class="c-btn c-btn--primary" onclick="submitTaskModal(); if(typeof EffectManager!=='undefined') EffectManager.trigger('save-click',this);">Speichern</button>
        </div>
    </div>
</div>

<?php include 'src/layout/footer.php'; ?>
<script>
// ---- State ----
const MONTHS_SHORT = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
const MONTHS_LONG  = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
let kalYear  = new Date().getFullYear();
let kalMonth = new Date().getMonth();
let kalView  = 'month';
let kalData  = null;
let _plantsCache   = null;
let _taskTypesCache = null;

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
    renderMonthTabs();
    await loadData();
}

async function loadData() {
    const r = await api('getCareTasksList', { year: kalYear });
    if (!r.success) return;
    kalData = r.tasks;
    document.getElementById('kal-year-label').textContent = kalYear;
    render();
}

// ---- Month tabs ----
function renderMonthTabs() {
    const el = document.getElementById('kal-month-tabs');
    el.innerHTML = MONTHS_SHORT.map((m, i) => `
        <button class="kal-month-btn${i === kalMonth ? ' active' : ''}"
            onclick="setMonth(${i})">${m}</button>`).join('');
}

function setMonth(m) {
    kalMonth = m;
    document.querySelectorAll('.kal-month-btn').forEach((btn, i) => {
        btn.classList.toggle('active', i === m);
    });
    if (kalView === 'month') render();
}

function changeYear(delta) {
    kalYear += delta;
    document.getElementById('kal-year-label').textContent = kalYear;
    loadData();
}

function setView(v) {
    kalView = v;
    document.getElementById('kal-view-month-btn').style.cssText =
        v === 'month' ? 'padding:5px 12px;border-radius:20px;border:1px solid var(--primary);font-size:0.8rem;cursor:pointer;background:var(--primary);color:white;font-family:inherit;'
                      : 'padding:5px 12px;border-radius:20px;border:1px solid var(--border);font-size:0.8rem;cursor:pointer;background:var(--bg-app);color:var(--text-main);font-family:inherit;';
    document.getElementById('kal-view-year-btn').style.cssText =
        v === 'year'  ? 'padding:5px 12px;border-radius:20px;border:1px solid var(--primary);font-size:0.8rem;cursor:pointer;background:var(--primary);color:white;font-family:inherit;'
                      : 'padding:5px 12px;border-radius:20px;border:1px solid var(--border);font-size:0.8rem;cursor:pointer;background:var(--bg-app);color:var(--text-main);font-family:inherit;';
    render();
}

// ---- Render ----
function render() {
    if (!kalData) return;
    kalView === 'month' ? renderMonth() : renderYear();
}

function scopeLabel(task) {
    if (task.plant_name)  return task.plant_name;
    if (task.group_name)  return task.group_name;
    return 'Gesamter Garten';
}

function renderMonth() {
    const bit     = 1 << kalMonth;
    const month1  = kalMonth + 1;
    const content = document.getElementById('kal-content');
    const tasks   = kalData.filter(t => t.months & bit);

    if (!tasks.length) {
        content.innerHTML = `<p style="color:var(--text-muted);margin-top:16px;">Keine Aufgaben im ${MONTHS_LONG[kalMonth]}.</p>`;
        return;
    }

    content.innerHTML = `
        <div style="margin-bottom:12px;">
            <span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;">
                ${MONTHS_LONG[kalMonth]} ${kalYear} · ${tasks.length} Aufgabe(n)
            </span>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
            ${tasks.map(t => {
                const done = t.done_months.includes(month1);
                return `
                <div class="task-card${done ? ' done' : ''}" id="task-card-${t.id}">
                    <div class="task-card__check${done ? ' checked' : ''}"
                        onclick="toggleDone(${t.id}, ${month1}, ${!done})">${done ? '✓' : ''}</div>
                    <div style="flex:1;">
                        <div style="font-weight:600;font-size:0.9rem;${done ? 'text-decoration:line-through;' : ''}">${esc(t.name)}</div>
                        <div style="font-size:0.78rem;color:var(--text-muted);">${esc(scopeLabel(t))}</div>
                        ${t.notes ? `<div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px;">${esc(t.notes)}</div>` : ''}
                    </div>
                    <div style="display:flex;gap:4px;flex-shrink:0;">
                        <button class="c-btn c-btn--text" style="font-size:0.75rem;padding:2px 8px;" onclick="openTaskModal(${t.id})">Bearbeiten</button>
                        <button class="c-btn c-btn--text" style="font-size:0.75rem;padding:2px 8px;color:var(--danger);" onclick="deleteTask(${t.id})">Löschen</button>
                    </div>
                </div>`;
            }).join('')}
        </div>`;
}

function renderYear() {
    const content = document.getElementById('kal-content');
    if (!kalData.length) {
        content.innerHTML = '<p style="color:var(--text-muted);margin-top:16px;">Noch keine Aufgaben angelegt.</p>';
        return;
    }

    const rows = kalData.map(t => {
        const cells = MONTHS_SHORT.map((m, i) => {
            const bit    = 1 << i;
            const month1 = i + 1;
            if (!(t.months & bit)) return `<td class="yg-na">—</td>`;
            const done = t.done_months.includes(month1);
            return `<td class="${done ? 'yg-done' : 'yg-pending'}" style="cursor:pointer;" onclick="setMonthAndCheck(${i},${t.id})">${done ? '✓' : '○'}</td>`;
        }).join('');
        return `<tr>
            <td class="yg-name">${esc(t.name)}</td>
            <td class="yg-sub">${esc(scopeLabel(t))}</td>
            ${cells}
            <td>
                <button class="c-btn c-btn--text" style="font-size:0.72rem;padding:1px 6px;" onclick="openTaskModal(${t.id})">✎</button>
                <button class="c-btn c-btn--text" style="font-size:0.72rem;padding:1px 6px;color:var(--danger);" onclick="deleteTask(${t.id})">✕</button>
            </td>
        </tr>`;
    }).join('');

    content.innerHTML = `
        <div style="overflow:auto;">
            <table class="year-grid">
                <thead>
                    <tr>
                        <th style="width:140px;">Aufgabe</th>
                        <th style="width:120px;">Zuordnung</th>
                        ${MONTHS_SHORT.map(m => `<th style="width:42px;">${m}</th>`).join('')}
                        <th style="width:60px;"></th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
}

function setMonthAndCheck(monthIdx, taskId) {
    setMonth(monthIdx);
    setView('month');
}

// ---- Done toggling ----
async function toggleDone(taskId, month1, done) {
    await api('toggleCareDone', { task_id: taskId, year: kalYear, month: month1, done });
    const task = kalData.find(t => String(t.id) === String(taskId));
    if (task) {
        if (done) { if (!task.done_months.includes(month1)) task.done_months.push(month1); }
        else      { task.done_months = task.done_months.filter(m => m !== month1); }
    }
    render();
}

// ---- Delete ----
async function deleteTask(id) {
    if (!confirm('Aufgabe löschen?')) return;
    await api('deleteCareTask', { id });
    kalData = kalData.filter(t => String(t.id) !== String(id));
    render();
}

// ---- Modal ----
let _cmMonthMask = 0;

async function openTaskModal(id = null) {
    document.getElementById('cm-id').value    = id || '';
    document.getElementById('cm-notes').value = '';
    _cmMonthMask = 0;

    if (!_taskTypesCache) {
        const r = await api('getCareTaskTypes');
        _taskTypesCache = r.success ? r.types : [];
    }
    const sel = document.getElementById('cm-type');
    sel.innerHTML = _taskTypesCache.map(t =>
        `<option value="${t.id}">${t.icon ? t.icon + ' ' : ''}${esc(t.name)}</option>`
    ).join('') + `<option value="custom">— Eigene Aufgabe —</option>`;

    if (id) {
        const task = kalData.find(t => String(t.id) === String(id));
        if (!task) return;
        if (task.task_type_id) {
            sel.value = task.task_type_id;
        } else {
            sel.value = 'custom';
            document.getElementById('cm-name').value = task.name;
        }
        document.getElementById('cm-notes').value = task.notes || '';
        _cmMonthMask = task.months;
        const scope = task.plant_id ? 'plant' : task.user_group_id ? 'group' : 'general';
        document.querySelector(`input[name="cm-scope"][value="${scope}"]`).checked = true;
        document.getElementById('care-modal-title').textContent = 'Aufgabe bearbeiten';
    } else {
        if (_taskTypesCache.length) sel.value = _taskTypesCache[0].id;
        else sel.value = 'custom';
        document.querySelector('input[name="cm-scope"][value="general"]').checked = true;
        document.getElementById('care-modal-title').textContent = 'Aufgabe anlegen';
    }

    updateNameField();
    renderModalMonths();
    await updateScopeUI(id ? kalData.find(t => String(t.id) === String(id)) : null);
    document.getElementById('care-modal-backdrop').style.display = 'flex';
}

function updateNameField() {
    const isCustom = document.getElementById('cm-type').value === 'custom';
    document.getElementById('cm-custom-name-wrap').style.display = isCustom ? 'block' : 'none';
}

function closeTaskModal() {
    document.getElementById('care-modal-backdrop').style.display = 'none';
}

function renderModalMonths() {
    const el = document.getElementById('cm-months');
    el.innerHTML = MONTHS_SHORT.map((m, i) => {
        const active = (_cmMonthMask >> i) & 1;
        return `<button type="button"
            onclick="toggleCmMonth(${i})" data-mi="${i}"
            style="width:34px;height:34px;border-radius:6px;border:1px solid var(--border);
                   font-size:0.75rem;font-weight:600;cursor:pointer;
                   background:${active ? 'var(--primary)' : 'var(--bg-app)'};
                   color:${active ? 'white' : 'var(--text-main)'};">${m}</button>`;
    }).join('');
}

function toggleCmMonth(i) {
    _cmMonthMask ^= (1 << i);
    const btn = document.querySelector(`#cm-months button[data-mi="${i}"]`);
    const active = (_cmMonthMask >> i) & 1;
    btn.style.background = active ? 'var(--primary)' : 'var(--bg-app)';
    btn.style.color      = active ? 'white'          : 'var(--text-main)';
}

async function updateScopeUI(editTask = null) {
    const scope = document.querySelector('input[name="cm-scope"]:checked')?.value;
    const wrap  = document.getElementById('cm-scope-select');
    const sel   = document.getElementById('cm-target');

    if (scope === 'general') { wrap.style.display = 'none'; return; }
    wrap.style.display = 'block';

    if (!_plantsCache) {
        const r = await api('getPlantsList');
        _plantsCache = r.success ? r : null;
    }
    if (!_plantsCache) return;

    if (scope === 'group') {
        sel.innerHTML = _plantsCache.groups.map(g =>
            `<option value="${g.id}">${esc(g.name || '(Unbenannt)')}</option>`
        ).join('');
        if (editTask?.user_group_id)
            sel.value = editTask.user_group_id;
    } else {
        sel.innerHTML = _plantsCache.groups.flatMap(g => g.plants).map(p =>
            `<option value="${p.id}">${esc(p.plant_name || 'Pflanze #' + p.id)}</option>`
        ).join('');
        if (editTask?.plant_id)
            sel.value = editTask.plant_id;
    }
}

async function submitTaskModal() {
    const id    = document.getElementById('cm-id').value;
    const name  = document.getElementById('cm-name').value.trim();
    const notes = document.getElementById('cm-notes').value.trim();
    const scope = document.querySelector('input[name="cm-scope"]:checked')?.value;
    const target = document.getElementById('cm-target').value;

    const typeVal2 = document.getElementById('cm-type').value;
    if (typeVal2 === 'custom' && !name) { alert('Bitte einen Namen eingeben.'); return; }
    if (_cmMonthMask === 0) { alert('Bitte mindestens einen Monat auswählen.'); return; }

    const typeVal = document.getElementById('cm-type').value;
    const payload = {
        task_type_id:  typeVal !== 'custom' ? parseInt(typeVal) : null,
        name:          typeVal === 'custom'  ? name : null,
        months: _cmMonthMask, notes: notes || null,
        plant_id:      scope === 'plant' ? parseInt(target) : null,
        user_group_id: scope === 'group' ? parseInt(target) : null,
    };
    if (id) payload.id = parseInt(id);

    const r = await api('saveCareTask', payload);
    if (!r.success) { alert(r.error || 'Fehler'); return; }
    closeTaskModal();
    await loadData();
}

// ---- Helpers ----
function esc(s) {
    return s == null ? '' : String(s)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

document.addEventListener('DOMContentLoaded', init);
</script>
