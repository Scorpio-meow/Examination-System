import { $, $$, h, icon } from './dom.js';
const MAX_TOASTS = 3;
const TOAST_MS = 4000;
const openers = new WeakMap();
export function showModal(dialog) {
    if (dialog.open) return;
    openers.set(dialog, document.activeElement);
    dialog.showModal();
}
export function setupDialog(dialog, { lightDismiss }) {
    dialog.addEventListener('close', () => {
        const opener = openers.get(dialog);
        openers.delete(dialog);
        if (opener instanceof HTMLElement && opener.isConnected && (document.activeElement === document.body || document.activeElement === null)) {
            opener.focus();
        }
    });
    if (!lightDismiss) return;
    if ('closedBy' in HTMLDialogElement.prototype) {
        dialog.setAttribute('closedby', 'any');
        return;
    }
    dialog.addEventListener('click', event => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const inside = rect.top <= event.clientY && event.clientY <= rect.bottom && rect.left <= event.clientX && event.clientX <= rect.right;
        if (!inside) dialog.close();
    });
}
export function confirmDialog({ title, body, confirmLabel, cancelLabel, tone }) {
    const dialog = $('#confirm-dialog');
    $('#confirm-title', dialog).textContent = title;
    $('#confirm-body', dialog).replaceChildren(...[body].flat().map(text => h('p', { text })));
    const confirmButton = $('[data-confirm-ok]', dialog);
    confirmButton.textContent = confirmLabel;
    confirmButton.className = `btn ${tone === 'danger' ? 'btn--danger' : 'btn--primary'}`;
    $('[data-confirm-cancel]', dialog).textContent = cancelLabel;
    dialog.returnValue = '';
    return new Promise(resolve => {
        dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true });
        showModal(dialog);
    });
}
export function toast(message) {
    const region = $('[data-toasts]');
    const item = h('div', { class: 'toast' }, icon('check'), h('span', { text: message }));
    region.append(item);
    $$('.toast', region).slice(0, -MAX_TOASTS).forEach(old => old.remove());
    setTimeout(() => item.remove(), TOAST_MS);
}
export function setupMenu(root, { onSelect }) {
    const toggle = $('[aria-controls]', root);
    const panel = document.getElementById(toggle.getAttribute('aria-controls'));
    const items = () => $$('button', panel);
    function close({ restoreFocus }) {
        if (panel.hidden) return;
        panel.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
        if (restoreFocus) toggle.focus();
    }
    function open() {
        panel.hidden = false;
        toggle.setAttribute('aria-expanded', 'true');
        items()[0].focus();
    }
    toggle.addEventListener('click', () => {
        if (panel.hidden) {
            open();
        } else {
            close({ restoreFocus: false });
        }
    });
    panel.addEventListener('click', event => {
        const item = event.target.closest('button');
        if (!item) return;
        close({ restoreFocus: true });
        onSelect(item);
    });
    root.addEventListener('keydown', event => {
        if (panel.hidden) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            close({ restoreFocus: true });
            return;
        }
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        event.preventDefault();
        const list = items();
        const current = list.indexOf(document.activeElement);
        const step = event.key === 'ArrowDown' ? 1 : -1;
        list[(current + step + list.length) % list.length].focus();
    });
    root.addEventListener('focusout', event => {
        if (!root.contains(event.relatedTarget)) close({ restoreFocus: false });
    });
    document.addEventListener('pointerdown', event => {
        if (!root.contains(event.target)) close({ restoreFocus: false });
    });
    return { close };
}