import { describe, expect, test } from 'bun:test';
import { fetchBankQuestions, normalizeQuestions, summarizeQuestions } from '../js/bank.js';
import { rawQuestion } from './helpers.js';
describe('normalizeQuestions', () => {
    test('只移除與位置相符的選項前綴', () => {
        const { questions, warnings } = normalizeQuestions([
            rawQuestion(1, { options: ['A. AI 可以協助', 'B．API 呼叫', 'C、B 計畫', 'Data 治理'] })
        ]);
        expect(warnings).toEqual([]);
        expect(questions[0].options).toEqual(['AI 可以協助', 'API 呼叫', 'B 計畫', 'Data 治理']);
        expect(questions[0]).toMatchObject({ key: 'q0', id: 1, type: 'single', answer: 'B' });
    });
    test('依 type 或缺少選項判斷為簡答題', () => {
        const { questions } = normalizeQuestions([
            { id: 1, type: 'SAQ', question: '說明 RAG', answer: '檢索增強生成' },
            { id: 2, question: '沒有選項', answer: '答案' }
        ]);
        expect(questions.map(question => question.type)).toEqual(['saq', 'saq']);
        expect(questions[0].options).toEqual([]);
    });
    test('略過不合格的題目並回報原因，不產生替代內容', () => {
        const { questions, warnings } = normalizeQuestions([
            rawQuestion(1, { answer: 'E' }),
            rawQuestion(2, { question: '   ' }),
            rawQuestion(3, { type: 'multiple' }),
            rawQuestion(4, { options: ['A. 甲', 42] }),
            null,
            rawQuestion(5)
        ]);
        expect(questions.map(question => question.id)).toEqual([5]);
        expect(questions[0].key).toBe('q5');
        expect(warnings).toHaveLength(5);
    });
    test('答案大小寫與空白容錯', () => {
        const { questions } = normalizeQuestions([rawQuestion(1, { answer: ' c ' })]);
        expect(questions[0].answer).toBe('C');
    });
    test('非陣列直接拋出錯誤', () => {
        expect(() => normalizeQuestions({ questions: [] })).toThrow('題庫必須是陣列格式');
    });
});
test('summarizeQuestions 統計題型與解析', () => {
    const { questions } = normalizeQuestions([
        rawQuestion(1),
        rawQuestion(2, { explanation: '' }),
        { id: 3, type: 'SAQ', question: '簡答', answer: '答' }
    ]);
    expect(summarizeQuestions(questions)).toEqual({
        questionCount: 3,
        typeCounts: { single: 2, saq: 1 },
        explanationCount: 1
    });
});
describe('fetchBankQuestions 的錯誤訊息', () => {
    const respond = (body, status = 200) => async () => new Response(body, { status });
    test('網路失敗', async () => {
        await expect(fetchBankQuestions('x', async () => { throw new TypeError('Failed to fetch'); }))
            .rejects.toThrow('無法連線到伺服器');
    });
    test('HTTP 錯誤', async () => {
        await expect(fetchBankQuestions('x', respond('missing', 404))).rejects.toThrow('HTTP 404');
    });
    test('不是 JSON', async () => {
        await expect(fetchBankQuestions('x', respond('<html>'))).rejects.toThrow('不是有效的 JSON');
    });
    test('沒有可用題目', async () => {
        await expect(fetchBankQuestions('x', respond('[]'))).rejects.toThrow('沒有可用的題目');
    });
    test('成功時回傳正規化題目', async () => {
        const result = await fetchBankQuestions('x', respond(JSON.stringify([rawQuestion(7)])));
        expect(result.questions[0].id).toBe(7);
    });
});