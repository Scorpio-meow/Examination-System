# 貢獻指南 (Contributing)

[English Version](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/.github/en/CONTRIBUTING.md)

感謝你願意協助改善考試系統！本專案是由個人維護的純前端自學練習工具，歡迎回報問題、修正題目、改善無障礙與提交程式碼。參與本專案即表示你同意遵守[行為準則](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/.github/CODE_OF_CONDUCT.md)。

---

## 目錄

- [參與方式](#參與方式)
- [開發環境](#開發環境)
- [程式慣例](#程式慣例)
- [新增或修正題庫](#新增或修正題庫)
- [文件](#文件)
- [Commit 訊息](#commit-訊息)
- [Pull Request 流程](#pull-request-流程)
- [授權](#授權)

---

## 參與方式

| 想做的事 | 管道 |
|----------|------|
| 回報程式錯誤 | [錯誤回報](https://github.com/Scorpio-meow/Examination-System/issues/new?template=bug_report.yml) |
| 回報題目、答案或解析錯誤 | [題目錯誤回報](https://github.com/Scorpio-meow/Examination-System/issues/new?template=question_error.yml) |
| 回報無障礙障礙 | [無障礙問題回報](https://github.com/Scorpio-meow/Examination-System/issues/new?template=accessibility.yml)，並參閱[無障礙聲明](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/.github/ACCESSIBILITY.md) |
| 建議新功能或新題庫 | [功能建議](https://github.com/Scorpio-meow/Examination-System/issues/new?template=feature_request.yml) |
| 回報安全性漏洞 | **請勿開公開 Issue**，依[安全政策](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/.github/SECURITY.md)私下回報 |
| 修正程式或文件 | 依下方[Pull Request 流程](#pull-request-流程)提交 |

開 Issue 前請先搜尋[既有 Issue](https://github.com/Scorpio-meow/Examination-System/issues?q=is%3Aissue)，避免重複。新功能、架構調整或新增題庫等較大的變更，請先開 Issue 討論方向，確認後再動工。

---

## 開發環境

網站本身沒有建置步驟，也沒有任何需要安裝的依賴套件。開發只需要：

- [Bun](https://bun.sh/)：執行單元測試與題庫統計腳本。
- 任一靜態網頁伺服器：瀏覽器不允許在 `file://` 下載入 ES modules 與題庫 JSON，啟動方式請參閱 [README 快速開始](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/README.md#快速開始)。

提交前請確認下列指令都通過：

```bash
bun test
```

```bash
bun run check:banks
```

---

## 程式慣例

完整的設計決策請參閱 [ADR-001](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/docs/adr/ADR-001-local-security-validation.md) 與 [ADR-002](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/docs/adr/ADR-002-frontend-architecture.md)。

### 架構

- **零執行期依賴**：不加入 npm 套件、CDN 資源或外部字型。`index.html` 的 CSP 只允許 `'self'`，外部資源會被瀏覽器阻擋。
- **不使用內嵌程式與樣式**：HTML 中不寫內嵌 `<script>`、`<style>`、`style` 屬性或 `onclick` 等行內事件，這些都會被 CSP 阻擋。
- **模組分工**：純邏輯放在 `js/` 共用模組且不碰 DOM，並在 `tests/` 補上 `bun test` 測試；畫面相關程式放在 `js/views/`；`app.js` 只負責啟動、路由與跨畫面流程。

### 安全

- 建立 DOM 一律使用 `js/dom.js` 的 `h()`、`svg()`，文字以 `text` 屬性（`textContent`）帶入，不使用 `innerHTML`。
- 從 localStorage、網址參數或題庫讀入的資料一律先驗證結構。格式不符時略過或捨棄並在 console 說明原因，不產生替代內容或猜測的預設值。
- 新增匯出欄位時沿用 `js/export.js` 的 CSV 公式字元轉義。

### 樣式與無障礙

- 顏色使用 `style.css` 的 token，淺色與深色都要定義，並符合 WCAG AA 對比。
- 觸控目標至少 44px；動畫放在 `@media (prefers-reduced-motion: no-preference)` 中。
- 互動元件必須能只用鍵盤操作，焦點清楚可見；新增單鍵快捷鍵時要能在進階設定關閉。詳見[無障礙聲明](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/.github/ACCESSIBILITY.md)。

### 風格

沿用周圍程式碼的寫法：4 個空白縮排、單引號、敘述結尾加分號。

---

## 新增或修正題庫

### 新增題庫

1. 依 [README 資料結構規範](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/README.md#資料結構規範)將題庫 JSON 放入 `json/`。檔名必須符合 `^[A-Za-z0-9][A-Za-z0-9 _.-]*\.json$`。
2. 在 `json/banks.json` 的 `banks` 加入一筆資料（`file`、`group`、`title`、`shortTitle`，可選 `subtitle`）。
3. 執行 `bun run build:banks` 產生題數統計，並確認沒有出現警告。

```bash
bun run build:banks
```

### 修正題目、答案或解析

- 在 Pull Request 中附上修正依據，例如官方公告、教材名稱與頁碼或法規條文。
- 只修改確定有誤的欄位，不要順手改寫其他題目的措辭。
- 修改題庫內容後同樣要執行 `bun run build:banks`，讓目錄統計保持一致。

### 內容來源與授權

- 只提交你有權公開的內容。來自官方公告的題目請註明來源與年度。
- 不接受翻拍、轉載未經授權的付費教材或題庫。
- 沒有可靠依據時請保留解析空白，不要撰寫猜測的解析。

---

## 文件

- **中英雙語**：README、CHANGELOG、ADR 都有中文版與 `.en.md` 英文版，本指南的英文版則放在 `.github/en/`，修改其中一份時請同步更新另一份。若無法撰寫另一種語言，請在 Pull Request 中說明，由維護者補上。
- **更新日誌**：使用者看得到的變更，記錄在 [CHANGELOG.md](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/CHANGELOG.md) 的 `[Unreleased]` 區塊，格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/)。
- **架構決策**：影響整體架構的決策，請在 `docs/adr/` 新增 ADR，沿用既有 ADR 的「狀態、上下文、決策、結果與權衡」結構。

---

## Commit 訊息

遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hant/v1.0.0/)，描述可使用繁體中文：

| 類型 | 用途 | 範例 |
|------|------|------|
| `feat` | 新功能 | `feat: 新增專案管理進階題庫` |
| `fix` | 修正錯誤 | `fix: 修正簡答題比對忽略全形空白` |
| `docs` | 文件 | `docs: 補充題庫格式說明` |
| `style` | 不影響行為的格式調整 | `style: 統一題庫 JSON 縮排` |
| `refactor` | 不改變行為的重構 | `refactor: 拆分結果頁回顧分頁` |
| `perf` | 效能改善 | `perf: 延遲載入歷史趨勢圖` |
| `test` | 測試 | `test: 補上 v3 設定轉換案例` |
| `chore` | 工具與雜項 | `chore: 更新開發腳本` |

破壞性變更請在類型後加上 `!`，例如 `feat!: 變更題庫目錄格式`，並在內文說明遷移方式。

---

## Pull Request 流程

1. Fork 本專案，從預設分支建立工作分支，例如 `feature/practice-timer`、`fix/csv-export` 或 `docs/contributing`。
2. 完成修改後執行 `bun test` 與 `bun run check:banks`。
3. 開啟 Pull Request 並填寫範本：變更內容、關聯 Issue 與測試方式。
4. 介面變更請附上淺色、深色與 375px 寬手機畫面的截圖，並說明鍵盤操作是否正常。
5. 維護者審查後可能要求修改，請直接推送到同一個分支，不需要另開 Pull Request。

一個 Pull Request 只處理一件事，較容易審查，也較快合併。

---

## 授權

你提交的程式碼與自行撰寫的內容（例如解析與文件），皆依本專案的 [MIT License](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/LICENSE) 釋出。轉載自官方公告的題目，權利仍屬原權利人，請在 Pull Request 中註明來源。[行為準則](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/.github/CODE_OF_CONDUCT.md)改編自 Contributor Covenant，另依 CC BY-SA 4.0 授權。