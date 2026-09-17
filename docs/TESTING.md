# Tests and verification evidence

## Repeatable checks

```sh
npm ci
npm run check
npx playwright install chromium
npm run test:e2e
npm run format:check
```

`check` runs strict TypeScript, the domain suite in three separate Node processes with different `TZ` values, and a production build. The cross-platform Node test runner uses `UTC`, `America/Los_Angeles` and `Asia/Tokyo`. Vitest only includes `tests/unit/**/*.test.ts`; Playwright tests live separately. Playwright starts or reuses port 4305 locally, uses Chromium, and retains traces/screenshots for failures. CI does not reuse an existing server.

## Acceptance map

| Requirement         | Evidence                                                                                                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| O1                  | London and New York offset assertions immediately before/after all four 2026 DST transition dates                                                                                                     |
| O2                  | Actual 23/25-hour bounds, 92/100 chronological slots, nonexistent-time rejection, distinct repeated instants/offsets and explicit date fallback                                                       |
| O3                  | Taipei, Kolkata's half-hour offset, previous/next-day shifts, New Year and adjacent UTC-year boundaries                                                                                               |
| O4                  | Full-duration fit, exact work end, one-minute overrun, exact midnight, next-day rejection and real rollback/forward-transition segments                                                               |
| O5                  | Anchor instant preservation, date conversion, exact URL round trip, protocol/query handling, malformed/oversized/unsupported input and empty/duplicate/excess participant rejection                   |
| O6                  | Date/city/work hours/duration changes, keyboard minute slider, copy/reload, manual copy fallback, mobile layout and doubled text sizes                                                                |
| Security/resilience | HTML-like URL input remains rejected with no image node; stale add form and out-of-range anchor preserve plan with no page error; stale clipboard completion cannot claim the current plan was copied |

## Recorded local results

17 September 2026:

- `npm run check`: passed; **47 domain cases in each of three host time zones** (141 executions), typecheck and production build.
- `npm run test:e2e`: **16 Chromium journeys passed**.
- `npm run format:check`: passed with the pinned Prettier version.
- Production preview smoke: CSP present; the second London 01:30 on the 25-hour day survived reload exactly; 100 quarter-hour cells rendered, and browser console/page error lists were empty.
- Real screenshots are captured at 1440px desktop and 390px mobile in `docs/screenshots/`. Browser tests also check no page overflow at 320px and 390px and after doubling every element's computed font size.
- Parent's independent initial review reported zero axe WCAG2/2.1 AA violations, no page errors and no overflow at 1440/720/390/320px.

Initial browser checks caught an exact-name mismatch caused by wrapping the duration select inside its label; the final label has an explicit `htmlFor`/`id` association. Parent review caught an uncaught anchor transition at the supported date boundary; a shared safe-action wrapper and a browser regression now verify error visibility and prior-state preservation.

## Fixtures and scope

`fixtures/sample-plan.json` holds the default synthetic team. `fixtures/london-repeat-second.json` selects the second London 01:30 on 25 October 2026. Fixtures are plain validated configuration examples; the app accepts sharing fragments, not file uploads.

Only local Chromium is exercised automatically. Firefox, Safari, physical phones, screen readers, future changes to government time-zone rules and deployment headers need their own verification. Doubled computed text sizes approximate text scaling and do not replace device accessibility checks. No solar, holiday, booking, multi-user consistency, throughput or performance benchmark is claimed. Public deployment and clean-clone verification are separate release gates.

## Refinement verification

Two real regressions were observed red before their final fixes:

- `npm run test:e2e -- --grep 'keyboard adjustment'`: the slider became inactive after its first ArrowRight because the entire picker was keyed by the changed instant. The test now preserves focus through two consecutive minute changes.
- `npm run test:e2e -- --grep 'restoring a shared plan'`: an old work-hour editor remained open after a different URL restored the same city, leaving stale hours ready to overwrite the restored plan. A restore generation now retires that old editor, and reopening reads the restored hours.

`tests/e2e/refinement.spec.ts` contributes six journeys covering these regressions, invalid clock draft reset without replacing controls, exact suggestion selection/reload, distinct repeated-hour suggestions with bounded pagination, and the new grid at 320px with doubled computed text sizes. All 16 browser journeys pass. `npm run check` again passes 47 domain cases in each of three host time zones (141 executions), TypeScript, and the build. Actual desktop/mobile screenshots were refreshed and visually inspected; every shell supporting font is at least 11 CSS pixels. No dependency or domain schema changes were made.

The full 16-journey suite also passed against a fresh production preview on port 4305, with the built CSP active; the final screenshots came from that run. The original axe observations above describe the initial release. Public deployment and independent accessibility verification of this refinement remain separate release checks.
