import { describe, expect, test } from 'bun:test';
import { normalizeQuestions } from '../js/bank.js';
import { DEFAULT_CONFIG } from '../js/storage.js';
import {
    createDrillSession,
    createSession,
    firstUnansweredIndex,
    normalizeShortAnswer,
    questionStatus,
    resolveCount,
    reveal,
    setAnswer,
    setSelfGrade,
    shortAnswerGradeSource,
    summarize,
    toggleFlag
} from '../js/session.js';
import { rawQuestion, seededRandom, sequentialIds } from './helpers.js';
const bank = { file: 'IPAS-AI-L12-A.json', title: 'L12 A 卷' };
const { questions } = normalizeQuestions([
    ...Array.from({ length: 10 }, (_, index) => rawQuestion(index + 1, { options: ['A. 甲', 'B. 乙', 'C. 丙', 'D. 丁'], answer: 'ABCD'[index % 4] })),
    { id: 11, type: 'SAQ', question: '利率為多少？', answer: '6 %' }
]);
function make(config = {}, seed = 7) {
    return createSession({
        bank,
        questions,
        config: { ...DEFAULT_CONFIG, ...config },
        random: seededRandom(seed),
        now: () => Date.parse('2026-10-09T08:00:00Z'),
        createId: sequentialIds()
    });
}
describe('resolveCount', () => {
    test.each([
        [{ count: 'all' }, 11],
        [{ count: 10 }, 10],
        [{ count: 50 }, 11],
        [{ count: 'custom', customCount: 3 }, 3],
        [{ count: 'custom', customCount: 99 }, 11]
    ])('%o → %i 題', (config, expected) => expect(resolveCount(config, 11)).toBe(expected));
});
describe('createSession', () => {
    test('抽題後維持題庫原順序', () => {
        const session = make({ count: 'custom', customCount: 4 });
        const positions = session.questions.map(question => questions.findIndex(original => original.key === question.key));
        expect(positions).toEqual([...positions].sort((a, b) => a - b));
        expect(session.questions).toHaveLength(4);
    });
    test('隨機選項後正確答案仍指向同一個選項內容', () => {
        const session = make({ shuffleOptions: true }, 3);
        session.questions.filter(question => question.type === 'single').forEach(question => {
            const original = questions.find(item => item.key === question.key);
            const originalCorrect = original.options['ABCD'.indexOf(original.answer)];
            expect(question.options['ABCD'.indexOf(question.answer)]).toBe(originalCorrect);
            expect([...question.options].sort()).toEqual([...original.options].sort());
        });
        expect(session.questions.some((question, index) => question.answer !== questions[index].answer)).toBe(true);
    });
    test('不會改動原始題目', () => {
        const snapshot = JSON.stringify(questions);
        make({ shuffleOptions: true, shuffleQuestions: true });
        expect(JSON.stringify(questions)).toBe(snapshot);
    });
    test('快照當時的及格分數與模式', () => {
        expect(make({ mode: 'practice', passingScore: 75 })).toMatchObject({ mode: 'practice', passingScore: 75, currentIndex: 0, elapsedMs: 0 });
    });
});
describe('作答與批改', () => {
    test('單選題對錯與未答', () => {
        const session = make();
        setAnswer(session, session.questions[0], 'A');
        setAnswer(session, session.questions[1], 'C');
        expect(questionStatus(session, session.questions[0])).toBe('correct');
        expect(questionStatus(session, session.questions[1])).toBe('wrong');
        expect(questionStatus(session, session.questions[2])).toBe('unanswered');
        expect(firstUnansweredIndex(session)).toBe(2);
    });
    test('簡答題寬鬆比對：全形、空白、大小寫與句尾標點', () => {
        expect(normalizeShortAnswer(' ６ ％。')).toBe(normalizeShortAnswer('6%'));
        expect(normalizeShortAnswer('6.5%')).not.toBe(normalizeShortAnswer('65%'));
        const session = make();
        const saq = session.questions.at(-1);
        setAnswer(session, saq, '６％');
        expect(questionStatus(session, saq)).toBe('correct');
        expect(shortAnswerGradeSource(session, saq)).toBe('auto');
    });
    test('簡答題比對不符時待自評，自評可覆寫，改答案會清除自評', () => {
        const session = make();
        const saq = session.questions.at(-1);
        setAnswer(session, saq, '大約六趴');
        expect(questionStatus(session, saq)).toBe('pending');
        setSelfGrade(session, saq.key, 'correct');
        expect(questionStatus(session, saq)).toBe('correct');
        expect(shortAnswerGradeSource(session, saq)).toBe('self');
        setAnswer(session, saq, '六趴');
        expect(questionStatus(session, saq)).toBe('pending');
        setAnswer(session, saq, '   ');
        expect(questionStatus(session, saq)).toBe('unanswered');
    });
    test('練習模式顯示對錯後鎖定答案', () => {
        const session = make({ mode: 'practice' });
        const question = session.questions[0];
        expect(setAnswer(session, question, 'C')).toBe(true);
        reveal(session, question.key);
        expect(setAnswer(session, question, 'A')).toBe(false);
        expect(session.answers[question.key]).toBe('C');
    });
    test('模擬考可以改答案', () => {
        const session = make();
        reveal(session, session.questions[0].key);
        setAnswer(session, session.questions[0], 'C');
        expect(setAnswer(session, session.questions[0], 'A')).toBe(true);
    });
    test('標記切換', () => {
        const session = make();
        expect(toggleFlag(session, 'q1')).toBe(true);
        expect(session.flags).toEqual(['q1']);
        expect(toggleFlag(session, 'q1')).toBe(false);
        expect(session.flags).toEqual([]);
    });
    test('summarize 計算分數與及格', () => {
        const session = make({ passingScore: 60 });
        session.questions.slice(0, 7).forEach(question => setAnswer(session, question, question.answer));
        setAnswer(session, session.questions[7], session.questions[7].answer === 'A' ? 'B' : 'A');
        toggleFlag(session, session.questions[8].key);
        const summary = summarize(session);
        expect(summary).toMatchObject({ total: 11, correct: 7, wrong: 1, unanswered: 3, pending: 0, answered: 8, flagged: 1, score: 64, isPassed: true });
        expect(summary.statuses.get(session.questions[7].key)).toBe('wrong');
    });
});
test('錯題重練只包含指定題目並使用練習模式', () => {
    const source = make({ mode: 'exam' });
    const drill = createDrillSession({
        source,
        keys: [source.questions[4].key, source.questions[1].key],
        label: '錯題練習',
        now: () => Date.parse('2026-10-09T09:00:00Z'),
        createId: () => 'drill-1'
    });
    expect(drill.questions.map(question => question.key)).toEqual([source.questions[1].key, source.questions[4].key]);
    expect(drill).toMatchObject({ mode: 'practice', label: '錯題練習', answers: {}, id: 'drill-1', bankFile: bank.file });
});