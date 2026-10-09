import { optionLetter } from './bank.js';
import { questionStatus } from './session.js';
const RESULT_TEXT = Object.freeze({ correct: '是', wrong: '否', unanswered: '否', pending: '待自評' });
export const EXPORT_COLUMNS = Object.freeze(['編號', 'ID', '類型', '題目', '選項', '作答', '解答', '是否正確', '解釋', '題庫標籤', '匯出時間']);
export function buildExportRows(session, exportedAt) {
    return session.questions.map((question, index) => ({
        '編號': index + 1,
        'ID': question.id ?? '',
        '類型': question.type === 'saq' ? '簡答題' : '單選題',
        '題目': question.question,
        '選項': question.options.map((option, optionIndex) => `${optionLetter(optionIndex)}. ${option}`).join('\n'),
        '作答': session.answers[question.key] ?? '',
        '解答': question.answer,
        '是否正確': RESULT_TEXT[questionStatus(session, question)],
        '解釋': question.explanation,
        '題庫標籤': session.bankTitle,
        '匯出時間': exportedAt
    }));
}
export function csvSanitize(value) {
    const text = String(value);
    return /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
}
export function csvEscape(value) {
    const text = String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
export function toCsv(rows) {
    const lines = [
        EXPORT_COLUMNS.join(','),
        ...rows.map(row => EXPORT_COLUMNS.map(column => csvEscape(csvSanitize(row[column]))).join(','))
    ];
    return `﻿${lines.join('\r\n')}`;
}
export function toJson(rows) {
    return JSON.stringify(rows, null, 2);
}
function pad(number) {
    return String(number).padStart(2, '0');
}
export function exportFileName(session, date, extension) {
    const slug = session.bankFile.replace(/\.json$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
    return `exam_result_${slug}_${stamp}.${extension}`;
}
export function downloadText(text, fileName, mimeType) {
    const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.dispatchEvent(new MouseEvent('click', { bubbles: false, cancelable: true }));
    setTimeout(() => URL.revokeObjectURL(url), 0);
}