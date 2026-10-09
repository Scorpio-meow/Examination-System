
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { normalizeQuestions, summarizeQuestions } from '../js/bank.js';
import { validateCatalog } from '../js/catalog.js';
const jsonDir = fileURLToPath(new URL('../json/', import.meta.url));
const catalogPath = join(jsonDir, 'banks.json');
const checkOnly = process.argv.includes('--check');
const catalogText = await readFile(catalogPath, 'utf8');
const catalog = JSON.parse(catalogText);
const problems = [];
for (const bank of catalog.banks) {
    const raw = JSON.parse(await readFile(join(jsonDir, bank.file), 'utf8'));
    const { questions, warnings } = normalizeQuestions(raw);
    warnings.forEach(warning => problems.push(`${bank.file}：${warning}`));
    const { questionCount, typeCounts, explanationCount } = summarizeQuestions(questions);
    Object.assign(bank, { questionCount, typeCounts, explanationCount });
}
const listed = new Set(catalog.banks.map(bank => bank.file));
const unlisted = (await readdir(jsonDir)).filter(file => file.endsWith('.json') && file !== 'banks.json' && !listed.has(file));
unlisted.forEach(file => problems.push(`${file}：尚未加入 banks.json，網站不會載入這個題庫`));
validateCatalog(catalog);
const nextText = `${JSON.stringify(catalog, null, 2)}\n`;
problems.forEach(problem => console.warn(`警告：${problem}`));
if (checkOnly) {
    if (JSON.stringify(catalog) !== JSON.stringify(JSON.parse(catalogText))) {
        console.error('banks.json 的統計已過期，請執行 bun run build:banks');
        process.exit(1);
    }
    console.log(`banks.json 與 ${catalog.banks.length} 個題庫一致`);
} else {
    await writeFile(catalogPath, nextText);
    console.log(`已更新 banks.json（${catalog.banks.length} 個題庫）`);
}