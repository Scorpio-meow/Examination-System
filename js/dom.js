const SVG_NS = 'http://www.w3.org/2000/svg';
export function $(selector, root = document) {
    return root.querySelector(selector);
}
export function $$(selector, root = document) {
    return [...root.querySelectorAll(selector)];
}
export function h(tag, props = {}, ...children) {
    const element = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
        if (value === undefined || value === null || value === false) continue;
        if (key === 'class') {
            element.className = value;
        } else if (key === 'text') {
            element.textContent = value;
        } else if (key === 'dataset') {
            Object.assign(element.dataset, value);
        } else if (key.startsWith('on') && typeof value === 'function') {
            element.addEventListener(key.slice(2).toLowerCase(), value);
        } else {
            element.setAttribute(key, value === true ? '' : String(value));
        }
    }
    element.append(...children.flat().filter(child => child !== null && child !== undefined && child !== false));
    return element;
}
export function svg(tag, attributes = {}) {
    const element = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attributes)) {
        element.setAttribute(key, String(value));
    }
    return element;
}
export function icon(name, className = 'icon') {
    const element = svg('svg', { class: className, 'aria-hidden': 'true', focusable: 'false' });
    element.append(svg('use', { href: `#i-${name}` }));
    return element;
}
export function announce(message) {
    const region = $('[data-announcer]');
    region.textContent = '';
    requestAnimationFrame(() => {
        region.textContent = message;
    });
}
export function formatClock(ms) {
    const total = Math.floor(ms / 1000);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    const pad = value => String(value).padStart(2, '0');
    return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}
export function formatDuration(ms) {
    const total = Math.round(ms / 1000);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    if (hours > 0) return `${hours} 小時 ${minutes} 分`;
    if (minutes > 0) return `${minutes} 分 ${seconds} 秒`;
    return `${seconds} 秒`;
}
const dateTimeFormat = new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeStyle: 'short' });
const shortDateFormat = new Intl.DateTimeFormat('zh-TW', { month: 'numeric', day: 'numeric' });
export function formatDateTime(iso) {
    return dateTimeFormat.format(new Date(iso));
}
export function formatShortDate(iso) {
    return shortDateFormat.format(new Date(iso));
}
export function isTextEntry(element) {
    if (!(element instanceof Element)) return false;
    if (element.isContentEditable || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') return true;
    return element.tagName === 'INPUT' && !['radio', 'checkbox', 'button', 'submit', 'reset'].includes(element.type);
}