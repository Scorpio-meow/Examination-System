import { $, $$, h, icon, formatDateTime, formatDuration } from '../dom.js';
import { optionLetter } from '../bank.js';
import { setSelfGrade, shortAnswerGradeSource, summarize } from '../session.js';
import { buildExportRows, downloadText, exportFileName, toCsv, toJson } from '../export.js';
import { previousAttempt } from '../history.js';
import { setupMenu, toast } from '../ui.js';
const PAGE_SIZE = 50;
const RING_RADIUS = 50;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const MODE_LABELS = Object.freeze({ exam: '模擬考', practice: '練習' });
const STATUS_INFO = Object.freeze({
    correct: { label: '正確', tag: 'tag tag--ok', icon: 'check' },
    wrong: { label: '錯誤', tag: 'tag tag--bad', icon: 'x' },
    unanswered: { label: '未作答', tag: 'tag tag--neutral', icon: 'minus' },
    pending: { label: '待自評', tag: 'tag', icon: 'info' }
});
const FILTERS = Object.freeze([
    { value: 'wrong', label: '錯題', empty: '沒有答錯的題目。' },
    { value: 'unanswered', label: '未答', empty: '每一題都有作答。' },
    { value: 'pending', label: '待自評', empty: '沒有需要自評的簡答題。' },
    { value: 'flagged', label: '標記', empty: '這次沒有標記任何題目。' },
    { value: 'all', label: '全部', empty: '沒有題目。' }
]);
const EXPORT_TYPES = Object.freeze({
    csv: { build: toCsv, mime: 'text/csv;charset=utf-8' },
    json: { build: toJson, mime: 'application/json;charset=utf-8' }
});
export function createResultView(ctx) {
    const root = $('[data-view="result"]');
    const summaryCard = $('[data-summary]', root);
    const list = $('[data-review-list]', root);
    const filtersHost = $('[data-review-filters]', root);
    const moreWrap = $('[data-review-more]', root);
    const moreButton = $('[data-review-more-button]', root);
    const emptyText = $('[data-review-empty]', root);
    const toggleAll = $('[data-review-toggle-all]', root);
    let session = null;
    let summary = null;
    let filter = 'wrong';
    let keys = [];
    let shown = 0;
    const menu = setupMenu($('[data-export-menu]', root), { onSelect: item => exportAs(item.dataset.export) });
    function matches(question, value) {
        const status = summary.statuses.get(question.key);
        if (value === 'all') return true;
        if (value === 'flagged') return session.flags.includes(question.key);
        return status === value;
    }
    function availableFilters() {
        return FILTERS.filter(item => item.value !== 'pending' || summary.pending > 0);
    }
    function defaultFilter() {
        if (summary.wrong > 0) return 'wrong';
        if (summary.pending > 0) return 'pending';
        if (summary.unanswered > 0) return 'unanswered';
        return 'all';
    }
    function renderRing() {
        const length = (summary.score / 100) * RING_CIRCUMFERENCE;
        $('[data-ring-value]', root).setAttribute('stroke-dasharray', `${length} ${RING_CIRCUMFERENCE}`);
        const angle = (session.passingScore / 100) * 2 * Math.PI;
        const line = $('[data-ring-threshold]', root);
        line.setAttribute('x1', String(60 + 57 * Math.cos(angle)));
        line.setAttribute('y1', String(60 + 57 * Math.sin(angle)));
        line.setAttribute('x2', String(60 + 43 * Math.cos(angle)));
        line.setAttribute('y2', String(60 + 43 * Math.sin(angle)));
        $('[data-score]', root).textContent = String(summary.score);
        $('[data-score-sub]', root).textContent = `分 · 及格 ${session.passingScore}`;
    }
    function currentRecord() {
        return ctx.records.find(record => record.id === session.id);
    }
    function renderVerdict() {
        const record = currentRecord();
        const previous = record && session.label === undefined ? previousAttempt(ctx.records, record) : null;
        const badges = [h('span', { class: `badge ${summary.isPassed ? 'badge--ok' : 'badge--bad'}` }, icon(summary.isPassed ? 'check' : 'x'), summary.isPassed ? '通過' : '未通過')];
        if (previous) {
            const diff = summary.score - previous.score;
            const text = diff === 0 ? '與上次同分' : `比上次 ${diff > 0 ? '+' : '−'}${Math.abs(diff)} 分`;
            badges.push(h('span', { class: 'badge badge--neutral', text }));
        }
        $('[data-verdict]', root).replaceChildren(...badges);
        const duration = `用時 ${formatDuration(session.elapsedMs)}${previous ? `（上次 ${formatDuration(previous.duration)}）` : ''}`;
        const perQuestion = `平均每題 ${formatDuration(session.elapsedMs / summary.total)}`;
        $('[data-summary-meta]', root).textContent = `${duration} · ${perQuestion}`;
    }
    function renderKpis() {
        const items = [
            ['correct', '正確', summary.correct],
            ['wrong', '錯誤', summary.wrong],
            ['unanswered', '未答', summary.unanswered]
        ];
        if (summary.pending > 0) items.push(['pending', '待自評', summary.pending]);
        $('[data-kpis]', root).replaceChildren(...items.map(([status, label, value]) => h('div', { class: `kpi kpi--${status}` },
            h('dt', { class: 'kpi__label' }, icon(STATUS_INFO[status].icon), label),
            h('dd', { class: 'kpi__value', text: String(value) }))));
    }
    function renderSummary() {
        summary = summarize(session);
        summaryCard.classList.toggle('is-passed', summary.isPassed);
        $('[data-result-bank]', root).textContent = session.bankTitle;
        $('[data-result-meta]', root).textContent = [MODE_LABELS[session.mode], session.label, `${summary.total} 題`, formatDateTime(session.finishedAt)].filter(Boolean).join(' · ');
        renderRing();
        renderVerdict();
        renderKpis();
        const pendingNote = $('[data-pending-note]', root);
        pendingNote.hidden = summary.pending === 0;
        $('[data-pending-text]', root).textContent = `有 ${summary.pending} 題簡答題和參考答案不完全相同，請自評，分數會立即更新。`;
        const drill = $('[data-drill]', root);
        drill.disabled = summary.wrong === 0;
        $('[data-drill-label]', root).textContent = summary.wrong === 0 ? '沒有錯題' : `重練錯題（${summary.wrong}）`;
        $('[data-retake]', root).textContent = session.label === undefined ? '重新考試' : '再練一次';
        document.title = `${summary.score} 分 · ${session.bankTitle} · 考試系統`;
    }
    function renderFilters() {
        if (!availableFilters().some(item => item.value === filter)) filter = 'all';
        filtersHost.replaceChildren(...availableFilters().map(item => {
            const count = session.questions.filter(question => matches(question, item.value)).length;
            const input = h('input', { class: 'sr-input', type: 'radio', name: 'review-filter', value: item.value });
            input.checked = item.value === filter;
            return h('label', { class: 'segmented__item' }, input,
                h('span', { class: 'segmented__label' }, item.label, h('span', { class: 'segmented__count', text: String(count) })));
        }));
    }
    function statusTag(status) {
        const info = STATUS_INFO[status];
        return h('span', { class: info.tag, dataset: { statusTag: '' } }, icon(info.icon), info.label);
    }
    function optionList(question) {
        const chosen = session.answers[question.key];
        return h('ol', { class: 'review-options' }, question.options.map((text, index) => {
            const letter = optionLetter(index);
            const isCorrect = letter === question.answer;
            const isChosen = letter === chosen;
            const marks = [];
            if (isCorrect) marks.push(icon('check'), isChosen ? '正確答案・你的答案' : '正確答案');
            if (!isCorrect && isChosen) marks.push(icon('x'), '你的答案');
            return h('li', { class: `review-option${isCorrect ? ' is-correct' : ''}${!isCorrect && isChosen ? ' is-wrong' : ''}` },
                h('span', { class: 'option__key', text: letter }),
                h('span', { class: 'option__text', text }),
                marks.length ? h('span', { class: 'option__mark' }, ...marks) : null);
        }));
    }
    function saqBlock(question, item) {
        const answer = session.answers[question.key];
        const wrap = h('div', { class: 'saq-compare' },
            h('div', { class: 'saq-compare__box' }, h('h3', { class: 'saq-compare__title', text: '你的答案' }), h('p', { class: 'saq-compare__text', text: answer && answer.trim() ? answer : '（未作答）' })),
            h('div', { class: 'saq-compare__box' }, h('h3', { class: 'saq-compare__title', text: '參考答案' }), h('p', { class: 'saq-compare__text', text: question.answer || '題庫沒有提供參考答案' })));
        if (!answer || !answer.trim()) return [wrap];
        const grade = session.selfGrades[question.key];
        const source = shortAnswerGradeSource(session, question);
        const note = source === 'auto' ? h('p', { class: 'field__hint', text: '你的答案與參考答案相符，已自動判定為正確；若判定有誤可以自行調整。' }) : null;
        const button = (value, label, iconName) => {
            const element = h('button', { class: 'btn btn--sm', type: 'button', 'aria-pressed': String(grade === value), dataset: { grade: value } }, icon(iconName), label);
            element.addEventListener('click', () => {
                setSelfGrade(session, question.key, grade === value ? null : value);
                ctx.updateResult(session);
                renderSummary();
                renderFilters();
                refreshItem(item, question);
                $(`[data-grade="${value}"]`, item).focus();
            });
            return element;
        };
        return [wrap, note, h('div', { class: 'self-grade', role: 'group', 'aria-label': '自評' },
            h('span', { class: 'self-grade__prompt', text: '自評：' }),
            button('correct', '我答對了', 'check'),
            button('wrong', '我答錯了', 'x'))];
    }
    function itemBody(question, item) {
        const parts = [];
        if (question.type === 'single') {
            parts.push(optionList(question));
        } else {
            parts.push(...saqBlock(question, item));
        }
        if (ctx.config.showExplanation && question.explanation) {
            parts.push(h('div', { class: 'explanation' }, h('h3', { class: 'explanation__title', text: '解析' }), h('p', { class: 'explanation__text', text: question.explanation })));
        }
        return h('div', { class: 'review-item__body' }, ...parts.filter(Boolean));
    }
    function refreshItem(item, question) {
        const details = $('details', item);
        $('[data-status-tag]', details).replaceWith(statusTag(summary.statuses.get(question.key)));
        $('.review-item__body', details).replaceWith(itemBody(question, item));
    }
    function reviewItem(key) {
        const index = session.questions.findIndex(question => question.key === key);
        const question = session.questions[index];
        const flagged = session.flags.includes(key);
        const item = h('li');
        const details = h('details', { class: 'review-item' });
        details.append(h('summary', {},
            h('span', { class: 'review-item__no', text: `第 ${index + 1} 題` }),
            h('span', { class: 'chips' }, statusTag(summary.statuses.get(key)), flagged ? h('span', { class: 'tag tag--flag' }, icon('flag'), '標記') : null),
            h('span', { class: 'review-item__preview', text: question.question }),
            icon('chevron-down', 'icon review-item__chevron')));
        let rendered = false;
        const ensureBody = () => {
            if (rendered) return;
            rendered = true;
            details.append(itemBody(question, item));
        };
        details.addEventListener('toggle', () => {
            if (details.open) ensureBody();
        });
        if (filter === 'wrong' || filter === 'pending') {
            ensureBody();
            details.open = true;
        }
        item.append(details);
        return item;
    }
    function renderToggleAll() {
        const items = $$('details.review-item', list);
        toggleAll.hidden = items.length === 0;
        toggleAll.textContent = items.some(details => !details.open) ? '全部展開' : '全部收合';
    }
    function renderMore() {
        const remaining = keys.length - shown;
        moreWrap.hidden = remaining <= 0;
        moreButton.textContent = `顯示更多（還有 ${remaining} 題）`;
    }
    function renderList() {
        keys = session.questions.filter(question => matches(question, filter)).map(question => question.key);
        shown = Math.min(PAGE_SIZE, keys.length);
        list.replaceChildren(...keys.slice(0, shown).map(reviewItem));
        emptyText.hidden = keys.length > 0;
        emptyText.textContent = FILTERS.find(item => item.value === filter).empty;
        renderMore();
        renderToggleAll();
    }
    function exportAs(type) {
        const now = new Date();
        const rows = buildExportRows(session, now.toISOString());
        const format = EXPORT_TYPES[type];
        downloadText(format.build(rows), exportFileName(session, now, type), format.mime);
        toast(`已匯出 ${type.toUpperCase()} 檔案`);
    }
    filtersHost.addEventListener('change', event => {
        filter = event.target.value;
        renderList();
    });
    toggleAll.addEventListener('click', () => {
        const items = $$('details.review-item', list);
        const expand = items.some(details => !details.open);
        items.forEach(details => {
            details.open = expand;
        });
        renderToggleAll();
    });
    list.addEventListener('toggle', renderToggleAll, true);
    moreButton.addEventListener('click', () => {
        const next = Math.min(shown + PAGE_SIZE, keys.length);
        const items = keys.slice(shown, next).map(reviewItem);
        list.append(...items);
        shown = next;
        renderMore();
        renderToggleAll();
        $('summary', items[0]).focus();
    });
    $('[data-show-pending]', root).addEventListener('click', () => {
        filter = 'pending';
        renderFilters();
        renderList();
        const first = $('summary', list);
        if (first) first.focus();
    });
    $('[data-drill]', root).addEventListener('click', () => {
        const wrongKeys = session.questions.filter(question => summary.statuses.get(question.key) === 'wrong').map(question => question.key);
        ctx.startDrill(session, wrongKeys);
    });
    $('[data-retake]', root).addEventListener('click', () => ctx.retake(session));
    return {
        name: 'result',
        focusTarget: () => $('#result-title', root),
        show() {
            session = ctx.result;
            summary = summarize(session);
            filter = defaultFilter();
            renderSummary();
            renderFilters();
            renderList();
        },
        hide() {
            menu.close({ restoreFocus: false });
        }
    };
}