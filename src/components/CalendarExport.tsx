import { useRef, useState } from "react";
import { CalendarDays, Download } from "lucide-react";
import { calendarFile } from "../domain/calendar";
import type { Configuration } from "../domain/planner";

export function CalendarExport({
  config,
  fits,
}: {
  config: Configuration;
  fits: boolean;
}) {
  const titleField = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("Team catch-up");
  const [error, setError] = useState("");
  const [downloaded, setDownloaded] = useState<Configuration | null>(null);
  return (
    <section className="calendar-export" aria-labelledby="calendar-heading">
      <div>
        <div className="eyebrow">
          <CalendarDays size={15} /> FROM A PLAN TO YOUR CALENDAR
        </div>
        <h2 id="calendar-heading">Keep this moment.</h2>
        <p>
          Download the selected meeting as an .ics file, then open it in your
          calendar. Your exact start and duration travel together.
        </p>
        <p className="calendar-boundary">
          A file for your calendar. No invitations are sent.
        </p>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setError("");
          try {
            const content = calendarFile(config, title, {
              uid: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
            });
            const url = URL.createObjectURL(
              new Blob([content], { type: "text/calendar;charset=utf-8" }),
            );
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = `overlap-${config.localDate}.ics`;
            anchor.click();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
            setDownloaded(config);
          } catch (cause) {
            setError(
              cause instanceof Error
                ? cause.message
                : "Calendar file could not be created.",
            );
            titleField.current?.focus();
          }
        }}
      >
        <label htmlFor="calendar-title">Meeting title</label>
        <input
          id="calendar-title"
          ref={titleField}
          value={title}
          maxLength={80}
          aria-invalid={!!error}
          aria-describedby={
            error ? "calendar-help calendar-error" : "calendar-help"
          }
          onChange={(event) => {
            setTitle(event.target.value);
            setError("");
            setDownloaded(null);
          }}
        />
        <p id="calendar-help">
          Title stays in this tab and the downloaded file; it is not included in
          your share link.
        </p>
        {!fits ? (
          <p className="calendar-warning">
            This selection is outside one or more work windows. Check the city
            times before importing.
          </p>
        ) : null}
        <button className="primary" type="submit">
          <Download size={16} /> Download calendar file
        </button>
        {error ? (
          <p id="calendar-error" className="error" role="alert">
            {error}
          </p>
        ) : null}
        {downloaded === config ? (
          <p role="status">
            Calendar file created for this selection. Open it in your calendar
            to review and save.
          </p>
        ) : null}
      </form>
    </section>
  );
}
