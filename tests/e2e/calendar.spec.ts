import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { defaultConfiguration } from "../../src/domain/planner";
import { encodeConfiguration } from "../../src/domain/sharing";

test("downloads the committed second repeated instant and subsequent duration", async ({
  page,
}) => {
  const config = {
    ...defaultConfiguration(),
    localDate: "2026-10-25",
    meetingInstant: "2026-10-25T01:30:00Z",
  };
  await page.goto("/" + encodeConfiguration(config));
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download calendar file" }).click();
  const file = await downloaded;
  expect(file.suggestedFilename()).toBe("overlap-2026-10-25.ics");
  const ics = await readFile((await file.path())!, "utf8");
  expect(ics).toContain("DTSTART:20261025T013000Z\r\n");
  expect(ics).toContain("DTEND:20261025T023000Z\r\n");
  expect(ics).not.toMatch(/ATTENDEE|ORGANIZER|METHOD|VALARM/);
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page
    .getByRole("region", { name: "Keep this moment." })
    .screenshot({ path: "docs/screenshots/calendar-export.png" });
  await page.getByLabel("Duration", { exact: true }).selectOption("30");
  await page.getByLabel("Meeting title").fill("Design review");
  const nextDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download calendar file" }).click();
  const next = await readFile((await (await nextDownload).path())!, "utf8");
  expect(next).toContain("DTEND:20261025T020000Z\r\n");
  expect(next).toContain("SUMMARY:Design review\r\n");
});

test("exports the committed selection without applying an invalid time draft and explains empty titles", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Start in London", { exact: true }).fill("25:00");
  await page.getByLabel("Meeting title").fill("   ");
  await page.getByRole("button", { name: "Download calendar file" }).click();
  await expect(page.getByRole("alert")).toContainText("1–80");
  await page.getByLabel("Meeting title").fill("Team catch-up");
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download calendar file" }).click();
  const ics = await readFile((await (await downloaded).path())!, "utf8");
  expect(ics).toContain("DTSTART:20260917T130000Z");
  await expect(page.getByLabel("Start in London", { exact: true })).toHaveValue(
    "25:00",
  );
  await expect(
    page.getByRole("status").filter({ hasText: "Calendar file created" }),
  ).toBeVisible();
});

test("calendar and engineering actions fit narrow screens and support keyboard input", async ({
  page,
}) => {
  await page.goto("/");
  await page.setViewportSize({ width: 320, height: 844 });
  const button = page.getByRole("button", { name: "Download calendar file" });
  await button.focus();
  const downloaded = page.waitForEvent("download");
  await page.keyboard.press("Enter");
  await downloaded;
  await expect(button).toBeFocused();
  await expect(
    page.getByRole("link", { name: "Source", exact: true }),
  ).toHaveAttribute("href", "https://github.com/nen-io/overlap-planner");
  await expect(
    page.getByRole("link", { name: "Engineering walkthrough" }),
  ).toHaveAttribute(
    "href",
    "https://github.com/nen-io/overlap-planner/blob/main/docs/REVIEWER_GUIDE.md",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
