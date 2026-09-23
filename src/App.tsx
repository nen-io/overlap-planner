import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Globe2,
  Link2,
  Plus,
} from "lucide-react";
import { Temporal } from "@js-temporal/polyfill";
import {
  changeAnchor,
  changeDate,
  CITIES,
  cityFor,
  dayBounds,
  daySlots,
  fullIntervalFits,
  parseDate,
  parseInstant,
  shiftDate,
  validateConfiguration,
  type Configuration,
} from "./domain/planner";
import { decodeConfiguration, shareUrl } from "./domain/sharing";
import { CityRow } from "./components/CityRow";
import { MeetingPicker } from "./components/MeetingPicker";
import { CalendarExport } from "./components/CalendarExport";

export default function App() {
  const [initial] = useState(() => decodeConfiguration(window.location.hash));
  const [config, setConfig] = useState(initial.config);
  const [notice, setNotice] = useState(initial.warning);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [planRevision, setPlanRevision] = useState(0);
  const [addZone, setAddZone] = useState("Asia/Kolkata");
  const copyGeneration = useRef(0);
  const [sharing, setSharing] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const bounds = useMemo(
    () => dayBounds(config.localDate, config.anchorZone),
    [config.localDate, config.anchorZone],
  );
  const slots = useMemo(
    () => daySlots(config),
    [
      config.localDate,
      config.anchorZone,
      config.durationMinutes,
      config.participants,
    ],
  );
  const instant = parseInstant(config.meetingInstant);
  const fits = config.participants.every((person) =>
    fullIntervalFits(instant, config.durationMinutes, person),
  );
  const progress =
    ((instant.epochMilliseconds - bounds.start.epochMilliseconds) /
      (bounds.end.epochMilliseconds - bounds.start.epochMilliseconds)) *
    100;
  const durationWidth = (config.durationMinutes / (bounds.hours * 60)) * 100;
  const date = parseDate(config.localDate);
  const dateTitle = date.toLocaleString("en-GB", {
    month: "long",
    day: "numeric",
  });
  const available = CITIES.filter(
    (city) => !config.participants.some((person) => person.zone === city.zone),
  );
  const link = shareUrl(window.location.href, config);

  useEffect(() => {
    try {
      window.history.replaceState(null, "", link);
    } catch {
      setNotice(
        "The browser could not update the URL. Copy a share link to preserve this plan.",
      );
    }
  }, [link]);
  useEffect(() => {
    const handle = () => {
      copyGeneration.current += 1;
      const restored = decodeConfiguration(window.location.hash);
      setConfig(restored.config);
      setPlanRevision((revision) => revision + 1);
      setNotice(restored.warning || "Plan restored from the shared URL.");
      setError("");
    };
    window.addEventListener("hashchange", handle);
    return () => window.removeEventListener("hashchange", handle);
  }, []);
  const update = (next: Configuration) => {
    const validated = validateConfiguration(next);
    copyGeneration.current += 1;
    setConfig((previous) => {
      // Keep the work-window identity stable when only the meeting instant moves.
      const sameParticipants =
        previous.participants.length === validated.participants.length &&
        validated.participants.every((person, index) => {
          const prior = previous.participants[index];
          return (
            person.zone === prior.zone &&
            person.workStartHour === prior.workStartHour &&
            person.workEndHour === prior.workEndHour
          );
        });
      return {
        ...validated,
        participants: sameParticipants
          ? previous.participants
          : validated.participants,
      };
    });
    setError("");
    setShareMessage("");
  };
  const act = (transition: () => Configuration, message?: string) => {
    try {
      update(transition());
      if (message) setNotice(message);
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "That change could not be applied.",
      );
      return false;
    }
  };
  const doDate = (nextDate: string) => {
    try {
      const result = changeDate(config, nextDate);
      update(result.config);
      setNotice(result.notice);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invalid date.");
    }
  };
  const copy = async () => {
    setSharing(true);
    setShareMessage("");
    // Each copied URL is an immutable snapshot, even if controls change during permission UI.
    const snapshot = link;
    const request = ++copyGeneration.current;
    try {
      await navigator.clipboard.writeText(snapshot);
      if (request !== copyGeneration.current) return;
      setShareMessage("Link copied. It contains a snapshot of this plan.");
    } catch {
      if (request !== copyGeneration.current) return;
      setShareMessage("Clipboard unavailable. Select and copy the link below.");
    }
  };
  return (
    <div className="app-shell">
      <header>
        <a href="./" className="brand">
          <span className="brand-icon">
            <Globe2 size={24} />
          </span>
          overlap<span>.</span>
        </a>
        <span className="header-center">A LITTLE MORE CONSIDERATE.</span>
        <button className="share-button" onClick={() => void copy()}>
          <Link2 size={15} /> Share this plan
        </button>
      </header>
      <main>
        <section className="hero">
          <div>
            <div className="eyebrow">DIFFERENT PLACES. ONE MOMENT.</div>
            <h1>
              Make time
              <br />
              for <em>everyone.</em>
            </h1>
            <p>Find the hours that bring your worlds together.</p>
          </div>
          <div className="date-poster">
            <span>
              {date.toLocaleString("en-GB", { weekday: "long" }).toUpperCase()}
            </span>
            <strong>{dateTitle}</strong>
            <div>
              {date.year} <span> / </span> {cityFor(config.anchorZone).city}{" "}
              calendar
            </div>
            <div className="poster-rule" />
          </div>
        </section>
        <section className="planner" aria-label="Time zone planner">
          <div className="planner-toolbar">
            <div className="date-controls">
              <button
                className="icon-button"
                aria-label="Previous date"
                onClick={() => {
                  try {
                    const result = shiftDate(config, -1);
                    update(result.config);
                    setNotice(result.notice);
                  } catch {
                    setError(
                      "The planner supports dates from 2000 through 2099.",
                    );
                  }
                }}
              >
                <ChevronLeft size={17} />
              </button>
              <label className="date-label">
                Planning date
                <input
                  type="date"
                  min="2000-01-01"
                  max="2099-12-31"
                  value={config.localDate}
                  onChange={(event) => doDate(event.target.value)}
                />
              </label>
              <button
                className="icon-button"
                aria-label="Next date"
                onClick={() => {
                  try {
                    const result = shiftDate(config, 1);
                    update(result.config);
                    setNotice(result.notice);
                  } catch {
                    setError(
                      "The planner supports dates from 2000 through 2099.",
                    );
                  }
                }}
              >
                <ChevronRight size={17} />
              </button>
            </div>
            <label className="anchor-control">
              Anchor calendar
              <select
                value={config.anchorZone}
                onChange={(event) => {
                  act(
                    () => changeAnchor(config, event.target.value),
                    "Anchor changed. The meeting instant stayed exactly the same.",
                  );
                }}
              >
                {CITIES.map((city) => (
                  <option key={city.zone} value={city.zone}>
                    {city.city}
                  </option>
                ))}
              </select>
            </label>
            <span className="day-length">
              {bounds.hours} actual hours
              {bounds.hours !== 24 ? " · DST day" : ""}
            </span>
          </div>
          {notice && (
            <p className="notice global-message" role="status">
              {notice}
            </p>
          )}
          {error && (
            <p className="error global-message" role="alert">
              {error}
            </p>
          )}
          <div className="track-heading">
            <span className="eyebrow">YOUR WORLDS, SIDE BY SIDE</span>
            <div className="legend">
              <span>
                <i className="legend-work" /> Work hours
              </span>
              <span>
                <i className="legend-off" /> Off hours
              </span>
              <span>
                <i className="legend-meeting" /> Meeting
              </span>
            </div>
          </div>
          <div className="anchor-ruler" aria-label="Anchor timeline labels">
            <span>{cityFor(config.anchorZone).city} time</span>
            <div>
              {slots
                .filter((slot, index) => index % 12 === 0)
                .map((slot) => (
                  <span
                    key={slot.instant}
                    style={{
                      left: `${((slot.epochMs - bounds.start.epochMilliseconds) / (bounds.end.epochMilliseconds - bounds.start.epochMilliseconds)) * 100}%`,
                    }}
                    className={slot.repeated ? "repeated-label" : ""}
                  >
                    {slot.label}
                    {slot.repeated && <small>{slot.offset}</small>}
                  </span>
                ))}
            </div>
          </div>
          <div>
            {config.participants.map((person, index) => (
              <CityRow
                key={`${person.zone}:${planRevision}`}
                person={person}
                index={index}
                config={config}
                slots={slots}
                progress={progress}
                durationWidth={durationWidth}
                onPick={(meetingInstant) => {
                  act(() => ({ ...config, meetingInstant }));
                }}
                onHours={(workStartHour, workEndHour) => {
                  update({
                    ...config,
                    participants: config.participants.map((item) =>
                      item.zone === person.zone
                        ? { ...item, workStartHour, workEndHour }
                        : item,
                    ),
                  });
                  setNotice(
                    `Updated ${cityFor(person.zone).city}'s work window.`,
                  );
                }}
                onRemove={() => {
                  act(
                    () => ({
                      ...config,
                      participants: config.participants.filter(
                        (item) => item.zone !== person.zone,
                      ),
                    }),
                    `${cityFor(person.zone).city} removed from this plan.`,
                  );
                }}
              />
            ))}
          </div>
          <div className="planner-bottom">
            <button
              className="add-button"
              disabled={config.participants.length >= 6}
              onClick={() => {
                setAdding(!adding);
                if (!available.some((city) => city.zone === addZone))
                  setAddZone(available[0]?.zone ?? "");
              }}
            >
              <Plus size={16} />{" "}
              {config.participants.length >= 6
                ? "Six-city limit reached"
                : "Add a city"}
            </button>
            <span>
              {config.participants.length} / 6 cities · Daytime guide: 07–19,
              not sunrise data
            </span>
          </div>
          {adding && (
            <form
              className="add-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (
                  act(
                    () => ({
                      ...config,
                      participants: [
                        ...config.participants,
                        { zone: addZone, workStartHour: 9, workEndHour: 18 },
                      ],
                    }),
                    `${cityFor(addZone).city} added with 09:00–18:00 work hours.`,
                  )
                )
                  setAdding(false);
              }}
            >
              <label>
                City to add
                <select
                  value={addZone}
                  onChange={(event) => setAddZone(event.target.value)}
                >
                  {available.map((city) => (
                    <option key={city.zone} value={city.zone}>
                      {city.city} · {city.country}
                    </option>
                  ))}
                </select>
              </label>
              <button className="primary" type="submit">
                Add to plan <Plus size={15} />
              </button>
            </form>
          )}
          {slots.some((slot) => slot.repeated) && (
            <div className="repeated-times" aria-label="Repeated clock times">
              {slots
                .filter((slot) => slot.repeated && slot.label.endsWith(":00"))
                .map((slot) => (
                  <span key={slot.instant}>
                    {slot.label} · {slot.offset}
                  </span>
                ))}
            </div>
          )}
          {bounds.hours !== 24 && (
            <p className="dst-note">
              This local date contains {bounds.hours} real hours.{" "}
              {bounds.hours < 24
                ? "Skipped clock times are absent from the band and rejected by the time field."
                : "Repeated clock times represent different instants. Use the start field to select an occurrence by UTC offset."}
            </p>
          )}
        </section>
        <MeetingPicker
          resetRevision={planRevision}
          config={config}
          slots={slots}
          min={bounds.start.epochMilliseconds}
          max={bounds.end.epochMilliseconds}
          fits={fits}
          onChange={(next) => {
            if (act(() => next)) setNotice("");
          }}
        />
        <CalendarExport config={config} fits={fits} />
        <section className="shared-overlap">
          <div>
            <Check size={16} />
            <span>Full-interval check</span>
          </div>
          <p>
            Work windows apply every day, including weekends. Sample Taipei uses
            a later shift. This tool helps you compare; it does not book
            meetings.
          </p>
          <span className="utc-instant" data-testid="utc-instant">
            {config.meetingInstant}
          </span>
        </section>
        {sharing && (
          <section className="sharing-panel" aria-label="Share plan">
            <div className="eyebrow">
              <Link2 size={14} /> A SNAPSHOT TO SHARE
            </div>
            <p role="status">{shareMessage || "Your link is ready below."}</p>
            <label htmlFor="share-link">
              Plan link · cities, work hours and meeting time only
            </label>
            <textarea
              id="share-link"
              readOnly
              value={link}
              rows={3}
              onFocus={(event) => event.target.select()}
            />
            <div>
              <button className="primary" onClick={() => void copy()}>
                <Copy size={15} /> Copy link
              </button>
              <a
                className="link-button"
                href={link}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open shared plan <ArrowRight size={15} />
              </a>
            </div>
          </section>
        )}
      </main>
      <footer>
        <span>Thoughtful scheduling, across a small planet.</span>
        <span>NO ACCOUNTS. NO INVITATIONS. JUST OVERLAP.</span>
        <nav aria-label="Project links">
          <a
            href="https://github.com/nen-io/overlap-planner"
            target="_blank"
            rel="noopener noreferrer"
          >
            Source
          </a>
          <a
            href="https://github.com/nen-io/overlap-planner/blob/main/docs/REVIEWER_GUIDE.md"
            target="_blank"
            rel="noopener noreferrer"
          >
            Engineering walkthrough
          </a>
        </nav>
      </footer>
    </div>
  );
}
