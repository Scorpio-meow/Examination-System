# Security Policy

[繁體中文](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/.github/SECURITY.md) | **English**

The Examination System is a client-side static site hosted on GitHub Pages. It has no server-side code, accounts or database, and all data stays in the user's own browser localStorage. Even so, any vulnerability that could harm users is taken seriously, and responsible disclosure is appreciated.

## Supported versions

The [live site](https://scorpio-meow.github.io/Examination-System/) always runs the latest release, and security fixes are only released for the latest major version.

| Version | Security fixes |
|---|---|
| 4.x (latest) | ✅ |
| Before 4.0 | ❌ |

If you host an older version yourself, please update to the latest release before reporting.

## Reporting a vulnerability

**Do not disclose vulnerability details in public issues, pull requests, or discussions.**

Report privately through one of these channels:

1. **GitHub private reporting (preferred)**: go to the repository's **Security** tab and click **Report a vulnerability**, or open the [private reporting form](https://github.com/Scorpio-meow/Examination-System/security/advisories/new) directly. Only you and the maintainer can see the report.
2. **Email**: if you can't use GitHub, write to [yao921024@gmail.com](mailto:yao921024@gmail.com) with a subject starting with `[Security] Examination-System`. Email is not end-to-end encrypted, so start with a short summary and send the details after you get a reply.

Please include as much of the following as you can:

- The affected version (shown in the page footer) or commit.
- The affected files, features or views.
- Steps to reproduce or a proof of concept, such as the bank JSON, URL or localStorage content that triggers the issue.
- The potential impact and a suggested fix (optional).

Use fake data when reproducing; don't include real personal data.

## Response process and timelines

This project is maintained by one person and has no bug bounty, but it commits to these timelines:

| Stage | Timeline |
|---|---|
| Acknowledge and first reply | Within 14 days of the report |
| Public disclosure | When the fix is released, and no later than 90 days after the report |

1. **Acknowledge**: confirm receipt and share an initial assessment.
2. **Assess**: confirm whether it is a vulnerability, its impact, and its severity, and ask you for details if needed; if it is not a vulnerability, explain why.
3. **Fix**: discuss the fix with you in a private GitHub security advisory, where you can also submit a fix on a private fork.
4. **Release**: release a fixed version and update the live site, publish the security advisory, request a CVE ID through GitHub when applicable, and record the fix under "Security" in [CHANGELOG_en.md](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/CHANGELOG_en.md).
5. **Credit**: credit you in the advisory if you wish.

Please do not disclose details until the fix is released. If a fix cannot be ready within 90 days, the maintainer will explain why before the deadline and agree on a new disclosure date with you.

## Scope

### In scope

- XSS or arbitrary HTML injection through bank content, URL parameters or localStorage data.
- Bypassing the `json/banks.json` whitelist, the file name rule or the `json/` folder restriction to load unexpected files.
- Bypassing the Content Security Policy (CSP) in `index.html`.
- Formula injection when an exported CSV is opened in spreadsheet software.
- Prototype pollution or unexpected code execution caused by corrupted or tampered localStorage data.
- Local data being sent to a third party.

### Out of scope

| Item | Reason |
|---|---|
| Questions and answers are visible in the browser | By design. This is a self-study tool whose banks are public on the client and it provides no anti-cheating protection. See [Security & Defensive Architecture in the README](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/README_en.md#security--defensive-architecture) |
| A user editing their own localStorage or changing scores with developer tools | It only affects that user's own browser |
| Self-XSS | Requires the victim to paste and run code in developer tools themselves |
| HTTP response headers that GitHub Pages cannot set, such as `X-Frame-Options` or a header-delivered CSP `frame-ancestors` | A limitation of the static hosting platform, and the site has no sign-in or other sensitive actions |
| Wrong questions, answers or explanations | Use the [Question error](https://github.com/Scorpio-meow/Examination-System/issues/new?template=question_error.yml) template |
| Automated scanner output without a description of real impact | The risk cannot be assessed |

## Security design

For the defenses already in place, see:

- [ADR-001: Client-side data security and defensive validation](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/docs/adr/ADR-001-local-security-validation_en.md)
- [ADR-002: Front-end rewrite](https://github.com/Scorpio-meow/Examination-System/blob/HEAD/docs/adr/ADR-002-frontend-architecture_en.md)
