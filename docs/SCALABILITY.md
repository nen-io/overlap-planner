# Scalability and limits

## Implemented envelope

- One to six participants from eleven curated IANA zones.
- Dates from 2000 through 2099; UTC instants can fall in an adjacent year where an anchor date requires it.
- Duration of 15, 30, 60, 90 or 120 actual minutes; minute-precision start selection.
- URL payload limited to 8 KiB before decode/parse and after decode.
- Day bands use 15-minute samples: 92, 96 or 100 starts on the tested 23/24/25-hour days.
- Shared-time suggestions search that finite grid; they do not claim to search every possible second/minute. A valid manually selected minute still receives an exact interval-fit check.

Overload is explicit: the seventh participant is rejected, Add disables at six, duplicate zones are refused, oversized/corrupt URLs load a warning plus safe sample, and out-of-range date transitions preserve the old plan. No growing background queue, document history or storage cache is present.

## Costs and current choices

With P participants, S displayed starts and T offset transitions inside a meeting, slot generation is O(S × P × (T + 1)) domain checks plus the polyfill/runtime's zone lookup cost. The supported short durations and curated zones keep T small; there is no invented constant-time claim about Intl. Slot memory is O(S × P), and rendered bands are O(S × P) buttons. At the tested maximum day/participant count this is 600 band cells. Full meeting summaries are O(P × (T + 1)). A gap date fallback scans at most the actual number of minutes in that one day.

The domain slots are memoized across meeting-start changes; the same date/anchor/duration/work windows need not be recalculated for each slider step. City-row local labels still derive during rendering. Full recomputation after date, duration or work-window changes favors simple consistency over incremental-cache complexity. Configuration serialization and validation are bounded linear operations in the small participant array and URL size.

## Measurements versus assumptions

No latency percentile, throughput, heap size or load-test capacity has been benchmarked. Tests establish behavior and bounds, not measured production scale. Screenshots and Chromium journeys are from the local development host; they do not prove physical-phone performance. The counts above follow from the model rather than a profiler.

## At 10× the scope

If extending to 60 people or multi-day views, group participants with identical zone/work rules, cache their shared calculations by date/zone/duration/window and measure actual input responsiveness. Precompute local labels once per zone/slot instead of in every row. Virtualize rows, preserving keyboard alternatives and textual summaries. Keep invalidation explicit: duration/work-window/date/anchor changes invalidate availability; selected instant changes only summaries/marker position.

## At 100× or with real calendars

Hundreds of people and long search horizons require bounded search jobs, cancellation and worker isolation so Intl computation does not monopolize the main thread. A worker improves responsiveness, not authorization. Calendar integration introduces sensitive event data, authenticated provider access, token storage, permission scopes and rate limits absent from this demo. A backend would need per-user access control, encrypted secrets, input quotas, idempotent refresh jobs and versioned availability snapshots.

Collaborative planning also changes consistency: a URL is currently an immutable share snapshot, not a shared authoritative document. Use explicit server revisions and conflict handling for simultaneous edits instead of silently overwriting another user's choices. Cache keys must include zone-database version/availability source revision where reproducibility matters. These are proposed redesigns, not shipped capabilities.

The shared-start grid reuses the day's existing 92/96/100 quarter-hour slots and filters them once per render. It renders at most six cards, each with at most six local clock labels. Pagination stores only a page number and clamps it if the set shrinks. No unbounded horizon, minute-by-minute recommendation search, network request, or new persisted collection was added.
