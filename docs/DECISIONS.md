# Decision records

## ADR 001 — Explicit Temporal polyfill rather than hand-written offset arithmetic

**Context:** DST gaps, repeated hours and 23/25-hour days are core requirements. **Alternatives:** native Date plus manual offsets; a smaller date formatter; conditional native Temporal. **Decision:** pin and explicitly import `@js-temporal/polyfill` 0.5.1, using Instant, PlainDate and ZonedDateTime boundaries. **Consequences:** a larger bundle but clear exact/calendar types and explicit disambiguation. Runtime Intl/tzdata still controls zone rules, so this does not freeze historical/future law. **Revisit:** native API availability across the supported browser matrix, measured bundle pressure or a need for independently versioned tzdata.

## ADR 002 — Pure validated domain with a React presentation layer

**Context:** Time-zone correctness must be testable without browser or host-local assumptions. **Alternatives:** date logic in component handlers; a global state library; a backend as authority. **Decision:** pure configuration transitions, slot and interval functions in domain modules; React owns drafts, committed configuration and presentation. **Consequences:** the same 47 test cases run under three host zones. All external state and mutations validate before commit. UI safe actions preserve prior state on errors. **Revisit:** reusable domain package consumers, substantially larger state or shared server authority.

## ADR 003 — Real instant timeline and explicit wall-time ambiguity

**Context:** A fake fixed 24-hour grid can silently pick the wrong time. **Alternatives:** omit DST days, normalize gaps automatically or always choose the first repeated time. **Decision:** derive actual day bounds and step through real instants. Typed gaps are errors; repeats require offset choices. Date navigation announces its gap/earlier-repeat fallback, while anchor changes preserve the instant. **Consequences:** a day may contain 92 or 100 quarter-hour starts, and date navigation can move the chosen wall reading with explanation. The meeting clock has minute resolution. **Revisit:** sub-minute scheduling or more complex historical transition support.

## ADR 004 — Whole-interval work check split at offset transitions

**Context:** Checking only the start, or just local endpoints, can misclassify an interval. **Alternatives:** sample each minute; map ambiguous work boundaries with implicit disambiguation; inspect endpoints without transitions. **Decision:** split at real transitions and verify each monotonic segment with an exclusive end. **Consequences:** exact work-end/midnight endings pass, overruns fail, and rollback/forward cases are explicit. Work windows remain same-day integer hours; no overnight/holiday model is invented. **Revisit:** split shifts, holiday calendars, fractional-hour work windows or multi-day meetings.

## ADR 005 — Bounded URL state with no accounts or database

**Context:** Share/reload should preserve the exact plan without collecting identity. **Alternatives:** localStorage-only state; server short links; automatic calendar invitations. **Decision:** validate a versioned configuration in an 8 KiB URL fragment, replace the current history entry after commits and copy immutable snapshots. Exclude arbitrary names/URLs and strip query parameters. **Consequences:** no backend/storage dependency, but links expose their settings and are snapshots rather than collaborative documents. Clipboard completion is generation-fenced. **Revisit:** confidential planning, invitation workflows, durable shared editing or URL-length constraints at larger scale.

## ADR 006 — Small curated catalog and finite suggestion grid

**Context:** A clean portfolio demo should make resource and correctness scope visible. **Alternatives:** arbitrary IANA zones, an unbounded participant list and unconstrained search horizon. **Decision:** eleven curated cities, at most six participants, 2000–2099 dates and a 15-minute suggested-start grid; manual minute selection remains available. **Consequences:** predictable bounded work and explicit overload behavior. Daytime shading is a labelled 07–19 guide rather than invented astronomical data. No performance claims without measurements. **Revisit:** validated demand and profiling for broader zones, larger groups or real solar/calendar data.

## ADR 007 — Stable control identity with bounded shared-start choices

**Context:** The meeting picker was keyed by the selected instant. Each arrow-key adjustment recreated the slider, so focus disappeared after one minute. A single Find button also hid other valid choices, while a same-city work-hour form could retain stale draft hours after an external URL restore.

**Alternatives:** Re-focus every remounted slider; render every minute as a separate control; automatically choose one best time; or preserve the picker and expose a bounded set of exact suggestions.

**Decision:** Keep meeting controls mounted and synchronize their local clock draft only when the committed instant/calendar or explicit restore generation changes. Render up to six shared starts per page from the existing validated slot list, showing anchor offsets and participant local clocks. URL restoration increments a UI-only generation that retires old city editors.

**Consequences:** Keyboard and pointer interaction retain control identity. The domain, minute precision, DST policy, URL schema, and full-interval validation are unchanged. Suggestions are a finite quarter-hour sample, not proof that no other exact-minute start can fit. The UI generation is not serialized or used as time authority. Clock editing remains local until submitted; duration changes alone do not erase the typed draft.

**Revisit:** Real calendar availability, richer ranking, or much larger teams would justify a different suggestion model. Preserve explicit instants and distinguish editor reset boundaries from ordinary updates.
