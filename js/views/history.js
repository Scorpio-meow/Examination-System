import { $, h, icon, svg, formatDateTime, formatDuration, formatShortDate } from '../dom.js';
import { bankStats, groupRecordsByBank, isFullAttempt } from '../history.js';
const TREND_POINTS = 12;
const CHART_HEIGHT = 148;
const PADDING = Object.freeze({ top: 16, right: 40, bottom: 28, left: 32 });
const MODE_LABELS = Object.freeze({ exam: '模擬考', practice: '練習' });
export function createHistoryView(ctx) {
    const root = $('[data-view="history"]');
    const list = $('[data-history-list]', root);
    const empty = $('[data-history-empty]', root);
    const charts = new Map();
    const resizeObserver = new ResizeObserver(entries => {
        entries.forEach(entry => {
            const draw = charts.get(entry.target);
            if (draw) draw();
        });
    });
    function bankTitle(bankFile, records) {
        const bank = ctx.catalog.byFile.get(bankFile);
        if (bank) return bank.subtitle ? `${bank.shortTitle}（${bank.subtitle}）` : bank.shortTitle;
        const labelled = records.find(record => record.bankLabel);
        return labelled ? labelled.bankLabel : bankFile;
    }
    function typeLabel(record) {
        return [MODE_LABELS[record.mode], record.label].filter(Boolean).join(' · ');
    }
    function drawChart(host, attempts) {
        const width = host.clientWidth;
        if (width === 0) return;
        const plotWidth = width - PADDING.left - PADDING.right;
        const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
        const x = index => PADDING.left + (attempts.length === 1 ? plotWidth : (index / (attempts.length - 1)) * plotWidth);
        const y = score => PADDING.top + (1 - score / 100) * plotHeight;
        const chart = svg('svg', {
            class: 'trend__svg', viewBox: `0 0 ${width} ${CHART_HEIGHT}`, width, height: CHART_HEIGHT, role: 'img', tabindex: 0,
            'aria-label': `最近 ${attempts.length} 次完整作答的分數：${attempts.map(record => `${record.score} 分`).join('、')}。可用左右方向鍵逐一查看。`
        });
        [0, 50, 100].forEach(score => {
            chart.append(svg('line', { class: 'trend__grid', x1: PADDING.left, x2: width - PADDING.right, y1: y(score), y2: y(score) }));
            const label = svg('text', { class: 'trend__label', x: PADDING.left - 8, y: y(score) + 4, 'text-anchor': 'end' });
            label.textContent = String(score);
            chart.append(label);
        });
        const passing = attempts.at(-1).passingScore;
        if (passing !== undefined) {
            chart.append(svg('line', { class: 'trend__pass', x1: PADDING.left, x2: width - PADDING.right, y1: y(passing), y2: y(passing) }));
            const label = svg('text', { class: 'trend__label', x: PADDING.left + 4, y: y(passing) - 5 });
            label.textContent = `及格 ${passing}`;
            chart.append(label);
        }
        chart.append(svg('path', { class: 'trend__line', d: attempts.map((record, index) => `${index === 0 ? 'M' : 'L'}${x(index)} ${y(record.score)}`).join(' ') }));
        attempts.forEach((record, index) => {
            chart.append(svg('circle', { class: 'trend__dot', cx: x(index), cy: y(record.score), r: 4 }));
        });
        const last = attempts.length - 1;
        const endLabel = svg('text', { class: 'trend__value', x: x(last) + 10, y: y(attempts[last].score) + 4 });
        endLabel.textContent = String(attempts[last].score);
        chart.append(endLabel);
        [[0, 'start'], [last, 'end']].forEach(([index, anchor]) => {
            if (index === last && last === 0) return;
            const label = svg('text', { class: 'trend__label', x: x(index), y: CHART_HEIGHT - 6, 'text-anchor': anchor });
            label.textContent = formatShortDate(attempts[index].date);
            chart.append(label);
        });
        const focusLine = svg('line', { class: 'trend__focus', y1: PADDING.top, y2: PADDING.top + plotHeight, visibility: 'hidden' });
        chart.append(focusLine);
        const hit = svg('rect', { class: 'trend__hit', x: PADDING.left - 12, y: 0, width: plotWidth + 24, height: CHART_HEIGHT });
        chart.append(hit);
        const tooltip = h('div', { class: 'trend__tooltip', hidden: true, 'aria-hidden': 'true' });
        let focused = last;
        function showPoint(index) {
            focused = index;
            const record = attempts[index];
            focusLine.setAttribute('x1', String(x(index)));
            focusLine.setAttribute('x2', String(x(index)));
            focusLine.setAttribute('visibility', 'visible');
            tooltip.replaceChildren(h('strong', { text: `${record.score} 分` }), ` · ${typeLabel(record)}`, h('br'), formatDateTime(record.date));
            tooltip.style.setProperty('left', `${x(index)}px`);
            tooltip.style.setProperty('top', `${y(record.score)}px`);
            tooltip.hidden = false;
        }
        function hidePoint() {
            focusLine.setAttribute('visibility', 'hidden');
            tooltip.hidden = true;
        }
        hit.addEventListener('pointermove', event => {
            const box = chart.getBoundingClientRect();
            const ratio = (event.clientX - box.left - PADDING.left) / plotWidth;
            showPoint(Math.max(0, Math.min(last, Math.round(ratio * last))));
        });
        hit.addEventListener('pointerleave', hidePoint);
        chart.addEventListener('focus', () => showPoint(focused));
        chart.addEventListener('blur', hidePoint);
        chart.addEventListener('keydown', event => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                event.preventDefault();
                showPoint(Math.max(0, Math.min(last, focused + (event.key === 'ArrowLeft' ? -1 : 1))));
            } else if (event.key === 'Escape') {
                hidePoint();
            }
        });
        host.replaceChildren(chart, tooltip);
    }
    function trendBlock(attempts) {
        const wrap = h('div', { class: 'trend' });
        if (attempts.length < 2) {
            wrap.append(h('p', { class: 'trend__caption', text: '完成兩次以上的完整作答後，這裡會顯示分數趨勢。' }));
            return wrap;
        }
        const host = h('div');
        wrap.append(h('p', { class: 'trend__caption', text: `分數趨勢（最近 ${attempts.length} 次完整作答）` }), host);
        charts.set(host, () => drawChart(host, attempts));
        resizeObserver.observe(host);
        return wrap;
    }
    function recordsTable(records) {
        return h('div', { class: 'table-wrap' }, h('table', { class: 'records' },
            h('caption', { class: 'visually-hidden', text: '作答紀錄，由新到舊' }),
            h('thead', {}, h('tr', {}, [['日期', ''], ['類型', ''], ['題數', 'num'], ['分數', 'num'], ['正確', 'num'], ['用時', 'num'], ['結果', '']].map(([label, align]) => h('th', { scope: 'col', class: align || null, text: label })))),
            h('tbody', {}, records.map(record => h('tr', {},
                h('td', { text: formatDateTime(record.date) }),
                h('td', { text: typeLabel(record) }),
                h('td', { class: 'num', text: String(record.totalCount) }),
                h('td', { class: 'num', text: String(record.score) }),
                h('td', { class: 'num', text: `${record.correctCount} / ${record.totalCount}` }),
                h('td', { class: 'num', text: formatDuration(record.duration) }),
                h('td', {}, resultTag(record)))))));
    }
    function resultTag(record) {
        return h('span', { class: `tag ${record.isPassed ? 'tag--ok' : 'tag--bad'}` }, icon(record.isPassed ? 'check' : 'x'), record.isPassed ? '通過' : '未通過');
    }
    function recordsList(records) {
        return h('ol', { class: 'record-list', 'aria-label': '作答紀錄，由新到舊' }, records.map(record => h('li', { class: 'record-item' },
            h('p', { class: 'record-item__main' }, h('strong', { class: 'record-item__score', text: `${record.score} 分` }), resultTag(record)),
            h('p', { class: 'record-item__meta', text: [formatDateTime(record.date), typeLabel(record), `正確 ${record.correctCount} / ${record.totalCount}`, `用時 ${formatDuration(record.duration)}`].join(' · ') }))));
    }
    function bankSection({ bankFile, records }) {
        const stats = bankStats(ctx.records, bankFile);
        const attempts = records.filter(isFullAttempt).slice(0, TREND_POINTS).reverse();
        const statsLine = stats
            ? h('p', { class: 'history-stats' },
                h('span', {}, '最近 ', h('strong', { text: String(stats.last.score) }), ' 分'),
                h('span', {}, '最佳 ', h('strong', { text: String(stats.best.score) }), ' 分'),
                h('span', {}, '完整作答 ', h('strong', { text: String(stats.attempts) }), ' 次'))
            : h('p', { class: 'history-stats', text: '目前只有錯題練習的紀錄' });
        return h('section', { class: 'card history-bank', 'aria-label': bankTitle(bankFile, records) },
            h('div', { class: 'history-bank__head' }, h('h2', { class: 'history-bank__title', text: bankTitle(bankFile, records) }), statsLine),
            trendBlock(attempts),
            recordsTable(records),
            recordsList(records));
    }
    return {
        name: 'history',
        focusTarget: () => $('#history-title', root),
        show() {
            document.title = '歷史紀錄 · 考試系統';
            charts.clear();
            resizeObserver.disconnect();
            const groups = groupRecordsByBank(ctx.records);
            empty.hidden = groups.length > 0;
            list.replaceChildren(...groups.map(bankSection));
        },
        hide() {
            resizeObserver.disconnect();
        }
    };
}