const BANK_FILE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 _.-]*\.json$/;
const GROUP_ID_PATTERN = /^[a-z][a-z0-9-]*$/;
const MAX_TEXT_LENGTH = 200;
const CATALOG_FILE = 'banks.json';
export function isSafeBankFile(file) {
    return typeof file === 'string' &&
        file.length <= MAX_TEXT_LENGTH &&
        file !== CATALOG_FILE &&
        BANK_FILE_PATTERN.test(file);
}
function requireText(value, field, { optional = false } = {}) {
    if (optional && value === undefined) return undefined;
    if (typeof value !== 'string' || !value.trim() || value.length > MAX_TEXT_LENGTH) {
        throw new Error(`題庫目錄欄位「${field}」格式錯誤`);
    }
    return value.trim();
}
function requireCount(value, field, max) {
    if (!Number.isInteger(value) || value < 0 || value > max) {
        throw new Error(`題庫目錄欄位「${field}」必須是 0–${max} 的整數，請執行 bun run build:banks 更新統計`);
    }
    return value;
}
export function validateCatalog(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('題庫目錄格式錯誤');
    }
    if (!Array.isArray(data.groups) || data.groups.length === 0 || !Array.isArray(data.banks) || data.banks.length === 0) {
        throw new Error('題庫目錄缺少 groups 或 banks');
    }
    const groups = data.groups.map((group, index) => {
        if (!group || typeof group.id !== 'string' || !GROUP_ID_PATTERN.test(group.id)) {
            throw new Error(`題庫目錄第 ${index + 1} 個分組的 id 格式錯誤`);
        }
        return { id: group.id, title: requireText(group.title, `groups[${index}].title`) };
    });
    const groupIds = new Set(groups.map(group => group.id));
    if (groupIds.size !== groups.length) {
        throw new Error('題庫目錄有重複的分組 id');
    }
    const banks = data.banks.map((bank, index) => {
        const where = `banks[${index}]`;
        if (!bank || typeof bank !== 'object' || !isSafeBankFile(bank.file)) {
            throw new Error(`題庫目錄 ${where}.file 不是允許的檔名`);
        }
        if (!groupIds.has(bank.group)) {
            throw new Error(`題庫目錄 ${where}.group 指向不存在的分組`);
        }
        const questionCount = requireCount(bank.questionCount, `${where}.questionCount`, 5000);
        if (questionCount === 0) {
            throw new Error(`題庫目錄 ${where} 沒有任何題目`);
        }
        const typeCounts = bank.typeCounts && typeof bank.typeCounts === 'object' ? bank.typeCounts : {};
        const single = requireCount(typeCounts.single, `${where}.typeCounts.single`, questionCount);
        const saq = requireCount(typeCounts.saq, `${where}.typeCounts.saq`, questionCount);
        if (single + saq !== questionCount) {
            throw new Error(`題庫目錄 ${where} 的題型統計與題數不符，請執行 bun run build:banks`);
        }
        return {
            file: bank.file,
            group: bank.group,
            title: requireText(bank.title, `${where}.title`),
            shortTitle: requireText(bank.shortTitle, `${where}.shortTitle`),
            subtitle: requireText(bank.subtitle, `${where}.subtitle`, { optional: true }),
            questionCount,
            typeCounts: { single, saq },
            explanationCount: requireCount(bank.explanationCount, `${where}.explanationCount`, questionCount)
        };
    });
    const byFile = new Map(banks.map(bank => [bank.file, bank]));
    if (byFile.size !== banks.length) {
        throw new Error('題庫目錄有重複的檔名');
    }
    if (!byFile.has(data.defaultBank)) {
        throw new Error('題庫目錄的 defaultBank 不在 banks 清單中');
    }
    return { defaultBank: data.defaultBank, groups, banks, byFile };
}
export function resolveBankUrl(file, catalogUrl) {
    if (!isSafeBankFile(file)) {
        throw new Error(`不允許的題庫檔名：${file}`);
    }
    const folder = new URL('./', catalogUrl);
    const url = new URL(file, folder);
    if (url.origin !== folder.origin || !url.pathname.startsWith(folder.pathname)) {
        throw new Error(`題庫檔位置超出允許範圍：${file}`);
    }
    return url.href;
}
export async function loadCatalog(catalogUrl, fetchImpl) {
    const response = await fetchImpl(catalogUrl).catch(() => {
        throw new Error('無法連線到伺服器，請檢查網路連線');
    });
    if (!response.ok) {
        throw new Error(`伺服器回應 HTTP ${response.status}`);
    }
    const data = await response.json().catch(() => {
        throw new Error('題庫目錄不是有效的 JSON');
    });
    return validateCatalog(data);
}