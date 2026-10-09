import { describe, expect, test } from 'bun:test';
import {
    DEFAULT_CONFIG,
    MAX_RECORDS,
    createStore,
    migrateLegacyProgress,
    sanitizeConfig,
    sanitizeRecords,
    validateSession
} from '../js/storage.js';
import { normalizeQuestions } from '../js/bank.js';
import { createSession } from '../js/session.js';
import { memoryStorage, rawQuestion, seededRandom, sequentialIds } from './helpers.js';
const bank = { file: 'IPAS-AI-L12-A.json', title: 'L12 A 卷' };
const { questions } = normalizeQuestions([rawQuestion(1), rawQuestion(2), { id: 3, type: 'SAQ', question: '簡答', answer: '答案' }]);
function makeSession(overrides = {}) {
    const session = createSession({
        bank,
        questions,
        config: { ...DEFAULT_CONFIG, ...overrides },
        random: seededRandom(1),
        now: () => Date.parse('2026-10-09T08:00:00Z'),
        createId: sequentialIds()
    });
    return session;
}
describe('createStore', () => {
    test('寫入後可讀回，過期後清除', () => {
        let clock = 1000;
        const backend = memoryStorage();
        const store = createStore(backend, () => clock);
        expect(store.write('k', { a: 1 }, 500)).toBe(true);
        expect(store.read('k')).toEqual({ a: 1 });
        clock = 1600;
        expect(store.read('k')).toBeNull();
        expect(backend.getItem('k')).toBeNull();
    });
    test('與 v3 相同的 TTL 包裝格式', () => {
        const backend = memoryStorage();
        createStore(backend, () => 42).write('k', 'v', 7);
        expect(JSON.parse(backend.getItem('k'))).toEqual({ value: 'v', _ts: 42, _ttl: 7 });
    });
    test('損毀的 JSON 會被移除', () => {
        const backend = memoryStorage({ k: '{oops' });
        expect(createStore(backend).read('k')).toBeNull();
        expect(backend.getItem('k')).toBeNull();
    });
    test('儲存失敗（例如容量已滿）回傳 false', () => {
        const store = createStore({ getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); }, removeItem: () => { } });
        expect(store.write('k', 1)).toBe(false);
    });
});
describe('sanitizeConfig', () => {
    test('不合法欄位回到預設值', () => {
        expect(sanitizeConfig({ mode: 'hack', passingScore: 120, count: 30, shortcuts: 'yes', bank: '../x.json' }))
            .toEqual(DEFAULT_CONFIG);
    });
    test('保留合法欄位', () => {
        const config = sanitizeConfig({ mode: 'practice', count: 'custom', customCount: 37, passingScore: 70, bank: 'IPAS-AI-L12-A.json' });
        expect(config).toMatchObject({ mode: 'practice', count: 'custom', customCount: 37, passingScore: 70, bank: 'IPAS-AI-L12-A.json' });
    });
    test.each([
        [{ drawQuestionCount: 0 }, { count: 'all' }],
        [{ drawQuestionCount: 20, customDrawCount: 37 }, { count: 20, customCount: 37 }],
        [{ drawQuestionCount: 30, customDrawCount: 20 }, { count: 'custom', customCount: 30 }],
        [{ drawQuestionCount: 100 }, { count: 'custom', customCount: 100 }]
    ])('讀入 v3 題數設定 %o', (legacy, expected) => {
        expect(sanitizeConfig({ ...legacy, shuffleQuestions: true, passingScore: 80 }))
            .toMatchObject({ ...expected, shuffleQuestions: true, passingScore: 80 });
    });
    test('非物件輸入得到完整預設設定', () => {
        expect(sanitizeConfig(null)).toEqual(DEFAULT_CONFIG);
        expect(sanitizeConfig([1, 2])).toEqual(DEFAULT_CONFIG);
    });
});
describe('validateSession', () => {
    test('新建立的 session 合法', () => {
        expect(validateSession(makeSession())).toBe(true);
    });
    const tamper = [
        ['答案超出選項範圍', session => { session.answers.q0 = 'E'; }],
        ['不存在的題目鍵', session => { session.answers.q99 = 'A'; }],
        ['標記清單重複', session => { session.flags = ['q0', 'q0']; }],
        ['單選題自評', session => { session.selfGrades.q0 = 'correct'; }],
        ['自評值不合法', session => { session.selfGrades.q2 = 'maybe'; }],
        ['目前題號超出範圍', session => { session.currentIndex = 3; }],
        ['題目鍵重複', session => { session.questions[1].key = 'q0'; }],
        ['正確答案不在選項中', session => { session.questions[0].answer = 'F'; }],
        ['不安全的題庫檔名', session => { session.bankFile = '../app.js'; }],
        ['時間格式錯誤', session => { session.startedAt = 'yesterday'; }],
        ['負的作答時間', session => { session.elapsedMs = -1; }],
        ['版本不符', session => { session.v = 1; }],
        ['answers 不是一般物件', session => { session.answers = []; }]
    ];
    test.each(tamper)('拒絕：%s', (_, mutate) => {
        const session = makeSession();
        mutate(session);
        expect(validateSession(session)).toBe(false);
    });
});
describe('migrateLegacyProgress', () => {
    const legacy = {
        currentQuestionIndex: 1,
        userAnswers: { 1: 'A', 2: 'B' },
        examStartTime: '2026-10-08T01:02:03.000Z',
        questions: [
            { id: 1, question: '題目 1', options: ['A. 甲', 'B. 乙'], answer: 'B', explanation: '', type: 'single' },
            { id: 2, question: '題目 2', options: ['A. 甲', 'B. 乙'], answer: 'A', explanation: '', type: 'single' }
        ],
        questionBank: 'IPAS-AI-L12-A.json',
        timestamp: '2026-10-08T01:05:00.000Z'
    };
    const options = { titleFor: file => (file === 'IPAS-AI-L12-A.json' ? 'L12 A 卷' : null), passingScore: 60, createId: () => 'migrated-1' };
    test('依題目 id 轉換答案並保留位置與開始時間', () => {
        const session = migrateLegacyProgress(legacy, options);
        expect(session).toMatchObject({
            bankFile: 'IPAS-AI-L12-A.json',
            bankTitle: 'L12 A 卷',
            currentIndex: 1,
            answers: { q0: 'A', q1: 'B' },
            startedAt: '2026-10-08T01:02:03.000Z'
        });
        expect(session.questions[0].options).toEqual(['甲', '乙']);
        expect(validateSession(session)).toBe(true);
    });
    test('缺少開始時間或題庫時放棄轉換', () => {
        expect(migrateLegacyProgress({ ...legacy, examStartTime: null }, options)).toBeNull();
        expect(migrateLegacyProgress({ ...legacy, questionBank: 'unknown.json' }, options)).toBeNull();
    });
    test('新版資料不會被當成舊版轉換', () => {
        expect(migrateLegacyProgress(makeSession(), options)).toBeNull();
    });
});
describe('sanitizeRecords', () => {
    const record = (date, overrides = {}) => ({
        date, bankFile: 'IPAS-AI-L12-A.json', bankLabel: 'L12', score: 80, correctCount: 28, totalCount: 35,
        isPassed: true, duration: 600000, ...overrides
    });
    test('保留 v3 格式的紀錄並依日期排序', () => {
        const records = sanitizeRecords([record('2026-10-01T00:00:00Z'), record('2026-10-05T00:00:00Z')]);
        expect(records.map(item => item.date)).toEqual(['2026-10-05T00:00:00Z', '2026-10-01T00:00:00Z']);
    });
    test('剔除不合法的紀錄', () => {
        const records = sanitizeRecords([
            record('2026-10-01T00:00:00Z'),
            record('2026-10-02T00:00:00Z', { score: 120 }),
            record('2026-10-03T00:00:00Z', { correctCount: 40 }),
            record('2026-10-04T00:00:00Z', { bankFile: '../x.json' }),
            record('2026-10-05T00:00:00Z', { mode: 'cheat' }),
            'not a record'
        ]);
        expect(records).toHaveLength(1);
    });
    test(`最多保留 ${MAX_RECORDS} 筆`, () => {
        const many = Array.from({ length: MAX_RECORDS + 5 }, (_, index) => record(new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString()));
        expect(sanitizeRecords(many)).toHaveLength(MAX_RECORDS);
    });
    test('非陣列得到空清單', () => {
        expect(sanitizeRecords({})).toEqual([]);
    });
});