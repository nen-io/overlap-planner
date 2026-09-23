import { describe, expect, it } from "vitest";
import { calendarFile } from "../../src/domain/calendar";
import { defaultConfiguration } from "../../src/domain/planner";
const metadata = {
  uid: "974825d6-b567-4628-86b5-012345678901",
  createdAt: "2026-09-23T10:12:34.567Z",
};
const make = (
  meetingInstant: string,
  localDate: string,
  durationMinutes = 60,
) => ({
  ...defaultConfiguration(),
  meetingInstant,
  localDate,
  durationMinutes,
});
const unfold = (value: string) => value.replace(/\r\n /g, "");

describe("calendar handoff", () => {
  it.each([
    [
      "2026-10-25T00:30:00Z",
      "2026-10-25",
      "20261025T003000Z",
      "20261025T013000Z",
    ],
    [
      "2026-10-25T01:30:00Z",
      "2026-10-25",
      "20261025T013000Z",
      "20261025T023000Z",
    ],
    [
      "2026-03-29T00:30:00Z",
      "2026-03-29",
      "20260329T003000Z",
      "20260329T013000Z",
    ],
    [
      "2026-12-31T23:30:00Z",
      "2026-12-31",
      "20261231T233000Z",
      "20270101T003000Z",
    ],
  ])("exports exact elapsed time at %s", (instant, date, start, end) => {
    const ics = calendarFile(make(instant, date), "Planning", metadata);
    expect(ics).toContain(`DTSTART:${start}\r\n`);
    expect(ics).toContain(`DTEND:${end}\r\n`);
    expect(ics).toContain("DTSTAMP:20260923T101234Z\r\n");
    expect(ics).not.toMatch(/ATTENDEE|ORGANIZER|VALARM|METHOD|TZID/);
  });
  it("escapes text separators and folds long UTF-8 titles without splitting a character", () => {
    const title = "設計,計劃;路徑\\" + "🌍".repeat(30);
    const ics = calendarFile(defaultConfiguration(), title, metadata);
    expect(unfold(ics)).toContain(
      "SUMMARY:設計\\,計劃\\;路徑\\\\" + "🌍".repeat(30),
    );
    for (const line of ics.split("\r\n"))
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(ics).toMatch(/\r\n /);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    expect(
      new TextDecoder("utf-8", { fatal: true }).decode(
        new TextEncoder().encode(ics),
      ),
    ).toBe(ics);
  });
  it.each([
    "",
    " ",
    "x".repeat(81),
    "Meeting\r\nATTENDEE:mailto:person@example.com",
    "x\u0000y",
  ])("rejects an invalid or injectable title", (title) => {
    expect(() => calendarFile(defaultConfiguration(), title, metadata)).toThrow(
      "1–80",
    );
  });
  it("revalidates configuration and export metadata", () => {
    expect(() =>
      calendarFile(
        { ...defaultConfiguration(), durationMinutes: 2 },
        "Meeting",
        metadata,
      ),
    ).toThrow();
    expect(() =>
      calendarFile(defaultConfiguration(), "Meeting", {
        ...metadata,
        uid: "bad\r\nATTENDEE:injected",
      }),
    ).toThrow();
    expect(() =>
      calendarFile(defaultConfiguration(), "Meeting", {
        ...metadata,
        createdAt: "bad",
      }),
    ).toThrow();
  });
  it("explains local times and off-hours without inventing attendees", () => {
    const ics = unfold(
      calendarFile(
        make("2026-10-25T01:30:00Z", "2026-10-25"),
        "Early meeting",
        metadata,
      ),
    );
    expect(ics).toContain("London: 2026-10-25 01:30 UTC+00:00");
    expect(ics).toContain("Taipei: 2026-10-25 09:30 UTC+08:00");
    expect(ics).toContain("Outside one or more work windows.");
    expect(ics).toContain("No invitations have been sent.");
  });
});
