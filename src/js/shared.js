/**
 * Gardian – Shared Functions (non-module)
 * Zentrale api() und doLogout() für alle Seiten.
 * Wird vor Inline-Scripts geladen.
 */

function api(action, extra = {}) {
    return fetch('backend/api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra })
    }).then(r => r.json());
}

async function doLogout() {
    await api('logout');
    location.href = 'login.html';
}
