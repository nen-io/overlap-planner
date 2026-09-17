import { Moon, Sun, X } from "lucide-react";
import { Temporal } from "@js-temporal/polyfill";
import { useState } from "react";
import {
  cityFor,
  clock,
  dayShiftLabel,
  hourLabel,
  offsetLabel,
  participantSummary,
  type Configuration,
  type Participant,
  type Slot,
} from "../domain/planner";
interface Props {
  person: Participant;
  index: number;
  config: Configuration;
  slots: Slot[];
  progress: number;
  durationWidth: number;
  onHours: (start: number, end: number) => void;
  onRemove: () => void;
  onPick: (instant: string) => void;
}
export function CityRow({
  person,
  index,
  config,
  slots,
  progress,
  durationWidth,
  onHours,
  onRemove,
  onPick,
}: Props) {
  const city = cityFor(person.zone);
  const summary = participantSummary(config, person);
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState(String(person.workStartHour));
  const [end, setEnd] = useState(String(person.workEndHour));
  const [error, setError] = useState("");
  const daytime = summary.start.hour >= 7 && summary.start.hour < 19;
  return (
    <article className="city-row" aria-label={`${city.city} time zone`}>
      <div className="city-identity">
        <div className={`city-symbol city-symbol-${index % 3}`}>
          {daytime ? <Sun size={21} /> : <Moon size={21} />}
        </div>
        <div>
          <h3>
            {city.city}
            {person.zone === config.anchorZone && (
              <span className="anchor-pill">ANCHOR</span>
            )}
          </h3>
          <p>
            {city.country} <span>· {offsetLabel(summary.start)}</span>
          </p>
        </div>
        <button
          className="remove-city"
          aria-label={`Remove ${city.city}`}
          disabled={config.participants.length === 1}
          onClick={onRemove}
        >
          <X size={15} />
        </button>
      </div>
      <div className="city-meeting">
        <span className="local-time">
          {clock(summary.start)} <span>—</span> {clock(summary.end)}
        </span>
        <span className="local-date">
          {summary.start.toPlainDate().toString()} ·{" "}
          {dayShiftLabel(summary.dayShift)}
          {summary.endDayShift !== 0
            ? ` · ends ${dayShiftLabel(summary.endDayShift)}`
            : ""}
          {summary.end.offset !== summary.start.offset
            ? ` · end ${offsetLabel(summary.end)}`
            : ""}
        </span>
        <span className={summary.fits ? "fit-badge" : "fit-badge outside"}>
          {summary.fits ? "Within work hours" : "Outside work hours"}
        </span>
      </div>
      <div className="city-track">
        <div
          className="hour-band"
          role="group"
          aria-label={`${city.city} local hour band`}
        >
          {slots.map((slot, slotIndex) => {
            const local = Temporal.Instant.from(
              slot.instant,
            ).toZonedDateTimeISO(person.zone);
            const isDaytime = local.hour >= 7 && local.hour < 19;
            return (
              <button
                key={slot.instant}
                tabIndex={-1}
                title={`${city.city}: ${clock(local)} ${offsetLabel(local)} · ${slot.working[index] ? "Working hours" : "Outside work hours"}`}
                aria-label={`Select ${clock(local)} in ${city.city}, ${offsetLabel(local)}`}
                className={`band-cell ${slot.working[index] ? "work" : "off"} ${isDaytime ? "daytime" : "nighttime"}`}
                onClick={() => onPick(slot.instant)}
              >
                <span>
                  {slotIndex % 12 === 0
                    ? String(local.hour).padStart(2, "0")
                    : ""}
                </span>
              </button>
            );
          })}
          <div
            className="meeting-marker"
            style={{
              left: `${progress}%`,
              width: `${Math.min(durationWidth, 100 - progress)}%`,
            }}
            aria-hidden="true"
          />
        </div>
        <div className="work-caption">
          <button
            className="hours-button"
            aria-expanded={editing}
            onClick={() => {
              setStart(String(person.workStartHour));
              setEnd(String(person.workEndHour));
              setError("");
              setEditing(!editing);
            }}
          >
            Work hours {hourLabel(person.workStartHour)}–
            {hourLabel(person.workEndHour)} <span>Edit</span>
          </button>
        </div>
      </div>
      {editing && (
        <form
          className="hours-editor"
          onSubmit={(event) => {
            event.preventDefault();
            try {
              onHours(Number(start), Number(end));
              setEditing(false);
              setError("");
            } catch (cause) {
              setError(
                cause instanceof Error
                  ? cause.message
                  : "Invalid working hours.",
              );
            }
          }}
        >
          <label>
            Work starts in {city.city}
            <select
              value={start}
              onChange={(event) => setStart(event.target.value)}
            >
              {Array.from({ length: 24 }, (_, value) => (
                <option value={value} key={value}>
                  {hourLabel(value)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Work ends in {city.city}
            <select
              value={end}
              onChange={(event) => setEnd(event.target.value)}
            >
              {Array.from({ length: 24 }, (_, value) => value + 1).map(
                (value) => (
                  <option value={value} key={value}>
                    {hourLabel(value)}
                  </option>
                ),
              )}
            </select>
          </label>
          <button className="primary" type="submit">
            Save hours
          </button>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
    </article>
  );
}
