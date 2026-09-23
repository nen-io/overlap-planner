# Assets and provenance

The planner's layout, colors, text, sample working-hour configuration and CSS bands are original to this example. No private product source, real customer schedule, external map, stock image or personal information was used. The sample contains only city zones and synthetic shifts; Taipei intentionally starts later to demonstrate a shared meeting window.

System fonts avoid remote font requests. Lucide icons come from the pinned `lucide-react` package under its ISC license. Geographic labels are descriptive names, not licensed map data. Time-zone calculations are supplied by the Temporal polyfill using the runtime's Intl data; this is not a hand-maintained offset table.

`docs/screenshots/desktop.png` and `mobile.png` are actual Playwright captures of the running, populated application with shared-start cards at 1440px and 390px. They are not image-generated mockups. There are no raster/media assets or third-party calls in the app itself. Original authored assets and source follow the repository MIT license; dependency licenses remain with their packages.

`docs/screenshots/calendar-export.png` is an actual Chromium region capture after downloading London's second 01:30 occurrence on 25 October 2026, from `tests/e2e/calendar.spec.ts`. It shows the off-hours reminder and real download feedback; no calendar-client import or invitation is depicted.
