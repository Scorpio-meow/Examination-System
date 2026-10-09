import { STORAGE_KEYS } from './storage.js';
const darkQuery = matchMedia('(prefers-color-scheme: dark)');
let resetScheme = null;
export function resetColorScheme() {
    resetScheme();
}
function schemeMeta() {
    return document.querySelector('meta[name="color-scheme"]');
}
function systemScheme() {
    return darkQuery.matches ? 'dark' : 'light';
}
function renderedScheme() {
    const content = schemeMeta().content;
    return content === 'light' || content === 'dark' ? content : systemScheme();
}
function syncThemeColor(themeMetas) {
    const pinned = schemeMeta().content === 'light' || schemeMeta().content === 'dark';
    const surface = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim();
    themeMetas.forEach(meta => {
        meta.content = pinned ? surface : meta.dataset.systemColor;
    });
}
function apply(scheme, themeMetas) {
    schemeMeta().content = scheme;
    syncThemeColor(themeMetas);
}
export function setupColorScheme(store, toggleButton) {
    const themeMetas = [...document.querySelectorAll('meta[name="theme-color"]')];
    themeMetas.forEach(meta => {
        meta.dataset.systemColor = meta.content;
    });
    syncThemeColor(themeMetas);
    resetScheme = () => apply('light dark', themeMetas);
    toggleButton.addEventListener('click', () => {
        const target = renderedScheme() === 'dark' ? 'light' : 'dark';
        if (target === systemScheme()) {
            store.remove(STORAGE_KEYS.colorScheme);
            apply('light dark', themeMetas);
        } else {
            store.writeRaw(STORAGE_KEYS.colorScheme, target);
            apply(target, themeMetas);
        }
    });
    darkQuery.addEventListener('change', () => syncThemeColor(themeMetas));
    window.addEventListener('storage', event => {
        if (event.key !== STORAGE_KEYS.colorScheme) return;
        apply(event.newValue === 'light' || event.newValue === 'dark' ? event.newValue : 'light dark', themeMetas);
    });
}