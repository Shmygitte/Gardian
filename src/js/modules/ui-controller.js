/**
 * UI Controller – zentrale View-Steuerung, Avatar, Settings, Theme
 * Ausgelagert aus index.php
 */

// Avatar + Rolle laden
async function loadAvatar() {
    const res = await fetch('backend/api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getAvatar' })
    });
    const data = await res.json();
    if (data.success && data.avatar) {
        document.getElementById('user-avatar').src = data.avatar + '?t=' + Date.now();
    }
    if (data.username) {
        document.getElementById('user-name').textContent = data.username;
    }
    if (data.role === 'admin') {
        document.getElementById('nav-admin').style.display = 'flex';
    }

    // Konfiguration (Theme + Effekte) beim Start laden
    const configRes = await fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'getGardenConfig' }) });
    const configData = await configRes.json();
    if (configData.success && configData.config) {
        const c = configData.config;
        if (c.theme) document.documentElement.setAttribute('data-theme', c.theme);
        const effectsToggle = document.getElementById('settings-effects-toggle');
        if (effectsToggle) effectsToggle.checked = parseInt(c.effects_enabled) !== 0;
        updateSettingsThemeBtn();

        // Animation-Trigger aus URL prüfen
        if (typeof EffectManager !== 'undefined') EffectManager.initFromUrl();
    }
}

// Avatar Upload / Cropper
let cropper = null;
const cropModal = document.getElementById('modal-avatar-crop');
const cropImg   = document.getElementById('avatar-crop-image');

function openCropModal(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        cropImg.src = e.target.result;
        cropModal.style.display = 'flex';
        if (cropper) cropper.destroy();
        cropper = new Cropper(cropImg, {
            aspectRatio: 1,
            viewMode: 1,
            dragMode: 'move',
            autoCropArea: 1,
            restore: false,
            guides: false,
            center: true,
            highlight: false,
            cropBoxMovable: false,
            cropBoxResizable: false,
            toggleDragModeOnDblclick: false,
            minContainerHeight: 300
        });
    };
    reader.readAsDataURL(file);
}

function closeCropModal() {
    cropModal.style.display = 'none';
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
}

async function saveCroppedAvatar() {
    if (!cropper) return;
    const canvas = cropper.getCroppedCanvas({ width: 400, height: 400 });
    canvas.toBlob(async (blob) => {
        const formData = new FormData();
        formData.append('action', 'uploadAvatar');
        formData.append('avatar', blob, 'avatar.png');
        const res = await fetch('backend/api.php', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            if (typeof EffectManager !== 'undefined') EffectManager.trigger('save-success');
            const avatarUrl = data.avatar + '?t=' + Date.now();
            document.getElementById('user-avatar').src = avatarUrl;
            const settingsAv = document.getElementById('settings-avatar');
            if (settingsAv) settingsAv.src = avatarUrl;
            closeCropModal();
        }
    }, 'image/png');
}

// View-Steuerung
const views = ['dashboard', 'pflanzen', 'galerie', 'einstellungen', 'about', 'admin'];

function showView(name) {
    history.replaceState(null, '', '#' + name);
    views.forEach(v => {
        const viewEl = document.getElementById('view-' + v);
        const navEl  = document.getElementById('nav-' + v);
        if (viewEl) viewEl.style.display = v === name ? (v === 'dashboard' ? 'flex' : 'block') : 'none';
        if (navEl) {
            navEl.className = 'c-btn ' + (v === name ? 'c-btn--secondary' : 'c-btn--text');
            navEl.style.justifyContent = 'flex-start';
        }
    });

    // About-View: Inhalt aus Build-generiertem HTML laden
    if (name === 'about') {
        const el = document.getElementById('about-user-content');
        if (el && !el.innerHTML.trim()) {
            el.innerHTML = window.__ABOUT_USER_HTML__ || '<p style="color:var(--text-muted);">Kein Inhalt verfuegbar.</p>';
        }
    }

    // Trigger interaction effect
    if (typeof EffectManager !== 'undefined') {
        const navBtn = document.getElementById('nav-' + name);
        EffectManager.trigger('sidebar-click', navBtn);
    }

    // Panning/Dragging sofort stoppen und Pan-Position sichern/wiederherstellen
    if (typeof state !== 'undefined') {
        if (name !== 'dashboard') {
            // Beim Verlassen: Position merken
            state._savedPanX = state.panX;
            state._savedPanY = state.panY;
            state._savedZoom = state.zoom;
        }
        state.isPanning = false;
        state.isDragging = false;
        state.hasMoved = false;
    }
    if (name === 'dashboard' && typeof state !== 'undefined') {
        // Beim Zurückkehren: Position wiederherstellen falls abgedriftet
        if (state._savedPanX !== undefined) {
            state.panX = state._savedPanX;
            state.panY = state._savedPanY;
            state.zoom = state._savedZoom;
        }
        requestAnimationFrame(() => {
            if (typeof updateTransform === 'function') updateTransform();
        });
    }
    if (name === 'pflanzen') loadPflanzenListe();
    if (name === 'galerie') loadGalerie();
    if (name === 'admin') loadAdminView();
    if (name === 'einstellungen') loadEinstellungen();
}

// Einstellungen
async function loadEinstellungen() {
    const res  = await fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'getUser' }) });
    const data = await res.json();
    if (!data.success) return;
    const u = data.user;
    document.getElementById('settings-username').textContent = u.username || '';
    document.getElementById('settings-email').textContent    = u.email    || '';
    if (u.avatar_path) document.getElementById('settings-avatar').src = u.avatar_path + '?t=' + Date.now();

    updateSettingsThemeBtn();
}

function updateSettingsThemeBtn() {
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    ['light','dark','unicorn'].forEach(t => {
        const el = document.getElementById('theme-opt-' + t);
        if (el) el.style.borderColor = t === theme ? 'var(--primary)' : 'transparent';
    });
}

async function settingsSaveProfile() {
    const email    = document.getElementById('settings-new-email').value.trim();
    const password = document.getElementById('settings-new-password').value.trim();

    if (!email && !password) {
        alert('Gespeichert.');
        return;
    }

    const res  = await fetch('backend/api.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'updateUser', email: email||null, password: password||null }) });
    const data = await res.json();
    if (data.success) {
        document.getElementById('settings-new-password').value = '';
        if (email) { document.getElementById('settings-email').textContent = email; document.getElementById('settings-new-email').value = ''; }
        alert('Gespeichert.');
        if (typeof EffectManager !== 'undefined') EffectManager.trigger('save-success');
    }
}

// Theme
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    updateSettingsThemeBtn();
    fetch('backend/api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveGardenConfig', theme })
    });
}

function setEffectsEnabled(enabled) {
    fetch('backend/api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveGardenConfig', effects_enabled: enabled ? 1 : 0 })
    });
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    setTheme(current === 'light' ? 'dark' : 'light');
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    _restoreAccordionState();
    loadAvatar();
    // Verwaiste Bilder still im Hintergrund bereinigen
    fetch('backend/api.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'cleanupImages' }) });
    // View aus URL-Hash laden (z.B. index.php#einstellungen)
    const hash = location.hash.replace('#', '');
    if (hash && views.includes(hash)) showView(hash);

    document.getElementById('avatar-upload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) openCropModal(file);
        e.target.value = '';
    });

    const settingsAvUpload = document.getElementById('settings-avatar-upload');
    if (settingsAvUpload) {
        settingsAvUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) openCropModal(file);
            e.target.value = '';
        });
    }
});

// Bridge: Funktionen für onclick-Handler im HTML
window.showView = showView;
window.setTheme = setTheme;
window.setEffectsEnabled = setEffectsEnabled;
window.toggleTheme = toggleTheme;
window.settingsSaveProfile = settingsSaveProfile;
window.openCropModal = openCropModal;
window.closeCropModal = closeCropModal;
window.saveCroppedAvatar = saveCroppedAvatar;
