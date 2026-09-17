import { useState } from "react";
import { Temporal } from "@js-temporal/polyfill";
import {
  cityFor,
  clock,
  dayShiftLabel,
  offsetLabel,
  type Configuration,
  type Slot,
} from "../domain/planner";

interface Props {
  config: Configuration;
  slots: Slot[];
  onChange: (config: Configuration) => void;
}
const PAGE_SIZE = 6;

/** Suggestions remain exact instants: repeated wall-clock labels are distinguished by offset. */
export function SharedStarts({ config, slots, onChange }: Props) {
  const starts = slots.filter((slot) => slot.allWorking);
  const [page, setPage] = useState(0);
  const lastPage = Math.max(0, Math.ceil(starts.length / PAGE_SIZE) - 1);
  const currentPage = Math.min(page, lastPage);
  const visible = starts.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE,
  );
  if (!starts.length) return null;
  return (
    <section className="shared-starts" aria-label="Shared start suggestions">
      <div className="shared-starts-heading">
        <div>
          <h3>Moments that fit</h3>
          <p>
            {starts.length} {starts.length === 1 ? "start" : "starts"} for all{" "}
            {config.participants.length}{" "}
            {config.participants.length === 1 ? "city" : "cities"} · 15-minute
            suggestions
          </p>
        </div>
        {lastPage > 0 && (
          <div className="suggestion-pages">
            <button
              aria-label="Earlier shared starts"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              ←
            </button>
            <span>
              {currentPage + 1} / {lastPage + 1}
            </span>
            <button
              aria-label="Later shared starts"
              disabled={currentPage === lastPage}
              onClick={() => setPage(currentPage + 1)}
            >
              →
            </button>
          </div>
        )}
      </div>
      <div className="start-options">
        {visible.map((slot) => {
          const instant = Temporal.Instant.from(slot.instant);
          const selected =
            Temporal.Instant.compare(
              instant,
              Temporal.Instant.from(config.meetingInstant),
            ) === 0;
          return (
            <button
              key={slot.instant}
              className={selected ? "start-option selected" : "start-option"}
              aria-pressed={selected}
              onClick={() =>
                onChange({ ...config, meetingInstant: slot.instant })
              }
            >
              <strong>
                {slot.label} <span>{slot.offset}</span>
              </strong>
              <span className="start-option-city">
                {cityFor(config.anchorZone).city} ·{" "}
                {selected ? "Selected" : `${config.durationMinutes} min`}
              </span>
              <span className="start-option-locals">
                {config.participants.map((person) => {
                  const local = instant.toZonedDateTimeISO(person.zone);
                  const shift = Temporal.PlainDate.from(config.localDate).until(
                    local.toPlainDate(),
                  ).days;
                  return (
                    <span key={person.zone}>
                      {cityFor(person.zone).code} {clock(local)}
                      {shift !== 0 ? ` (${dayShiftLabel(shift)})` : ""}
                      <span className="sr-only"> {offsetLabel(local)}</span>
                    </span>
                  );
                })}
              </span>
            </button>
          );
        })}
      </div>
      <p className="suggestions-help">
        Each option fits the entire meeting. Use the clock or slider for any
        exact minute.
      </p>
    </section>
  );
}
