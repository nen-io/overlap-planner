# Overlap design plan

Written before UI implementation. A paper-and-indigo meeting planner with a generous masthead, editorial date typography and a technical time-band workspace. The page reads as an invitation to find a considerate time, with no fabricated productivity metrics.

A slim brand header sits above a large date and a short explanation. A date/anchor control strip establishes whose calendar day the timeline represents. Each city row pairs an actual local start/end with a horizontal 24-hour-style band; the band is really built from chronological instants and expands to 23 or 25 hours on DST days. Pale indigo means work hours, a hatch means outside work, and a dark outlined meeting indicator spans the actual meeting duration. A textual legend supplies the same information without relying on color.

A bottom meeting card shows the anchor start and duration controls, an accessible native slider, and a full-interval overlap status. The city summary includes calendar-day shifts, UTC offsets and explicit within/outside work-hour text. Sharing exposes a copyable URL as a fallback and makes clear that it stores configuration, not invitations.

Primary journey: choose a date, move the meeting across the real day, adjust duration or city work windows, inspect each person's local meeting interval, and share the exact configuration. Date changes preserve the desired anchor wall clock where possible; gap/repeat fallback is always explained. Anchor changes preserve the instant and may change the displayed calendar date. Typed nonexistent times are rejected; repeated times require an explicit occurrence choice with UTC offset.

Invalid date, zone/hour or URL data gets a nearby warning while committed state remains valid. No shared-working-time day gets an honest explanation, not an invented recommendation. At least one participant stays present and the Add control explains the six-city limit. Dates are deterministic in the initial example, so screenshots and walkthroughs do not expire daily.

Phone layout stacks city identity, local summary and band; controls wrap with a two-column-to-one-column transition. Timeline tick labels become sparse while the native slider and textual time picker stay fully usable. 320px, text scaling, keyboard operation, strong focus states and reduced motion are acceptance checks. Supporting text uses a dark enough gray/indigo palette to meet normal text contrast. No remote font, icon font, decorative map request or analytics.
