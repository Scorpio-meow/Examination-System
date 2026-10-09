import { $, $$, h, icon, formatDateTime } from '../dom.js';
import { COUNT_CHOICES } from '../storage.js';
import { resolveCount, summarize } from '../session.js';
import { bankStats } from '../history.js';
const MODE_LABELS = Object.freeze({ exam: '模擬考', practice: '練習' });
const MODE_HINTS = Object.freeze({
    exam: '交卷後才顯示對錯與解析，交卷前都能修改答案。',
    practice: '每題作答後立即顯示對錯與解析，答案會鎖定。'
});
export function bankMetaText(bank) {
    const parts = [`${bank.questionCount} 題`];
    if (bank.typeCounts.saq === 0) {
        parts.push('單選');
    } else if (bank.typeCounts.single === 0) {
        parts.push('簡答');
    } else {
        parts.push(`單選 ${bank.typeCounts.single}`, `簡答 ${bank.typeCounts.saq}`);
    }
    if (bank.explanationCount > 0) parts.push('含解析');
    return parts.join(' · ');
}
export function createHomeView(ctx) {
    const root = $('[data-view="home"]');
    const groupsHost = $('[data-bank-groups]', root);
    const startButton = $('[data-start]', root);
    const startLabel = $('[data-start-label]', root);
    const floating = $('[data-floating-cta]', root);
    const customWrap = $('[data-custom-count]', root);
    const customInput = $('#custom-count-input', root);
    const customError = $('[data-custom-count-error]', root);
    const passingInput = $('#passing-score-input', root);
    const passingError = $('[data-passing-error]', root);
    const bankError = $('[data-bank-error]', root);
    const resumeCard = $('[data-resume]', root);
    let bankState = { file: null, status: 'idle', message: '' };
    let startVisible = true;
    function selectedBank() {
        return ctx.catalog.byFile.get(ctx.config.bank);
    }
    function renderBankGroups() {
        groupsHost.replaceChildren(...ctx.catalog.groups.map(group => {
            const banks = ctx.catalog.banks.filter(bank => bank.group === group.id);
            return h('fieldset', { class: 'bank-group' },
                h('legend', { class: 'bank-group__title', text: group.title }),
                h('div', { class: 'bank-grid' }, banks.map(bankCard)));
        }));
    }
    function bankCard(bank) {
        const stats = bankStats(ctx.records, bank.file);
        const input = h('input', { class: 'sr-input', type: 'radio', name: 'bank', value: bank.file });
        input.checked = bank.file === ctx.config.bank;
        return h('label', { class: 'bank-card' },
            input,
            icon('check', 'icon bank-card__check'),
            h('span', { class: 'bank-card__title', text: bank.shortTitle }),
            bank.subtitle ? h('span', { class: 'bank-card__subtitle', text: bank.subtitle }) : null,
            h('span', { class: 'bank-card__meta', text: bankMetaText(bank) }),
            stats ? h('span', { class: 'bank-card__score', text: `上次 ${stats.last.score} 分 · 最佳 ${stats.best.score} 分` }) : null);
    }
    function availableCount() {
        return selectedBank().questionCount;
    }
    function renderCountChoices() {
        const total = availableCount();
        const choices = COUNT_CHOICES.filter(value => value < total);
        const checkedValue = ctx.config.count === 'custom' ? 'custom' : (ctx.config.count === 'all' || ctx.config.count >= total ? 'all' : String(ctx.config.count));
        const chip = (value, label) => {
            const input = h('input', { class: 'sr-input', type: 'radio', name: 'count', value });
            input.checked = value === checkedValue;
            return h('label', { class: 'chip' }, input, h('span', { class: 'chip__label', text: label }));
        };
        $('[data-count-choices]', root).replaceChildren(
            ...choices.map(value => chip(String(value), `${value} 題`)),
            chip('all', `全部 ${total} 題`),
            chip('custom', '自訂'));
        customInput.max = String(total);
        customInput.value = String(ctx.config.customCount);
        customWrap.hidden = ctx.config.count !== 'custom';
        validateCustomCount();
    }
    function validateCustomCount() {
        if (ctx.config.count !== 'custom') {
            customError.hidden = true;
            customInput.removeAttribute('aria-invalid');
            return true;
        }
        const total = availableCount();
        const value = Number(customInput.value);
        const valid = Number.isInteger(value) && value >= 1 && value <= total;
        customError.hidden = valid;
        customError.textContent = valid ? '' : `請輸入 1 到 ${total} 的整數`;
        if (valid) {
            customInput.removeAttribute('aria-invalid');
        } else {
            customInput.setAttribute('aria-invalid', 'true');
        }
        return valid;
    }
    function validatePassingScore() {
        const value = Number(passingInput.value);
        const valid = passingInput.value.trim() !== '' && Number.isInteger(value) && value >= 0 && value <= 100;
        passingError.hidden = valid;
        passingError.textContent = valid ? '' : '及格分數必須是 0 到 100 的整數';
        if (valid) {
            passingInput.removeAttribute('aria-invalid');
        } else {
            passingInput.setAttribute('aria-invalid', 'true');
        }
        return valid;
    }
    function questionCountForStart() {
        return resolveCount(ctx.config, availableCount());
    }
    function renderStart() {
        const bank = selectedBank();
        $('[data-start-bank-name]', root).textContent = bank.title;
        $('[data-start-bank-meta]', root).textContent = bankMetaText(bank);
        $('[data-floating-bank]', root).textContent = bank.shortTitle;
        $$('input[name="mode"]', root).forEach(input => {
            input.checked = input.value === ctx.config.mode;
        });
        $('[data-mode-hint]', root).textContent = MODE_HINTS[ctx.config.mode];
        $$('[data-setting]', root).forEach(input => {
            input.checked = ctx.config[input.dataset.setting];
        });
        if (document.activeElement !== passingInput) passingInput.value = String(ctx.config.passingScore);
        bankError.hidden = bankState.status !== 'error';
        $('[data-bank-error-text]', root).textContent = bankState.message;
        const label = bankState.status === 'loading' ? '題庫載入中…' : `開始 ${questionCountForStart()} 題${MODE_LABELS[ctx.config.mode]}`;
        startLabel.textContent = label;
        $('[data-floating-label]', root).textContent = label;
        const ready = bankState.status === 'ready' && validateCustomCount() && validatePassingScore();
        startButton.disabled = !ready;
        $('[data-start-proxy]', root).disabled = !ready;
        updateFloating();
    }
    function renderResume() {
        const progress = ctx.progress;
        resumeCard.hidden = !progress;
        if (!progress) return;
        const summary = summarize(progress);
        $('[data-resume-bank]', root).textContent = `${progress.bankTitle}${progress.label ? `（${progress.label}）` : ''}`;
        $('[data-resume-meta]', root).textContent = `${MODE_LABELS[progress.mode]} · 已答 ${summary.answered} / ${summary.total} 題 · 開始於 ${formatDateTime(progress.startedAt)}`;
        const bar = $('[data-resume-progress]', root);
        bar.max = summary.total;
        bar.value = summary.answered;
        bar.setAttribute('aria-valuetext', `已答 ${summary.answered} 題，共 ${summary.total} 題`);
    }
    async function loadSelectedBank() {
        const file = ctx.config.bank;
        bankState = { file, status: 'loading', message: '' };
        renderStart();
        try {
            await ctx.loadBank(file);
            if (ctx.config.bank !== file) return;
            bankState = { file, status: 'ready', message: '' };
        } catch (error) {
            if (ctx.config.bank !== file) return;
            bankState = { file, status: 'error', message: `題庫載入失敗：${error.message}` };
        }
        renderCountChoices();
        renderStart();
    }
    function selectBank(file) {
        ctx.setBank(file);
        renderCountChoices();
        loadSelectedBank();
    }
    function updateFloating() {
        const isHome = document.body.dataset.view === 'home';
        floating.hidden = !isHome || startVisible || matchMedia('(min-width: 1024px)').matches;
    }
    async function start() {
        if (startButton.disabled) return;
        await ctx.startFromBank(ctx.config.bank, ctx.config.mode);
    }
    groupsHost.addEventListener('change', event => {
        if (event.target.name === 'bank') selectBank(event.target.value);
    });
    root.addEventListener('change', event => {
        const input = event.target;
        if (input.name === 'mode') {
            ctx.config.mode = input.value;
        } else if (input.name === 'count') {
            ctx.config.count = input.value === 'all' || input.value === 'custom' ? input.value : Number(input.value);
            customWrap.hidden = ctx.config.count !== 'custom';
            if (ctx.config.count === 'custom') customInput.focus();
        } else if (input.dataset.setting) {
            ctx.config[input.dataset.setting] = input.checked;
        } else {
            return;
        }
        ctx.saveConfig();
        renderStart();
    });
    customInput.addEventListener('input', () => {
        if (validateCustomCount()) {
            ctx.config.customCount = Number(customInput.value);
            ctx.saveConfig();
        }
        renderStart();
    });
    passingInput.addEventListener('input', () => {
        if (validatePassingScore()) {
            ctx.config.passingScore = Number(passingInput.value);
            ctx.saveConfig();
        }
        renderStart();
    });
    $('[data-bank-retry]', root).addEventListener('click', loadSelectedBank);
    startButton.addEventListener('click', start);
    $('[data-start-proxy]', root).addEventListener('click', start);
    $('[data-resume-continue]', root).addEventListener('click', () => ctx.resumeProgress());
    $('[data-resume-discard]', root).addEventListener('click', () => ctx.discardAndRestart());
    new IntersectionObserver(entries => {
        startVisible = entries.at(-1).isIntersecting;
        updateFloating();
    }).observe(startButton);
    matchMedia('(min-width: 1024px)').addEventListener('change', updateFloating);
    return {
        name: 'home',
        title: '考試系統',
        focusTarget: () => $('#home-title', root),
        show() {
            renderBankGroups();
            renderResume();
            renderCountChoices();
            if (bankState.file !== ctx.config.bank || bankState.status === 'error') {
                loadSelectedBank();
            } else {
                renderStart();
            }
        },
        hide() {
            floating.hidden = true;
        },
        refresh() {
            renderBankGroups();
            renderResume();
            renderCountChoices();
            renderStart();
        }
    };
}