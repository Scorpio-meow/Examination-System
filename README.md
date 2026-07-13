# 考試系統 (Examination System)

> 基於純前端技術打造的知識測驗平台，支援多種專業題庫、隨機抽題、進度自動保存與結果匯出。

[![版本](https://img.shields.io/badge/版本-3.5.2-brightgreen?style=flat-square)](CHANGELOG.md)
[![授權](https://img.shields.io/badge/授權-MIT-orange?style=flat-square)](LICENSE)
[![更新日期](https://img.shields.io/badge/更新日期-2026--06--03-blue?style=flat-square)](CHANGELOG.md)
[![GitHub Pages](https://img.shields.io/badge/線上試用-GitHub%20Pages-brightgreen?style=flat-square&logo=github)](https://scorpio-meow.github.io/Examination-System/)
[![Issues](https://img.shields.io/github/issues/Scorpio-meow/Examination-System?style=flat-square)](https://github.com/Scorpio-meow/Examination-System/issues)
[![Pull Requests](https://img.shields.io/github/issues-pr/Scorpio-meow/Examination-System?style=flat-square)](https://github.com/Scorpio-meow/Examination-System/pulls)

---

## 目錄

- [快速開始](#快速開始)
- [線上試用](#線上試用)
- [功能特色](#功能特色)
- [題庫內容](#題庫內容)
- [檔案結構](#檔案結構)
- [技術架構](#技術架構)
- [開發指南](#開發指南)
- [使用說明](#使用說明)
- [安全與隱私](#安全與隱私)
- [疑難排解](#疑難排解)
- [常見問題](#常見問題)
- [版本記錄](#版本記錄)
- [貢獻指南](#貢獻指南)
- [聯絡方式](#聯絡方式)

---

## 快速開始

**線上使用（最快）**：直接前往 [https://scorpio-meow.github.io/Examination-System/](https://scorpio-meow.github.io/Examination-System/)，無需任何安裝。

**本機執行**：

1. 下載或 Clone 本專案：
   ```bash
   git clone https://github.com/Scorpio-meow/Examination-System.git
   cd Examination-System
   ```

2. 啟動本機伺服器（必要，避免瀏覽器對 `file://` 的安全限制）：

   - **macOS / Linux**
     ```bash
     python3 -m http.server 8000
     ```
   - **Windows（PowerShell）**
     ```powershell
     py -3 -m http.server 8000
     ```

3. 在瀏覽器中開啟 [http://localhost:8000](http://localhost:8000)

4. 從「選擇題庫」下拉選單選擇題庫，按「開始考試」即可。

> **注意**：直接用檔案總管雙擊 `index.html` 開啟，會因瀏覽器安全限制導致題庫 JSON 載入失敗，請務必使用本機伺服器。

---

## 線上試用

本專案已部署於 GitHub Pages，無需安裝，開箱即用：

**[https://scorpio-meow.github.io/Examination-System/](https://scorpio-meow.github.io/Examination-System/)**

---

## 功能特色

### 考試功能

| 功能 | 說明 |
|------|------|
| 多種專業題庫 | 涵蓋專案管理、理財規劃、IPAS AI、ERP 等多個領域 |
| 多樣題型 | 單選題（4 選項）與簡答題（SAQ） |
| 隨機抽題 | 支援抽取全部、10、20、30、50、100 題或自訂數量 |
| 題目與選項亂序 | 每次考試順序不同，避免記憶位置 |
| 詳細解釋 | 每題附解析，幫助深度理解 |
| 無時間限制 | 自由掌控答題節奏 |
| 自訂及格分數 | 預設 60 分，可於設定面板調整（0–100） |
| 題號快速跳轉 | 右側側邊欄顯示所有題號，已答/未答即時標示 |

### 進度與設定

| 功能 | 說明 |
|------|------|
| 自動保存進度 | 意外關閉後仍可繼續作答 |
| 題庫隔離 | 不同題庫進度互不干擾 |
| 智慧恢復提示 | 重開頁面時提供選擇：繼續 or 重新開始 |
| 本機資料 TTL | 進度、設定、歷史預設保存 7 天後自動清除 |
| 深色/淺色主題 | 自動偵測系統偏好，亦可手動切換 |
| 答案解釋顯示 | 結果頁可選擇是否展開詳細解析 |

### 結果分析與匯出

- 詳細成績報告（總分、正確率、是否及格）
- 錯題列表，附解析說明
- 歷史記錄（含題庫名稱）
- 一鍵匯出 **JSON** 或 **CSV**（UTF-8 with BOM，Excel 友好，含公式注入防護）

#### 匯出欄位

CSV 與 JSON 均以「每題一筆」輸出，欄位如下：

| # | 欄位名稱 | 說明 |
|---|----------|------|
| 1 | 編號 | 題目序號 |
| 2 | ID | 題庫原始 ID |
| 3 | 類型 | `單選題` / `簡答題` |
| 4 | 題目 | 題目內容 |
| 5 | 選項 | 各選項文字（換行分隔） |
| 6 | 作答 | 使用者作答 |
| 7 | 解答 | 正確答案 |
| 8 | 是否正確 | `是` / `否` |
| 9 | 解釋 | 答題解析 |
| 10 | 題庫標籤 | 題庫名稱 |
| 11 | 匯出時間 | ISO 8601 格式 |

**JSON 輸出範例：**

```json
[
  {
    "編號": 1,
    "ID": 101,
    "類型": "單選題",
    "題目": "專案的三大限制為何？",
    "選項": "A. 範疇\nB. 時程\nC. 成本\nD. 品質",
    "作答": "A",
    "解答": "A",
    "是否正確": "是",
    "解釋": "傳統三角形限制為範疇、時程、成本。",
    "題庫標籤": "專案管理",
    "匯出時間": "2025-08-16T10:15:30.000Z"
  }
]
```

### 使用者體驗

- **響應式設計**：桌機、平板、手機全支援
- **鍵盤快捷鍵**：提升操作效率（詳見[使用說明](#使用說明)）
- **無障礙支援**：ARIA 標籤、螢幕閱讀器通知、完整鍵盤導航、WCAG AA 對比度
- **即時視覺反饋**：選擇選項時即時高亮

---

## 題庫內容

### 可用題庫一覽

| 題庫名稱 | 檔案 | 說明 |
|----------|------|------|
| 專案管理 | `Project_Management.json` | 12 項原則、8 大績效領域等 PMI 核心知識 |
| 理財規劃 | `Basic_Financial_Planning.json` | 基本財務觀念、投資、保險、退休規劃 |
| IPAS L11-A | `IPAS-AI-L11-A.json` | AI 基礎與治理（A 卷） |
| IPAS L11-B | `IPAS-AI-L11-B.json` | AI 基礎與治理（B 卷） |
| IPAS L11 #130994 | `IPAS-AI-L11-130994.json` | 114 年科目一 L1101 正式考題 |
| IPAS L12-A | `IPAS-AI-L12-A.json` | 生成式 AI 應用與規劃（A 卷） |
| IPAS L12-B | `IPAS-AI-L12-B.json` | 生成式 AI 應用與規劃（B 卷） |
| IPAS L12-C | `IPAS-AI-L12-C.json` | 生成式 AI 應用與規劃（C 卷） |
| IPAS L12-D | `IPAS-AI-L12-D.json` | 生成式 AI 應用與規劃（D 卷） |
| ERP 規劃師參考題型 | `ERP Planner_Reference Question Types_202509_V06.json` | ERP 規劃師核心概念與參考題型 |
| ERP 基礎檢定 | `PFERP_Reference119_20240201.json` | ERP 基礎檢定學科題型 |

### 各題庫重點說明

**專案管理（PMI PMBOK）**
- 12 項原則：管家式服務、協作、價值、系統思考、領導力、品質、複雜性、風險、適應性與韌性、變革管理等
- 8 大績效領域：利害關係人、團隊、開發方法與生命週期、規劃、專案工作、交付、衡量、不確定性

**理財規劃**
- 基本財務觀念與計算
- 投資工具與策略
- 風險評估與管理
- 退休規劃與資產配置
- 保險與稅務規劃

**IPAS AI 應用規劃師（L11、L12）**
- No Code / Low Code 選型、擴充、效能與成本考量
- 生成式 AI 應用（提示策略、seed 控制、一致性）
- RAG、微調、合規/隱私與治理框架
- 敏捷與產品交付實務、風險控管

**ERP 題庫**
- 企業資源規劃基礎概念
- ERP 規劃師與基礎檢定考題

---

## 檔案結構

```
Examination-System/
├── index.html                  # 主頁面（UI 結構與設定面板）
├── app.js                      # 核心應用程式邏輯
├── style.css                   # 樣式表（CSS 變數、深/淺色主題）
├── favicon.png                 # 網站圖示
├── robots.txt                  # 搜尋引擎爬蟲設定
├── sitemap.xml                 # SEO Sitemap
├── CHANGELOG.md                # 版本更新歷史
├── LICENSE                     # MIT 授權條款
├── README.md                   # 本說明文件
├── llms.txt                    # AI 友善的專案說明文件
├── json/                       # 題庫目錄
│   ├── Project_Management.json
│   ├── Basic_Financial_Planning.json
│   ├── IPAS-AI-L11-A.json
│   ├── IPAS-AI-L11-B.json
│   ├── IPAS-AI-L11-130994.json
│   ├── IPAS-AI-L12-A.json
│   ├── IPAS-AI-L12-B.json
│   ├── IPAS-AI-L12-C.json
│   ├── IPAS-AI-L12-D.json
│   ├── ERP Planner_Reference Question Types_202509_V06.json
│   └── PFERP_Reference119_20240201.json
└── docs/
    ├── screenshots/            # 功能截圖
    └── adr/                    # 架構決策紀錄 (ADR)
        └── ADR-001-local-security-validation.md
```

---

## 技術架構

| 項目 | 說明 |
|------|------|
| 核心技術 | 純 HTML5 + CSS3 + Vanilla JavaScript（無任何框架依賴） |
| 本地儲存 | LocalStorage（含 TTL 機制與結構驗證） |
| 題庫格式 | JSON（含 Schema 驗證） |
| 主題系統 | CSS 變數 + `prefers-color-scheme` 媒體查詢 |
| 部署平台 | GitHub Pages（HTTPS 強制） |
| 外部依賴 | 零（無供應鏈風險） |

### 系統需求

| 瀏覽器 | 最低版本 |
|--------|----------|
| Chrome | 70+ |
| Firefox | 65+ |
| Safari | 12+ |
| Edge | 79+ |
| Opera | 60+ |

- 需啟用 **JavaScript**
- 需允許 **LocalStorage**（請勿使用無痕/隱私模式，否則進度無法保存）

---

## 開發指南

### 新增題庫

1. 依照以下 JSON 格式建立題庫檔案，放入 `json/` 目錄：

   **單選題格式：**
   ```json
   [
     {
       "id": 1,
       "question": "題目內容",
       "options": [
         "A. 選項A",
         "B. 選項B",
         "C. 選項C",
         "D. 選項D"
       ],
       "answer": "B",
       "explanation": "答案解釋"
     }
   ]
   ```

   **簡答題格式：**
   ```json
   [
     {
       "id": 2,
       "question": "簡答題內容",
       "type": "SAQ",
       "answer": "標準答案",
       "explanation": "答案解釋"
     }
   ]
   ```

2. 在 `index.html` 的 `question-bank-select` 下拉選單新增對應 `<option>`：
   ```html
   <option value="My_New_Bank.json">我的新題庫</option>
   ```

3. 在 `app.js` 的 `ALLOWED_BANKS` 白名單陣列中加入檔名：
   ```javascript
   const ALLOWED_BANKS = [
     // ... 現有項目
     'My_New_Bank.json',
   ];
   ```

> **命名建議**：使用 `<Domain>_<Topic>.json` 或 `IPAS-<Letter>.json` 格式，便於識別。

### 本機開發建議

- 使用 Python 的 `http.server` 或任何靜態檔案伺服器（如 VS Code Live Server）
- 開發環境下 `console.log` / `console.info` 訊息完整可見；生產環境（GitHub Pages）自動隱藏，僅保留 `warn` / `error`

---

## 使用說明

### 考試流程

1. **設定題庫與選項**：首頁選擇題庫、設定隨機抽題數量、調整其他偏好
2. **開始考試**：按「開始考試」進入答題頁
3. **答題**：點擊選項（單選題）或輸入文字（簡答題），可隨時跳題
4. **提交**：最後一題作答完畢後按「提交」或按 Enter
5. **查看結果**：成績頁面顯示總分、正確率、錯題解析
6. **匯出**：可一鍵匯出 JSON 或 CSV 結果檔

### 鍵盤快捷鍵

| 快捷鍵 | 功能 |
|--------|------|
| `←` / `→` | 上一題 / 下一題 |
| `1` – `4` | 快速選擇選項 A–D（僅單選題） |
| `Enter`（答題中） | 跳至下一題；最後一題時提交考試 |
| `Enter`（結果頁） | 重新開始考試 |

### 題號側邊欄

- 右側顯示所有題號按鈕，點擊可直接跳轉至該題
- **綠色描邊**：已作答；**低透明度**：未作答；**高亮**：目前所在題目
- 側邊欄同步顯示已答/未答題數統計

### 考試設定選項

| 設定 | 說明 | 預設值 |
|------|------|--------|
| 選擇題庫 | 從下拉選單選擇任一題庫 | ERP 規劃師 |
| 抽題數量 | 全部 / 10 / 20 / 30 / 50 / 100 / 自訂 | 全部 |
| 隨機打亂題目 | 每次考試題目順序不同 | 關閉 |
| 隨機打亂選項 | 選項順序隨機排列，自動更新正確答案 | 關閉 |
| 顯示答案解釋 | 結果頁是否展示詳細解析 | 開啟 |
| 及格分數 | 自訂及格標準（0–100） | 60 分 |

---

## 安全與隱私

關於本系統的詳細安全控制決策與設計考量，請參閱 [ADR-001: 用戶端資料安全與防禦性驗證機制](docs/adr/ADR-001-local-security-validation.md)。

### 已實施的安全控制

**前端安全**
- 完全移除 `innerHTML`，100% 使用 `textContent` 與 DOM API 防止 XSS
- 嚴格 CSP 政策（無 `unsafe-inline` / `unsafe-eval` / `data:` URI）
- 條件化 Logger：生產環境隱藏 `log` / `info`，保留 `warn` / `error`

**資料保護**
- LocalStorage TTL 機制（預設 7 天自動過期）
- CSV 匯出公式注入防護（前置單引號保護 `=`、`+`、`-`、`@` 開頭內容）
- JSON Schema 驗證，防止格式錯誤的題庫資料載入

**輸入驗證**
- 題庫白名單（`ALLOWED_BANKS`）防止路徑注入攻擊
- LocalStorage 進度 / 記錄 / 設定讀取前執行結構驗證
- 配置載入使用 `_sanitizeConfig()` 清理函式，取代不安全的物件展開合併

**部署安全**
- GitHub Pages HTTPS 強制啟用
- `.gitignore` 防止敏感檔案意外提交
- 零外部依賴，無供應鏈風險

### 架構限制說明

> **本系統為純前端個人學習工具**，所有題庫 JSON 檔案於瀏覽器公開可見，不適用於需要防弊的正式考試場景。所有邏輯均在瀏覽器端執行，無伺服器端驗證。

---

## 快速預覽

> 考試頁主畫面與右側題號側邊欄：

![Main Preview](docs/screenshots/preview.svg)
![Sidebar Preview](docs/screenshots/sidebar.svg)

> 設定面板與結果匯出：

![Settings Panel](docs/screenshots/settings-panel.svg)
![Result Export](docs/screenshots/result-export.svg)

---

## 疑難排解

| 問題 | 解決方式 |
|------|----------|
| 題庫載入失敗 / 顯示「題目載入失敗」 | 請使用本機伺服器開啟（見[快速開始](#快速開始)），勿直接雙擊 `index.html` |
| CSV 匯出後 Excel 顯示亂碼 | 使用「資料 > 自文字/CSV 匯入」並選擇 UTF-8 編碼；或先用記事本確認編碼 |
| 介面未更新 / 快捷鍵異常 | 重新整理並清除瀏覽器快取（Ctrl+Shift+R） |
| 歷史記錄遺失 | 歷史存於 LocalStorage；清除瀏覽器資料或使用隱私模式會導致記錄不可用 |
| 想清除本機所有資料 | 首頁「考試設定」面板 > 「清除所有本機資料」按鈕 |

---

## 常見問題

**Q：如何在手機上使用？**
A：直接在手機瀏覽器開啟[線上版本](https://scorpio-meow.github.io/Examination-System/)，系統採響應式設計，自動適應各種螢幕尺寸。

**Q：如何添加自己的題庫？**
A：參考[新增題庫](#新增題庫)章節，按 JSON 格式建立檔案、放入 `json/` 目錄，並在 `index.html` 下拉選單與 `app.js` 白名單中新增對應項目。

**Q：考試系統會記錄我的考試歷史嗎？**
A：會。系統使用瀏覽器 LocalStorage 記錄歷史，預設保存 7 天。清除瀏覽器資料或使用隱私模式會導致記錄消失。

**Q：如何匯出考試結果？**
A：在結果頁面點擊「匯出結果（JSON/CSV）」。CSV 以 UTF-8 with BOM 產生，通常可被 Excel 正確辨識；若遇亂碼，請用 Excel 的「資料匯入」功能並選擇 UTF-8 編碼。

**Q：考試有時間限制嗎？**
A：預設沒有時間限制，可依自己的節奏作答。

**Q：如何調整本機資料保存期限？**
A：系統預設保存 7 天（由 `storageTtlMs` 控制）。若需即時清除，可在首頁設定面板按「清除所有本機資料」。

**Q：選項亂序後，正確答案會跑掉嗎？**
A：不會。啟用選項亂序時，系統會自動重新標註 A–D 並同步更新正確答案標記，判分結果保持正確。

---

## 版本記錄

完整版本更新記錄請參閱 [CHANGELOG.md](CHANGELOG.md)。

**目前版本**：v3.5.2（2026-06-03）

**近期主要更新：**

| 版本 | 日期 | 重點 |
|------|------|------|
| 3.5.2 | 2026-06-03 | ERP 題庫解析補完、題庫統一移至 `json/` 目錄 |
| 3.5.1 | 2026-06-01 | 題庫白名單、LocalStorage 驗證、CSP 收緊 |
| 3.5.0 | 2026-06-01 | 隨機抽題功能、ERP 新題庫、UI 重構 |
| 3.4.1 | 2025-11-02 | 條件化日誌、系統定位說明、.gitignore |
| 3.4.0 | 2025-11-01 | 詳見 CHANGELOG |

---

## 貢獻指南

歡迎透過以下方式貢獻：

1. **回報問題**：前往 [GitHub Issues](https://github.com/Scorpio-meow/Examination-System/issues) 描述問題與重現步驟
2. **提交 PR**：
   - Fork 本專案
   - 建立功能分支（`git checkout -b feature/your-feature`）
   - 提交變更（`git commit -m 'feat: 描述功能'`）
   - 推送分支並開啟 Pull Request
3. **新增題庫**：依照[開發指南](#開發指南)中的格式提交題庫 JSON 檔案

---

## 聯絡方式

| 管道 | 連結 |
|------|------|
| **電子郵件** | [![Email](https://img.shields.io/badge/Email-yao921024%40gmail.com-blue?style=flat-square)](mailto:yao921024@gmail.com) |
| **Instagram** | [![Instagram](https://img.shields.io/badge/Instagram-%23E4405F.svg?style=flat-square&logo=Instagram&logoColor=white)](https://www.instagram.com/scorpio_meow_1024) |
| **Threads** | [![Threads](https://img.shields.io/badge/Threads-%23000000.svg?style=flat-square&logo=Threads&logoColor=white)](https://www.threads.com/@scorpio_meow_1024) |
| **問題回報** | [![GitHub issues](https://img.shields.io/github/issues/Scorpio-meow/Examination-System?style=flat-square)](https://github.com/Scorpio-meow/Examination-System/issues) |
| **協作開發** | [![GitHub Pull Requests](https://img.shields.io/github/issues-pr/Scorpio-meow/Examination-System?style=flat-square)](https://github.com/Scorpio-meow/Examination-System/pulls) |
| **專案首頁** | [![GitHub repo](https://img.shields.io/badge/GitHub-Repository-lightgrey?style=flat-square)](https://github.com/Scorpio-meow/Examination-System) |

---

## 授權條款

本專案採用 [MIT 授權條款](LICENSE)，允許自由使用、修改和分發。

---

> **考試系統** - 持續更新中，助您掌握專業知識，提升考試能力。