# Security Policy

[繁體中文版](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/.github/SECURITY.md)

The Examination System is a client-side static site hosted on GitHub Pages. It has no server-side code, accounts or database, and all data stays in the user's own browser localStorage. Even so, we take any vulnerability that could harm users seriously, and we appreciate responsible disclosure.

---

## Supported Versions

The [live site](https://scorpio-meow.github.io/Examination-System/) always runs the latest release, and security fixes are only released for the latest major version.

| Version | Security fixes |
|---------|----------------|
| 4.x (latest) | ✅ |
| Before 4.0 | ❌ |

If you host an older version yourself, please update to the latest release before reporting.

---

## Reporting a Vulnerability

**Do not disclose vulnerability details in public issues, pull requests or comments.**

Report privately through one of these channels:

1. **GitHub private reporting (preferred)**: open a private security advisory draft from [Security → Report a vulnerability](https://github.com/Scorpio-meow/Examination-System/security/advisories/new).
2. **Email**: write to [yao921024@gmail.com](mailto:yao921024@gmail.com) with a subject line starting with `[Security]`. Email is not encrypted, so do not include sensitive personal data.

Please include as much of the following as you can:

- The affected version (shown in the page footer) or commit.
- The affected files, features or views.
- Steps to reproduce or a proof of concept, such as the bank JSON, URL or localStorage content that triggers the issue.
- The potential impact and, if you have one, a suggested fix.

---

## Response Process

1. The maintainer aims to acknowledge your report within 7 days.
2. Once the issue is confirmed, the maintainer will share the assessment and the planned fix, and keep you updated while it is being fixed.
3. After the fix ships, it is recorded under "Security" in [CHANGELOG.en.md](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/CHANGELOG.en.md), and a GitHub security advisory is published when appropriate. You will be credited in the advisory if you wish.

Please keep the details private until the fix is released or until a date we agree on. This project is maintained by one person and does not offer a bug bounty.

---

## Scope

### In Scope

- XSS or arbitrary HTML injection through bank content, URL parameters or localStorage data.
- Bypassing the `json/banks.json` whitelist, the file name rule or the `json/` folder restriction to load unexpected files.
- Bypassing the Content Security Policy (CSP) in `index.html`.
- Formula injection when an exported CSV is opened in spreadsheet software.
- Prototype pollution or unexpected code execution caused by corrupted or tampered localStorage data.
- Local data being sent to a third party.

### Out of Scope

| Item | Reason |
|------|--------|
| Questions and answers are visible in the browser | By design. This is a self-study tool whose banks are public on the client and it provides no anti-cheating protection. See [Security & Defensive Architecture in the README](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/README.en.md#security--defensive-architecture) |
| A user editing their own localStorage or changing scores with developer tools | It only affects that user's own browser |
| Self-XSS | Requires the victim to paste and run code in developer tools themselves |
| HTTP response headers that GitHub Pages cannot set, such as `X-Frame-Options` or a header-delivered CSP `frame-ancestors` | A limitation of the static hosting platform, and the site has no sign-in or other sensitive actions |
| Wrong questions, answers or explanations | Use the [Question error](https://github.com/Scorpio-meow/Examination-System/issues/new?template=question_error.yml) template |
| Automated scanner output without a description of real impact | The risk cannot be assessed |

---

## Security Design

For the defenses already in place, see:

- [ADR-001: Client-side data security and defensive validation](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/docs/adr/ADR-001-local-security-validation.en.md)
- [ADR-002: Front-end rewrite](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/docs/adr/ADR-002-frontend-architecture.en.md)