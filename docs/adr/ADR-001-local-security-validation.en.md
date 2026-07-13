# ADR-001: Client-Side Data Security and Defensive Verification Mechanism

## Status
Accepted

## Context
In previous versions of the Examination System, several security concerns were identified:
1. **Arbitrary Question Bank Path Injection**: The path to load question banks could be manipulated via the URL `bank` parameter or the selection dropdown, potentially triggering loading of unauthorized local JSON files.
2. **Unvalidated LocalStorage Restorations**: Exam progress (`examProgress`) and history records (`examRecords`) were retrieved from LocalStorage and processed directly without schema checks. Malformed or corrupted local states could crash the system or introduce logical loops.
3. **Unsafe Object Merge on Configuration**: System configurations were restored using direct object spreads (`{ ...config, ...savedConfig }`), exposing the application to prototype pollution or configuration state contamination.
4. **Relaxed CSP Policy**: The Content Security Policy permitted the `data:` URI scheme in multiple locations, increasing the attack surface for potential data exfiltration.

To reinforce the resilience and stability of the system as a client-side practice tool, we decided to implement defensive programming controls at the browser level.

## Decision
We decided to integrate the following safety validation structures inside `app.js`:
1. **Question Bank Whitelisting**: Declared a static `ALLOWED_BANKS` whitelist. During bank initialization or switching, we check if the requested filename matches the whitelist, completely blocking path injection vulnerabilities.
2. **Defensive LocalStorage Schema Audits**: Implemented `_validateProgressSchema()` and `_validateRecordsSchema()` methods. These methods verify array formats, types of properties, item ranges, and value lengths before reading data. In case validation fails, the corrupted items are purged immediately.
3. **Safe Configuration Deserializer**: Introduced `_sanitizeConfig()` to parse saved options. This utility validates input types and value ranges before loading them into memory, replacing the unsafe direct object spread model.
4. **Tightened Content Security Policy**: Removed the `data:` URI scheme allowance from both `img-src` and `font-src` directives, restricting them to `'self'` only.
5. **DOM-Safe File Download Dispatch**: Avoided inserting `<a>` elements into the DOM tree during export actions. Instead, we programmatically dispatch mouse click events (`dispatchEvent(new MouseEvent(...))`) to trigger downloads, mitigating potential DOM manipulation vectors.

## Consequences
- **Advantages**:
  - Significantly improves runtime robustness, preventing page crashes due to corrupted local storage profiles.
  - Mitigates path injection vulnerabilities by locking down file scopes to whitelisted question files.
  - Minimizes cross-site scripting (XSS) risks and blocks common data leakage vectors through tightened security configurations.
- **Disadvantages / Constraints**:
  - Developers adding new question banks must register the JSON filename inside both `index.html` (the option list) and `app.js` (the `ALLOWED_BANKS` whitelist), introducing an extra configuration step in development.