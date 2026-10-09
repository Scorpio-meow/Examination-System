export const ROUTES = Object.freeze(['/', '/exam', '/result', '/history']);
export function currentPath() {
    const path = location.hash.replace(/^#/, '');
    return ROUTES.includes(path) ? path : '/';
}
export function createRouter(onRoute) {
    let rendered = null;
    function render() {
        const path = currentPath();
        if (path === rendered) return;
        rendered = path;
        onRoute(path);
    }
    function navigate(path, { replace, state }) {
        const url = `${location.pathname}${location.search}#${path}`;
        if (replace) {
            history.replaceState(state, '', url);
        } else {
            history.pushState(state, '', url);
        }
        render();
    }
    function back(path) {
        if (history.state && history.state.from === path) {
            history.back();
        } else {
            navigate(path, { replace: true, state: null });
        }
    }
    window.addEventListener('popstate', render);
    window.addEventListener('hashchange', render);
    return { navigate, back, render, get path() { return rendered; } };
}