<?php
$pageId = 'gartentalk';
$pageTitle = 'Gardian – Gartenanalyse';
$extraHeadStyles = '
        .gt-output {
            background: var(--bg-card); border: 1px solid var(--border);
            border-radius: var(--radius-md); padding: 20px 24px;
            font-size: 0.88rem; line-height: 1.6; color: var(--text-main);
            min-height: 200px; word-wrap: break-word; overflow-wrap: break-word;
        }
        .gt-output--empty {
            color: var(--text-muted); font-style: italic;
        }
        .gt-history-item {
            padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius-md);
            background: var(--bg-card); cursor: pointer; font-size: 0.8rem;
            color: var(--text-muted); transition: border-color 0.2s;
        }
        .gt-history-item:hover { border-color: var(--primary); }
        .gt-history-item.active { border-color: var(--primary); color: var(--text-main); font-weight: 600; }';

include 'src/layout/head.php';
include 'src/layout/header.php';
?>

    <div class="l-app-body">
<?php include 'src/layout/sidebar.php'; ?>

        <div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;background:var(--bg-app);padding:24px;">

            <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
                <h2 style="font-size:1.1rem;font-weight:700;color:var(--text-main);margin:0;">🤖 Gartenanalyse</h2>
                <button id="gt-btn" onclick="startAnalyse()" class="c-btn c-btn--primary" style="font-size:0.85rem;">Neue Analyse starten</button>
                <button onclick="testButterfly()" class="c-btn c-btn--text" style="font-size:0.75rem;color:var(--text-muted);">🦋 Test Animation</button>
            </div>

            <div style="display:flex;gap:16px;align-items:flex-start;">
                <div style="flex:1;">
                    <div id="gt-output" class="gt-output gt-output--empty">
                        Klicke auf „Neue Analyse starten", um eine KI-gestützte Analyse deines Gartens zu erhalten.
                    </div>
                </div>
                <div id="gt-history" style="width:200px;flex-shrink:0;display:flex;flex-direction:column;gap:6px;">
                    <span style="font-size:0.7rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;">Historie</span>
                </div>
            </div>

        </div>
    </div>

<?php include 'src/layout/footer.php'; ?>
<script>
let _historyCache = [];

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
            window.soundsEnabled = parseInt(c.sounds_enabled) !== 0;
        }
    } catch(e) {}
    if (typeof EffectManager !== 'undefined') EffectManager.initFromUrl();
    await loadHistory();
}

async function startAnalyse() {
    const btn = document.getElementById('gt-btn');
    const out = document.getElementById('gt-output');
    btn.disabled = true;
    btn.textContent = '⏳ Analyse läuft…';
    out.className = 'gt-output gt-output--empty';
    out.textContent = 'Anfrage wird verarbeitet…';
    startButterfly();

    try {
        const list = await api('getPlantsList');
        if (!list.success) throw new Error('Pflanzenliste konnte nicht geladen werden');
        const MONATE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
        function bitmaskToMonths(bm) {
            if (!bm) return [];
            const result = [];
            for (let i = 0; i < 12; i++) { if ((bm >> i) & 1) result.push(MONATE[i]); }
            return result;
        }
        const pflanzen = list.groups.flatMap(g =>
            g.plants.map(p => ({
                name: g.name,
                botanical_name: g.botanical_name,
                type: g.type,
                marker_color: p.marker_color || g.marker_color,
                pos_x: p.pos_x,
                pos_y: p.pos_y,
                bluehmonate: bitmaskToMonths(p.bloom_months || g.bloom_months_resolved),
                height: g.height,
                location: g.location,
                hardy: g.hardy,
                evergreen: g.evergreen
            }))
        );
        if (!pflanzen.length) throw new Error('Keine Pflanzen im Garten vorhanden');

        const res = await fetch('http://localhost:5678/webhook/gartentalk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pflanzen })
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const raw = await res.json();
        const content = raw.output || raw;
        const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

        out.className = 'gt-output';
        out.innerHTML = formatOutput(text);

        // In DB speichern
        await api('saveGartenanalyse', { content: text });
        await loadHistory();
    } catch (err) {
        out.className = 'gt-output';
        out.innerHTML = '<span style="color:var(--danger);">Fehler: ' + esc(err.message) + '</span>';
    } finally {
        stopButterfly();
        btn.disabled = false;
        btn.textContent = 'Neue Analyse starten';
    }
}

async function loadHistory() {
    const r = await api('getGartenanalyseHistory');
    if (!r.success) return;
    _historyCache = r.history;
    const container = document.getElementById('gt-history');
    const label = '<span style="font-size:0.7rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;">Historie</span>';
    if (!r.history.length) {
        container.innerHTML = label + '<span style="font-size:0.78rem;color:var(--text-muted);">Noch keine Analysen.</span>';
        return;
    }
    container.innerHTML = label + r.history.map((h, i) => {
        const d = new Date(h.created_at);
        const dateStr = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        return `<div class="gt-history-item" onclick="showHistory(${i})" id="gt-h-${i}">${dateStr}, ${timeStr}</div>`;
    }).join('');
}

function showHistory(index) {
    const entry = _historyCache[index];
    if (!entry) return;
    const out = document.getElementById('gt-output');
    out.className = 'gt-output';
    out.innerHTML = formatOutput(entry.content);
    document.querySelectorAll('.gt-history-item').forEach((el, i) => {
        el.classList.toggle('active', i === index);
    });
}

function formatOutput(text) {
    const escaped = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const lines = escaped.split('\n');
    let html = '', inList = false;
    for (const line of lines) {
        const t = line.trim();
        if (!t) { if (!inList) html += '</p><p style="margin:0 0 6px;">'; continue; }
        if (/^#{3} /.test(t)) { if (inList) { html += '</ul>'; inList = false; } html += '<h4 style="margin:14px 0 4px;font-size:0.9rem;">' + t.slice(4) + '</h4>'; }
        else if (/^#{2} /.test(t)) { if (inList) { html += '</ul>'; inList = false; } html += '<h3 style="margin:18px 0 6px;font-size:1rem;border-bottom:1px solid var(--border);padding-bottom:4px;">' + t.slice(3) + '</h3>'; }
        else if (/^# /.test(t)) { if (inList) { html += '</ul>'; inList = false; } html += '<h2 style="margin:20px 0 8px;font-size:1.1rem;">' + t.slice(2) + '</h2>'; }
        else if (/^[-*] /.test(t)) { if (!inList) { html += '<ul style="margin:4px 0 8px 16px;padding:0;">'; inList = true; } html += '<li style="margin-bottom:2px;">' + t.slice(2) + '</li>'; }
        else { if (inList) { html += '</ul>'; inList = false; } html += t + '<br>'; }
    }
    if (inList) html += '</ul>';
    return html
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/<\/p><p[^>]*>(<h[234])/g, '$1');
}

// ========================
// Butterfly Animation
// ========================
let _butterflyEl = null;

function startButterfly() {
    stopButterfly();
    _butterflyEl = [];

    const img = document.createElement('img');
    img.src = 'https://media.giphy.com/media/Mk9DAe0SOPFBKpLX7p/giphy.gif';
    const left = 25 + Math.random() * 50;
    const top = 10 + Math.random() * 15;
    img.style.cssText = `position:fixed;top:${top}%;left:${left}%;transform:translate(-50%,0);width:350px;height:auto;z-index:9999;pointer-events:none;opacity:0;transition:opacity 3s ease;`;
    document.body.appendChild(img);
    _butterflyEl.push(img);

    requestAnimationFrame(() => { img.style.opacity = '0.85'; });
}

function stopButterfly() {
    if (_butterflyEl && _butterflyEl.length) {
        const els = _butterflyEl;
        _butterflyEl = null;
        els.forEach(el => { el.style.opacity = '0'; });
        setTimeout(() => els.forEach(el => el.remove()), 5000);
    }
}

function testButterfly() {
    startButterfly();
    setTimeout(stopButterfly, 10000);
}

function esc(s) {
    return s == null ? '' : String(s)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

document.addEventListener('DOMContentLoaded', init);
</script>
