import { $, $$, h, icon, announce, formatClock, isTextEntry } from '../dom.js';
import { optionLetter } from '../bank.js';
import {
    firstUnansweredIndex,
    isAnswered,
    isFlagged,
    isRevealed,
    questionStatus,
    reveal,
    setAnswer,
    setSelfGrade,
    shortAnswerGradeSource,
    summarize,
    toggleFlag
} from '../session.js';
import { showModal } from '../ui.js';
const MODE_LABELS = Object.freeze({ exam: '模擬考', practice: '練習' });
const SAVE_DELAY_MS = 400;
const MAX_ANSWER_LENGTH = 2000;
const MAP_FILTERS = Object.freeze([
    { value: 'all', label: '全部' },
    { value: 'unanswered', label: '未答' },
    { value: 'flagged', label: '標記' }
]);
export function createExamView(ctx) {
    const root = $('[data-view="exam"]');
    const card = $('[data-question]', root);
    const heading = $('[data-question-no]', root);
    const answerArea = $('[data-answer-area]', root);
    const feedbackArea = $('[data-feedback-area]', root);
    const flagButton = $('[data-flag]', root);
    const timerText = $('[data-timer]', root);
    const timerToggle = $('[data-timer-toggle]', root);
    const examBar = $('[data-exam-bar]', root);
    const submitDialog = $('#submit-dialog');
    const shortcutsDialog = $('#shortcuts-dialog');
    const mapSheet = $('#map-sheet');
    let session = null;
    let active = false;
    let resumedAt = 0;
    let timerId = 0;
    let saveTimer = 0;
    let mapFilter = 'all';
    const maps = [createMap($('[data-qmap="panel"]', root), false), createMap($('[data-qmap="sheet"]'), true)];
    const barObserver = new ResizeObserver(() => {
        root.style.setProperty('--exam-bar-h', `${examBar.offsetHeight}px`);
    });
    timerToggle.removeAttribute('aria-pressed');
    function current() {
        return session.questions[session.currentIndex];
    }
    function lastIndex() {
        return session.questions.length - 1;
    }
    function elapsed() {
        return session.elapsedMs + (active ? Date.now() - resumedAt : 0);
    }
    function commitTime() {
        const now = Date.now();
        session.elapsedMs += now - resumedAt;
        resumedAt = now;
    }
    function persistNow() {
        clearTimeout(saveTimer);
        saveTimer = 0;
        commitTime();
        ctx.saveProgress(session);
    }
    function persistSoon() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(persistNow, SAVE_DELAY_MS);
    }
    function statusText(question) {
        const answered = isAnswered(question, session.answers[question.key]);
        if (session.mode === 'practice' && isRevealed(session, question.key)) {
            const status = questionStatus(session, question);
            if (status === 'correct') return '答對';
            if (status === 'wrong') return '答錯';
            if (status === 'pending') return '待自評';
        }
        return answered ? '已答' : '未答';
    }
    function createMap(host, inSheet) {
        let builtFor = null;
        let cells = [];
        let counts = {};
        let empty = null;
        function build() {
            const name = `qmap-filter-${inSheet ? 'sheet' : 'panel'}`;
            const practice = session.mode === 'practice';
            const hasSaq = session.questions.some(question => question.type === 'saq');
            const legend = h('div', { class: 'qmap__legend', 'aria-hidden': 'true' },
                h('span', {}, h('i', { class: 'qmap__swatch qmap__swatch--current' }), '目前'),
                practice ? h('span', {}, h('i', { class: 'qmap__swatch qmap__swatch--correct' }), '答對') : null,
                practice ? h('span', {}, h('i', { class: 'qmap__swatch qmap__swatch--wrong' }), '答錯') : null,
                !practice || hasSaq ? h('span', {}, h('i', { class: 'qmap__swatch qmap__swatch--answered' }), practice ? '已作答未核對' : '已答') : null,
                h('span', {}, h('i', { class: 'qmap__swatch qmap__swatch--flag' }), '標記'),
                h('span', {}, h('i', { class: 'qmap__swatch' }), '未答'));
            counts = {};
            const filter = h('fieldset', { class: 'field' },
                h('legend', { class: 'visually-hidden', text: '篩選題號' }),
                h('div', { class: 'segmented segmented--sm' }, MAP_FILTERS.map(({ value, label }) => {
                    const input = h('input', { class: 'sr-input', type: 'radio', name, value });
                    input.checked = value === mapFilter;
                    counts[value] = h('span', { class: 'segmented__count' });
                    return h('label', { class: 'segmented__item' }, input, h('span', { class: 'segmented__label' }, label, counts[value]));
                })));
            filter.addEventListener('change', event => {
                mapFilter = event.target.value;
                maps.forEach(map => map.update());
            });
            const grid = h('ol', { class: 'qmap__grid' });
            cells = session.questions.map((_, index) => {
                const button = h('button', { class: 'qmap__cell', type: 'button', dataset: { index } });
                grid.append(h('li', {}, button));
                return button;
            });
            grid.addEventListener('click', event => {
                const button = event.target.closest('.qmap__cell');
                if (!button) return;
                if (inSheet) mapSheet.close();
                goTo(Number(button.dataset.index), { focusHeading: true });
            });
            empty = h('p', { class: 'qmap__empty', text: '沒有符合的題目' });
            host.replaceChildren(legend, filter, grid, empty);
            builtFor = session.id;
        }
        function update() {
            if (builtFor !== session.id) build();
            let unanswered = 0;
            let flagged = 0;
            let visible = 0;
            cells.forEach((button, index) => {
                const question = session.questions[index];
                const answered = isAnswered(question, session.answers[question.key]);
                const isFlag = isFlagged(session, question.key);
                const graded = session.mode === 'practice' && isRevealed(session, question.key) ? questionStatus(session, question) : null;
                if (!answered) unanswered += 1;
                if (isFlag) flagged += 1;
                button.className = 'qmap__cell';
                button.classList.toggle('is-answered', answered && graded !== 'correct' && graded !== 'wrong');
                button.classList.toggle('is-correct', graded === 'correct');
                button.classList.toggle('is-wrong', graded === 'wrong');
                button.classList.toggle('is-flagged', isFlag);
                button.replaceChildren(String(index + 1));
                if (graded === 'correct' || graded === 'wrong') button.append(icon(graded === 'correct' ? 'check' : 'x', 'icon qmap__mark'));
                button.setAttribute('aria-label', `第 ${index + 1} 題，${statusText(question)}${isFlag ? '，已標記' : ''}`);
                if (index === session.currentIndex) {
                    button.setAttribute('aria-current', 'step');
                } else {
                    button.removeAttribute('aria-current');
                }
                const show = mapFilter === 'all' || (mapFilter === 'unanswered' && !answered) || (mapFilter === 'flagged' && isFlag);
                button.parentElement.hidden = !show;
                if (show) visible += 1;
            });
            counts.all.textContent = String(cells.length);
            counts.unanswered.textContent = String(unanswered);
            counts.flagged.textContent = String(flagged);
            empty.hidden = visible > 0;
        }
        return {
            update,
            reset() {
                builtFor = null;
            }
        };
    }
    function shortcutHint(question) {
        const hint = $('[data-shortcut-hint]', root);
        hint.hidden = !ctx.config.shortcuts;
        const parts = [];
        if (question.type === 'single') {
            parts.push(['按 ', h('kbd', { text: '1' }), '–', h('kbd', { text: String(question.options.length) }), ' 作答']);
        }
        parts.push([h('kbd', { text: 'F' }), ' 標記'], [h('kbd', { text: '?' }), ' 快捷鍵']);
        hint.replaceChildren(...parts.flatMap((part, index) => (index === 0 ? part : [' · ', ...part])));
    }
    function renderOptions(question) {
        const locked = session.mode === 'practice' && isRevealed(session, question.key);
        const chosen = session.answers[question.key];
        const fieldset = h('fieldset', { class: 'options', 'aria-labelledby': 'question-stem' });
        question.options.forEach((text, index) => {
            const letter = optionLetter(index);
            const input = h('input', { class: 'sr-input', type: 'radio', name: 'answer', value: letter });
            input.checked = chosen === letter;
            input.disabled = locked;
            const option = h('label', { class: 'option' }, input, h('span', { class: 'option__key', text: letter }), h('span', { class: 'option__text', text }));
            if (locked && letter === question.answer) {
                option.classList.add('is-correct');
                option.append(h('span', { class: 'option__mark' }, icon('check'), chosen === letter ? '你的答案・正確' : '正確答案'));
            } else if (locked && letter === chosen) {
                option.classList.add('is-wrong');
                option.append(h('span', { class: 'option__mark' }, icon('x'), '你的答案'));
            }
            fieldset.append(option);
        });
        fieldset.addEventListener('change', event => chooseOption(event.target.value, { viaKey: false }));
        return fieldset;
    }
    function renderSaq(question) {
        const locked = session.mode === 'practice' && isRevealed(session, question.key);
        const textarea = h('textarea', { class: 'input', id: 'saq-input', rows: 5, maxlength: MAX_ANSWER_LENGTH, 'aria-describedby': 'question-stem' });
        textarea.value = session.answers[question.key] || '';
        textarea.readOnly = locked;
        const wrap = h('div', { class: 'saq' }, h('label', { class: 'saq__label', for: 'saq-input', text: locked ? '你的答案（已核對）' : '你的答案' }), textarea);
        if (session.mode === 'practice' && !locked) {
            const check = h('button', { class: 'btn', type: 'button' }, icon('check'), '核對答案');
            check.disabled = !isAnswered(question, textarea.value);
            check.addEventListener('click', () => {
                reveal(session, question.key);
                persistNow();
                renderQuestion({ focus: false });
                renderStatus();
                announce('已顯示參考答案，請自評你的答案');
                const firstGrade = $('[data-grade]', feedbackArea);
                if (firstGrade) {
                    firstGrade.focus();
                } else {
                    focusVisibleNext();
                }
            });
            textarea.addEventListener('input', () => {
                check.disabled = !isAnswered(question, textarea.value);
            });
            wrap.append(h('div', { class: 'saq__actions' }, check));
        }
        textarea.addEventListener('input', () => {
            setAnswer(session, question, textarea.value);
            persistSoon();
            renderStatus();
        });
        return wrap;
    }
    function selfGradeControls(question) {
        const grade = session.selfGrades[question.key];
        const button = (value, label, iconName) => {
            const element = h('button', { class: 'btn btn--sm', type: 'button', 'aria-pressed': String(grade === value), dataset: { grade: value } }, icon(iconName), label);
            element.addEventListener('click', () => {
                setSelfGrade(session, question.key, grade === value ? null : value);
                persistNow();
                renderFeedback(question);
                renderStatus();
                $(`[data-grade="${value}"]`, feedbackArea).focus();
            });
            return element;
        };
        return h('div', { class: 'self-grade', role: 'group', 'aria-label': '自評' },
            h('span', { class: 'self-grade__prompt', text: '你的答案正確嗎？' }),
            button('correct', '我答對了', 'check'),
            button('wrong', '我答錯了', 'x'));
    }
    function renderFeedback(question) {
        feedbackArea.replaceChildren();
        if (session.mode !== 'practice' || !isRevealed(session, question.key)) return;
        if (question.type === 'single') {
            const correct = session.answers[question.key] === question.answer;
            feedbackArea.append(h('p', { class: `feedback ${correct ? 'feedback--correct' : 'feedback--wrong'}` },
                icon(correct ? 'check' : 'x'), correct ? '答對了' : `答錯了，正確答案是 ${question.answer}`));
        } else {
            feedbackArea.append(h('div', { class: 'reference' },
                h('h3', { class: 'reference__title', text: '參考答案' }),
                h('p', { class: 'reference__text', text: question.answer || '題庫沒有提供參考答案' })));
            if (shortAnswerGradeSource(session, question) === 'auto') {
                feedbackArea.append(h('p', { class: 'feedback feedback--correct' }, icon('check'), '與參考答案相符，判定為答對'));
            } else {
                feedbackArea.append(selfGradeControls(question));
            }
        }
        if (ctx.config.showExplanation && question.explanation) {
            feedbackArea.append(h('div', { class: 'explanation' },
                h('h3', { class: 'explanation__title', text: '解析' }),
                h('p', { class: 'explanation__text', text: question.explanation })));
        }
    }
    function renderQuestion({ focus }) {
        const question = current();
        const index = session.currentIndex;
        heading.replaceChildren(`第 ${index + 1} 題`, h('span', { class: 'visually-hidden', text: `，共 ${session.questions.length} 題` }));
        $('[data-question-type]', root).textContent = question.type === 'saq' ? '簡答' : '單選';
        flagButton.setAttribute('aria-pressed', String(isFlagged(session, question.key)));
        $('[data-question-stem]', root).textContent = question.question;
        answerArea.replaceChildren(question.type === 'saq' ? renderSaq(question) : renderOptions(question));
        renderFeedback(question);
        shortcutHint(question);
        $$('[data-prev]', root).forEach(button => {
            button.disabled = index === 0;
        });
        $$('[data-next-label]', root).forEach(label => {
            label.textContent = index === lastIndex() ? '檢查並交卷' : '下一題';
        });
        document.title = `第 ${index + 1} 題 · ${session.bankTitle} · 考試系統`;
        if (focus) heading.focus();
    }
    function renderStatus() {
        const summary = summarize(session);
        $('[data-answered-text]', root).textContent = `已答 ${summary.answered} / ${summary.total}`;
        const bar = $('[data-answered-progress]', root);
        bar.max = summary.total;
        bar.value = summary.answered;
        bar.setAttribute('aria-valuetext', `已答 ${summary.answered} 題，共 ${summary.total} 題`);
        $('[data-dock-position]', root).textContent = `${session.currentIndex + 1} / ${summary.total}`;
        maps[0].update();
        if (mapSheet.open) maps[1].update();
    }
    function renderTimer() {
        timerText.textContent = formatClock(elapsed());
    }
    function renderTimerVisibility() {
        const visible = ctx.config.showTimer;
        timerText.hidden = !visible;
        $('[data-timer-icon="hide"]', root).hidden = !visible;
        $('[data-timer-icon="show"]', root).hidden = visible;
        $('.visually-hidden', timerToggle).textContent = visible ? '隱藏計時' : '顯示計時';
    }
    function renderBar() {
        const bank = ctx.catalog.byFile.get(session.bankFile);
        $('[data-exam-bank-full]', root).textContent = session.bankTitle;
        $('[data-exam-bank-short]', root).textContent = bank ? bank.shortTitle : session.bankTitle;
        $('[data-exam-sub]', root).textContent = [MODE_LABELS[session.mode], session.label, `${session.questions.length} 題`].filter(Boolean).join(' · ');
        renderTimerVisibility();
    }
    function focusVisibleNext() {
        const target = $$('[data-next]', root).find(button => button.offsetParent !== null);
        if (target) target.focus();
    }
    function chooseOption(letter, { viaKey }) {
        const question = current();
        if (!setAnswer(session, question, letter)) return;
        if (session.mode === 'practice') {
            reveal(session, question.key);
            persistNow();
            renderQuestion({ focus: false });
            renderStatus();
            announce(letter === question.answer ? '答對了' : `答錯了，正確答案是 ${question.answer}`);
            focusVisibleNext();
            return;
        }
        persistNow();
        renderStatus();
        if (viaKey) announce(`已選擇 ${letter}`);
    }
    function selectByKey(letter) {
        const input = $(`input[name="answer"][value="${letter}"]`, answerArea);
        if (!input || input.disabled) return;
        input.checked = true;
        chooseOption(letter, { viaKey: true });
    }
    function goTo(index, { focusHeading }) {
        if (index < 0 || index > lastIndex() || index === session.currentIndex) {
            if (focusHeading) heading.focus();
            return;
        }
        const focusWasInCard = card.contains(document.activeElement) && !$$('[data-next], [data-prev]', card).includes(document.activeElement);
        const focusOnPrev = $$('[data-prev]', root).includes(document.activeElement);
        session.currentIndex = index;
        persistSoon();
        renderQuestion({ focus: focusHeading || focusWasInCard || (focusOnPrev && index === 0) });
        renderStatus();
        if (!focusHeading && !focusWasInCard) announce(`第 ${index + 1} 題，共 ${session.questions.length} 題`);
    }
    function toggleCurrentFlag() {
        const question = current();
        const flagged = toggleFlag(session, question.key);
        flagButton.setAttribute('aria-pressed', String(flagged));
        persistNow();
        renderStatus();
        announce(flagged ? `已標記第 ${session.currentIndex + 1} 題` : `已取消標記第 ${session.currentIndex + 1} 題`);
    }
    function openSubmit() {
        const summary = summarize(session);
        $('[data-submit-answered]', submitDialog).textContent = `${summary.answered} 題`;
        $('[data-submit-unanswered]', submitDialog).textContent = `${summary.unanswered} 題`;
        $('[data-submit-flagged]', submitDialog).textContent = `${summary.flagged} 題`;
        const notes = [summary.unanswered > 0 ? '未作答的題目以錯誤計分。' : '交卷後就不能再修改答案。'];
        if (summary.flagged > 0) notes.push('你還有標記的題目，可以先回去檢查。');
        $('[data-submit-note]', submitDialog).textContent = notes.join('');
        $('[data-submit-goto]', submitDialog).hidden = summary.unanswered === 0;
        submitDialog.returnValue = '';
        showModal(submitDialog);
    }
    function finish() {
        persistNow();
        active = false;
        clearInterval(timerId);
        ctx.finishSession(session);
    }
    function onKeydown(event) {
        if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
        if (document.querySelector('dialog[open]') || isTextEntry(event.target)) return;
        const index = session.currentIndex;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            goTo(event.key === 'ArrowLeft' ? index - 1 : index + 1, { focusHeading: false });
            return;
        }
        if (event.key === 'Enter') {
            if (event.target.closest('button, a, summary')) return;
            event.preventDefault();
            goTo(index + 1, { focusHeading: false });
            return;
        }
        if (!ctx.config.shortcuts) return;
        if (/^[1-9]$/.test(event.key)) {
            const question = current();
            const optionIndex = Number(event.key) - 1;
            if (question.type !== 'single' || optionIndex >= question.options.length) return;
            event.preventDefault();
            selectByKey(optionLetter(optionIndex));
        } else if (event.key === 'f' || event.key === 'F') {
            event.preventDefault();
            toggleCurrentFlag();
        } else if (event.key === '?') {
            event.preventDefault();
            showModal(shortcutsDialog);
        }
    }
    function onVisibilityChange() {
        if (active && document.visibilityState === 'hidden') persistNow();
    }
    function onPageHide() {
        if (active) persistNow();
    }
    $$('[data-prev]', root).forEach(button => button.addEventListener('click', () => goTo(session.currentIndex - 1, { focusHeading: false })));
    $$('[data-next]', root).forEach(button => button.addEventListener('click', () => {
        if (session.currentIndex === lastIndex()) {
            openSubmit();
        } else {
            goTo(session.currentIndex + 1, { focusHeading: false });
        }
    }));
    flagButton.addEventListener('click', toggleCurrentFlag);
    $('[data-submit]', root).addEventListener('click', openSubmit);
    $('[data-leave]', root).addEventListener('click', () => ctx.leaveExam());
    $('[data-open-map]', root).addEventListener('click', () => {
        maps[1].update();
        showModal(mapSheet);
        const currentCell = $('.qmap__cell[aria-current="step"]', mapSheet);
        if (currentCell) currentCell.scrollIntoView({ block: 'center' });
    });
    timerToggle.addEventListener('click', () => {
        ctx.config.showTimer = !ctx.config.showTimer;
        ctx.saveConfig();
        renderTimerVisibility();
    });
    submitDialog.addEventListener('close', () => {
        if (!active) return;
        if (submitDialog.returnValue === 'submit') {
            finish();
        } else if (submitDialog.returnValue === 'goto') {
            goTo(firstUnansweredIndex(session), { focusHeading: true });
        }
    });
    return {
        name: 'exam',
        focusTarget: () => heading,
        show() {
            session = ctx.session;
            active = true;
            resumedAt = Date.now();
            maps.forEach(map => map.reset());
            renderBar();
            renderQuestion({ focus: false });
            renderStatus();
            renderTimer();
            timerId = setInterval(renderTimer, 1000);
            document.addEventListener('keydown', onKeydown);
            document.addEventListener('visibilitychange', onVisibilityChange);
            window.addEventListener('pagehide', onPageHide);
            barObserver.observe(examBar);
        },
        hide() {
            const wasActive = active;
            if (wasActive) persistNow();
            active = false;
            clearInterval(timerId);
            clearTimeout(saveTimer);
            document.removeEventListener('keydown', onKeydown);
            document.removeEventListener('visibilitychange', onVisibilityChange);
            window.removeEventListener('pagehide', onPageHide);
            barObserver.disconnect();
            [submitDialog, mapSheet, shortcutsDialog].forEach(dialog => {
                if (dialog.open) dialog.close();
            });
            if (wasActive) ctx.notifyLeft(session);
        }
    };
}