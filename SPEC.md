# Overlap — Thoughtful time-zone planning

This document defines the behavior and acceptance criteria. All demonstration data is synthetic. The demo runs without a login or API key.

## Product and visual design

A light paper-and-indigo planner with large date, horizontal daylight/work-hour bands and city local-clock rows. Meaningful accents identify overlap and selected meeting, with patterns/text as well as color. Start London, Taipei and New York.

## Model and rules

Configuration v1 has anchor IANA zone, local date, chosen meeting UTC instant, duration (15/30/60/90/120 min), and <=6 unique participants {zone,workStartHour,workEndHour}. Work interval same local day with start<end, integer hours0..24. No invented offsets; use Intl and a well-supported library/polyfill if needed. URL payload <=8KiB, validate all dates/zones/hours and reject unsupported versions. User selecting another anchor zone changes presentation, not the chosen instant.

## Required behavior

1. Choose date, add/remove supported city zones, edit working hours and choose meeting start from a labelled slider/time grid with keyboard alternative. At least8 curated cities across continents; custom valid IANA input optional.
2. Derive each local date/time and meeting interval for the same UTC instant. Render day shifts. Full meeting interval must fit every participant's work window to count as overlap, not just start.
3. Timeline represents actual instants on anchor's local calendar date: DST day can contain23/25 hours. Ambiguous repeated local times labelled with offset; nonexistent local times unavailable/rejected, never silently shifted without explanation.
4. Previous/next date recomputes permitted instants; desired wall time preserves where unambiguous and fallback explicitly shown. Changing duration recomputes availability.
5. Share configuration through URL and copy link with fallback if clipboard unavailable. On reload restore exact instant and settings. Corrupt URL uses safe defaults with warning.
6. Summary shows each participant's local start/end, day offsets and whether inside work hours. No booking or invitations.
7. All labels and times format consistently (24hour); date-only values parsed as calendar dates, never as host-local Date assumptions. Tests run under different host TZ.

## Acceptance tests

- O1: London/New York offset differences around2026-03-08,2026-03-29,2026-10-25,2026-11-01.
- O2: actual23/25hour anchor day, gap rejected and repeated hour distinguishes instants.
- O3: Taipei and half-hour zone Asia/Kolkata; crossing midnight and year boundary.
- O4: meeting whole duration fits work windows; end exactly workEnd accepted, one minute beyond fails.
- O5: anchor switch preserves instant; share roundtrip and corrupt payload fallback; empty participant list rejected.
- O6 browser: edit date/city/work hours/duration, select slot, copy/reload share link; keyboard and mobile.

## Documentation

Explain instant vs local date, DST policy, limited working-hour model and library choice with official sources. Document privacy (URL includes settings only).

## Completion gate

Implement the behavior and acceptance tests above; document any deliberate limitation. `npm run check` and `npm run test:e2e` must pass. Independently review the code and exercise the production build before release. Verify the public demo at its GitHub repository subpath.

## Usability refinement

- Consecutive slider arrow-key changes preserve focus and move by exact minutes. Clock drafts/errors reset when the committed instant or restored plan changes without remounting the picker.
- A bounded, paginated grid presents shared starts with anchor UTC offsets and each participant's local time. Suggestions retain the 15-minute grid and existing full-duration checks; repeated wall times remain distinct exact instants.
- Restoring a URL retires an old work-hour editor, so a stale draft cannot replace restored settings. Shell supporting text is at least 11 CSS pixels and the new grid supports 320px and enlarged text.

## Calendar handoff refinement (23 September 2026)

Download a single-event `.ics` snapshot of the currently committed meeting. The optional title is local-only, 1–80 UTF-16 code units after trimming, and rejects control characters. UTC DTSTART and exclusive DTEND encode exact selected instants and real elapsed duration, including repeated clock times and date boundaries. The file has a unique UID, UTC DTSTAMP, CRLF lines and RFC 5545 UTF-8 byte-aware folding. Plain-text description lists each supported city’s local date/time/offset and whether the complete interval fits. It contains no attendees, organizer, alarms, recurrence or scheduling METHOD; downloading sends no invitations. It does not silently apply uncommitted clock or work-hour drafts. Plans outside work hours may be exported with a visible reminder. Invalid titles preserve the plan and produce no download.

Acceptance: parse actual download start/end; verify both London 01:30 occurrences separately; duration crossing spring DST/year end; long Unicode title folding and injection rejection; current plan/anchor changes reflected in subsequent downloads; narrow-screen keyboard operation and public engineering links.

## Accessibility interaction refinement

Preserve a usable focus destination after conditional controls disappear, associate validation errors with the affected fields, support visible keyboard focus and reduced motion, and maintain 320px reflow with enlarged text. Keyboard-only tasks and the explicitly unverified assistive-technology/device conditions are documented in [ACCESSIBILITY.md](docs/ACCESSIBILITY.md). City and time editing preserve committed instant authority; cancelling an unfinished editor does not change the plan.
