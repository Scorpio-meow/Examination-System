# 安全政策

**繁體中文** | [English](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/.github/SECURITY_en.md)

考試系統是部署在 GitHub Pages 的純前端靜態網站，沒有伺服器端程式、帳號或資料庫，所有資料只存在使用者自己的瀏覽器 localStorage。即使如此，仍重視任何可能讓使用者受害的漏洞，感謝你協助負責任地揭露。

## 支援的版本

[線上版](https://scorpio-meow.github.io/Examination-System/)一律部署最新版本，安全修正只會發布在最新的主要版本。

| 版本 | 安全修正 |
|---|---|
| 4.x（最新版） | ✅ |
| 4.0 以前 | ❌ |

如果你自行部署舊版本，請先更新到最新版本再回報。

## 回報漏洞

**請不要在公開的 Issue、Pull Request 或討論區揭露漏洞細節。**

請擇一管道私下回報：

1. **GitHub 私下回報（建議）**：到本專案的 **Security** 分頁按 **Report a vulnerability**，或直接開啟[私下回報表單](https://github.com/Scorpio-meow/Examination-System/security/advisories/new)。內容只有你和維護者看得到。
2. **電子郵件**：無法使用 GitHub 時，寄到 [yao921024@gmail.com](mailto:yao921024@gmail.com)，主旨開頭加上 `[Security] Examination-System`。電子郵件不是端對端加密，信裡先簡述問題就好，細節等收到回覆後再提供。

回報時請盡量附上：

- 受影響的版本（頁尾顯示的版本號）或 commit。
- 受影響的檔案、功能或畫面。
- 重現步驟或概念驗證（PoC），例如可觸發問題的題庫 JSON、網址或 localStorage 內容。
- 可能造成的影響，以及你建議的修正方式（選填）。

重現時請用假的資料，不要附上真實的個人資料。

## 處理流程與時限

本專案由個人維護，沒有漏洞獎勵，但會遵守以下時限：

| 階段 | 時限 |
|---|---|
| 確認收到並首次回覆 | 收到回報後 14 天內 |
| 公開漏洞細節 | 修正發布時，最晚在回報後 90 天 |

1. **確認收到**：回覆已收到，並說明初步評估。
2. **評估**：確認是否屬於漏洞、影響範圍與嚴重程度，必要時向你詢問細節；不屬於漏洞時會說明原因。
3. **修正**：在私下的 GitHub Security Advisory 中與你討論修正方式，你也可以在其中的私人分支提交修正。
4. **發布**：發布修正版本並更新線上版、公開 Security Advisory，適用時透過 GitHub 申請 CVE 編號，並在 [CHANGELOG.md](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/CHANGELOG.md) 的「安全性 (Security)」區塊記錄。
5. **致謝**：你願意的話，會在 Advisory 中列名致謝。

修正發布前請不要公開漏洞細節。90 天內來不及修正時，會在期限前向你說明原因，並協商新的公開日期。

## 範圍

### 範圍內

- 透過題庫內容、網址參數或 localStorage 資料造成的 XSS 或任意 HTML 注入。
- 繞過 `json/banks.json` 白名單、檔名規則或 `json/` 資料夾限制，載入非預期的檔案。
- 繞過 `index.html` 的內容安全政策（CSP）。
- 匯出的 CSV 在試算表軟體中觸發公式注入。
- 損毀或竄改的 localStorage 資料造成原型污染或執行非預期的程式。
- 本機資料被傳送到第三方。

### 不在範圍內

| 項目 | 原因 |
|---|---|
| 在瀏覽器中可以看到題目與答案 | 設計使然。本系統定位為自學工具，題庫公開於用戶端，不具防弊能力，詳見 [README 安全防禦與架構限制](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/README.md#安全防禦與架構限制) |
| 使用者修改自己的 localStorage 或用開發者工具竄改分數 | 只影響使用者自己的瀏覽器，不會影響其他人 |
| Self-XSS | 需要受害者自行在開發者工具貼上並執行程式碼 |
| GitHub Pages 無法設定的 HTTP 回應標頭，例如 `X-Frame-Options` 或以標頭傳送的 CSP `frame-ancestors` | 屬於靜態託管平台的限制，且網站沒有登入或其他敏感操作 |
| 題目、答案或解析的內容錯誤 | 請使用[題目錯誤回報](https://github.com/Scorpio-meow/Examination-System/issues/new?template=question_error.yml) |
| 只有自動掃描工具輸出、沒有說明實際影響的報告 | 無法評估是否構成風險 |

## 安全設計

本系統已實作的防禦機制請參閱：

- [ADR-001：用戶端資料安全與防禦性驗證機制](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/docs/adr/ADR-001-local-security-validation.md)
- [ADR-002：前端重構](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/docs/adr/ADR-002-frontend-architecture.md)
