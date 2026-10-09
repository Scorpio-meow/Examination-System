import { fetchBankQuestions, summarizeQuestions } from './js/bank.js';
import { loadCatalog, resolveBankUrl } from './js/catalog.js';
import { STORAGE_KEYS, createStore, migrateLegacyProgress, sanitizeConfig, sanitizeRecords, validateSession } from './js/storage.js';
import { createDrillSession, createSession, summarize } from './js/session.js';
import { recordFromSession, upsertRecord } from './js/history.js';
import { $, $$ } from './js/dom.js';
import { confirmDialog, setupDialog, showModal, toast } from './js/ui.js';
import { resetColorScheme, setupColorScheme } from './js/theme.js';
import { createRouter } from './js/router.js';
import { createHomeView } from './js/views/home.js';
import { createExamView } from './js/views/exam.js';
import { createResultView } from './js/views/result.js';
import { createHistoryView } from './js/views/history.js';
const CATALOG_URL = new URL('json/banks.json', document.baseURI).href;
const DRILL_LABEL = '錯題練習';
const store = createStore({
    getItem: key => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
    removeItem: key => localStorage.removeItem(key)
});
const fetchUrl = url => fetch(url);
const views = {};
let router = null;
let activeView = null;
let firstRoute = true;
const ctx = {
    catalog: null,
    config: sanitizeConfig(store.read(STORAGE_KEYS.config)),
    records: sanitizeRecords(store.read(STORAGE_KEYS.records)),
    progress: null,
    session: null,
    result: null,
    bankCache: new Map(),
    storageWarned: false,
    unsaved: false
};
function createId() {
    return Array.from(crypto.getRandomValues(new Uint8Array(12)), byte => byte.toString(16).padStart(2, '0')).join('');
}
function warnStorage() {
    if (ctx.storageWarned) return;
    ctx.storageWarned = true;
    toast('瀏覽器目前無法儲存資料（空間不足或隱私模式），關閉頁面前請先完成作答。');
}
function clearProgress() {
    store.remove(STORAGE_KEYS.progress);
    ctx.progress = null;
    ctx.unsaved = false;
}
ctx.saveConfig = () => {
    if (!store.write(STORAGE_KEYS.config, ctx.config)) warnStorage();
};
ctx.saveRecords = () => {
    if (!store.write(STORAGE_KEYS.records, ctx.records)) warnStorage();
};
ctx.saveProgress = session => {
    let saved = store.write(STORAGE_KEYS.progress, session);
    if (!saved && store.read(STORAGE_KEYS.lastResult) !== null) {
        store.remove(STORAGE_KEYS.lastResult);
        saved = store.write(STORAGE_KEYS.progress, session);
    }
    ctx.progress = session;
    ctx.unsaved = !saved;
    if (!saved) warnStorage();
};
ctx.loadBank = file => {
    if (!ctx.bankCache.has(file)) {
        const request = fetchBankQuestions(resolveBankUrl(file, CATALOG_URL), fetchUrl).then(({ questions, warnings }) => {
            if (warnings.length > 0) console.warn(`題庫 ${file} 有 ${warnings.length} 題格式不正確，已略過`, warnings);
            const bank = ctx.catalog.byFile.get(file);
            const actual = summarizeQuestions(questions);
            if (actual.questionCount !== bank.questionCount || actual.typeCounts.saq !== bank.typeCounts.saq || actual.explanationCount !== bank.explanationCount) {
                console.warn(`json/banks.json 的統計與 ${file} 實際內容不符，已改用實際內容；請執行 bun run build:banks`);
                Object.assign(bank, actual);
            }
            return questions;
        });
        request.catch(() => ctx.bankCache.delete(file));
        ctx.bankCache.set(file, request);
    }
    return ctx.bankCache.get(file);
};
ctx.setBank = file => {
    ctx.config.bank = file;
    ctx.saveConfig();
    const url = new URL(location.href);
    url.searchParams.set('bank', file);
    history.replaceState(history.state, '', url);
};
function confirmReplaceProgress() {
    const progress = ctx.progress;
    if (!progress) return Promise.resolve(true);
    const summary = summarize(progress);
    return confirmDialog({
        title: '要取代未完成的進度嗎？',
        body: [`「${progress.bankTitle}」還有一份已答 ${summary.answered} / ${summary.total} 題的進度。`, '開始新的作答後，這份進度會被清除。'],
        confirmLabel: '開始新的作答',
        cancelLabel: '保留進度',
        tone: 'danger'
    });
}
function beginSession(session) {
    ctx.session = session;
    ctx.saveProgress(session);
    router.navigate('/exam', { replace: false, state: { from: router.path } });
}
function drillFrom(source, keys, label) {
    return createDrillSession({ source, keys, label, now: Date.now, createId });
}
ctx.startFromBank = async (file, mode) => {
    const bank = ctx.catalog.byFile.get(file);
    if (!bank) {
        toast('這個題庫已不在題庫目錄中');
        return;
    }
    if (!(await confirmReplaceProgress())) return;
    let questions;
    try {
        questions = await ctx.loadBank(file);
    } catch (error) {
        toast(`題庫載入失敗：${error.message}`);
        return;
    }
    beginSession(createSession({ bank, questions, config: { ...ctx.config, mode }, random: Math.random, now: Date.now, createId }));
};
ctx.resumeProgress = () => {
    ctx.session = ctx.progress;
    router.navigate('/exam', { replace: false, state: { from: router.path } });
};
ctx.discardAndRestart = async () => {
    const progress = ctx.progress;
    const summary = summarize(progress);
    const confirmed = await confirmDialog({
        title: '放棄這份進度並重新開始？',
        body: [`「${progress.bankTitle}」已作答的 ${summary.answered} 題會被清除，並以目前的設定重新出題。`],
        confirmLabel: '放棄並重新開始',
        cancelLabel: '取消',
        tone: 'danger'
    });
    if (!confirmed) return;
    clearProgress();
    views['/'].refresh();
    if (progress.label !== undefined) {
        beginSession(drillFrom(progress, progress.questions.map(question => question.key), progress.label));
        return;
    }
    await ctx.startFromBank(progress.bankFile, progress.mode);
};
ctx.startDrill = async (source, keys) => {
    if (!(await confirmReplaceProgress())) return;
    beginSession(drillFrom(source, keys, DRILL_LABEL));
};
ctx.retake = async source => {
    if (source.label === undefined) {
        await ctx.startFromBank(source.bankFile, source.mode);
        return;
    }
    if (!(await confirmReplaceProgress())) return;
    beginSession(drillFrom(source, source.questions.map(question => question.key), source.label));
};
ctx.leaveExam = () => router.back('/');
ctx.notifyLeft = () => toast('進度已保存，可以從首頁繼續作答。');
ctx.finishSession = session => {
    session.finishedAt = new Date().toISOString();
    ctx.records = upsertRecord(ctx.records, recordFromSession(session, summarize(session)));
    ctx.saveRecords();
    ctx.result = session;
    if (!store.write(STORAGE_KEYS.lastResult, session)) warnStorage();
    clearProgress();
    ctx.session = null;
    router.navigate('/result', { replace: true, state: history.state });
};
ctx.updateResult = session => {
    ctx.records = upsertRecord(ctx.records, recordFromSession(session, summarize(session)));
    ctx.saveRecords();
    if (!store.write(STORAGE_KEYS.lastResult, session)) warnStorage();
};
function resolveInitialBank() {
    const requested = new URLSearchParams(location.search).get('bank');
    if (requested !== null && !ctx.catalog.byFile.has(requested)) console.warn(`網址指定的題庫不存在：${requested}`);
    const file = [requested, ctx.config.bank, ctx.catalog.defaultBank].find(candidate => ctx.catalog.byFile.has(candidate));
    ctx.setBank(file);
}
function restoreSavedState() {
    const rawProgress = store.read(STORAGE_KEYS.progress);
    if (rawProgress !== null) {
        if (validateSession(rawProgress) && rawProgress.finishedAt === undefined) {
            ctx.progress = rawProgress;
        } else {
            const migrated = migrateLegacyProgress(rawProgress, {
                titleFor: file => (ctx.catalog.byFile.has(file) ? ctx.catalog.byFile.get(file).title : null),
                passingScore: ctx.config.passingScore,
                createId
            });
            if (migrated) {
                ctx.saveProgress(migrated);
            } else {
                console.warn('作答進度格式不正確，已清除');
                store.remove(STORAGE_KEYS.progress);
            }
        }
    }
    const rawResult = store.read(STORAGE_KEYS.lastResult);
    if (rawResult !== null) {
        if (validateSession(rawResult) && rawResult.finishedAt !== undefined) {
            ctx.result = rawResult;
        } else {
            store.remove(STORAGE_KEYS.lastResult);
        }
    }
}
function route(path) {
    if (path === '/exam' && !ctx.session) {
        if (!ctx.progress) {
            router.navigate('/', { replace: true, state: null });
            return;
        }
        ctx.session = ctx.progress;
    }
    if (path === '/result' && !ctx.result) {
        router.navigate('/', { replace: true, state: null });
        return;
    }
    const view = views[path];
    if (activeView && activeView !== view) activeView.hide();
    if (path !== '/exam') ctx.session = null;
    $$('main [data-view]').forEach(section => {
        section.hidden = section.dataset.view !== view.name;
    });
    document.body.dataset.view = view.name;
    const historyLink = $('[data-nav="history"]');
    if (path === '/history') {
        historyLink.setAttribute('aria-current', 'page');
    } else {
        historyLink.removeAttribute('aria-current');
    }
    if (view.title) document.title = view.title;
    activeView = view;
    view.show();
    if (!firstRoute) {
        window.scrollTo({ top: 0 });
        view.focusTarget().focus();
    }
    firstRoute = false;
}
async function clearAllData() {
    $('#privacy-dialog').close();
    const confirmed = await confirmDialog({
        title: '清除所有本機資料？',
        body: ['作答進度、最近一次結果、設定、歷史紀錄與外觀偏好都會被刪除，無法復原。'],
        confirmLabel: '清除所有資料',
        cancelLabel: '取消',
        tone: 'danger'
    });
    if (!confirmed) return;
    Object.values(STORAGE_KEYS).forEach(key => store.remove(key));
    resetColorScheme();
    Object.assign(ctx, { config: sanitizeConfig(null), records: [], progress: null, result: null, session: null, unsaved: false });
    resolveInitialBank();
    if (router.path === '/') {
        views['/'].refresh();
    } else {
        router.navigate('/', { replace: true, state: null });
    }
    toast('已清除所有本機資料');
}
async function boot() {
    $('[data-boot-loading]').hidden = false;
    $('[data-boot-error]').hidden = true;
    try {
        ctx.catalog = await loadCatalog(CATALOG_URL, fetchUrl);
    } catch (error) {
        $('[data-boot-loading]').hidden = true;
        $('[data-boot-error]').hidden = false;
        $('[data-boot-error-text]').textContent = error.message;
        return;
    }
    resolveInitialBank();
    restoreSavedState();
    views['/'] = createHomeView(ctx);
    views['/exam'] = createExamView(ctx);
    views['/result'] = createResultView(ctx);
    views['/history'] = createHistoryView(ctx);
    router = createRouter(route);
    router.render();
}
setupColorScheme(store, $('[data-scheme-toggle]'));
['#shortcuts-dialog', '#map-sheet', '#privacy-dialog'].forEach(selector => setupDialog($(selector), { lightDismiss: true }));
['#confirm-dialog', '#submit-dialog'].forEach(selector => setupDialog($(selector), { lightDismiss: false }));
$('[data-skip-link]').addEventListener('click', event => {
    event.preventDefault();
    if (activeView) {
        activeView.focusTarget().focus();
    } else {
        $('#main').focus();
    }
});
$('[data-open-privacy]').addEventListener('click', () => showModal($('#privacy-dialog')));
$('[data-clear-data]').addEventListener('click', clearAllData);
$('[data-boot-retry]').addEventListener('click', boot);
window.addEventListener('beforeunload', event => {
    if (ctx.session && ctx.unsaved) event.preventDefault();
});
boot();