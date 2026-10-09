export function seededRandom(seed) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6D2B79F5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
export function sequentialIds(prefix = 'session') {
    let next = 0;
    return () => `${prefix}-${++next}`;
}
export function memoryStorage(initial = {}) {
    const data = new Map(Object.entries(initial));
    return {
        getItem: key => (data.has(key) ? data.get(key) : null),
        setItem: (key, value) => data.set(key, String(value)),
        removeItem: key => data.delete(key),
        dump: () => Object.fromEntries(data)
    };
}
export function rawQuestion(id, overrides = {}) {
    return {
        id,
        question: `題目 ${id}`,
        options: ['A. 甲', 'B. 乙', 'C. 丙', 'D. 丁'],
        answer: 'B',
        explanation: `解析 ${id}`,
        ...overrides
    };
}