# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.5.2] - 2026-06-03

### Added
- **ERP Planner Explanation Completion**: Added comprehensive explanations in Traditional Chinese for all questions in the ERP Planner mock question bank (`ERP Planner_Reference Question Types_202509_V06.json`).

### Changed
- **Unified Question Bank File Structure**: Moved all JSON question banks to the `json/` directory (including IPAS AI L11/L12 series, Basic Financial Planning, Project Management, etc.).
- **Corrected Loading Paths**: Adjusted the question bank base URL structure in `app.js` to include the `json/` subfolder, ensuring question files load properly.
- **Unified ERP Filenames**: Aligned filenames for ERP question files across code references, documentation, and the select dropdown.

### Fixed
- Fixed loading issues caused by question bank files situated outside the `json/` directory.
- Fixed bank switching errors triggered by filename inconsistencies.

---

## [3.5.1] - 2026-06-01

### Added
- **Question Bank Whitelist Validation**: Added the `ALLOWED_BANKS` whitelist mechanism to prevent local path injection vulnerabilities when switching banks.
- **LocalStorage Progress Schema Verification**: Introduced the `_validateProgressSchema` method to test properties, ranges, and types of saved progress items before restoration, purging invalid states.
- **LocalStorage History Schema Verification**: Introduced the `_validateRecordsSchema` method to evaluate structure and types of the exam histories array before reading.
- **Config Sanitizer**: Added the `_sanitizeConfig` utility to explicitly sanitize values and ranges before loading configurations, replacing unsafe direct object spreads (`{ ...config, ...savedConfig }`).

### Changed
- **Tightened CSP Policy**: Removed support for `data:` URIs in `img-src` and `font-src` directives, limiting options to `'self'` for reduced data leakage risks.
- **Safe Downloads**: Triggered CSV/JSON exports via dispatching custom MouseEvents without inserting the link anchor directly into the DOM, mitigating potential DOM pollution.
- **Adjusted Logger Separation**: Preserved `warn` and `error` outputs in production; only `log` and `info` messages are silenced.

### Security
- Fixed a potential prototype pollution / state contamination vulnerability during configuration merges.
- Patched path injection vulnerability in the question bank parameter.
- Patched logical anomalies that could occur when using unsanitized progress or history records from LocalStorage.

---

## [3.5.0] - 2026-06-01

### Added
- **Question Draw Settings**: Integrated the "Drawing Limit" option in the configuration panel, allowing test-takers to extract all, 10, 20, 30, 50, 100, or a customized number of questions randomly.
- **New Question Banks**:
  - ERP Planner Mock Exam Questions (`ERP Planner_Reference Question Types_202509_V06.json`)
  - ERP Basic Certification Exam (`PFERP_Reference119_20240201.json`)

### Changed
- **UI Aesthetics**: Redesigned layouts and condensed CSS variables to deliver premium, consistent, and clean visual themes.
- **Unified Favicon**: Standardized website icons and Apple Touch Icons to point to the local `favicon.png`.
- **Code Refactoring**: Streamlined JavaScript flow, removed redundant blank lines, and elevated performance.

---

## [3.4.1] - 2025-11-02

### Added
- **Scope Disclaimer**: Added a clear notification warning on the landing page stating that the tool is intended for personal practice, and answers are readable on the client side.
- **Git Ignore File**: Added `.gitignore` to prevent committing development variables, environment settings, and local logs.

### Changed
- **Conditional Logger**: Silenced console debug traces in production builds (GitHub Pages), keeping detailed debug logs in local development.
- **Documentation Updates**: Documented local security practices and client-side scope constraints in the README.

### Security
- Prevented potential data leaks by removing 20+ console logs in production environments.
- Raised transparency on project positioning to ensure users do not employ the tool in anti-cheating, high-stakes contexts.

---

## [3.4.0] - 2025-11-01

### Added
- **Bank Switching Warning**: Introduced a confirmation dialog to prevent accidental progress loss when switching banks with active exams in progress.
- **LocalStorage Capacity Warnings**: Handled QuotaExceededError anomalies gracefully, notifying users and safely cleaning up older history data.
- **Defensive DOM Checks**: Added `_getElement` and `_querySelector` defensive wrappers to shield against null pointer exceptions.
- **A11y Enhancements**:
  - Attached `aria-checked` attributes to selection options.
  - Implemented `aria-live="polite"` state readouts for assistive readers during question navigation.
- **JSON Schema Check**: Validated question bank formats during AJAX loads.

### Changed
- Improved error layouts with friendlier messages.
- Polished readability of core functions.

### Fixed
- Fixed missing warnings when changing question banks during active sessions.
- Fixed crashes on storage quota limits.
- Fixed null exceptions on dynamic DOM elements.

---

## [3.3.2] - 2025-11-01

### Added
- **IPAS AI Question Banks**:
  - L11 Fundamentals & Governance (Mock Exam A & B)
  - L12 GenAI Application & Planning (Mock Exam A, B, C, D)
- **Question Grid Navigation**:
  - Introduced a sidebar to jump directly to any question.
  - Created live metrics for answered and unanswered counts.
- **CSV & JSON Exports**:
  - Export test sessions to UTF-8 with BOM CSV files to prevent Excel garbled texts.
  - Implemented CSV Formula Injection defenses.
- **LocalStorage TTL Mechanism**:
  - Expired local storage progress and records automatically after 7 days.
  - Placed a manual "Clear All Local Data" button on settings.
- **Security Hardening**:
  - Removed all `innerHTML` structures, utilizing safe DOM APIs.
  - Cleaned inline style policies in the CSP.

### Changed
- Optimized session isolation for multi-bank support.
- Refined progress save and retrieve timing.

### Fixed
- Fixed progress mix-ups when switching question banks.
- Fixed correct answer misalignment during option shuffling.

---

## [3.2.0] - 2024-12-15

### Added
- **Exam Configuration Settings**:
  - Option to randomize question sequences.
  - Option to shuffle option arrangements (dynamically mapping correct answers).
  - Option to hide/reveal explanations on review.
  - Custom passing score configurations.
- **Keyboard Navigation**:
  - Arrow keys navigate questions.
  - Number keys 1-4 choose options A-D.
  - Enter keys jump or submit.
- **History Logs**: Retained historical metrics for the 10 most recent tests.
- **Auto-save Loop**: Backed up progress to LocalStorage every 30 seconds.

### Changed
- Polished dark mode layout details.
- Scaled up mobile browser rendering quality.

---

## [3.1.0] - 2024-11-20

### Added
- **Short Answer Questions (SAQ)**: Expanded support from single-choice formats to typed SAQ questions.
- **Bank Selector**: Allowed toggling between different domains.
- **Answer Review**: Visual highlights representing incorrect selections and correct answers.
- **Performance Evaluation**: Added accuracy indicators, time analysis, and learning advice.

---

## [3.0.0] - 2024-10-01

### Added
- Initial official release.
- Single-choice testing flow.
- Progress bars and timer controls.
- Responsive designs.
- Dark/Light switching styles.