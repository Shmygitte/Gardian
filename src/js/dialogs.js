/**
 * Gardian – Custom Dialog System
 * Ersetzt native alert() und confirm() durch Theme-kompatible Modals.
 */

const _dialogQueue = [];
let _dialogActive = false;

function _createDialogEl() {
    const el = document.createElement('div');
    el.className = 'c-modal c-dialog';
    el.style.display = 'flex';
    el.style.zIndex = '9999';
    el.innerHTML = `
        <div class="c-card">
            <div class="c-modal__body c-dialog__body"></div>
            <div class="c-modal__footer">
                <span class="c-modal__spacer"></span>
                <button class="c-btn c-btn--text c-dialog__cancel" style="display:none;"></button>
                <button class="c-btn c-btn--primary c-dialog__ok"></button>
            </div>
        </div>`;
    return el;
}

function _showNextDialog() {
    if (_dialogQueue.length === 0) { _dialogActive = false; return; }
    _dialogActive = true;
    const { message, type, resolve, confirmLabel, cancelLabel, danger } = _dialogQueue.shift();

    const el = _createDialogEl();
    const body = el.querySelector('.c-dialog__body');
    const okBtn = el.querySelector('.c-dialog__ok');
    const cancelBtn = el.querySelector('.c-dialog__cancel');

    body.textContent = message;

    okBtn.textContent = confirmLabel || 'OK';
    if (danger) {
        okBtn.className = 'c-btn c-btn--danger c-dialog__ok';
    }

    function close(result) {
        el.classList.add('c-dialog--closing');
        setTimeout(() => {
            el.remove();
            resolve(result);
            _showNextDialog();
        }, 150);
    }

    if (type === 'confirm') {
        cancelBtn.style.display = '';
        cancelBtn.textContent = cancelLabel || 'Abbrechen';
        cancelBtn.onclick = () => close(false);
        // Backdrop-Klick = Abbrechen
        el.addEventListener('click', e => { if (e.target === el) close(false); });
    } else {
        // Alert: Backdrop-Klick = OK
        el.addEventListener('click', e => { if (e.target === el) close(undefined); });
    }

    okBtn.onclick = () => close(type === 'confirm' ? true : undefined);

    // Escape-Taste
    function onKey(e) {
        if (e.key === 'Escape') {
            e.stopPropagation();
            close(type === 'confirm' ? false : undefined);
            document.removeEventListener('keydown', onKey, true);
        }
    }
    document.addEventListener('keydown', onKey, true);

    document.body.appendChild(el);

    // Focus auf OK-Button (Accessibility)
    requestAnimationFrame(() => okBtn.focus());
}

/**
 * Zeigt eine Hinweis-Meldung (ersetzt alert()).
 * @param {string} message
 * @returns {Promise<void>}
 */
function customAlert(message) {
    return new Promise(resolve => {
        _dialogQueue.push({ message, type: 'alert', resolve });
        if (!_dialogActive) _showNextDialog();
    });
}

/**
 * Zeigt eine Bestätigungsfrage (ersetzt confirm()).
 * @param {string} message
 * @param {object} [opts] - { confirmLabel, cancelLabel, danger }
 * @returns {Promise<boolean>}
 */
function customConfirm(message, opts = {}) {
    return new Promise(resolve => {
        _dialogQueue.push({
            message,
            type: 'confirm',
            resolve,
            confirmLabel: opts.confirmLabel,
            cancelLabel: opts.cancelLabel,
            danger: opts.danger ?? false,
        });
        if (!_dialogActive) _showNextDialog();
    });
}
