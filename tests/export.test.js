import { describe, expect, test } from 'bun:test';
import { normalizeQuestions } from '../js/bank.js';
import { DEFAULT_CONFIG } from '../js/storage.js';
import { createSession, setAnswer } from '../js/session.js';
import { EXPORT_COLUMNS, buildExportRows, csvEscape, csvSanitize, exportFileName, toCsv, toJson } from '../js/export.js';
import { rawQuestion, seededRandom } from './helpers.js';
const { questions } = normalizeQuestions([
    rawQuestion(1, { question: '=HYPERLINK("http://evil")', answer: 'A' }),
    rawQuestion(2, { question: '含有 "引號", 逗號\n與換行', answer: 'B' }),
    { id: 3, type: 'SAQ', question: '簡答', answer: '答案' }
]);
const session = createSession({
    bank: { file: 'ERP Planner_Reference Question Types_202509_V06.json', title: 'ERP規劃師' },
    questions,
    config: DEFAULT_CONFIG,
    random: seededRandom(1),
    now: () => 0,
    createId: () => 's1'
});
setAnswer(session, session.questions[0], 'A');
setAnswer(session, session.questions[1], 'C');
setAnswer(session, session.questions[2], '不同的答案');
describe('CSV 防護', () => {
    test.each(['=SUM(A1)', '+1', '-1', '@cmd', ' =1', '\t=1'])('公式前置單引號：%s', value => {
        expect(csvSanitize(value).startsWith("'")).toBe(true);
    });
    test('一般文字不變', () => {
        expect(csvSanitize('正常文字')).toBe('正常文字');
    });
    test('含逗號、引號、換行時加上引號並跳脫', () => {
        expect(csvEscape('a "b", c')).toBe('"a ""b"", c"');
        expect(csvEscape('a\nb')).toBe('"a\nb"');
    });
});
test('匯出列包含結果文字與帶字母的選項', () => {
    const rows = buildExportRows(session, '2026-10-09T00:00:00.000Z');
    expect(rows.map(row => row['是否正確'])).toEqual(['是', '否', '待自評']);
    expect(rows[0]['選項']).toBe('A. 甲\nB. 乙\nC. 丙\nD. 丁');
    expect(rows[2]['類型']).toBe('簡答題');
    expect(Object.keys(rows[0])).toEqual([...EXPORT_COLUMNS]);
});
test('CSV 以 BOM 開頭、CRLF 分行並阻擋公式', () => {
    const csv = toCsv(buildExportRows(session, '2026-10-09T00:00:00.000Z'));
    expect(csv.startsWith('﻿編號,ID,')).toBe(true);
    expect(csv.split('\r\n')).toHaveLength(4);
    expect(csv).toContain(`"'=HYPERLINK(""http://evil"")"`);
});
test('JSON 匯出可被解析', () => {
    const rows = buildExportRows(session, 'now');
    expect(JSON.parse(toJson(rows))).toEqual(rows);
});
test('檔名使用題庫檔名的英數字', () => {
    const name = exportFileName(session, new Date(2026, 9, 9, 8, 5, 3), 'csv');
    expect(name).toBe('exam_result_erp-planner-reference-question-types-202509-v06_20261009_080503.csv');
});