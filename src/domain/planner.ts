import { Temporal } from "@js-temporal/polyfill";
export const CITIES = [
  {
    zone: "Europe/London",
    city: "London",
    country: "United Kingdom",
    code: "LON",
  },
  { zone: "Asia/Taipei", city: "Taipei", country: "Taiwan", code: "TPE" },
  {
    zone: "America/New_York",
    city: "New York",
    country: "United States",
    code: "NYC",
  },
  { zone: "Asia/Kolkata", city: "Kolkata", country: "India", code: "CCU" },
  { zone: "Asia/Tokyo", city: "Tokyo", country: "Japan", code: "TYO" },
  {
    zone: "Australia/Sydney",
    city: "Sydney",
    country: "Australia",
    code: "SYD",
  },
  {
    zone: "America/Los_Angeles",
    city: "Los Angeles",
    country: "United States",
    code: "LAX",
  },
  { zone: "Europe/Paris", city: "Paris", country: "France", code: "PAR" },
  {
    zone: "Asia/Singapore",
    city: "Singapore",
    country: "Singapore",
    code: "SIN",
  },
  {
    zone: "Asia/Dubai",
    city: "Dubai",
    country: "United Arab Emirates",
    code: "DXB",
  },
  {
    zone: "Africa/Johannesburg",
    city: "Johannesburg",
    country: "South Africa",
    code: "JNB",
  },
] as const;
export const DURATIONS = [15, 30, 60, 90, 120] as const;
export interface Participant {
  zone: string;
  workStartHour: number;
  workEndHour: number;
}
export interface Configuration {
  version: 1;
  anchorZone: string;
  localDate: string;
  meetingInstant: string;
  durationMinutes: number;
  participants: Participant[];
}
export const MAX_PAYLOAD_BYTES = 8192;
export class PlannerError extends Error {}
const isRecord = (input: unknown): input is Record<string, unknown> =>
  typeof input === "object" && input !== null;
export const cityFor = (zone: string) =>
  CITIES.find((city) => city.zone === zone)!;
export function validateZone(zone: unknown): string {
  if (typeof zone !== "string" || !CITIES.some((city) => city.zone === zone))
    throw new PlannerError("Choose a supported city time zone.");
  return zone;
}
export function parseDate(date: unknown): Temporal.PlainDate {
  if (typeof date !== "string" || !/^(20\d{2})-\d{2}-\d{2}$/.test(date))
    throw new PlannerError("Choose a calendar date from 2000 through 2099.");
  try {
    return Temporal.PlainDate.from(date, { overflow: "reject" });
  } catch {
    throw new PlannerError("That calendar date does not exist.");
  }
}
export function parseInstant(value: unknown): Temporal.Instant {
  if (
    typeof value !== "string" ||
    value.length > 40 ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00(?:\.000)?Z$/.test(value)
  )
    throw new PlannerError(
      "Meeting time must be a UTC instant at whole-minute precision.",
    );
  try {
    return Temporal.Instant.from(value);
  } catch {
    throw new PlannerError("The meeting instant is invalid.");
  }
}
export function validateConfiguration(input: unknown): Configuration {
  if (!isRecord(input) || input.version !== 1)
    throw new PlannerError(
      "This link uses an unsupported configuration version.",
    );
  const anchorZone = validateZone(input.anchorZone);
  const localDate = parseDate(input.localDate).toString();
  const instant = parseInstant(input.meetingInstant);
  if (
    instant.toZonedDateTimeISO(anchorZone).toPlainDate().toString() !==
    localDate
  )
    throw new PlannerError(
      "The meeting instant must belong to the selected anchor date.",
    );
  if (
    typeof input.durationMinutes !== "number" ||
    !DURATIONS.some((value) => value === input.durationMinutes)
  )
    throw new PlannerError("Choose a supported meeting duration.");
  if (
    !Array.isArray(input.participants) ||
    input.participants.length < 1 ||
    input.participants.length > 6
  )
    throw new PlannerError("Include between one and six unique cities.");
  const zones = new Set<string>();
  const participants = input.participants.map((item): Participant => {
    if (!isRecord(item)) throw new PlannerError("A city entry is malformed.");
    const zone = validateZone(item.zone);
    if (zones.has(zone))
      throw new PlannerError("Each city can appear only once.");
    zones.add(zone);
    const { workStartHour: start, workEndHour: end } = item;
    if (
      typeof start !== "number" ||
      typeof end !== "number" ||
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < 0 ||
      start >= end ||
      end > 24
    )
      throw new PlannerError(
        "Working hours need a start before the end, within 00:00–24:00.",
      );
    return { zone, workStartHour: start, workEndHour: end };
  });
  return {
    version: 1,
    anchorZone,
    localDate,
    meetingInstant: instant.toString(),
    durationMinutes: input.durationMinutes,
    participants,
  };
}
export const defaultConfiguration = (): Configuration => ({
  version: 1,
  anchorZone: "Europe/London",
  localDate: "2026-09-17",
  meetingInstant: "2026-09-17T13:00:00Z",
  durationMinutes: 60,
  participants: [
    { zone: "Europe/London", workStartHour: 9, workEndHour: 18 },
    { zone: "Asia/Taipei", workStartHour: 13, workEndHour: 22 },
    { zone: "America/New_York", workStartHour: 8, workEndHour: 17 },
  ],
});
export function dayBounds(date: string, zone: string) {
  const plain = parseDate(date);
  validateZone(zone);
  const start = plain.toZonedDateTime(zone).toInstant();
  const end = plain.add({ days: 1 }).toZonedDateTime(zone).toInstant();
  return {
    start,
    end,
    hours: (end.epochMilliseconds - start.epochMilliseconds) / 3600000,
  };
}
export const clock = (zoned: Temporal.ZonedDateTime) =>
  `${String(zoned.hour).padStart(2, "0")}:${String(zoned.minute).padStart(2, "0")}`;
export const hourLabel = (hour: number) =>
  `${String(hour).padStart(2, "0")}:00`;
export const offsetLabel = (zoned: Temporal.ZonedDateTime) =>
  `UTC${zoned.offset}`;
export function possibleInstants(
  date: string,
  time: string,
  zone: string,
): Temporal.Instant[] {
  const plainDate = parseDate(date);
  validateZone(zone);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    throw new PlannerError("Enter a 24-hour time as HH:MM.");
  const desired = plainDate.toPlainDateTime(time);
  const fields = {
    timeZone: zone,
    year: desired.year,
    month: desired.month,
    day: desired.day,
    hour: desired.hour,
    minute: desired.minute,
  };
  const earlier = Temporal.ZonedDateTime.from(fields, {
    disambiguation: "earlier",
  });
  const later = Temporal.ZonedDateTime.from(fields, {
    disambiguation: "later",
  });
  const valid = [earlier, later]
    .filter((value) => value.toPlainDateTime().equals(desired))
    .map((value) => value.toInstant());
  return valid.filter((value, index) => index === 0 || !value.equals(valid[0]));
}
export function chooseLocalTime(
  config: Configuration,
  time: string,
  occurrence?: "earlier" | "later",
): Configuration {
  const choices = possibleInstants(config.localDate, time, config.anchorZone);
  if (!choices.length)
    throw new PlannerError(
      `${time} does not exist on this date because clocks move forward. Choose another time.`,
    );
  if (choices.length === 2 && !occurrence)
    throw new PlannerError(
      `${time} occurs twice. Choose an occurrence with its UTC offset.`,
    );
  return validateConfiguration({
    ...config,
    meetingInstant:
      choices[occurrence === "later" ? choices.length - 1 : 0].toString(),
  });
}
export function changeAnchor(
  config: Configuration,
  anchorZone: string,
): Configuration {
  validateZone(anchorZone);
  return validateConfiguration({
    ...config,
    anchorZone,
    localDate: parseInstant(config.meetingInstant)
      .toZonedDateTimeISO(anchorZone)
      .toPlainDate()
      .toString(),
  });
}
export function changeDate(
  config: Configuration,
  localDate: string,
): { config: Configuration; notice: string } {
  parseDate(localDate);
  const desiredTime = clock(
    parseInstant(config.meetingInstant).toZonedDateTimeISO(config.anchorZone),
  );
  const choices = possibleInstants(localDate, desiredTime, config.anchorZone);
  if (choices.length)
    return {
      config: validateConfiguration({
        ...config,
        localDate,
        meetingInstant: choices[0].toString(),
      }),
      notice:
        choices.length === 2
          ? `${desiredTime} occurs twice on this date. The earlier occurrence was selected; choose the other occurrence below if needed.`
          : `Kept ${desiredTime} in ${cityFor(config.anchorZone).city}.`,
    };
  const bounds = dayBounds(localDate, config.anchorZone);
  let cursor = bounds.start;
  while (Temporal.Instant.compare(cursor, bounds.end) < 0) {
    if (clock(cursor.toZonedDateTimeISO(config.anchorZone)) >= desiredTime)
      break;
    cursor = cursor.add({ minutes: 1 });
  }
  if (cursor.equals(bounds.end)) cursor = bounds.start;
  return {
    config: validateConfiguration({
      ...config,
      localDate,
      meetingInstant: cursor.toString(),
    }),
    notice: `${desiredTime} does not exist on this date. Moved to the first available time, ${clock(cursor.toZonedDateTimeISO(config.anchorZone))}.`,
  };
}
export function shiftDate(config: Configuration, days: number) {
  return changeDate(
    config,
    parseDate(config.localDate).add({ days }).toString(),
  );
}
const isWorking = (time: Temporal.ZonedDateTime, person: Participant) =>
  time.hour >= person.workStartHour && time.hour < person.workEndHour;
/** Split at real offset transitions; each segment is monotonic in wall time. */
export function fullIntervalFits(
  instant: Temporal.Instant,
  durationMinutes: number,
  person: Participant,
): boolean {
  const end = instant.add({ minutes: durationMinutes });
  const initialDate = instant.toZonedDateTimeISO(person.zone).toPlainDate();
  let cursor = instant;
  while (Temporal.Instant.compare(cursor, end) < 0) {
    const first = cursor.toZonedDateTimeISO(person.zone);
    const transition = first.getTimeZoneTransition("next")?.toInstant();
    const boundary =
      transition && Temporal.Instant.compare(transition, end) < 0
        ? transition
        : end;
    const last = boundary
      .subtract({ nanoseconds: 1 })
      .toZonedDateTimeISO(person.zone);
    if (
      !first.toPlainDate().equals(initialDate) ||
      !last.toPlainDate().equals(initialDate) ||
      !isWorking(first, person) ||
      !isWorking(last, person)
    )
      return false;
    cursor = boundary;
  }
  return true;
}
export function participantSummary(config: Configuration, person: Participant) {
  const instant = parseInstant(config.meetingInstant);
  const start = instant.toZonedDateTimeISO(person.zone);
  const end = instant
    .add({ minutes: config.durationMinutes })
    .toZonedDateTimeISO(person.zone);
  return {
    start,
    end,
    fits: fullIntervalFits(instant, config.durationMinutes, person),
    dayShift: parseDate(config.localDate).until(start.toPlainDate()).days,
    endDayShift: start.toPlainDate().until(end.toPlainDate()).days,
  };
}
export interface Slot {
  instant: string;
  epochMs: number;
  label: string;
  offset: string;
  repeated: boolean;
  allWorking: boolean;
  working: boolean[];
}
export function daySlots(config: Configuration): Slot[] {
  const { start, end } = dayBounds(config.localDate, config.anchorZone);
  const slots: Slot[] = [];
  let cursor = start;
  while (Temporal.Instant.compare(cursor, end) < 0) {
    const zoned = cursor.toZonedDateTimeISO(config.anchorZone);
    const working = config.participants.map((person) =>
      isWorking(cursor.toZonedDateTimeISO(person.zone), person),
    );
    const allWorking = config.participants.every((person) =>
      fullIntervalFits(cursor, config.durationMinutes, person),
    );
    slots.push({
      instant: cursor.toString(),
      epochMs: cursor.epochMilliseconds,
      label: clock(zoned),
      offset: offsetLabel(zoned),
      repeated: false,
      allWorking,
      working,
    });
    cursor = cursor.add({ minutes: 15 });
  }
  const counts = new Map<string, number>();
  for (const slot of slots)
    counts.set(slot.label, (counts.get(slot.label) ?? 0) + 1);
  return slots.map((slot) => ({
    ...slot,
    repeated: counts.get(slot.label)! > 1,
  }));
}
export const dayShiftLabel = (days: number) =>
  days === 0
    ? "Same day"
    : days === 1
      ? "+1 day"
      : days === -1
        ? "−1 day"
        : `${days > 0 ? "+" : ""}${days} days`;
