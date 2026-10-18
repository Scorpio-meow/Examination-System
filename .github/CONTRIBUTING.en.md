# Contributing

[繁體中文版](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/.github/CONTRIBUTING.md)

Thank you for helping improve the Examination System! This is a client-side self-study tool maintained by one person. Bug reports, question fixes, accessibility improvements and code contributions are all welcome. By participating, you agree to follow the [Code of Conduct](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/.github/CODE_OF_CONDUCT.en.md).

---

## Table of Contents

- [Ways to Contribute](#ways-to-contribute)
- [Development Setup](#development-setup)
- [Coding Conventions](#coding-conventions)
- [Adding or Fixing Question Banks](#adding-or-fixing-question-banks)
- [Documentation](#documentation)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [License](#license)

---

## Ways to Contribute

| What you want to do | Where to go |
|---------------------|-------------|
| Report a bug | [Bug report](https://github.com/Scorpio-meow/Examination-System/issues/new?template=bug_report.yml) |
| Report a wrong question, answer or explanation | [Question error](https://github.com/Scorpio-meow/Examination-System/issues/new?template=question_error.yml) |
| Report an accessibility barrier | [Accessibility issue](https://github.com/Scorpio-meow/Examination-System/issues/new?template=accessibility.yml), see also the [Accessibility statement](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/.github/ACCESSIBILITY.en.md) |
| Suggest a feature or a new bank | [Feature request](https://github.com/Scorpio-meow/Examination-System/issues/new?template=feature_request.yml) |
| Report a security vulnerability | **Do not open a public issue.** Report it privately as described in the [Security policy](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/.github/SECURITY.en.md) |
| Fix code or documentation | Follow the [Pull Request process](#pull-request-process) below |

Please search [existing issues](https://github.com/Scorpio-meow/Examination-System/issues?q=is%3Aissue) before opening a new one. For larger changes such as new features, architectural changes or new question banks, open an issue first so we can agree on the direction before you start.

---

## Development Setup

The site has no build step and no dependencies to install. You only need:

- [Bun](https://bun.sh/) to run the unit tests and the bank statistics script.
- Any static web server. Browsers do not load ES modules or bank JSON over `file://`; see [Quick Start in the README](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/README.en.md#quick-start).

Make sure these commands pass before you submit:

```bash
bun test
```

```bash
bun run check:banks
```

---

## Coding Conventions

See [ADR-001](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/docs/adr/ADR-001-local-security-validation.en.md) and [ADR-002](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/docs/adr/ADR-002-frontend-architecture.en.md) for the full design decisions.

### Architecture

- **Zero runtime dependencies**: do not add npm packages, CDN resources or external fonts. The CSP in `index.html` only allows `'self'`, so browsers block external resources.
- **No inline code or styles**: do not write inline `<script>`, `<style>`, `style` attributes or inline handlers such as `onclick` in HTML. The CSP blocks all of them.
- **Module boundaries**: pure logic lives in the shared `js/` modules, never touches the DOM and gets `bun test` coverage in `tests/`. View code lives in `js/views/`. `app.js` only handles startup, routing and cross-view flows.

### Security

- Always build DOM nodes with `h()` and `svg()` from `js/dom.js`, passing text through the `text` property (`textContent`). Never use `innerHTML`.
- Validate the structure of anything read from localStorage, URL parameters or question banks. When the data does not match, skip or discard it and explain why in the console. Do not generate substitute content or guessed defaults.
- Reuse the CSV formula escaping in `js/export.js` when adding export fields.

### Styling and Accessibility

- Use the color tokens in `style.css`, define both light and dark values, and keep WCAG AA contrast.
- Keep touch targets at least 44px, and put animations inside `@media (prefers-reduced-motion: no-preference)`.
- Every interactive control must work with the keyboard alone and show a visible focus indicator. New single-key shortcuts must be switchable off in the advanced settings. See the [Accessibility statement](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/.github/ACCESSIBILITY.en.md).

### Style

Follow the surrounding code: 4-space indentation, single quotes and semicolons at the end of statements.

---

## Adding or Fixing Question Banks

### Adding a Bank

1. Put the bank JSON in `json/`, following the [Data Schema in the README](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/README.en.md#data-schema--standards). The file name must match `^[A-Za-z0-9][A-Za-z0-9 _.-]*\.json$`.
2. Add an entry to `banks` in `json/banks.json` (`file`, `group`, `title`, `shortTitle` and an optional `subtitle`).
3. Run `bun run build:banks` to generate the statistics and make sure it prints no warnings.

```bash
bun run build:banks
```

### Fixing Questions, Answers or Explanations

- Cite your source in the pull request, such as an official announcement, a textbook title and page number, or a legal provision.
- Change only the fields that are actually wrong. Do not reword other questions along the way.
- Run `bun run build:banks` after changing bank content so the catalog statistics stay in sync.

### Content Sources and Rights

- Only submit content you have the right to publish. Cite the source and year of questions taken from official announcements.
- Photographed or copied material from paid textbooks or question banks without permission will not be accepted.
- If you have no reliable source for an explanation, leave it empty instead of writing a guess.

---

## Documentation

- **Bilingual docs**: the README, CHANGELOG, ADRs and this guide each have a Traditional Chinese version and an `.en.md` English version. Update both when you change one. If you cannot write the other language, say so in the pull request and the maintainer will fill it in.
- **Changelog**: record user-facing changes under `[Unreleased]` in [CHANGELOG.en.md](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/CHANGELOG.en.md), following [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
- **Architecture decisions**: add an ADR in `docs/adr/` for decisions that affect the overall architecture, using the same Status, Context, Decision and Consequences structure as the existing ADRs.

---

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). Descriptions may be written in Traditional Chinese or English:

| Type | Use | Example |
|------|-----|---------|
| `feat` | New feature | `feat: add an advanced project management bank` |
| `fix` | Bug fix | `fix: ignore full-width spaces in short-answer matching` |
| `docs` | Documentation | `docs: clarify the bank schema` |
| `style` | Formatting with no behavior change | `style: unify bank JSON indentation` |
| `refactor` | Restructuring with no behavior change | `refactor: split the result review tabs` |
| `perf` | Performance | `perf: lazy-render the history trend chart` |
| `test` | Tests | `test: cover v3 config migration` |
| `chore` | Tooling and housekeeping | `chore: update development scripts` |

Mark breaking changes with `!` after the type, for example `feat!: change the bank catalog format`, and describe the migration in the body.

---

## Pull Request Process

1. Fork the repository and create a branch from the default branch, for example `feature/practice-timer`, `fix/csv-export` or `docs/contributing`.
2. Run `bun test` and `bun run check:banks` after your changes.
3. Open a pull request and fill in the template: what changed, related issues and how you tested it.
4. For interface changes, attach screenshots in light theme, dark theme and at a 375px mobile width, and confirm keyboard operation still works.
5. The maintainer may ask for changes after review. Push them to the same branch; there is no need to open a new pull request.

Keep each pull request focused on one change. Small pull requests are easier to review and merge sooner.

---

## License

Code and content you write yourself, such as explanations and documentation, are released under the project's [MIT License](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/LICENSE). Questions taken from official announcements remain the property of their original rights holders, so cite the source in the pull request. The [Code of Conduct](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/.github/CODE_OF_CONDUCT.en.md) is adapted from the Contributor Covenant and licensed separately under CC BY-SA 4.0.