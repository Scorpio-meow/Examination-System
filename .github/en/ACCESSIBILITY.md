# Accessibility Statement

[繁體中文版](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/.github/ACCESSIBILITY.md)

We want everyone to be able to practice and take mock exams with the Examination System, including people who use only a keyboard, screen readers, screen magnification, high contrast modes or reduced motion. This statement describes our goals, what is supported today, known limitations and how to report a barrier.

---

## Goals

- Target [WCAG 2.2](https://www.w3.org/TR/WCAG22/) Level AA.
- Make every feature usable with the keyboard alone, with a clearly visible focus indicator.
- Keep text and component contrast at WCAG AA in both light and dark themes.
- Impose no time limit on answering. The timer is for reference only and can be hidden at any time.

---

## Current Support

| Area | Implementation |
|------|----------------|
| Keyboard | Every button, option, dialog and the question map can be operated with the keyboard. On the exam page, <kbd>←</kbd> <kbd>→</kbd> move between questions and <kbd>?</kbd> opens the shortcut help |
| Single-key shortcuts | Number keys, <kbd>F</kbd> and <kbd>?</kbd> can be turned off in the advanced settings (WCAG 2.1.4). They never fire while typing in a text field or composing with an input method |
| Skip link | A 「跳到主要內容」 (skip to main content) link is provided at the top of the page |
| Semantics | Options are native radio buttons inside a `fieldset` named by the question stem. The attempt history table has a caption |
| Focus management | Focus moves to the page heading after each view change. Dialogs use the native `<dialog>` element and return focus to the triggering button when closed |
| Answer confirmation | In practice mode, arrow keys, number keys and mouse clicks only select an answer; the result appears after pressing 「核對答案」 ("Check answer") or <kbd>Enter</kbd>. In mock exam mode, answers can be changed until submission, and submitting always opens a confirmation dialog (WCAG 3.3.4) |
| Announcements | Question changes, practice-mode results, flagging and toast messages are announced through `aria-live` regions |
| Question map | Each number is named "Question N, answered / unanswered / correct / wrong, flagged", and the current question is marked with `aria-current`. Correct and wrong answers also show check and cross icons, so color is not the only cue |
| Chart alternative | The score trend chart can be explored with a mouse or the arrow keys, and the same data is also shown in a table |
| Touch targets | Touch targets are at least 44px on mobile, with a fixed bottom action bar on phones |
| Reduced motion | Animations only play under `prefers-reduced-motion: no-preference` |
| Color scheme | Follows the system light or dark setting by default and can be switched manually in the top bar |
| Language | The page declares `lang="zh-TW"` so screen readers use the right voice |

### How We Test

For v4.0.0, every view was scanned with axe (WCAG 2.2 A / AA and best-practice rules) with 0 violations. The main flows were also checked with E2E tests and Lighthouse, and the layout was accepted at a 375px mobile width. See [ADR-002](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/docs/adr/ADR-002-frontend-architecture.en.md).

---

## Supported Environments

The site relies on widely available web features such as `:has()`, `<dialog>` and ES modules, and does not support browser versions released before 2023.

| Type | Environment |
|------|-------------|
| Desktop browsers | Latest Chrome, Edge, Firefox and Safari |
| Mobile browsers | Latest iOS / iPadOS Safari and Android Chrome |
| High contrast | Windows forced colors mode: switches and segmented options have dedicated styles, and other components use the browser's forced colors |

---

## Known Limitations

- **Screen reader testing**: the documented checks are mostly automated. No complete walkthrough of every flow with NVDA, JAWS, VoiceOver or TalkBack has been recorded yet. Reports from assistive technology users are especially welcome.
- **English terms in questions**: almost all English in the banks consists of technical terms and product names (for example RAG, Fine-tuning or VS Code). WCAG 3.1.2 does not require marking the language of technical terms and proper names, so bank content carries no extra `lang` attributes and screen readers read these words with a Chinese voice. Please report any English passage that gets in the way of understanding.
- **Interface language**: the interface is only available in Traditional Chinese.

---

## Reporting Accessibility Issues

Please open an issue with the [Accessibility issue](https://github.com/Scorpio-meow/Examination-System/issues/new?template=accessibility.yml) template. If GitHub is hard to use for you, email [yao921024@gmail.com](mailto:yao921024@gmail.com) with a subject line starting with `[Accessibility]`.

Please include as much of the following as you can:

- The view where the problem happens and the steps to get there.
- What you expected and what actually happened.
- Your browser, operating system and assistive technology (for example the screen reader name and version, zoom level, and whether high contrast or reduced motion is on).

### Severity

| Level | Description |
|-------|-------------|
| Critical | You cannot answer, submit or view your score, and there is no workaround |
| Serious | You can finish, but only through a clearly difficult workaround |
| Moderate | It causes inconvenience or confusion, but you can still finish normally |
| Minor | A small issue that does not stop you from finishing |

### How We Respond

- The maintainer will reply as soon as possible, confirming whether the issue can be reproduced, suggesting a workaround if one exists and outlining next steps.
- Issues are prioritized by severity, and Critical issues are fixed first.
- Fixes are recorded in [CHANGELOG.en.md](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/CHANGELOG.en.md), and you will be notified in the issue.

---

## Ownership and Maintenance

The maintainer, [@Scorpio-meow](https://github.com/Scorpio-meow), triages and tracks accessibility issues and keeps this statement up to date. All interface changes are expected to meet the accessibility requirements in the [Contributing guide](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/.github/en/CONTRIBUTING.md#styling-and-accessibility).

---

## Feedback

If you have suggestions for this statement or our accessibility practices, please open an issue or submit a pull request.