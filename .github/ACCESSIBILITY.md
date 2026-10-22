# 無障礙聲明 (Accessibility Statement)

[English Version](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/.github/ACCESSIBILITY_en.md)

我們希望每個人都能使用考試系統練習與模擬考，包括只使用鍵盤、使用螢幕閱讀器、放大畫面、高對比模式或減少動態效果的使用者。本文說明我們的目標、目前的支援情況、已知限制，以及回報障礙的方式。

---

## 目標

- 以 [WCAG 2.2](https://www.w3.org/TR/WCAG22/) AA 等級為目標。
- 所有功能都能只用鍵盤完成，且焦點位置清楚可見。
- 淺色與深色主題的文字與元件對比皆符合 WCAG AA。
- 不設作答時間限制，計時只做為參考，並可隨時隱藏。

---

## 目前的支援

| 項目 | 實作方式 |
|------|----------|
| 鍵盤操作 | 所有按鈕、選項、對話框與題號地圖都能用鍵盤操作；考試頁可用 <kbd>←</kbd> <kbd>→</kbd> 換題，按 <kbd>?</kbd> 開啟快捷鍵說明 |
| 單鍵快捷鍵 | 數字鍵、<kbd>F</kbd>、<kbd>?</kbd> 可在「進階設定」關閉（WCAG 2.1.4），在輸入框打字或使用輸入法組字時不會觸發 |
| 略過導覽 | 頁面開頭提供「跳到主要內容」連結 |
| 語意結構 | 選項使用原生 radio，並放在以題幹命名的 `fieldset` 中；作答紀錄表格附有標題（caption） |
| 焦點管理 | 換頁後焦點移到該頁標題；對話框使用原生 `<dialog>`，關閉後焦點回到原本的按鈕 |
| 作答確認 | 練習模式用方向鍵、數字鍵或滑鼠都只會選取答案，按「核對答案」或 <kbd>Enter</kbd> 才顯示對錯；模擬考交卷前都能修改答案，交卷前一律開啟確認對話框（WCAG 3.3.4） |
| 狀態通告 | 切換題目、練習模式的對錯、標記與 Toast 提示都會透過 `aria-live` 通告 |
| 題號地圖 | 每個題號都有「第 N 題，已答／未答／答對／答錯，已標記」的名稱，目前題目以 `aria-current` 標示；答對與答錯另有勾與叉圖示，不只靠顏色區分 |
| 圖表替代 | 歷史分數趨勢圖可用滑鼠或方向鍵查看每次分數，並另有表格呈現相同資料 |
| 觸控目標 | 行動裝置上的觸控目標至少 44px，手機版提供固定底部操作列 |
| 減少動態效果 | 動畫只在 `prefers-reduced-motion: no-preference` 時播放 |
| 色彩主題 | 預設跟隨系統的淺色／深色設定，也可在頂部列手動切換 |
| 語言 | 頁面宣告 `lang="zh-TW"`，讓螢幕閱讀器使用正確的語音 |

### 驗收方式

v4.0.0 以 axe（WCAG 2.2 A／AA 與 best-practice 規則）掃描各畫面，結果為 0 違規；另以 E2E 測試與 Lighthouse 檢查主要流程，版面以 375px 寬的手機畫面驗收。詳見 [ADR-002](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/docs/adr/ADR-002-frontend-architecture.md)。

---

## 支援環境

本系統使用 `:has()`、`<dialog>` 與 ES modules 等已廣泛支援的網頁功能，不支援 2023 年以前的瀏覽器版本。

| 類型 | 環境 |
|------|------|
| 桌機瀏覽器 | 最新版 Chrome、Edge、Firefox、Safari |
| 行動裝置瀏覽器 | 最新版 iOS／iPadOS Safari、Android Chrome |
| 高對比模式 | Windows 強制色彩模式：開關與分段選項已另外調整，其他元件依瀏覽器的強制色彩呈現 |

---

## 已知限制

- **螢幕閱讀器測試**：目前記錄的驗收以自動化工具為主，尚未記錄以 NVDA、JAWS、VoiceOver 或 TalkBack 完整走過所有流程的結果。若你在使用輔助科技時遇到問題，特別歡迎回報。
- **題目中的英文術語**：題庫中的英文幾乎都是技術名詞與產品名稱（例如 RAG、Fine-tuning、VS Code）。WCAG 3.1.2 不要求標示技術名詞與專有名稱的語言，因此題庫內容沒有另外加上 `lang` 屬性，螢幕閱讀器會以中文語音朗讀這些詞。如果某段英文影響理解，歡迎回報。
- **介面語言**：介面只提供繁體中文。

---

## 回報無障礙問題

請使用[無障礙問題回報](https://github.com/Scorpio-meow/Examination-System/issues/new?template=accessibility.yml)範本開 Issue。若不方便使用 GitHub，也可以寄信至 [yao921024@gmail.com](mailto:yao921024@gmail.com)，主旨以 `[Accessibility]` 開頭。

回報時請盡量提供：

- 發生問題的畫面與操作步驟。
- 你預期的結果與實際發生的情況。
- 使用的瀏覽器、作業系統與輔助科技（例如螢幕閱讀器名稱與版本、放大倍率、是否開啟高對比或減少動態效果）。

### 嚴重程度

| 等級 | 說明 |
|------|------|
| 嚴重 (Critical) | 無法完成作答、交卷或查看成績，且沒有替代方式 |
| 重大 (Serious) | 可以完成，但必須依賴明顯困難的替代方式 |
| 中等 (Moderate) | 造成不便或混淆，但仍能正常完成 |
| 輕微 (Minor) | 不影響完成任務的小問題 |

### 處理方式

- 維護者會盡快回覆，說明是否能重現、可行的暫時替代方式，以及後續處理方向。
- 依嚴重程度排定處理順序，「嚴重」等級的問題優先修正。
- 修正後會在 [CHANGELOG.md](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/CHANGELOG.md) 記錄，並在 Issue 中通知。

---

## 維護與責任

本專案由維護者 [@Scorpio-meow](https://github.com/Scorpio-meow) 負責無障礙問題的分類、追蹤與本文的更新。新的介面變更都應符合[貢獻指南](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/.github/CONTRIBUTING.md#樣式與無障礙)中的無障礙要求。

---

## 意見回饋

如果你對本聲明或我們的無障礙做法有任何建議，歡迎開 Issue 或直接提交 Pull Request。