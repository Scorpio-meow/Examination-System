# Changelog

[繁體中文版](CHANGELOG.md)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [4.0.0] - 2026-10-09

A full rewrite of the interface and code architecture that resolves the 6 P0 and 31 P1–P3 issues found in the v3.5.2 UI/UX review. See [ADR-002](docs/adr/ADR-002-frontend-architecture.en.md) for the design decisions. The interface is in Traditional Chinese, so UI labels are quoted in Chinese with an English translation.

### Added
- **Bank Cards**: The home page lists the 11 banks in three groups (ERP, iPAS AI Application Planner, Management & Finance); each card shows a short name, question count, question types, whether explanations are included, and the last and best scores.
- **Start Panel**: Choose the mode and question count (10 / 20 / 50 / all / custom; choices larger than the bank are hidden), and the start button states the count, for example 「開始 20 題模擬考」 ("Start a 20-question exam"). The custom count and passing score are validated inline, and an exam cannot start before its bank has loaded. On narrow screens a floating start button appears once the start button scrolls out of view.
- **Practice Mode**: Each answer immediately shows right or wrong, the correct answer and the explanation, and is then locked; short answers use 「核對答案」 ("Check answer") to reveal the reference answer.
- **Wrong-Answer Retry**: 「重練錯題（N）」 ("Retry N wrong answers") on the result page redoes this attempt's wrong answers in practice mode. Retry attempts are recorded but do not count toward a bank's last and best scores or its trend chart.
- **Flags & Question Map**: Flag a question with <kbd>F</kbd> or the 「標記」 ("Flag") button. The question map marks current, answered, flagged and unanswered questions (plus right and wrong in practice mode), can filter to unanswered or flagged questions, and opens as a bottom sheet on phones.
- **Submission Dialog**: The 「交卷」 ("Submit") button stays in the exam top bar; the dialog lists answered, unanswered and flagged counts and can jump to the first unanswered question.
- **Leave Exam**: A new 「離開」 ("Leave") button on the exam page saves progress before returning home, just like the browser Back button.
- **Hash Routing**: Home `#/`, exam `#/exam`, result `#/result` and history `#/history`.
- **Score Summary**: The score ring changes color with the pass state and marks the passing line, with a pass badge, the change from the previous attempt, correct / wrong / unanswered / pending counts, the time spent and the average time per question.
- **Review Tabs**: Wrong, unanswered, pending self-grade, flagged and all; wrong and pending questions are expanded by default, everything can be expanded or collapsed, and 50 questions are shown per page.
- **Short-Answer Self-Grading**: Short answers that do not match are marked as pending and shown next to the reference answer; choosing 「我答對了」 / 「我答錯了」 ("I got it right" / "I got it wrong") updates the score and history immediately.
- **History Page**: Grouped by bank, with the last and best scores, a score trend chart (each score can be read with the mouse or the arrow keys, with a table alternative) and the attempt list.
- **Dark Mode**: Follows the system by default with a toggle in the top bar; `color-scheme` is written only after a manual choice, and the browser toolbar color follows the theme.
- **Shortcuts**: <kbd>F</kbd> flags a question and <kbd>?</kbd> opens the shortcut guide; number keys, <kbd>F</kbd> and <kbd>?</kbd> can be turned off in the advanced settings.
- **Timer Toggle**: The timer can be hidden during an exam, and the choice is remembered.
- **Data & Privacy**: A footer dialog explains how local data is kept and can clear all local data after confirmation.
- **Toasts**: Non-blocking messages for saved progress, exports, cleared data and storage failures.
- **Resume Progress Card**: The top of the home page shows unfinished progress (bank, mode, answered count, start time) with 「繼續作答」 ("Continue") and 「放棄並重新開始」 ("Discard and restart"), replacing the `confirm()` shown during page load.
- **Load Errors with Retry**: When the bank catalog or a bank fails to load, the reason (connection failure, HTTP status, invalid JSON, no usable questions) appears with a retry button.
- **Bank Catalog `json/banks.json`**: One place for groups, names and question statistics; `bun run build:banks` generates the statistics and `bun run check:banks` reports stale ones.
- **Unit Tests**: 98 `bun test` cases covering bank normalization, the catalog whitelist, storage validation and legacy migration, drawing and grading, history and CSV protection.
- **Architecture Decision Record**: Added [ADR-002](docs/adr/ADR-002-frontend-architecture.en.md) in Chinese and English.

### Changed
- **Code Architecture**: The single 1,700-line `app.js` is split into ES modules: the `app.js` entry point, 10 shared modules in `js/` and 4 view modules in `js/views/`. There are still no runtime dependencies, and the site still deploys directly to GitHub Pages.
- **New Interface & Stylesheet**: `style.css` is rewritten with `@layer` and design tokens; text and component contrast meets WCAG AA in both light and dark themes, touch targets are at least 44px, and `prefers-reduced-motion` is respected.
- **Dialogs**: Every native `confirm()` / `alert()` is replaced by `<dialog>` dialogs and toasts, and focus returns to the triggering button on close.
- **Native Radio Options**: Options are radio buttons inside a `fieldset` named by the question stem, so one click records one answer and the up and down arrow keys keep their native behavior.
- **Focus & Announcements**: Focus moves to the page heading after navigation, and question changes are announced through `aria-live`.
- **Mobile Layout**: The exam page has a fixed bottom bar (previous, question list, next), and bank cards form two columns on narrow screens.
- **Answer Keys**: Answers are keyed by the question's position in the bank (`q<n>`) instead of its `id`.
- **Session Structure v2**: Progress and the last result also store flags, checked questions, short-answer self-grades, answering time and the passing score at start. v3 progress, settings and history are migrated automatically, and data that cannot be fully understood is discarded.
- **Timing**: Only the time spent on the exam page counts; the time between leaving and resuming is excluded.
- **Question Counts**: The choices are now 10 / 20 / 50 / all / custom; saved 30- and 100-question settings become custom counts.
- **Settings**: Added `mode`, `showTimer` and `shortcuts`; `drawQuestionCount` / `customDrawCount` became `count` / `customCount` with automatic migration.
- **History**: The limit grows from 10 to 100 attempts, and each record also stores the mode, wrong / unanswered / pending counts, time spent and passing score.
- **Short-Answer Matching**: A lenient match (ignoring full-width versus half-width forms, spaces, letter case and trailing punctuation) runs first, and non-matching answers are graded by the user.
- **Export**: The "Is Correct" column in CSV / JSON gains 「待自評」 (pending self-grade), and file names use the bank file name, for example `exam_result_ipas-ai-l12-a_20261009_221530.csv`, instead of a Chinese bank title that filtering reduced to an empty or partial name.
- **Bank Normalization**: Invalid questions are skipped and the reasons are listed in the console instead of being filled with placeholder text such as 「正確選項」 or 「選項A」; option prefixes are removed only when the letter matches the option's position.
- **Storage Full**: When saving progress fails, the last result is removed and the save is retried; if it still fails, the user is notified.
- **Bank Switching**: Only updates `?bank=` with `replaceState` and no longer adds history entries.
- **Lighter Site Icons**: Replaced the 4.5 MB 2048×2048 `favicon.png` with 32×32, 512×512 and 180×180 (Apple Touch Icon, opaque background) versions totaling about 55 KB; the top bar logo uses the 2.4 KB `assets/logo-64.png`.
- **Submission Always Confirms**: Submitting opens the confirmation dialog even when every question is answered.
- **Shortcut Scope**: Key combinations with Alt / Ctrl / ⌘ and keys pressed during IME composition no longer trigger exam shortcuts.
- **Documentation**: Rewrote the README files and llms.txt, and replaced the screenshots with WebP captures of the real interface.

### Removed
- The bank dropdown and the `ALLOWED_BANKS` set in `app.js`; `json/banks.json` manages banks now.
- The result page's "wrong answer analysis" and speed comments; wrong answers are handled by the review tabs and retry, and the average time per question moved to the score summary.
- The home page's "Important Notes" card; its content moved to the footer and the Data & Privacy dialog.
- The `autoSave` setting; answers are always saved automatically.
- The conditional logger; normal runs no longer print debug output, and `console.warn` is used only for data problems.
- `frame-ancestors` from the CSP `<meta>` tag (the directive is not supported in `<meta>` and only produced a console warning).
- The old SVG mock-up screenshots (`preview.svg`, `sidebar.svg`, `settings-panel.svg`, `result-export.svg`).

### Fixed
- Fixed resumed progress landing on the home page, where pressing "Start Exam" wiped the restored answers.
- Fixed Enter on the result page always restarting the exam, which discarded results when using the export buttons from the keyboard.
- Fixed the exam page intercepting Enter globally, which broke the question-number and "Previous" buttons and sent the final question straight into submission.
- Fixed arrow keys changing the answer instead of the question, and number keys 1–4 not working, after clicking an option with the mouse.
- Fixed being able to start an empty exam, or one with the previous bank's questions, after a question bank failed to load.
- Fixed answers overwriting each other for the duplicated question ids (206 and 411) in the ERP Planner bank.
- Fixed the browser Back button leaving the site during an exam, or wiping progress after the bank had been switched.

### Security
- The bank whitelist now has three checks: the file is listed in `json/banks.json`, its name matches `^[A-Za-z0-9][A-Za-z0-9 _.-]*\.json$` (no slashes, `..` or query strings), and the resolved URL stays inside the `json/` folder.
- Progress, the last result, settings and history are fully validated when read from LocalStorage, and corrupted or tampered data is discarded.

---

## [3.5.2] - 2026-06-03

### Added
- **ERP Planner Explanation Completion**: Added comprehensive explanations in Traditional Chinese for all questions in the ERP Planner mock question bank (`ERP Planner_Reference Question Types_202509_V06.json`).

### Changed
- **Unified Question Bank Directory Structure**: Moved all JSON question banks to the `./json/` directory (including IPAS-AI series, Basic Financial Planning, Project Management, etc.).
- **Question Bank Loading Paths**: Updated the question bank base URL path resolution in `app.js` to ensure proper routing into the `/json/` subfolder across all deployment environments.
- **Synchronized Question Bank Identifiers**: Aligned filenames across codebase whitelist, documentation, and the select dropdown.

### Fixed
- Fixed question bank loading failures caused by inconsistencies in relative directory paths.
- Fixed bank switching exceptions triggered by filename casing or spacing discrepancies.

---

## [3.5.1] - 2026-06-01

### Added
- **Question Bank Whitelist Guard**: Implemented the `ALLOWED_BANKS` whitelist mechanism to strictly validate filenames during initialization and bank toggles, preventing path injection vectors.
- **LocalStorage Progress Schema Verification**: Introduced the `_validateProgressSchema()` method to verify array structure, property types, and valid ranges before restoring progress states, purging corrupted entries automatically.
- **LocalStorage History Schema Audit**: Introduced the `_validateRecordsSchema()` method to validate exam history structures before reading.
- **Safe Configuration Deserializer**: Introduced the `_sanitizeConfig()` method to explicitly sanitize properties and ranges before loading configurations, replacing unsafe direct object spreads.

### Changed
- **Tightened Content Security Policy (CSP)**: Removed `data:` URI support from `img-src` and `font-src`, restricting them to `'self'` for reduced data exfiltration risks.
- **Safe Download Mechanism**: Triggered CSV and JSON file exports via `dispatchEvent(new MouseEvent(...))` instead of appending temporary anchor elements into the DOM tree.
- **Tiered Logger Output**: Configured production environments to silence `log` and `info` while preserving critical `warn` and `error` outputs.

### Security
- Mitigated potential prototype pollution and configuration state corruption in `loadConfig()`.
- Neutralized path injection vectors via the URL `bank` query parameter.
- Shielded the application from runtime logic crashes caused by unvalidated LocalStorage states.

---

## [3.5.0] - 2026-06-01

### Added
- **Random Question Drawing**: Added the "Drawing Limit" option to the settings panel, allowing users to extract all, 10, 20, 30, 50, 100, or a customized number of questions.
- **Expanded Professional Question Banks**:
  - ERP Planner Mock Exam Questions (`ERP Planner_Reference Question Types_202509_V06.json`)
  - ERP Basic Certification Exam (`PFERP_Reference119_20240201.json`)

### Changed
- **UI Aesthetics & Design Tokens**: Refactored CSS variables, visual hierarchy, spacing rhythms, and contrast for improved readability.
- **Standardized Favicon**: Unified Web Favicon and Apple Touch Icon paths to the local `favicon.png`.
- **Codebase Streamlining**: Cleaned redundant controller logic to improve rendering speed and state transition performance.

---

## [3.4.1] - 2025-11-02

### Added
- **Scope & Disclaimer Notice**: Added a prominent notice on the home page stating that the tool is intended for personal practice and self-evaluation, with questions publicly stored on the client side.
- **Git Ignore Configuration**: Added `.gitignore` to prevent committing development variables, environment configurations, and local logs.

### Changed
- **Conditional Logging**: Automatically silenced debug trace messages in production environments (GitHub Pages) while keeping them accessible during local development.
- **Security Documentation**: Documented client-side security practices and architectural boundaries in project documentation.

### Security
- Removed debug traces in production builds to reduce frontend information disclosure risks.
- Clearly communicated tool scope to prevent misuse in anti-cheating, high-stakes examination environments.

---

## [3.4.0] - 2025-11-01

### Added
- **Bank Switching Confirmation**: Introduced a confirmation modal when switching banks during active exam sessions to prevent accidental loss of progress.
- **LocalStorage Capacity Warnings**: Handled `QuotaExceededError` gracefully by purging older historical logs and alerting the user safely.
- **Defensive DOM Query Wrappers**: Added `_getElement()` and `_querySelector()` helpers to guard against null pointer exceptions.
- **Accessibility (A11y) Enhancements**:
  - Attached `aria-checked` attributes to option buttons.
  - Implemented `aria-live="polite"` state notifications for screen readers during question navigation.
- **JSON Schema Validation**: Validated question bank schemas during file loading.

### Changed
- Improved error layouts and fallback messaging.
- Refactored controller structure for better maintainability.

### Fixed
- Fixed missing confirmations when changing question banks during active sessions.
- Fixed storage exhaustion crashes.
- Fixed null reference exceptions on dynamically rendered DOM nodes.

---

## [3.3.2] - 2025-11-01

### Added
- **IPAS AI Question Banks**:
  - L11 Fundamentals & Governance (Mock Exam A & B)
  - L12 GenAI Application & Planning (Mock Exam A, B, C, D)
- **Question Navigation Grid Sidebar**:
  - Sidebar matrix allowing instant jumping to any question.
  - Live counters for answered, unanswered, and active questions.
- **CSV & JSON Export Engine**:
  - Exported test sessions to UTF-8 with BOM CSV files to avoid Excel character corruption.
  - Implemented CSV Formula Injection defenses.
- **LocalStorage TTL (Time-To-Live)**:
  - LocalStorage progress and records expire automatically after 7 days.
  - Added a "Clear All Local Data" button inside settings.
- **Security Hardening**:
  - Removed all `innerHTML` operations in favor of safe DOM APIs and `textContent`.
  - Tightened CSP rules and eliminated external font dependencies to eliminate supply chain risks.

### Changed
- Refined multi-bank session isolation logic.
- Optimized progress saving timing and retrieval reliability.

### Fixed
- Fixed progress collision when alternating between question banks.
- Fixed correct answer misalignment when option shuffling is enabled.

---

## [3.2.0] - 2024-12-15

### Added
- **Exam Configuration Panel**:
  - Shuffled question ordering.
  - Shuffled option ordering (with dynamic correct answer re-mapping).
  - Configurable passing score threshold (0–100).
  - Toggable explanation displays on review screens.
- **Keyboard Navigation System**:
  - Arrow keys `←` / `→` for question navigation.
  - Number keys `1`–`4` for single choice option selection.
  - `Enter` key for jumping questions and exam submission.
- **Historical Records**: Preserved metrics for the 10 most recent tests.
- **Auto-save Loop**: Backed up active progress to LocalStorage periodically.

### Changed
- Enhanced dark mode contrast and visual feedback.
- Refined touch targets and responsiveness on mobile viewports.

---

## [3.1.0] - 2024-11-20

### Added
- **Short Answer Questions (SAQ)**: Introduced SAQ formats alongside single choice items.
- **Question Bank Switching**: Enabled switching across multiple subject domains.
- **Post-Exam Review**: Visual review indicating correct answers, user choices, and explanations.
- **Performance Evaluation**: Added accuracy indicators, time analysis, and domain performance breakdown.

### Changed
- Refactored codebase architecture into clean controller layers.
- Improved layout fluidity across varied screen resolutions.

---

## [3.0.0] - 2024-10-01

### Added
- Initial official release.
- Single choice testing flow and scoring algorithm.
- Progress bars and countdown timer controls.
- Responsive design and dark/light theme switching.

---

## Versioning Policy

This project strictly adheres to Semantic Versioning:
- **Major**: Breaking architectural changes or incompatible API updates.
- **Minor**: Backward-compatible new features and bank additions.
- **Patch**: Backward-compatible bug fixes and security improvements.