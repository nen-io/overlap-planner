import { describe, expect, it } from "vitest";
import { Temporal } from "@js-temporal/polyfill";
import {
  changeAnchor,
  changeDate,
  chooseLocalTime,
  clock,
  dayBounds,
  daySlots,
  defaultConfiguration,
  fullIntervalFits,
  parseDate,
  participantSummary,
  possibleInstants,
  shiftDate,
  validateConfiguration,
} from "../../src/domain/planner";
import {
  decodeConfiguration,
  encodeConfiguration,
  shareUrl,
} from "../../src/domain/sharing";
const at = (value: string) => Temporal.Instant.from(value);

describe("offsets and calendar dates O1/O3", () => {
  it.each([
    ["2026-03-07T12:00:00Z", "+00:00", "-05:00"],
    ["2026-03-08T12:00:00Z", "+00:00", "-04:00"],
    ["2026-03-28T12:00:00Z", "+00:00", "-04:00"],
    ["2026-03-29T12:00:00Z", "+01:00", "-04:00"],
    ["2026-10-24T12:00:00Z", "+01:00", "-04:00"],
    ["2026-10-25T12:00:00Z", "+00:00", "-04:00"],
    ["2026-10-31T12:00:00Z", "+00:00", "-04:00"],
    ["2026-11-01T12:00:00Z", "+00:00", "-05:00"],
  ])("uses actual London/New York offsets at %s", (instant, london, ny) => {
    expect(at(instant).toZonedDateTimeISO("Europe/London").offset).toBe(london);
    expect(at(instant).toZonedDateTimeISO("America/New_York").offset).toBe(ny);
  });
  it("handles Taipei, Kolkata half-hours and year/day boundaries", () => {
    const config = {
      ...defaultConfiguration(),
      localDate: "2026-12-31",
      meetingInstant: "2026-12-31T23:30:00Z",
    };
    const taipei = participantSummary(config, {
      zone: "Asia/Taipei",
      workStartHour: 0,
      workEndHour: 24,
    });
    expect(clock(taipei.start)).toBe("07:30");
    expect(taipei.start.toPlainDate().toString()).toBe("2027-01-01");
    expect(taipei.dayShift).toBe(1);
    expect(
      clock(at(config.meetingInstant).toZonedDateTimeISO("Asia/Kolkata")),
    ).toBe("05:00");
    const ny = participantSummary(
      {
        ...config,
        localDate: "2026-01-01",
        meetingInstant: "2026-01-01T01:00:00Z",
      },
      { zone: "America/New_York", workStartHour: 0, workEndHour: 24 },
    );
    expect(ny.dayShift).toBe(-1);
    expect(ny.start.toPlainDate().toString()).toBe("2025-12-31");
  });
  it.each([
    "2026-02-30",
    "2026-13-01",
    "2026-1-1",
    "1999-12-31",
    "2100-01-01",
    "<img src=x>",
  ])("rejects invalid or unsupported date %s", (value) =>
    expect(() => parseDate(value)).toThrow(),
  );
});
describe("real DST days, disambiguation and date changes O2", () => {
  it.each([
    ["2026-03-29", "Europe/London", 23],
    ["2026-10-25", "Europe/London", 25],
    ["2026-03-08", "America/New_York", 23],
    ["2026-11-01", "America/New_York", 25],
    ["2026-09-17", "Asia/Kolkata", 24],
  ])("measures %s %s as %i hours", (date, zone, hours) =>
    expect(dayBounds(date as string, zone as string).hours).toBe(hours),
  );
  it("omits gaps, distinguishes repeated instants and keeps chronological slots", () => {
    expect(possibleInstants("2026-03-29", "01:30", "Europe/London")).toEqual(
      [],
    );
    const repeats = possibleInstants("2026-10-25", "01:30", "Europe/London");
    expect(repeats.map((value) => value.toString())).toEqual([
      "2026-10-25T00:30:00Z",
      "2026-10-25T01:30:00Z",
    ]);
    const spring = daySlots({
      ...defaultConfiguration(),
      localDate: "2026-03-29",
    });
    expect(spring).toHaveLength(92);
    expect(spring.some((slot) => slot.label === "01:30")).toBe(false);
    const fall = daySlots({
      ...defaultConfiguration(),
      localDate: "2026-10-25",
    });
    expect(fall).toHaveLength(100);
    expect(
      fall.filter((slot) => slot.label === "01:30").map((slot) => slot.offset),
    ).toEqual(["UTC+01:00", "UTC+00:00"]);
    expect(
      fall.every(
        (slot, index) => !index || slot.epochMs > fall[index - 1].epochMs,
      ),
    ).toBe(true);
  });
  it("rejects nonexistent time and requires a choice for repeated time", () => {
    const spring = {
      ...defaultConfiguration(),
      localDate: "2026-03-29",
      meetingInstant: "2026-03-29T12:00:00Z",
    };
    expect(() => chooseLocalTime(spring, "01:30")).toThrow("does not exist");
    const fall = {
      ...spring,
      localDate: "2026-10-25",
      meetingInstant: "2026-10-25T12:00:00Z",
    };
    expect(() => chooseLocalTime(fall, "01:30")).toThrow("occurs twice");
    expect(chooseLocalTime(fall, "01:30", "later").meetingInstant).toBe(
      "2026-10-25T01:30:00Z",
    );
  });
  it("preserves wall time across dates and explains gap/repeat fallbacks", () => {
    const before = {
      ...defaultConfiguration(),
      localDate: "2026-03-28",
      meetingInstant: "2026-03-28T01:30:00Z",
    };
    const spring = shiftDate(before, 1);
    expect(spring.config.meetingInstant).toBe("2026-03-29T01:00:00Z");
    expect(spring.notice).toContain("Moved to the first available time, 02:00");
    const normal = changeDate(before, "2026-04-01");
    expect(normal.config.meetingInstant).toBe("2026-04-01T00:30:00Z");
    const fall = changeDate(before, "2026-10-25");
    expect(fall.config.meetingInstant).toBe("2026-10-25T00:30:00Z");
    expect(fall.notice).toContain("earlier occurrence");
  });
  it("handles minimum date with previous UTC year and rejects stepping out of bounds", () => {
    const start = {
      ...defaultConfiguration(),
      anchorZone: "Asia/Taipei",
      localDate: "2000-01-01",
      meetingInstant: "1999-12-31T16:00:00Z",
    };
    expect(validateConfiguration(start).meetingInstant).toBe(
      start.meetingInstant,
    );
    expect(() => shiftDate(start, -1)).toThrow();
    expect(
      validateConfiguration({
        ...start,
        anchorZone: "America/New_York",
        localDate: "2099-12-31",
        meetingInstant: "2100-01-01T04:00:00Z",
      }).meetingInstant,
    ).toBe("2100-01-01T04:00:00Z");
  });
});
describe("whole-interval working windows O4", () => {
  const london = { zone: "Europe/London", workStartHour: 9, workEndHour: 18 };
  it("accepts exact work-end but rejects one minute later or start-only overlap", () => {
    expect(fullIntervalFits(at("2026-09-17T16:00:00Z"), 60, london)).toBe(true);
    expect(fullIntervalFits(at("2026-09-17T16:01:00Z"), 60, london)).toBe(
      false,
    );
    expect(fullIntervalFits(at("2026-09-17T16:30:00Z"), 60, london)).toBe(
      false,
    );
  });
  it("allows an exact midnight end for a 00–24 window, rejects crossing into next day", () => {
    const allDay = { ...london, workStartHour: 0, workEndHour: 24 };
    expect(fullIntervalFits(at("2026-12-31T23:00:00Z"), 60, allDay)).toBe(true);
    expect(fullIntervalFits(at("2026-12-31T23:01:00Z"), 60, allDay)).toBe(
      false,
    );
  });
  it("checks both sides of a rollback and forward jump", () => {
    const repeat = { ...london, workStartHour: 1, workEndHour: 2 };
    expect(fullIntervalFits(at("2026-10-25T00:30:00Z"), 90, repeat)).toBe(true);
    expect(fullIntervalFits(at("2026-10-25T00:31:00Z"), 90, repeat)).toBe(
      false,
    );
    expect(
      fullIntervalFits(at("2026-03-29T00:30:00Z"), 60, {
        ...london,
        workStartHour: 0,
        workEndHour: 2,
      }),
    ).toBe(false);
    expect(
      fullIntervalFits(at("2026-03-29T00:30:00Z"), 60, {
        ...london,
        workStartHour: 0,
        workEndHour: 3,
      }),
    ).toBe(true);
  });
  it("duration changes availability and work band stays independent of duration", () => {
    const config = defaultConfiguration();
    const short = daySlots(config);
    const long = daySlots({ ...config, durationMinutes: 120 });
    expect(short.filter((slot) => slot.allWorking).length).toBeGreaterThan(
      long.filter((slot) => slot.allWorking).length,
    );
    expect(short.map((slot) => slot.working)).toEqual(
      long.map((slot) => slot.working),
    );
  });
});
describe("identity, sharing and hostile inputs O5", () => {
  it("anchor switches preserve exact instant and update local calendar date", () => {
    const original = {
      ...defaultConfiguration(),
      meetingInstant: "2026-09-17T22:30:00Z",
    };
    const changed = changeAnchor(original, "Asia/Taipei");
    expect(changed.meetingInstant).toBe(original.meetingInstant);
    expect(changed.localDate).toBe("2026-09-18");
  });
  it("roundtrips exact configuration and strips existing query information from share URL", () => {
    const config = defaultConfiguration();
    expect(decodeConfiguration(encodeConfiguration(config))).toEqual({
      config,
      warning: "",
    });
    const url = shareUrl(
      "https://example.test/overlap/?secret=do-not-copy#other",
      config,
    );
    expect(new URL(url).search).toBe("");
    expect(decodeConfiguration(new URL(url).hash).config).toEqual(config);
    expect(() => shareUrl("javascript:alert(1)", config)).toThrow();
  });
  it.each([
    "#plan=%zz",
    "#plan=%7B",
    "#plan=" + "x".repeat(8193),
    "#other=1",
    "#plan=" + encodeURIComponent(JSON.stringify({ version: 2 })),
    "#plan=" +
      encodeURIComponent(
        JSON.stringify({
          ...defaultConfiguration(),
          anchorZone: "<img src=x onerror=alert(1)>",
        }),
      ),
  ])("invalid URLs recover without echoing hostile input", (hash) => {
    const result = decodeConfiguration(hash);
    expect(result.config).toEqual(defaultConfiguration());
    expect(result.warning).toContain("safe sample");
    expect(result.warning).not.toContain("<img");
  });
  it.each([
    { participants: [] },
    { participants: Array(7).fill(defaultConfiguration().participants[0]) },
    {
      participants: [
        defaultConfiguration().participants[0],
        defaultConfiguration().participants[0],
      ],
    },
    { durationMinutes: NaN },
    { durationMinutes: 45 },
    { anchorZone: "Invalid/Zone" },
    { meetingInstant: "2026-09-18T13:00:00Z" },
    { meetingInstant: "2026-09-17T13:00:30Z" },
    {
      participants: [
        { zone: "Europe/London", workStartHour: 17, workEndHour: 9 },
      ],
    },
    {
      participants: [
        { zone: "Europe/London", workStartHour: NaN, workEndHour: 24 },
      ],
    },
    {
      participants: [
        { zone: "Europe/London", workStartHour: 0, workEndHour: 25 },
      ],
    },
  ])("rejects malformed configuration %o", (patch) =>
    expect(() =>
      validateConfiguration({ ...defaultConfiguration(), ...patch }),
    ).toThrow(),
  );
});
