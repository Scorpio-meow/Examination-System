const SAQ_TYPES = new Set(['saq', 'sqa', 'short']);
const SINGLE_TYPE = 'single';
const OPTION_LETTERS = 'ABCDEFGHIJ';
export const MAX_OPTIONS = OPTION_LETTERS.length;
export function optionLetter(index) {
    return OPTION_LETTERS[index];
}
export function letterIndex(letter) {
    return OPTION_LETTERS.indexOf(letter);
}
function resolveType(raw) {
    const declared = typeof raw.type === 'string' ? raw.type.trim().toLowerCase() : '';
    if (SAQ_TYPES.has(declared)) return 'saq';
    if (declared && declared !== SINGLE_TYPE) return null;
    return Array.isArray(raw.options) && raw.options.length > 0 ? 'single' : 'saq';
}
// 只移除與選項位置相符的字母前綴（例如第 2 個選項的「B.」），避免把以 A–D 開頭的內文誤刪。
function stripOptionPrefix(text, index) {
    const prefix = new RegExp(`^${optionLetter(index)}\\s*[.．、:：)）]\\s*`);
    return text.replace(prefix, '').trim();
}
function asText(value) {
    return typeof value === 'string' ? value.trim() : '';
}
export function normalizeQuestions(rawQuestions) {
    if (!Array.isArray(rawQuestions)) {
        throw new TypeError('題庫必須是陣列格式');
    }
    const questions = [];
    const warnings = [];
    rawQuestions.forEach((raw, index) => {
        const label = `第 ${index + 1} 題`;
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
            warnings.push(`${label}：格式不是物件`);
            return;
        }
        const type = resolveType(raw);
        if (!type) {
            warnings.push(`${label}：不支援的題型「${raw.type}」`);
            return;
        }
        const question = asText(raw.question);
        if (!question) {
            warnings.push(`${label}：缺少題目內容`);
            return;
        }
        const base = {
            key: `q${index}`,
            id: typeof raw.id === 'number' || typeof raw.id === 'string' ? raw.id : null,
            type,
            question,
            explanation: asText(raw.explanation)
        };
        if (type === 'saq') {
            questions.push({ ...base, options: [], answer: asText(raw.answer) });
            return;
        }
        if (raw.options.length > MAX_OPTIONS || raw.options.some(option => typeof option !== 'string' || !option.trim())) {
            warnings.push(`${label}：選項格式不正確`);
            return;
        }
        const options = raw.options.map((option, optionIndex) => stripOptionPrefix(option.trim(), optionIndex));
        const answer = asText(raw.answer).toUpperCase();
        const answerIndex = letterIndex(answer);
        if (answer.length !== 1 || answerIndex < 0 || answerIndex >= options.length) {
            warnings.push(`${label}：正確答案「${raw.answer}」不在選項範圍內`);
            return;
        }
        questions.push({ ...base, options, answer });
    });
    return { questions, warnings };
}
export function summarizeQuestions(questions) {
    return {
        questionCount: questions.length,
        typeCounts: {
            single: questions.filter(question => question.type === 'single').length,
            saq: questions.filter(question => question.type === 'saq').length
        },
        explanationCount: questions.filter(question => question.explanation).length
    };
}
export async function fetchBankQuestions(url, fetchImpl) {
    const response = await fetchImpl(url).catch(() => {
        throw new Error('無法連線到伺服器，請檢查網路連線');
    });
    if (!response.ok) {
        throw new Error(`伺服器回應 HTTP ${response.status}`);
    }
    const raw = await response.json().catch(() => {
        throw new Error('題庫檔案不是有效的 JSON');
    });
    const result = normalizeQuestions(raw);
    if (result.questions.length === 0) {
        throw new Error('題庫中沒有可用的題目');
    }
    return result;
}