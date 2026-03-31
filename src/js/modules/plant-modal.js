/**
 * Gardian - Plant Modals
 * Pflanze bearbeiten, hinzufügen, Gruppe anlegen
 */
import { api } from '../core/api.js';
import { state, DEFAULT_MARKER } from '../core/state.js';
import { resolveMarkerIcon, switchIconTab, updateIconPreview } from './icons.js';

// === Plant Edit Modal ===

export function openPlantEditModal(pin) {
    const p = state.pins.find(pp => String(pp.id) === String(pin.id)) || pin;

    document.getElementById('edit-plant-id').value = '';
    document.getElementById('edit-plant-name').value = '';
    document.getElementById('edit-marker-color').value = '#4CAF50';
    document.getElementById('edit-marker-size').value = '';
    document.getElementById('edit-marker-icon').value = '';
    document.getElementById('edit-marker-emoji').value = '';
    document.getElementById('edit-marker-icon-color').value = '#333333';

    document.getElementById('edit-plant-id').value = p.id;
    document.getElementById('modal-edit-title').textContent = 'Pflanze';
    document.getElementById('edit-plant-name').value = p.plant_name || '';
    document.getElementById('edit-marker-color').value = p.marker_color || '#4CAF50';

    const defaultSize = (DEFAULT_MARKER[p.type] || DEFAULT_MARKER._fallback).size;
    document.getElementById('edit-marker-size').value = p.marker_size || '';
    document.getElementById('edit-marker-size').dataset.defaultSize = defaultSize;
    document.getElementById('edit-marker-size').dataset.pinType = p.type || 'flower';
    const iconColorEl = document.getElementById('edit-marker-icon-color');
    iconColorEl.value = p.marker_icon_color || '#ffffff';
    iconColorEl.dataset.original = p.marker_icon_color || '';

    const iconVal = p.marker_icon || '';
    document.getElementById('edit-marker-icon').value = iconVal;
    if (iconVal && !iconVal.startsWith('lib:') && !iconVal.startsWith('user:')) {
        document.getElementById('edit-marker-emoji').value = iconVal;
        switchIconTab('emoji');
    } else if (iconVal.startsWith('lib:')) {
        switchIconTab('library');
    } else if (iconVal.startsWith('user:')) {
        switchIconTab('own');
    } else {
        switchIconTab('emoji');
    }

    updateIconPreview(iconVal || null);
    updateMarkerPreview();
    loadPlantEditPhotos(p.id);
    document.getElementById('modal-pflanze-edit').style.display = 'flex';
}

export function closePlantEditModal() {
    document.getElementById('modal-pflanze-edit').style.display = 'none';
}

async function loadPlantEditPhotos(plantId) {
    const grid = document.getElementById('edit-plant-photos-grid');
    grid.innerHTML = '';
    try {
        const data = await api('getImages', { type: 'plant', plant_id: plantId });
        if (data.success && data.images.length) {
            grid.innerHTML = data.images.map(img =>
                `<div style="position:relative;">
                    <img src="${img.file_path}" style="width:48px;height:48px;object-fit:cover;border-radius:4px;border:1px solid var(--border);cursor:pointer;" onclick="showFullImage('${img.file_path_gallery || img.file_path}')">
                    <button onclick="deletePlantPhotoFromModal(${img.id})" style="position:absolute;top:-4px;right:-4px;width:16px;height:16px;border-radius:50%;background:var(--danger);color:white;border:none;font-size:0.6rem;cursor:pointer;line-height:1;padding:0;">✕</button>
                </div>`
            ).join('');
        }
    } catch (e) {}
}

export function uploadPlantPhotoFromModal(input) {
    const plantId = document.getElementById('edit-plant-id').value;
    if (!plantId) return;
    window.uploadImage(input, 'plant', null, plantId, 'edit-plant-photos-grid');
}

export async function deletePlantPhotoFromModal(imageId) {
    if (!await window.customConfirm('Foto löschen?', { confirmLabel: 'Löschen', danger: true })) return;
    const data = await api('deleteImage', { id: imageId });
    if (data.success) {
        const plantId = document.getElementById('edit-plant-id').value;
        loadPlantEditPhotos(plantId);
    }
}

export async function deletePlantFromModal() {
    const id = document.getElementById('edit-plant-id').value;
    if (!id) return;
    if (!await window.customConfirm('Pflanze wirklich löschen? Alle zugehörigen Fotos und Daten werden entfernt.', { confirmLabel: 'Löschen', danger: true })) return;
    try {
        const data = await api('deletePlant', { plant_id: parseInt(id) });
        if (data.success) {
            closePlantEditModal();
            await window.loadPins();
        } else {
            window.customAlert(data.error || 'Fehler beim Löschen');
        }
    } catch (e) {
        window.customAlert('Fehler beim Löschen');
    }
}

export function adjustMarkerSize(delta) {
    const input = document.getElementById('edit-marker-size');
    const defaultSize = parseInt(input.dataset.defaultSize) || 30;
    const current = parseInt(input.value) || defaultSize;
    const newVal = Math.max(8, Math.min(80, current + delta));
    input.value = newVal === defaultSize ? '' : newVal;
    updateMarkerPreview();
}

export function updateMarkerPreview() {
    const preview = document.getElementById('edit-marker-preview');
    if (!preview) return;
    const input = document.getElementById('edit-marker-size');
    const defaultSize = parseInt(input.dataset.defaultSize) || 30;
    const size = parseInt(input.value) || defaultSize;
    const displaySize = Math.min(size, 48);
    const color = document.getElementById('edit-marker-color').value || '#4CAF50';
    const iconVal = document.getElementById('edit-marker-icon').value;
    const pinType = input.dataset.pinType || 'flower';
    const isSvg = iconVal && (iconVal.startsWith('lib:') || iconVal.startsWith('user:'));
    const iconColor = isSvg ? document.getElementById('edit-marker-icon-color').value : null;
    const iconContent = resolveMarkerIcon(iconVal || '', pinType, iconColor);
    const fontSize = displaySize < 20 ? '0.5rem' : displaySize < 30 ? '0.7rem' : displaySize < 40 ? '0.9rem' : '1.2rem';
    preview.style.width = displaySize + 'px';
    preview.style.height = displaySize + 'px';
    preview.style.background = color;
    preview.style.fontSize = fontSize;
    preview.style.color = 'white';
    preview.innerHTML = iconContent;
}

export async function savePlantEdit() {
    const id = document.getElementById('edit-plant-id').value;
    const iconVal = document.getElementById('edit-marker-icon').value || null;
    const isSvgIcon = iconVal && (iconVal.startsWith('lib:') || iconVal.startsWith('user:'));
    const colorEl = document.getElementById('edit-marker-color');
    const iconColorEl = document.getElementById('edit-marker-icon-color');
    const wasReset = colorEl.dataset.reset === '1';
    const payload = {
        id: parseInt(id),
        name: document.getElementById('edit-plant-name').value || null,
        marker_color: wasReset ? null : colorEl.value,
        marker_size: document.getElementById('edit-marker-size').value || null,
        marker_icon: iconVal,
        marker_icon_color: isSvgIcon && !wasReset ? (function () {
            const orig = iconColorEl.dataset.original || '';
            if (!orig && iconColorEl.value === '#ffffff') return null;
            return iconColorEl.value;
        })() : null,
    };
    delete colorEl.dataset.reset;
    delete iconColorEl.dataset.reset;
    const data = await api('updatePlant', payload);
    if (data.success) {
        if (typeof EffectManager !== 'undefined') EffectManager.trigger('save-success');
        closePlantEditModal();
        await window.loadPins();
    } else {
        window.customAlert(data.error || 'Fehler beim Speichern');
    }
}

// === Plant Add Modal ===

export async function openPlantModal() {
    const modal = document.getElementById('modal-pflanze');
    const select = document.getElementById('modal-group-select');
    modal.style.display = 'flex';

    const data = await api('getGroups');
    while (select.options.length > 2) select.remove(2);
    select.value = '';

    if (data.success) {
        data.groups.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.id;
            opt.dataset.source = g.source;
            opt.textContent = g.name;
            select.appendChild(opt);
        });
    }
    document.getElementById('modal-group-select').value = '';
}

export function onGroupSelectChange() {
    const val = document.getElementById('modal-group-select').value;
    if (val === '__new__') {
        document.getElementById('modal-group-select').value = '';
        openNeueGruppeModal();
    }
}

export function openNeueGruppeModal() {
    const body = document.getElementById('modal-neue-gruppe-body');
    body.innerHTML = window.renderGroupFormNice({}, 'form-neue-gruppe', 'saveNeueGruppe()');
    document.getElementById('modal-neue-gruppe-title').textContent = 'Neue Pflanzengruppe anlegen';
    document.getElementById('modal-neue-gruppe').style.display = 'flex';
}

export function closeNeueGruppeModal() {
    document.getElementById('modal-neue-gruppe').style.display = 'none';
}

export async function saveNeueGruppe() {
    const groupData = window.getGroupFormNiceData('form-neue-gruppe');
    if (!groupData.name) { window.customAlert('Bitte einen Gruppennamen eingeben.'); return; }

    const data = await api('createUserGroup', groupData);
    if (!data.success) { window.customAlert(data.error || 'Fehler beim Anlegen der Gruppe'); return; }

    closeNeueGruppeModal();

    if (state.pendingCoords) {
        const plantData = await api('addPlant', { user_group_id: data.id, pos_x: state.pendingCoords.x, pos_y: state.pendingCoords.y });
        if (plantData.success) {
            closeModal();
            await window.loadFilterGroups();
            await window.loadPins();
            const newMarker = document.querySelector(`.marker[data-id="${plantData.id}"]`);
            if (newMarker && typeof EffectManager !== 'undefined') EffectManager.trigger('plant-place', newMarker);
        } else {
            window.customAlert(plantData.error || 'Pflanze konnte nicht angelegt werden');
        }
    } else {
        await window.loadFilterGroups();
        await openPlantModal();
    }
}

export function closeModal() {
    document.getElementById('modal-pflanze').style.display = 'none';
    state.pendingCoords = null;
}

export async function confirmAddPlant() {
    const selectVal = document.getElementById('modal-group-select').value;
    if (!selectVal || !state.pendingCoords) return;

    if (selectVal === '__new__') {
        const groupData = window.getNewGroupFormData?.();
        if (!groupData?.name) { window.customAlert('Bitte einen Gruppennamen eingeben.'); return; }
        const data = await api('createUserGroup', groupData);
        if (!data.success) { window.customAlert(data.error || 'Fehler beim Anlegen der Gruppe'); return; }
        const plantData = await api('addPlant', { group_id: null, user_group_id: data.id, pos_x: state.pendingCoords.x, pos_y: state.pendingCoords.y });
        if (plantData.success) {
            closeModal();
            await window.loadFilterGroups();
            await window.loadPins();
        }
        return;
    }

    const selectedOpt = document.getElementById('modal-group-select').selectedOptions[0];
    const isUserGroup = selectedOpt?.dataset.source === 'user';

    const payload = { pos_x: state.pendingCoords.x, pos_y: state.pendingCoords.y };
    if (isUserGroup) payload.user_group_id = selectVal;
    else payload.group_id = selectVal;

    const data = await api('addPlant', payload);
    if (data.success) {
        closeModal();
        await window.loadFilterGroups();
        await window.loadPins();
        const newMarker = document.querySelector(`.marker[data-id="${data.id}"]`);
        if (newMarker && typeof EffectManager !== 'undefined') EffectManager.trigger('plant-place', newMarker);
    }
}

// Bridge
window.openPlantEditModal = openPlantEditModal;
window.closePlantEditModal = closePlantEditModal;
window.uploadPlantPhotoFromModal = uploadPlantPhotoFromModal;
window.deletePlantPhotoFromModal = deletePlantPhotoFromModal;
window.deletePlantFromModal = deletePlantFromModal;
window.adjustMarkerSize = adjustMarkerSize;
window.updateMarkerPreview = updateMarkerPreview;
window.savePlantEdit = savePlantEdit;
window.onGroupSelectChange = onGroupSelectChange;
window.openNeueGruppeModal = openNeueGruppeModal;
window.closeNeueGruppeModal = closeNeueGruppeModal;
window.saveNeueGruppe = saveNeueGruppe;
window.closeModal = closeModal;
window.confirmAddPlant = confirmAddPlant;
