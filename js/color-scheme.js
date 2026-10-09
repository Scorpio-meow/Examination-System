try {
    const scheme = localStorage.getItem('color-scheme');
    if (scheme === 'light' || scheme === 'dark') {
        document.querySelector('meta[name="color-scheme"]').content = scheme;
    }
} catch { }