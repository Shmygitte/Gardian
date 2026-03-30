/**
 * Gardian - Icon Manager
 * Icon-Caches, Icon-Picker, Icon-Auflösung
 */
import { api, apiUpload } from '../core/api.js';
import { iconLibraryCache, userIconsCache, setIconLibraryCache, setUserIconsCache } from '../core/state.js';

function getEmoji(type) {
    if (type === 'tree') return '🌳';
    if (type === 'shrub') return '🌿';
    if (type === 'climber') return '🌱';
    return '🌸';
}

export async function loadIconCaches() {
    const [libData, userData] = await Promise.all([
        api('getIconLibrary'),
        api('getUserIcons')
    ]);
    if (libData.success) setIconLibraryCache(Object.fromEntries(libData.icons.map(i => [String(i.id), i.file_path])));
    if (userData.success) setUserIconsCache(Object.fromEntries(userData.icons.map(i => [String(i.id), i.file_path])));
}

export function resolveMarkerIcon(markerIcon, type, iconColor) {
    if (!markerIcon) return `<span>${getEmoji(type)}</span>`;

    if (markerIcon.startsWith('lib:')) {
        const iconId = markerIcon.substring(4);
        const path = iconLibraryCache?.[iconId];
        if (path) {
            if (iconColor) {
                return `<div style="width:65%;height:65%;background:${iconColor};-webkit-mask:url(${path}) center/contain no-repeat;mask:url(${path}) center/contain no-repeat;"></div>`;
            }
            return `<img src="${path}" style="width:65%;height:65%;object-fit:contain;" alt="">`;
        }
        return `<span>${getEmoji(type)}</span>`;
    }
    if (markerIcon.startsWith('user:')) {
        const iconId = markerIcon.substring(5);
        const path = userIconsCache?.[iconId];
        if (path) {
            if (iconColor) {
                return `<div style="width:65%;height:65%;background:${iconColor};-webkit-mask:url(${path}) center/contain no-repeat;mask:url(${path}) center/contain no-repeat;"></div>`;
            }
            return `<img src="${path}" style="width:65%;height:65%;object-fit:contain;" alt="">`;
        }
        return `<span>${getEmoji(type)}</span>`;
    }
    return `<span>${markerIcon}</span>`;
}

// === Icon Picker (Plant Edit Modal) ===

export function switchIconTab(tab) {
    const radio = document.querySelector(`input[name="icon-source"][value="${tab}"]`);
    if (radio) radio.checked = true;
    document.querySelectorAll('.icon-tab-panel').forEach(p => p.style.display = 'none');
    document.getElementById('icon-tab-' + tab).style.display = 'block';
    if (tab === 'library') renderIconLibraryGrid();
    if (tab === 'own') renderUserIconGrid();
}

export function updateIconPreview(value) {
    const preview = document.getElementById('icon-picker-current');
    const label = document.getElementById('icon-picker-label');
    const colorWrap = document.getElementById('icon-color-picker-wrap');
    document.getElementById('edit-marker-icon').value = value || '';
    const isSvg = value && (value.startsWith('lib:') || value.startsWith('user:'));
    colorWrap.style.display = isSvg ? 'flex' : 'none';
    const iconColor = isSvg ? document.getElementById('edit-marker-icon-color').value : null;

    if (!value) {
        preview.innerHTML = getEmoji('flower');
        label.textContent = 'Standard-Emoji';
    } else if (value.startsWith('lib:')) {
        const path = iconLibraryCache?.[value.substring(4)];
        if (path && iconColor) {
            preview.innerHTML = `<div style="width:22px;height:22px;background:${iconColor};-webkit-mask:url(${path}) center/contain no-repeat;mask:url(${path}) center/contain no-repeat;"></div>`;
        } else {
            preview.innerHTML = path ? `<img src="${path}" style="width:22px;height:22px;">` : '?';
        }
        label.textContent = 'Bibliothek';
    } else if (value.startsWith('user:')) {
        const path = userIconsCache?.[value.substring(5)];
        if (path && iconColor) {
            preview.innerHTML = `<div style="width:22px;height:22px;background:${iconColor};-webkit-mask:url(${path}) center/contain no-repeat;mask:url(${path}) center/contain no-repeat;"></div>`;
        } else {
            preview.innerHTML = path ? `<img src="${path}" style="width:22px;height:22px;">` : '?';
        }
        label.textContent = 'Eigenes';
    } else {
        preview.innerHTML = `<span>${value}</span>`;
        label.textContent = 'Emoji';
    }
    window.updateMarkerPreview?.();
}

export function selectEmojiIcon(val) { updateIconPreview(val.trim() || null); }
export function selectLibraryIcon(id) { updateIconPreview('lib:' + id); }
export function selectUserIcon(id) { updateIconPreview('user:' + id); }
export function resetMarkerIcon() {
    document.getElementById('edit-marker-emoji').value = '';
    updateIconPreview(null);
}

export function resetAllMarkerSettings() {
    document.getElementById('edit-marker-color').value = '#4CAF50';
    document.getElementById('edit-marker-size').value = '';
    document.getElementById('edit-marker-emoji').value = '';
    document.getElementById('edit-marker-icon-color').value = '#333333';
    updateIconPreview(null);
    window.updateMarkerPreview?.();
}

export function renderIconLibraryGrid() {
    const grid = document.getElementById('icon-library-grid');
    if (!iconLibraryCache) { grid.innerHTML = '<span style="color:var(--text-muted);font-size:0.8rem;grid-column:1/-1;">Keine Icons vorhanden</span>'; return; }
    const currentVal = document.getElementById('edit-marker-icon').value;
    grid.innerHTML = Object.entries(iconLibraryCache).map(([id, path]) =>
        `<button type="button" onclick="selectLibraryIcon('${id}')" title="Icon #${id}"
            style="width:100%;aspect-ratio:1;border:2px solid ${currentVal === 'lib:'+id ? 'var(--primary)' : 'var(--border)'};border-radius:var(--radius-sm);background:var(--bg-app);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:4px;transition:transform 0.15s;"
            onmouseenter="this.style.transform='scale(1.8)';this.style.zIndex='10'" onmouseleave="this.style.transform='';this.style.zIndex=''">
            <img src="${path}" style="width:100%;height:100%;object-fit:contain;">
        </button>`
    ).join('');
}

export function renderUserIconGrid() {
    const grid = document.getElementById('icon-user-grid');
    if (!userIconsCache || Object.keys(userIconsCache).length === 0) {
        grid.innerHTML = '<span style="color:var(--text-muted);font-size:0.8rem;grid-column:1/-1;">Noch keine eigenen Icons</span>';
        return;
    }
    const currentVal = document.getElementById('edit-marker-icon').value;
    grid.innerHTML = Object.entries(userIconsCache).map(([id, path]) =>
        `<div style="position:relative;">
            <button type="button" onclick="selectUserIcon('${id}')" title="Eigenes Icon #${id}"
                style="width:100%;aspect-ratio:1;border:2px solid ${currentVal === 'user:'+id ? 'var(--primary)' : 'var(--border)'};border-radius:var(--radius-sm);background:var(--bg-app);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:4px;transition:transform 0.15s;"
                onmouseenter="this.style.transform='scale(1.8)';this.style.zIndex='10'" onmouseleave="this.style.transform='';this.style.zIndex=''">
                <img src="${path}" style="width:100%;height:100%;object-fit:contain;">
            </button>
            <button type="button" onclick="deleteUserIcon('${id}')" title="Löschen"
                style="position:absolute;top:-4px;right:-4px;width:16px;height:16px;border-radius:50%;background:var(--danger);color:white;border:none;font-size:0.6rem;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;">✕</button>
        </div>`
    ).join('');
}

export async function uploadUserIcon(input) {
    const file = input.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.svg')) { window.customAlert('Nur SVG-Dateien erlaubt.'); return; }
    if (file.size > 51200) { window.customAlert('Datei zu groß (max. 50KB).'); return; }

    const formData = new FormData();
    formData.append('action', 'uploadIcon');
    formData.append('target', 'user');
    formData.append('name', file.name.replace('.svg', ''));
    formData.append('icon', file);

    const data = await apiUpload(formData);
    if (data.success) {
        // Update cache directly via import
        const cache = userIconsCache || {};
        cache[String(data.id)] = data.file_path;
        setUserIconsCache(cache);
        selectUserIcon(String(data.id));
        renderUserIconGrid();
    } else {
        window.customAlert(data.error || 'Upload fehlgeschlagen');
    }
    input.value = '';
}

export async function deleteUserIcon(id) {
    if (!await window.customConfirm('Icon wirklich löschen?', { confirmLabel: 'Löschen', danger: true })) return;
    const data = await api('deleteIcon', { target: 'user', id });
    if (data.success) {
        const cache = userIconsCache || {};
        delete cache[id];
        setUserIconsCache(cache);
        const current = document.getElementById('edit-marker-icon').value;
        if (current === 'user:' + id) resetMarkerIcon();
        renderUserIconGrid();
    }
}

// Bridge
window.getEmoji = getEmoji;
window.resolveMarkerIcon = resolveMarkerIcon;
window.switchIconTab = switchIconTab;
window.updateIconPreview = updateIconPreview;
window.selectEmojiIcon = selectEmojiIcon;
window.selectLibraryIcon = selectLibraryIcon;
window.selectUserIcon = selectUserIcon;
window.resetMarkerIcon = resetMarkerIcon;
window.resetAllMarkerSettings = resetAllMarkerSettings;
window.uploadUserIcon = uploadUserIcon;
window.deleteUserIcon = deleteUserIcon;
