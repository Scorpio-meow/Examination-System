import { isSafeBankFile } from './catalog.js';
import { letterIndex, normalizeQuestions } from './bank.js';
export const STORAGE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_RECORDS = 100;
export const SESSION_VERSION = 2;
export const STORAGE_KEYS = Object.freeze({
    progress: 'examProgress',
    config: 'examConfig',
    records: 'examRecords',
    lastResult: 'examLastResult',
    colorScheme: 'color-scheme'
});
export const COUNT_CHOICES = Object.freeze([10, 20, 50]);
export const DEFAULT_CONFIG = Object.freeze({
    bank: null,
    mode: 'exam',
    count: 'all',
    customCount: 20,
    shuffleQuestions: false,
    shuffleOptions: false,
    passingScore: 60,
    showExplanation: true,
    showTimer: true,
    shortcuts: true
});
const MODES = new Set(['exam', 'practice']);
const SELF_GRADES = new Set(['correct', 'wrong']);
const SESSION_ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;
const QUESTION_KEY_PATTERN = /^q\d{1,5}$/;
const MAX_QUESTIONS = 5000;
const MAX_ANSWER_LENGTH = 2000;
function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype;
}
function isIsoDate(value) {
    return typeof value === 'string' && value.length <= 40 && !Number.isNaN(Date.parse(value));
}
function isBoundedText(value, max, { allowEmpty = true } = {}) {
    return typeof value === 'string' && value.length <= max && (allowEmpty || value.trim() !== '');
}
function isIntInRange(value, min, max) {
    return Number.isInteger(value) && value >= min && value <= max;
}
export function createStore(backend, now = () => Date.now()) {
    function remove(key) {
        try {
            backend.removeItem(key);
        } catch {
        }
    }
    function read(key) {
        let raw;
        try {
            raw = backend.getItem(key);
        } catch {
            return null;
        }
        if (raw === null) return null;
        let record;
        try {
            record = JSON.parse(raw);
        } catch {
            remove(key);
            return null;
        }
        if (!record || typeof record !== 'object' || !('value' in record)) {
            return record;
        }
        const ts = Number(record._ts);
        const ttl = Number(record._ttl);
        if (ttl > 0 && now() - ts > ttl) {
            remove(key);
            return null;
        }
        return record.value;
    }
    function write(key, value, ttlMs = STORAGE_TTL_MS) {
        try {
            backend.setItem(key, JSON.stringify({ value, _ts: now(), _ttl: ttlMs }));
            return true;
        } catch {
            return false;
        }
    }
    function readRaw(key) {
        try {
            return backend.getItem(key);
        } catch {
            return null;
        }
    }
    function writeRaw(key, value) {
        try {
            backend.setItem(key, value);
            return true;
        } catch {
            return false;
        }
    }
    return { read, write, remove, readRaw, writeRaw };
}
function legacyCount(source) {
    const mapped = {};
    if (Number.isInteger(source.customDrawCount)) mapped.customCount = source.customDrawCount;
    const draw = source.drawQuestionCount;
    if (!Number.isInteger(draw) || draw < 0) return mapped;
    if (draw === 0) {
        mapped.count = 'all';
    } else if (COUNT_CHOICES.includes(draw)) {
        mapped.count = draw;
    } else {
        mapped.count = 'custom';
        mapped.customCount = draw;
    }
    return mapped;
}
export function sanitizeConfig(raw) {
    const source = isPlainObject(raw) ? { ...raw } : {};
    if (source.count === undefined && 'drawQuestionCount' in source) {
        Object.assign(source, legacyCount(source));
    }
    const pick = (key, valid) => (valid(source[key]) ? source[key] : DEFAULT_CONFIG[key]);
    const isBool = value => typeof value === 'boolean';
    return {
        bank: pick('bank', value => value === null || isSafeBankFile(value)),
        mode: pick('mode', value => MODES.has(value)),
        count: pick('count', value => value === 'all' || value === 'custom' || COUNT_CHOICES.includes(value)),
        customCount: pick('customCount', value => isIntInRange(value, 1, MAX_QUESTIONS)),
        shuffleQuestions: pick('shuffleQuestions', isBool),
        shuffleOptions: pick('shuffleOptions', isBool),
        passingScore: pick('passingScore', value => isIntInRange(value, 0, 100)),
        showExplanation: pick('showExplanation', isBool),
        showTimer: pick('showTimer', isBool),
        shortcuts: pick('shortcuts', isBool)
    };
}
function validateQuestion(question) {
    if (!isPlainObject(question) || !QUESTION_KEY_PATTERN.test(question.key)) return false;
    if (!(question.id === null || typeof question.id === 'number' || isBoundedText(question.id, 100))) return false;
    if (!isBoundedText(question.question, 5000, { allowEmpty: false })) return false;
    if (!isBoundedText(question.explanation, 10000)) return false;
    if (!Array.isArray(question.options)) return false;
    if (question.type === 'saq') {
        return question.options.length === 0 && isBoundedText(question.answer, 5000);
    }
    if (question.type !== 'single') return false;
    if (question.options.length < 2 || question.options.length > 10) return false;
    if (!question.options.every(option => isBoundedText(option, 2000, { allowEmpty: false }))) return false;
    const answerIndex = letterIndex(question.answer);
    return typeof question.answer === 'string' && question.answer.length === 1 &&
        answerIndex >= 0 && answerIndex < question.options.length;
}
function isValidAnswer(question, value) {
    if (typeof value !== 'string') return false;
    if (question.type === 'saq') return value.length <= MAX_ANSWER_LENGTH;
    const index = letterIndex(value);
    return value.length === 1 && index >= 0 && index < question.options.length;
}
function isKeyList(value, byKey) {
    return Array.isArray(value) && value.length <= byKey.size &&
        new Set(value).size === value.length && value.every(key => byKey.has(key));
}
export function validateSession(data) {
    if (!isPlainObject(data) || data.v !== SESSION_VERSION) return false;
    if (typeof data.id !== 'string' || !SESSION_ID_PATTERN.test(data.id)) return false;
    if (!isSafeBankFile(data.bankFile) || !isBoundedText(data.bankTitle, 200, { allowEmpty: false })) return false;
    if (!MODES.has(data.mode)) return false;
    if (data.label !== undefined && !isBoundedText(data.label, 50, { allowEmpty: false })) return false;
    if (!Array.isArray(data.questions) || data.questions.length === 0 || data.questions.length > MAX_QUESTIONS) return false;
    if (!data.questions.every(validateQuestion)) return false;
    const byKey = new Map(data.questions.map(question => [question.key, question]));
    if (byKey.size !== data.questions.length) return false;
    if (!isPlainObject(data.answers)) return false;
    for (const [key, value] of Object.entries(data.answers)) {
        const question = byKey.get(key);
        if (!question || !isValidAnswer(question, value)) return false;
    }
    if (!isKeyList(data.flags, byKey) || !isKeyList(data.revealed, byKey)) return false;
    if (!isPlainObject(data.selfGrades)) return false;
    for (const [key, grade] of Object.entries(data.selfGrades)) {
        const question = byKey.get(key);
        if (!question || question.type !== 'saq' || !SELF_GRADES.has(grade)) return false;
    }
    if (!isIntInRange(data.currentIndex, 0, data.questions.length - 1)) return false;
    if (!isIsoDate(data.startedAt)) return false;
    if (data.finishedAt !== undefined && !isIsoDate(data.finishedAt)) return false;
    if (typeof data.elapsedMs !== 'number' || !Number.isFinite(data.elapsedMs) || data.elapsedMs < 0) return false;
    return isIntInRange(data.passingScore, 0, 100);
}
export function migrateLegacyProgress(data, { titleFor, passingScore, createId }) {
    if (!isPlainObject(data) || data.v !== undefined) return null;
    if (!isSafeBankFile(data.questionBank) || !titleFor(data.questionBank)) return null;
    if (!Array.isArray(data.questions) || data.questions.length === 0 || data.questions.length > MAX_QUESTIONS) return null;
    if (!isPlainObject(data.userAnswers) || !isIntInRange(data.currentQuestionIndex, 0, MAX_QUESTIONS)) return null;
    if (!isIsoDate(data.examStartTime)) return null;
    let normalized;
    try {
        normalized = normalizeQuestions(data.questions);
    } catch {
        return null;
    }
    if (normalized.warnings.length > 0 || normalized.questions.length !== data.questions.length) return null;
    const answers = {};
    normalized.questions.forEach(question => {
        const value = data.userAnswers[String(question.id)];
        if (value !== undefined && isValidAnswer(question, value)) {
            answers[question.key] = value;
        }
    });
    const session = {
        v: SESSION_VERSION,
        id: createId(),
        bankFile: data.questionBank,
        bankTitle: titleFor(data.questionBank),
        mode: 'exam',
        questions: normalized.questions,
        answers,
        flags: [],
        revealed: [],
        selfGrades: {},
        currentIndex: data.currentQuestionIndex,
        startedAt: data.examStartTime,
        elapsedMs: 0,
        passingScore
    };
    return validateSession(session) ? session : null;
}
export function validateRecord(record) {
    if (!isPlainObject(record)) return false;
    if (!isIsoDate(record.date) || !isSafeBankFile(record.bankFile)) return false;
    if (record.bankLabel !== undefined && !isBoundedText(record.bankLabel, 200)) return false;
    if (typeof record.score !== 'number' || !Number.isFinite(record.score) || record.score < 0 || record.score > 100) return false;
    if (!isIntInRange(record.totalCount, 1, MAX_QUESTIONS) || !isIntInRange(record.correctCount, 0, record.totalCount)) return false;
    if (typeof record.isPassed !== 'boolean') return false;
    if (typeof record.duration !== 'number' || !Number.isFinite(record.duration) || record.duration < 0) return false;
    if (record.id !== undefined && !SESSION_ID_PATTERN.test(String(record.id))) return false;
    if (record.mode !== undefined && !MODES.has(record.mode)) return false;
    if (record.label !== undefined && !isBoundedText(record.label, 50, { allowEmpty: false })) return false;
    if (record.passingScore !== undefined && !isIntInRange(record.passingScore, 0, 100)) return false;
    for (const field of ['wrongCount', 'unansweredCount', 'pendingCount']) {
        if (record[field] !== undefined && !isIntInRange(record[field], 0, record.totalCount)) return false;
    }
    return true;
}
export function sanitizeRecords(data) {
    if (!Array.isArray(data)) return [];
    return data
        .filter(validateRecord)
        .map(record => (record.mode === undefined ? { ...record, mode: 'exam' } : record))
        .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
        .slice(0, MAX_RECORDS);
}