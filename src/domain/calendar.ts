import { Temporal } from "@js-temporal/polyfill";
import {
  cityFor,
  clock,
  fullIntervalFits,
  parseInstant,
  validateConfiguration,
  type Configuration,
} from "./planner";

interface CalendarMetadata {
  uid: string;
  createdAt: string;
}
const pad = (value: number) => String(value).padStart(2, "0");
function timestamp(instant: Temporal.Instant): string {
  const utc = instant.toZonedDateTimeISO("UTC");
  if (utc.year < 1 || utc.year > 9999)
    throw new Error("Calendar timestamp is outside the supported range.");
  return `${String(utc.year).padStart(4, "0")}${pad(utc.month)}${pad(utc.day)}T${pad(utc.hour)}${pad(utc.minute)}${pad(utc.second)}Z`;
}
function text(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}
// RFC 5545 folds octets, not JavaScript code units. A continuation's leading space counts too.
function fold(line: string): string {
  const encoder = new TextEncoder();
  let current = "";
  let bytes = 0;
  const lines: string[] = [];
  for (const character of line) {
    const length = encoder.encode(character).length;
    if (bytes + length > 75) {
      lines.push(current);
      current = " ";
      bytes = 1;
    }
    current += character;
    bytes += length;
  }
  lines.push(current);
  return lines.join("\r\n");
}

/** A standalone event snapshot, never an invitation or recurring calendar subscription. */
export function calendarFile(
  value: Configuration,
  title: string,
  metadata: CalendarMetadata,
): string {
  const config = validateConfiguration(value);
  const summary = title.trim();
  if (!summary || summary.length > 80 || /[\u0000-\u001f\u007f]/u.test(title))
    throw new Error(
      "Use a meeting title of 1–80 characters without control characters.",
    );
  if (
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      metadata.uid,
    )
  )
    throw new Error("Invalid calendar identity.");
  const start = parseInstant(config.meetingInstant);
  const end = start.add({ minutes: config.durationMinutes });
  const fits = config.participants.every((person) =>
    fullIntervalFits(start, config.durationMinutes, person),
  );
  const description = [
    "A meeting snapshot from Overlap. No invitations have been sent.",
    `${config.durationMinutes} minutes. ${fits ? "Fits all configured work windows." : "Outside one or more work windows."}`,
    ...config.participants.map((person) => {
      const local = start.toZonedDateTimeISO(person.zone);
      return `${cityFor(person.zone).city}: ${local.toPlainDate()} ${clock(local)} UTC${local.offset}`;
    }),
    "Work hours are planning preferences, not calendar availability.",
  ].join("\n");
  return (
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Overlap//Meeting snapshot//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${metadata.uid}@overlap-planner`,
      `DTSTAMP:${timestamp(Temporal.Instant.from(metadata.createdAt))}`,
      `DTSTART:${timestamp(start)}`,
      `DTEND:${timestamp(end)}`,
      `SUMMARY:${text(summary)}`,
      `DESCRIPTION:${text(description)}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ]
      .map(fold)
      .join("\r\n") + "\r\n"
  );
}
