import { letterIndex, optionLetter } from './bank.js';
import { SESSION_VERSION } from './storage.js';
export function shuffleInPlace(items, random) {
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
}
export function resolveCount(config, available) {
    if (config.count === 'all') return available;
    if (config.count === 'custom') return Math.min(config.customCount, available);
    return Math.min(config.count, available);
}
function cloneQuestion(question) {
    return { ...question, options: [...question.options] };
}
function shuffleQuestionOptions(question, random) {
    if (question.type !== 'single') return question;
    const order = shuffleInPlace(question.options.map((_, index) => index), random);
    return {
        ...question,
        options: order.map(index => question.options[index]),
        answer: optionLetter(order.indexOf(letterIndex(question.answer)))
    };
}
function baseSession({ bankFile, bankTitle, mode, questions, passingScore, now, createId }) {
    return {
        v: SESSION_VERSION,
        id: createId(),
        bankFile,
        bankTitle,
        mode,
        questions,
        answers: {},
        flags: [],
        revealed: [],
        selfGrades: {},
        currentIndex: 0,
        startedAt: new Date(now()).toISOString(),
        elapsedMs: 0,
        passingScore
    };
}
export function createSession({ bank, questions, config, random, now, createId }) {
    const count = resolveCount(config, questions.length);
    let picked = questions.map(cloneQuestion);
    if (count < picked.length) {
        const chosen = new Set(shuffleInPlace(picked.map((_, index) => index), random).slice(0, count));
        picked = picked.filter((_, index) => chosen.has(index));
    }
    if (config.shuffleQuestions) shuffleInPlace(picked, random);
    if (config.shuffleOptions) picked = picked.map(question => shuffleQuestionOptions(question, random));
    return baseSession({
        bankFile: bank.file,
        bankTitle: bank.title,
        mode: config.mode,
        questions: picked,
        passingScore: config.passingScore,
        now,
        createId
    });
}
export function createDrillSession({ source, keys, label, now, createId }) {
    const wanted = new Set(keys);
    const session = baseSession({
        bankFile: source.bankFile,
        bankTitle: source.bankTitle,
        mode: 'practice',
        questions: source.questions.filter(question => wanted.has(question.key)).map(cloneQuestion),
        passingScore: source.passingScore,
        now,
        createId
    });
    session.label = label;
    return session;
}
export function isAnswered(question, value) {
    if (typeof value !== 'string') return false;
    return question.type === 'saq' ? value.trim() !== '' : value !== '';
}
export function isRevealed(session, key) {
    return session.revealed.includes(key);
}
export function isFlagged(session, key) {
    return session.flags.includes(key);
}
export function setAnswer(session, question, value) {
    if (session.mode === 'practice' && isRevealed(session, question.key)) return false;
    if (question.type === 'saq') {
        delete session.selfGrades[question.key];
        if (value.trim() === '') {
            delete session.answers[question.key];
            return true;
        }
    }
    session.answers[question.key] = value;
    return true;
}
export function toggleFlag(session, key) {
    if (isFlagged(session, key)) {
        session.flags = session.flags.filter(flagged => flagged !== key);
        return false;
    }
    session.flags = [...session.flags, key];
    return true;
}
export function reveal(session, key) {
    if (!isRevealed(session, key)) session.revealed = [...session.revealed, key];
}
export function setSelfGrade(session, key, grade) {
    if (grade === null) {
        delete session.selfGrades[key];
    } else {
        session.selfGrades[key] = grade;
    }
}
export function normalizeShortAnswer(text) {
    return text.normalize('NFKC').toLowerCase().replace(/\s+/g, '').replace(/[。.!?]+$/u, '');
}
function shortAnswerMatches(question, value) {
    return question.answer !== '' && normalizeShortAnswer(value) === normalizeShortAnswer(question.answer);
}
export function questionStatus(session, question) {
    const value = session.answers[question.key];
    if (!isAnswered(question, value)) return 'unanswered';
    if (question.type === 'single') return value === question.answer ? 'correct' : 'wrong';
    const grade = session.selfGrades[question.key];
    if (grade) return grade;
    return shortAnswerMatches(question, value) ? 'correct' : 'pending';
}
export function shortAnswerGradeSource(session, question) {
    if (question.type !== 'saq') return null;
    if (session.selfGrades[question.key]) return 'self';
    const value = session.answers[question.key];
    return isAnswered(question, value) && shortAnswerMatches(question, value) ? 'auto' : null;
}
export function summarize(session) {
    const counts = { correct: 0, wrong: 0, unanswered: 0, pending: 0 };
    const statuses = new Map();
    session.questions.forEach(question => {
        const status = questionStatus(session, question);
        counts[status] += 1;
        statuses.set(question.key, status);
    });
    const total = session.questions.length;
    const score = Math.round((counts.correct / total) * 100);
    return {
        total,
        ...counts,
        answered: total - counts.unanswered,
        flagged: session.flags.length,
        score,
        isPassed: score >= session.passingScore,
        statuses
    };
}
export function firstUnansweredIndex(session) {
    return session.questions.findIndex(question => !isAnswered(question, session.answers[question.key]));
}