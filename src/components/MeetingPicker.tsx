import { ArrowRight, Check, Clock3 } from "lucide-react";
import { useState } from "react";
import { Temporal } from "@js-temporal/polyfill";
import {
  chooseLocalTime,
  cityFor,
  clock,
  DURATIONS,
  offsetLabel,
  possibleInstants,
  type Configuration,
  type Slot,
} from "../domain/planner";
interface Props {
  config: Configuration;
  slots: Slot[];
  min: number;
  max: number;
  fits: boolean;
  onChange: (config: Configuration) => void;
}
export function MeetingPicker({
  config,
  slots,
  min,
  max,
  fits,
  onChange,
}: Props) {
  const current = Temporal.Instant.from(
    config.meetingInstant,
  ).toZonedDateTimeISO(config.anchorZone);
  const [draft, setDraft] = useState(clock(current));
  const [error, setError] = useState("");
  const [choices, setChoices] = useState<Temporal.Instant[]>([]);
  const nextSlot =
    slots.find(
      (slot) => slot.allWorking && slot.epochMs >= current.epochMilliseconds,
    ) ?? slots.find((slot) => slot.allWorking);
  return (
    <section className="meeting-card" aria-label="Meeting selection">
      <div className="meeting-card-title">
        <div className="eyebrow">THE MOMENT IN COMMON</div>
        <h2>A good time for everyone.</h2>
        <p>Give the whole meeting room to fit.</p>
      </div>
      <div className="meeting-controls">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            try {
              const candidates = possibleInstants(
                config.localDate,
                draft,
                config.anchorZone,
              );
              if (candidates.length === 2) {
                setChoices(candidates);
                setError(
                  "This time occurs twice. Choose its UTC offset below.",
                );
              } else {
                onChange(chooseLocalTime(config, draft));
                setChoices([]);
                setError("");
              }
            } catch (cause) {
              setChoices([]);
              setError(
                cause instanceof Error ? cause.message : "Invalid time.",
              );
            }
          }}
        >
          <label htmlFor="meeting-time">
            Start in {cityFor(config.anchorZone).city}
          </label>
          <div className="time-entry">
            <input
              id="meeting-time"
              type="text"
              inputMode="numeric"
              placeholder="HH:MM"
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setChoices([]);
              }}
            />
            <button type="submit" aria-label="Set meeting time">
              <ArrowRight size={17} />
            </button>
          </div>
        </form>
        <div className="duration-label">
          <label htmlFor="duration">Duration</label>
          <select
            id="duration"
            value={config.durationMinutes}
            onChange={(event) =>
              onChange({
                ...config,
                durationMinutes: Number(event.target.value),
              })
            }
          >
            {DURATIONS.map((duration) => (
              <option key={duration} value={duration}>
                {duration} minutes
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="meeting-slider">
        <label htmlFor="meeting-slider">
          Move through {cityFor(config.anchorZone).city}'s day
          <span>
            {clock(current)} · {offsetLabel(current)}
          </span>
        </label>
        <input
          id="meeting-slider"
          type="range"
          min={min}
          max={max - 60000}
          step={60000}
          value={current.epochMilliseconds}
          onChange={(event) =>
            onChange({
              ...config,
              meetingInstant: Temporal.Instant.fromEpochMilliseconds(
                Number(event.target.value),
              ).toString(),
            })
          }
          aria-valuetext={`${clock(current)} ${offsetLabel(current)}`}
        />
        <div className="slider-extents">
          <span>Start of calendar day</span>
          <span>End of calendar day</span>
        </div>
      </div>
      {error && (
        <p className={choices.length ? "notice" : "error"} role="alert">
          {error}
        </p>
      )}
      {choices.length > 0 && (
        <div className="occurrences">
          {choices.map((instant, index) => (
            <button
              className="secondary"
              key={instant.toString()}
              onClick={() => {
                onChange(
                  chooseLocalTime(
                    config,
                    draft,
                    index === 0 ? "earlier" : "later",
                  ),
                );
                setError("");
                setChoices([]);
              }}
            >
              {index === 0 ? "First" : "Second"} {draft} ·{" "}
              {offsetLabel(instant.toZonedDateTimeISO(config.anchorZone))}
            </button>
          ))}
        </div>
      )}
      <div className={`meeting-result ${fits ? "all-fit" : ""}`}>
        <span className="result-icon">
          {fits ? <Check size={20} /> : <Clock3 size={20} />}
        </span>
        <div>
          <strong>
            {fits
              ? "This whole meeting fits."
              : "Some cities are outside work hours."}
          </strong>
          <p>
            {fits
              ? `All ${config.participants.length} cities have room for ${config.durationMinutes} minutes.`
              : nextSlot
                ? "A shared start is available on this day."
                : "No shared 15-minute-grid start fits. Adjust work windows or choose another day."}
          </p>
        </div>
        <button
          disabled={!nextSlot}
          onClick={() =>
            nextSlot &&
            onChange({ ...config, meetingInstant: nextSlot.instant })
          }
        >
          Find shared time <ArrowRight size={15} />
        </button>
      </div>
    </section>
  );
}
