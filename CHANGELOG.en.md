# Changelog

[繁體中文版](CHANGELOG.md)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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