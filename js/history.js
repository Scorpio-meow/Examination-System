import { MAX_RECORDS } from './storage.js';
function newestFirst(a, b) {
    return Date.parse(b.date) - Date.parse(a.date);
}
export function isFullAttempt(record) {
    return record.label === undefined;
}
export function recordFromSession(session, summary) {
    const record = {
        id: session.id,
        date: session.finishedAt,
        bankFile: session.bankFile,
        bankLabel: session.bankTitle,
        mode: session.mode,
        score: summary.score,
        correctCount: summary.correct,
        totalCount: summary.total,
        wrongCount: summary.wrong,
        unansweredCount: summary.unanswered,
        pendingCount: summary.pending,
        duration: Math.round(session.elapsedMs),
        isPassed: summary.isPassed,
        passingScore: session.passingScore
    };
    if (session.label !== undefined) record.label = session.label;
    return record;
}
export function upsertRecord(records, record) {
    return [record, ...records.filter(existing => existing.id !== record.id)]
        .sort(newestFirst)
        .slice(0, MAX_RECORDS);
}
export function recordsForBank(records, bankFile) {
    return records.filter(record => record.bankFile === bankFile).sort(newestFirst);
}
export function bankStats(records, bankFile) {
    const attempts = recordsForBank(records, bankFile).filter(isFullAttempt);
    if (attempts.length === 0) return null;
    const best = attempts.reduce((top, record) => (record.score > top.score ? record : top));
    return { last: attempts[0], best, attempts: attempts.length };
}
export function previousAttempt(records, record) {
    return recordsForBank(records, record.bankFile)
        .filter(isFullAttempt)
        .find(candidate => candidate.id !== record.id && Date.parse(candidate.date) < Date.parse(record.date)) ?? null;
}
export function groupRecordsByBank(records) {
    const groups = new Map();
    [...records].sort(newestFirst).forEach(record => {
        if (!groups.has(record.bankFile)) groups.set(record.bankFile, []);
        groups.get(record.bankFile).push(record);
    });
    return [...groups].map(([bankFile, list]) => ({ bankFile, records: list }));
}