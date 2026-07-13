# Examination System

> A front-end knowledge testing and mock examination platform supporting multiple professional question banks, randomized questions, auto-saved progress, and results export.

[![Version](https://img.shields.io/badge/Version-3.5.2-brightgreen?style=flat-square)](CHANGELOG.en.md)
[![License](https://img.shields.io/badge/License-MIT-orange?style=flat-square)](LICENSE)
[![Updated](https://img.shields.io/badge/Updated-2026--06--03-blue?style=flat-square)](CHANGELOG.en.md)
[![GitHub Pages](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-brightgreen?style=flat-square&logo=github)](https://scorpio-meow.github.io/Examination-System/)

---

## Table of Contents

- [Quick Start](#quick-start)
- [Live Demo](#live-demo)
- [Features](#features)
- [Question Banks](#question-banks)
- [File Structure](#file-structure)
- [Technical Architecture](#technical-architecture)
- [Developer Guide](#developer-guide)
- [Usage Instructions](#usage-instructions)
- [Security & Privacy](#security-privacy)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [Changelog](#changelog)
- [Contribution Guide](#contribution-guide)
- [Contact](#contact)
- [License](#license)

---

## Quick Start

**Online Version (Recommended)**: Go directly to [https://scorpio-meow.github.io/Examination-System/](https://scorpio-meow.github.io/Examination-System/) with no installation required.

**Local Run**:

1. Clone or download this project:
   ```bash
   git clone https://github.com/Scorpio-meow/Examination-System.git
   cd Examination-System
   ```

2. Start a local server (necessary to bypass browser security policies on the `file://` protocol):
   - **Using Python**
     ```bash
     python3 -m http.server 8000
     ```
   - **Using Bun**
     ```bash
     bun x http-server -p 8000
     ```

3. Open your browser and navigate to [http://localhost:8000](http://localhost:8000).

4. Select a question bank from the dropdown, click "Start Exam" and begin.

> **Notice**: Directly double-clicking `index.html` to open it in a browser will fail due to CORS security restrictions blocking the loading of JSON question banks. Please use a local server.

---

## Live Demo

This project is deployed on GitHub Pages and is ready to use:

**[https://scorpio-meow.github.io/Examination-System/](https://scorpio-meow.github.io/Examination-System/)**

---

## Features

### Examination Functions

| Feature | Description |
|---------|-------------|
| Diverse Question Banks | Covers Project Management, Financial Planning, IPAS AI, ERP, and more |
| Multiple Question Types | Single-choice (4 options) and Short Answer Questions (SAQ) |
| Random Question Drawing | Supports drawing all, 10, 20, 30, 50, 100, or a custom number of questions |
| Shuffled Questions & Options | Randomizes order each time to prevent position-based memorization |
| Detailed Explanations | Each question includes explanation notes for deep learning |
| No Time Limit | Practice at your own pace |
| Custom Passing Score | Default is 60, customizable via the settings panel (0-100) |
| Question Sidebar | Quickly navigate to any question; immediately shows answered/unanswered status |

### Progress and Settings

| Feature | Description |
|---------|-------------|
| Auto-save Progress | Keeps your progress safe even if the tab is closed accidentally |
| Isolated Question Banks | Progress for different question banks is kept separate |
| Smart Resume Prompt | Prompts you to resume from where you left off or start fresh |
| Data Expiration (TTL) | Progress, settings, and histories automatically expire after 7 days |
| Dark/Light Theme | Automatically detects system preferences with manual toggle support |
| Toggle Explanations | Choose whether to display explanations on the results page |

### Result Analysis & Export

- Detailed performance report (total score, accuracy rate, pass/fail status)
- Incorrect questions list with explanations
- History records (with question bank titles)
- One-click export to **JSON** or **CSV** (UTF-8 with BOM for Excel compatibility, with CSV Injection protection)

#### Export Fields

Both CSV and JSON outputs represent "one record per question" with the following fields:

| # | Field Name | Description |
|---|------------|-------------|
| 1 | Index | Question order number |
| 2 | ID | Original question ID |
| 3 | Type | `Single Choice` / `Short Answer` |
| 4 | Question | Question description |
| 5 | Options | Option texts (separated by newlines) |
| 6 | User Answer | Answer chosen/entered by the user |
| 7 | Correct Answer | Correct answer for the question |
| 8 | Is Correct | `Yes` / `No` |
| 9 | Explanation | Explanation details |
| 10 | Bank Label | Name of the question bank |
| 11 | Export Time | ISO 8601 format |

**JSON Export Example:**

```json
[
  {
    "Index": 1,
    "ID": 101,
    "Type": "Single Choice",
    "Question": "What are the three constraints of a project?",
    "Options": "A. Scope\nB. Schedule\nC. Cost\nD. Quality",
    "User Answer": "A",
    "Correct Answer": "A",
    "Is Correct": "Yes",
    "Explanation": "The traditional project management constraints are Scope, Schedule, and Cost.",
    "Bank Label": "Project Management",
    "Export Time": "2025-08-16T10:15:30.000Z"
  }
]
```

### User Experience

- **Responsive Design**: Support for Desktop, Tablet, and Mobile devices
- **Keyboard Shortcuts**: Enhanced efficiency (see [Usage Instructions](#usage-instructions))
- **Accessibility (A11y)**: ARIA labels, screen reader notifications, full keyboard navigation, and WCAG AA contrast ratios
- **Real-time Feedback**: Visual highlights when options are selected

---

## Question Banks

### Available Question Banks

| Bank Name | File Name | Description |
|-----------|-----------|-------------|
| Project Management | `Project_Management.json` | 12 Principles and 8 Performance Domains (PMBOK Core) |
| Financial Planning | `Basic_Financial_Planning.json` | Basic financial concepts, investment, insurance, and retirement planning |
| IPAS L11-A | `IPAS-AI-L11-A.json` | AI Fundamentals & Governance (Mock Exam A) |
| IPAS L11-B | `IPAS-AI-L11-B.json` | AI Fundamentals & Governance (Mock Exam B) |
| IPAS L11 #130994 | `IPAS-AI-L11-130994.json` | Year 114 iPAS AI Application Planner official exam questions |
| IPAS L12-A | `IPAS-AI-L12-A.json` | GenAI Applications & Planning (Mock Exam A) |
| IPAS L12-B | `IPAS-AI-L12-B.json` | GenAI Applications & Planning (Mock Exam B) |
| IPAS L12-C | `IPAS-AI-L12-C.json` | GenAI Applications & Planning (Mock Exam C) |
| IPAS L12-D | `IPAS-AI-L12-D.json` | GenAI Applications & Planning (Mock Exam D) |
| ERP Planner Reference Questions | `ERP Planner_Reference Question Types_202509_V06.json` | ERP Planner core concepts and reference questions |
| ERP Basic Certificate Exam | `PFERP_Reference119_20240201.json` | ERP Basic Certificate Exam academic questions |

---

## File Structure

```
Examination-System/
├── index.html                  # Main UI & settings panel
├── app.js                      # Core application logic
├── style.css                   # Styles (CSS variables, dark/light themes)
├── favicon.png                 # Website icon
├── robots.txt                  # Search engine crawl rules
├── sitemap.xml                 # SEO Sitemap
├── CHANGELOG.md                # Version update history (Traditional Chinese)
├── CHANGELOG.en.md             # Version update history (English)
├── LICENSE                     # MIT License
├── README.md                   # Chinese documentation
├── README.en.md                # English documentation (This file)
├── llms.txt                    # AI-friendly project details
├── json/                       # Question bank directory
│   ├── Project_Management.json
│   └── ...
└── docs/
    ├── screenshots/            # UI screenshots
    └── adr/                    # Architecture Decision Records
        └── ADR-001-local-security-validation.md
```

---

## Technical Architecture

| Aspect | Description |
|--------|-------------|
| Core Tech | HTML5, CSS3, Vanilla JavaScript (Zero-dependency framework) |
| Storage | LocalStorage with TTL mechanism and schema verification |
| Bank Format | JSON format with schema validation |
| Theme System | CSS variables + `prefers-color-scheme` media query |
| Deployment | GitHub Pages with forced HTTPS |
| Dependencies | Zero (eliminating supply chain risks) |

### System Requirements

| Browser | Minimum Version |
|---------|-----------------|
| Chrome  | 70+             |
| Firefox | 65+             |
| Safari  | 12+             |
| Edge    | 79+             |
| Opera   | 60+             |

- **JavaScript** must be enabled.
- **LocalStorage** must be allowed (do not use incognito mode, otherwise progress cannot be saved).

---

## Developer Guide

### Adding a Question Bank

1. Create a JSON question bank file in the `json/` directory according to the following formats:

   **Single Choice Format:**
   ```json
   [
     {
       "id": 1,
       "question": "Question content",
       "options": [
         "A. Option A",
         "B. Option B",
         "C. Option C",
         "D. Option D"
       ],
       "answer": "B",
       "explanation": "Explanation content"
     }
   ]
   ```

   **Short Answer Format (SAQ):**
   ```json
   [
     {
       "id": 2,
       "question": "SAQ content",
       "type": "SAQ",
       "answer": "Standard Answer",
       "explanation": "Explanation content"
     }
   ]
   ```

2. Add a new `<option>` to the `question-bank-select` dropdown in `index.html`:
   ```html
   <option value="My_New_Bank.json">My New Question Bank</option>
   ```

3. Append your file name to the `ALLOWED_BANKS` whitelist in `app.js`:
   ```javascript
   const ALLOWED_BANKS = [
     // ... existing entries
     'My_New_Bank.json',
   ];
   ```

### Local Development Advice

- Serve the static files using a Python server or VS Code Live Server to prevent CORS blocks.
- Console `log`/`info` outputs are fully visible in local environments, but are automatically silenced in production (GitHub Pages) except for `warn`/`error`.

---

## Usage Instructions

### Exam Flow

1. **Configure Exam**: Choose a question bank, set the drawing count, and configure randomizations.
2. **Start Exam**: Click "Start Exam" to enter the question page.
3. **Answering**: Click options (Single Choice) or input text (SAQ). You can navigate back and forth at any time.
4. **Submission**: Click "Submit Exam" or press Enter on the last question.
5. **Results**: View score, accuracy, and detailed correct/incorrect questions reports.
6. **Export**: Export results to JSON or CSV.

### Keyboard Shortcuts

| Shortcut | Function |
|----------|----------|
| `←` / `→` | Prev / Next question |
| `1` - `4` | Select option A-D (Single-choice only) |
| `Enter` (During test) | Jump to next question; Submit on the last question |
| `Enter` (On result page) | Restart the exam |

---

## Security & Privacy

For details on the architecture choices and security considerations, refer to [ADR-001: Local Data Security and Defensive Verification Mechanism](docs/adr/ADR-001-local-security-validation.en.md).

### Implemented Controls

- **Front-end Security**: Replaced all `innerHTML` usage with secure DOM APIs and `textContent`. Rigid CSP policies applied.
- **Data Protection**: LocalStorage TTL mechanism. CSV Formula Injection mitigation. JSON schema verification.
- **Input Sanitization**: Question bank whitelist checks. Defensive schema checks on LocalStorage content and configuration loading via `_sanitizeConfig`.

### Architecture Disclaimer

> **This is a client-side practice tool**. All question bank JSON files are publicly readable on the client side. This application is not intended for high-stakes, fraud-controlled exams.

---

## Quick Preview

> Question page with sidebar:

![Main Preview](docs/screenshots/preview.svg)
![Sidebar Preview](docs/screenshots/sidebar.svg)

> Settings panel and export view:

![Settings Panel](docs/screenshots/settings-panel.svg)
![Result Export](docs/screenshots/result-export.svg)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Question bank loading fails / "Loading Failed" | Make sure you run a local server (see [Quick Start](#quick-start)) rather than double-clicking `index.html`. |
| CSV export shows garbled characters in Excel | Import the file using "Data > From Text/CSV" and choose UTF-8 encoding. |
| Interface freeze / shortcut issues | Hard reload the browser (Ctrl+Shift+R) to clear outdated cache. |
| Clear all local data | Go to "Exam Settings" on the home page and click "Clear All Local Data". |

---

## FAQ

**Q: How do I use it on a mobile device?**
A: Directly open the [Live Demo](https://scorpio-meow.github.io/Examination-System/) in your mobile browser. The UI is fully responsive.

**Q: Will the correct answers get messed up if I shuffle options?**
A: No. The option shuffler dynamically maps correct answers to newly generated indexes, ensuring evaluation accuracy.

---

## Changelog

See [CHANGELOG.en.md](CHANGELOG.en.md) for full update details.

**Current Version**: v3.5.2 (2026-06-03)

---

## Contribution Guide

1. **Report Bugs**: Go to [GitHub Issues](https://github.com/Scorpio-meow/Examination-System/issues) and describe the problem.
2. **Submit PR**: Fork this repository, create a branch (`feature/your-feature`), commit (`feat: describe it`), and push to open a PR.
3. **Submit Bank**: Follow the [Developer Guide](#developer-guide) JSON format and submit a PR with your new question bank JSON.

---

## License

This project is licensed under the [MIT License](LICENSE).