# Security and privacy model

## Assets, attackers and boundaries

This static demo has no account, privileged backend, credentials, uploads, analytics or third-party requests. Its assets are the integrity of the selected plan, browser responsiveness and understandable sharing behavior. URLs remain untrusted: an attacker can craft a fragment with malformed JSON, unexpected fields, oversized input, unsupported zones or HTML-like strings. A clipboard permission prompt can resolve after the user changes the plan. Extensions, a compromised host/dependency, or another script executing on the origin are outside the app's protection boundary.

| Threat                                     | Concrete mitigation                                                                                                                                      | Matching evidence                                                                                    |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Large/malformed fragment                   | Encoded and decoded 8 KiB bounds before parsing/construction; supported schema only                                                                      | Unit oversized/URI-corruption/version tests and browser safe fallback                                |
| Impossible or inconsistent plan            | Exact calendar parsing, curated zone allowlist, supported durations, one to six unique participants, same-day work bounds, instant/anchor-date agreement | Unit malformed/nonfinite/range/duplicate tests; browser invalid hours and date-boundary preservation |
| DOM injection                              | React text nodes; hostile URL values are rejected and warnings do not echo them; no innerHTML/eval                                                       | HTML-like anchor payload creates no image node and restores safe defaults                            |
| Lost correctness after a failed transition | Domain validation before committing and safe UI action wrapper                                                                                           | Browser anchor range-boundary failure and stale add form preserve prior state with no page error     |
| Misleading clipboard confirmation          | Captured snapshot plus generation fence; no stale success message after later edit                                                                       | Delayed clipboard browser test                                                                       |
| Unintended sharing of query information    | Share URLs strip existing query parameters, use fixed same-page HTTP(S) URL and contain only validated configuration                                     | Share URL unit test; exact copy/reload browser test                                                  |
| Resource growth                            | Six-city bound; finite day/date/duration scope; memoized derived slots; no persistent job or unbounded history                                           | Limit tests, 23/25-hour slot counts and source review                                                |

## Browser policy and dependencies

Production builds inject a meta CSP: default/script/connect/font sources are self; objects, base URI and form actions are disabled; images are self/data. Inline styles remain allowed for precise timeline geometry. Inline scripts and eval are not allowed. Development omits this policy for Vite tooling. Meta CSP does not supply `frame-ancestors`, HSTS or other server response headers; no host-level hardening is claimed. HTTPS and appropriate response headers belong to the deployment owner.

Exact direct versions and the npm lockfile make dependencies reviewable. Dependency scans alone are not a security audit. The Temporal polyfill and runtime time-zone database are correctness dependencies; current government zone-rule changes require runtime updates and fresh test evidence.

## Residual privacy risks

A share link exposes cities, work windows and the chosen meeting instant to anyone who has it. It is not encrypted. Fragments are not sent in the initial HTTP request, but browser history, extensions and any same-origin script can read them. There are no participant names or secrets in the schema. Browser clipboard contents persist outside this app. No localStorage is used.

Responsible reporting: use this repository's private vulnerability reporting feature if available. Otherwise open a minimal issue requesting a private channel; do not attach sensitive schedules or exploits publicly. No contact address is invented. The controls above are implemented demo boundaries, not a claim of comprehensive production security.
