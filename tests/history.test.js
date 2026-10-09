import { describe, expect, test } from 'bun:test';
import { bankStats, groupRecordsByBank, previousAttempt, upsertRecord } from '../js/history.js';
import { MAX_RECORDS } from '../js/storage.js';
const record = (id, date, score, overrides = {}) => ({
    id, date, score, bankFile: 'IPAS-AI-L12-A.json', bankLabel: 'L12', correctCount: 1, totalCount: 2,
    isPassed: score >= 60, duration: 1000, ...overrides
});
describe('upsertRecord', () => {
    test('同一個 id 會被取代', () => {
        const records = [record('a', '2026-10-01T00:00:00Z', 50)];
        const next = upsertRecord(records, record('a', '2026-10-01T00:00:00Z', 70));
        expect(next).toHaveLength(1);
        expect(next[0].score).toBe(70);
    });
    test('依日期由新到舊並限制筆數', () => {
        let records = [];
        for (let i = 0; i < MAX_RECORDS + 3; i++) {
            records = upsertRecord(records, record(`r${i}`, new Date(Date.UTC(2026, 0, 1, i)).toISOString(), 60));
        }
        expect(records).toHaveLength(MAX_RECORDS);
        expect(records[0].id).toBe(`r${MAX_RECORDS + 2}`);
    });
});
describe('bankStats 與 previousAttempt', () => {
    const records = [
        record('d', '2026-10-04T00:00:00Z', 100, { label: '錯題練習' }),
        record('c', '2026-10-03T00:00:00Z', 74),
        record('b', '2026-10-02T00:00:00Z', 86),
        record('a', '2026-10-01T00:00:00Z', 66),
        record('x', '2026-10-05T00:00:00Z', 90, { bankFile: 'Project_Management.json' })
    ];
    test('錯題重練不列入最近與最佳', () => {
        const stats = bankStats(records, 'IPAS-AI-L12-A.json');
        expect(stats.last.id).toBe('c');
        expect(stats.best.id).toBe('b');
        expect(stats.attempts).toBe(3);
    });
    test('沒有紀錄的題庫回傳 null', () => {
        expect(bankStats(records, 'Basic_Financial_Planning.json')).toBeNull();
    });
    test('上一次完整作答', () => {
        expect(previousAttempt(records, records[1]).id).toBe('b');
        expect(previousAttempt(records, records[3])).toBeNull();
    });
    test('依題庫分組，最近作答的排前面', () => {
        expect(groupRecordsByBank(records).map(group => group.bankFile)).toEqual(['Project_Management.json', 'IPAS-AI-L12-A.json']);
    });
});