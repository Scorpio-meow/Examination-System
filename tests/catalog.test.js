import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { isSafeBankFile, resolveBankUrl, validateCatalog } from '../js/catalog.js';
const catalogJson = JSON.parse(readFileSync(new URL('../json/banks.json', import.meta.url), 'utf8'));
const catalogUrl = 'https://example.github.io/Examination-System/json/banks.json';
function cloneCatalog() {
    return structuredClone(catalogJson);
}
test('實際的 json/banks.json 通過驗證', () => {
    const catalog = validateCatalog(catalogJson);
    expect(catalog.banks).toHaveLength(11);
    expect(catalog.byFile.get(catalog.defaultBank).group).toBe('erp');
});
describe('isSafeBankFile', () => {
    test.each([
        'IPAS-AI-L12-A.json',
        'ERP Planner_Reference Question Types_202509_V06.json'
    ])('允許 %s', file => expect(isSafeBankFile(file)).toBe(true));
    test.each([
        '../secret.json',
        'sub/bank.json',
        'sub\\bank.json',
        'banks.json',
        '.hidden.json',
        'bank.js',
        'bank.json?x=1',
        'bank.json#frag',
        '%2e%2e.json',
        ''
    ])('拒絕 %s', file => expect(isSafeBankFile(file)).toBe(false));
});
describe('resolveBankUrl', () => {
    test('網址留在 json 資料夾內並編碼空白', () => {
        expect(resolveBankUrl('ERP Planner_Reference Question Types_202509_V06.json', catalogUrl))
            .toBe('https://example.github.io/Examination-System/json/ERP%20Planner_Reference%20Question%20Types_202509_V06.json');
    });
    test('不安全的檔名直接拒絕', () => {
        expect(() => resolveBankUrl('../app.js', catalogUrl)).toThrow('不允許的題庫檔名');
    });
});
describe('validateCatalog 拒絕不一致的目錄', () => {
    test('重複檔名', () => {
        const catalog = cloneCatalog();
        catalog.banks.push({ ...catalog.banks[0] });
        expect(() => validateCatalog(catalog)).toThrow('重複的檔名');
    });
    test('缺少題數統計', () => {
        const catalog = cloneCatalog();
        delete catalog.banks[0].questionCount;
        expect(() => validateCatalog(catalog)).toThrow('build:banks');
    });
    test('題型統計與題數不符', () => {
        const catalog = cloneCatalog();
        catalog.banks[0].typeCounts.single -= 1;
        expect(() => validateCatalog(catalog)).toThrow('題型統計與題數不符');
    });
    test('分組不存在', () => {
        const catalog = cloneCatalog();
        catalog.banks[0].group = 'unknown';
        expect(() => validateCatalog(catalog)).toThrow('不存在的分組');
    });
    test('預設題庫不在清單中', () => {
        const catalog = cloneCatalog();
        catalog.defaultBank = 'missing.json';
        expect(() => validateCatalog(catalog)).toThrow('defaultBank');
    });
});