/**
 * Gardian - Bloom Engine
 * Blütezeit-Slider, Autoplay, Bloom-Beobachtungen
 */
import { api } from '../core/api.js';
import { bloomState, bloomLayerFilter, bloomObservations, setBloomObservations, MONTH_NAMES } from '../core/state.js';
import { updateBloomOpacity } from './markers.js';

const BLOOM_YEARS = [2025, 2026, 2027, 2028, 2029, 2030];
let bloomAutoplayTimer = null;
let bloomAutoplaySpeed = 1500;

export async function loadBloomObservationsAll() {
    try {
        const data = await api('getAllBloomObservations');
        if (data.success) setBloomObservations(data.observations);
    } catch (err) {
        console.error('Failed to load bloom observations', err);
    }
}

export function getBloomBitmaskForPin(pin) {
    if (bloomState.year === 'std') {
        return parseInt(pin.bloom_months_resolved) || 0;
    }
    const plantObs = bloomObservations.find(o => String(o.plant_id) === String(pin.id) && String(o.year) === bloomState.year);
    if (plantObs) return parseInt(plantObs.bloom_months);
    const groupObs = bloomObservations.find(o => {
        const matchGroup = pin.user_group_id
            ? String(o.user_group_id) === String(pin.user_group_id)
            : String(o.group_id) === String(pin.group_id);
        return matchGroup && String(o.year) === bloomState.year;
    });
    if (groupObs) return parseInt(groupObs.bloom_months);
    return parseInt(pin.bloom_months_resolved) || 0;
}

export function initBloomSlider() {
    const currentYear = new Date().getFullYear();
    document.querySelectorAll('.bloom-year-btn[data-bloom-year]').forEach(btn => {
        const year = parseInt(btn.dataset.bloomYear);
        if (!isNaN(year) && year > currentYear) {
            btn.style.display = 'none';
        }
    });
}

export function setBloomAll() {
    stopBloomAutoplay();
    bloomState.enabled = false;
    document.getElementById('bloom-month-controls').style.display = 'none';
    document.getElementById('bloom-layer-filters').style.display = 'none';
    document.querySelectorAll('.bloom-year-btn').forEach(b => {
        b.style.background = 'var(--bg-app)';
        b.style.color = 'var(--text-main)';
    });
    document.getElementById('bloom-btn-all').className = 'c-btn c-btn--primary';
    window.renderMarkers();
}

export function setBloomYear(year) {
    bloomState.enabled = true;
    bloomState.year = String(year);
    document.getElementById('bloom-btn-all').className = 'c-btn c-btn--text';
    document.querySelectorAll('.bloom-year-btn').forEach(b => {
        const active = b.dataset.bloomYear === String(year);
        b.style.background = active ? 'var(--primary)' : 'var(--bg-app)';
        b.style.color = active ? 'white' : 'var(--text-main)';
    });
    document.getElementById('bloom-month-controls').style.display = 'flex';
    document.getElementById('bloom-layer-filters').style.display = 'flex';
    window.renderMarkers();
}

export function setBloomMonth(value) {
    bloomState.month = parseInt(value);
    document.getElementById('bloom-month-label').textContent = MONTH_NAMES[bloomState.month];
    document.getElementById('bloom-month-input').value = bloomState.month;
    updateBloomOpacity();
}

export function setBloomSpeed(ms) {
    bloomAutoplaySpeed = parseInt(ms);
    if (bloomAutoplayTimer) {
        stopBloomAutoplay();
        startBloomAutoplay();
    }
}

export function toggleBloomLayer(layer) {
    bloomLayerFilter[layer] = !bloomLayerFilter[layer];
    const btn = document.querySelector(`[data-bloom-layer="${layer}"]`);
    if (btn) {
        btn.style.background = bloomLayerFilter[layer] ? 'var(--primary)' : 'var(--bg-app)';
        btn.style.color = bloomLayerFilter[layer] ? 'white' : 'var(--text-muted)';
        btn.style.opacity = bloomLayerFilter[layer] ? '1' : '0.5';
    }
    window.renderMarkers();
}

export function toggleBloomAutoplay() {
    if (bloomAutoplayTimer) stopBloomAutoplay();
    else startBloomAutoplay();
}

function isValidTimePoint(year, month) {
    const now = new Date();
    const y = parseInt(year);
    if (y < now.getFullYear()) return true;
    if (y === now.getFullYear()) return month <= now.getMonth();
    return false;
}

function validMonthsForYear(year) {
    return Array.from({ length: 12 }, (_, i) => i).filter(m => isValidTimePoint(year, m));
}

function bloomAutoplayStep() {
    if (bloomState.year === 'std') {
        setBloomMonth((bloomState.month + 1) % 12);
        return;
    }
    const validMonths = validMonthsForYear(bloomState.year);
    const currentIdx = validMonths.indexOf(bloomState.month);
    const hasNextMonth = currentIdx >= 0 && currentIdx < validMonths.length - 1;

    if (hasNextMonth) {
        setBloomMonth(validMonths[currentIdx + 1]);
        return;
    }

    const currentYearIdx = BLOOM_YEARS.indexOf(parseInt(bloomState.year));
    let nextIdx = currentYearIdx + 1;
    while (nextIdx < BLOOM_YEARS.length && validMonthsForYear(BLOOM_YEARS[nextIdx]).length === 0) nextIdx++;
    if (nextIdx >= BLOOM_YEARS.length) {
        nextIdx = 0;
        while (nextIdx < BLOOM_YEARS.length && validMonthsForYear(BLOOM_YEARS[nextIdx]).length === 0) nextIdx++;
    }
    if (nextIdx < BLOOM_YEARS.length) {
        const nextYear = BLOOM_YEARS[nextIdx];
        const nextMonths = validMonthsForYear(nextYear);
        setBloomYear(nextYear);
        setBloomMonth(nextMonths[0]);
    }
}

function startBloomAutoplay() {
    document.getElementById('bloom-autoplay-btn').textContent = '⏸';
    bloomAutoplayTimer = setInterval(bloomAutoplayStep, bloomAutoplaySpeed);
    if (typeof MagicSounds !== 'undefined') MagicSounds.playGarden();
}

function stopBloomAutoplay() {
    clearInterval(bloomAutoplayTimer);
    bloomAutoplayTimer = null;
    document.getElementById('bloom-autoplay-btn').textContent = '▶';
    if (typeof MagicSounds !== 'undefined') MagicSounds.stopGarden();
}

// Bridge
window.setBloomAll = setBloomAll;
window.setBloomYear = setBloomYear;
window.setBloomMonth = setBloomMonth;
window.setBloomSpeed = setBloomSpeed;
window.toggleBloomLayer = toggleBloomLayer;
window.toggleBloomAutoplay = toggleBloomAutoplay;
window.loadBloomObservationsAll = loadBloomObservationsAll;
