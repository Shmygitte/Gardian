/**
 * Gardian - Zentraler API-Client
 * Einziger Ort für alle Backend-Aufrufe.
 */

const API_URL = 'backend/api.php';

export async function api(action, extra = {}) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra })
    });
    return res.json();
}

export async function apiUpload(formData) {
    const res = await fetch(API_URL, {
        method: 'POST',
        body: formData
    });
    return res.json();
}

// Bridge für Nicht-Module (z.B. inline onclick in tabelle.php/kalender.php)
window._api = api;
window._apiUpload = apiUpload;
