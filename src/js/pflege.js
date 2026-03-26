/**
 * Gardian – Gartenkalender Overlay (Karte)
 */

let _careOverlayActive = false;
let _careOverlayYear   = new Date().getFullYear();
let _careOverlayTasks  = null;

// ========================
// HILFSFUNKTIONEN (auch für Filter)
// ========================
async function ensureCareTasksLoaded() {
    if (_careOverlayTasks) return;
    const res  = await fetch('backend/api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getCareTasksList', year: _careOverlayYear })
    });
    const data = await res.json();
    if (data.success) _careOverlayTasks = data.tasks;
}

function getPinsWithCareTasks(careMonths) {
    const result = new Set();
    if (!_careOverlayTasks) return result;
    // careMonths: Set (leer = alle), sonst Set mit 0-indexed Monatsnummern
    let mask = 0;
    if (!careMonths || careMonths.size === 0) {
        mask = (1 << 12) - 1; // alle Monate
    } else {
        careMonths.forEach(m => { mask |= (1 << m); });
    }
    const pins = (typeof state !== 'undefined' ? state.pins : []) || [];

    for (const task of _careOverlayTasks) {
        if (!(task.months & mask)) continue;
        if (task.plant_id) {
            result.add(task.plant_id);
        } else if (task.user_group_id) {
            pins.filter(p =>
                String(p.user_group_id) === String(task.user_group_id) ||
                (task.user_group_default_group_id &&
                 String(p.group_id) === String(task.user_group_default_group_id))
            ).forEach(p => result.add(p.id));
        } else {
            pins.forEach(p => result.add(p.id));
        }
    }
    return result;
}

// ========================
// TOGGLE
// ========================
function toggleCareOverlay(checked) {
    _careOverlayActive = checked;
    if (_careOverlayActive) {
        loadAndRenderCareOverlay();
    } else {
        clearCareBadges();
    }
}

// ========================
// LOAD & RENDER
// ========================
async function loadAndRenderCareOverlay() {
    await ensureCareTasksLoaded();
    renderCareBadges();
}

function renderCareBadges() {
    clearCareBadges();
    if (!_careOverlayTasks || !_careOverlayActive) return;

    const canvas = document.querySelector('.map__canvas');
    if (!canvas) return;
    const overlay = canvas.querySelector('.map__markers-overlay');
    if (!overlay) return;

    const pins        = (typeof state !== 'undefined' ? state.pins : []) || [];
    const careMonths  = (typeof filterState !== 'undefined') ? filterState.careMonths : new Set();
    const activeMonths = careMonths.size === 0
        ? [0,1,2,3,4,5,6,7,8,9,10,11]
        : Array.from(careMonths);

    // Aufgaben je Plant-ID sammeln: {pending, done, icons}
    const byPlant = {};
    const addTo = (plantId, isPending, icon) => {
        if (!byPlant[plantId]) byPlant[plantId] = { pending: 0, done: 0, icons: [] };
        if (isPending) byPlant[plantId].pending++;
        else           byPlant[plantId].done++;
        if (icon && byPlant[plantId].icons.length < 3 && !byPlant[plantId].icons.includes(icon))
            byPlant[plantId].icons.push(icon);
    };

    for (const task of _careOverlayTasks) {
        for (const m of activeMonths) {
            if (!(task.months & (1 << m))) continue;
            const month1   = m + 1;
            const isPending = !task.done_months.includes(month1);

            if (task.plant_id) {
                addTo(task.plant_id, isPending, task.icon);
            } else if (task.user_group_id) {
                pins.filter(p =>
                    String(p.user_group_id) === String(task.user_group_id) ||
                    (task.user_group_default_group_id &&
                     String(p.group_id) === String(task.user_group_default_group_id))
                ).forEach(p => addTo(p.id, isPending, task.icon));
            } else {
                pins.forEach(p => addTo(p.id, isPending, task.icon));
            }
        }
    }

    for (const pin of pins) {
        const stats = byPlant[pin.id];
        if (!stats) continue;

        const allDone = stats.pending === 0;
        const iconStr = stats.icons.join('');
        const label   = allDone
            ? (iconStr ? iconStr + ' ✓' : '✓')
            : (iconStr ? iconStr + (stats.pending > 1 ? ` ${stats.pending}` : '') : `${stats.pending} offen`);

        const badge = document.createElement('div');
        badge.className       = 'care-badge';
        badge.dataset.plantId = pin.id;
        badge.style.cssText   = `
            position:absolute; left:${pin.pos_x}%; top:${pin.pos_y}%;
            transform:translate(8px,-22px);
            background:${allDone ? '#22c55e' : '#f97316'};
            color:white; border-radius:20px; padding:2px 7px;
            font-size:0.75rem; font-weight:700; pointer-events:auto;
            cursor:default; z-index:200; white-space:nowrap;
            box-shadow:0 1px 4px rgba(0,0,0,0.3);
        `;
        badge.textContent = label;
        overlay.appendChild(badge);
    }
}

function clearCareBadges() {
    document.querySelectorAll('.care-badge').forEach(b => b.remove());
}

