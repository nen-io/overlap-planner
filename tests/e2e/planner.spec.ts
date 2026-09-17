import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { defaultConfiguration } from "../../src/domain/planner";
import { encodeConfiguration } from "../../src/domain/sharing";

test("primary journey edits date, city, hours, duration, slider and reloads exact URL state", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("This whole meeting fits.")).toBeVisible();
  await page.getByLabel("Planning date").fill("2026-09-18");
  await page.getByRole("button", { name: "Add a city", exact: true }).click();
  await page.getByLabel("City to add").selectOption("Asia/Kolkata");
  await page.getByRole("button", { name: "Add to plan" }).click();
  const kolkata = page.getByRole("article", { name: "Kolkata time zone" });
  await expect(kolkata).toContainText("UTC+05:30");
  await kolkata.getByRole("button", { name: /Work hours/ }).click();
  await page.getByLabel("Work ends in Kolkata").selectOption("22");
  await page.getByRole("button", { name: "Save hours" }).click();
  await page.getByLabel("Duration", { exact: true }).selectOption("30");
  const slider = page.getByRole("slider");
  const before = Number(await slider.inputValue());
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(slider).toHaveValue(String(before + 60000));
  const instant = await page.getByTestId("utc-instant").innerText();
  await page.reload();
  await expect(page.getByTestId("utc-instant")).toHaveText(instant);
  await expect(page.getByLabel("Duration", { exact: true })).toHaveValue("30");
  await expect(kolkata).toContainText("09:00–22:00");
  await page.getByRole("button", { name: "Remove Kolkata" }).click();
  await expect(kolkata).toHaveCount(0);
});

test("date DST gap is rejected; date navigation announces fallback; repeat choice selects exact occurrence", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Planning date").fill("2026-03-28");
  await page.getByLabel("Start in London", { exact: true }).fill("01:30");
  await page.getByRole("button", { name: "Set meeting time" }).click();
  await page.getByRole("button", { name: "Next date", exact: true }).click();
  await expect(page.getByText("23 actual hours · DST day")).toBeVisible();
  await expect(page.getByRole("status")).toContainText(
    "Moved to the first available time, 02:00",
  );
  await page.getByLabel("Start in London", { exact: true }).fill("01:30");
  await page.getByRole("button", { name: "Set meeting time" }).click();
  await expect(page.getByRole("alert")).toContainText("does not exist");
  await expect(page.getByTestId("utc-instant")).toHaveText(
    "2026-03-29T01:00:00Z",
  );
  await page.getByLabel("Planning date").fill("2026-10-25");
  await expect(page.getByText("25 actual hours · DST day")).toBeVisible();
  await page.getByLabel("Start in London", { exact: true }).fill("01:30");
  await page.getByRole("button", { name: "Set meeting time" }).click();
  await expect(page.getByRole("alert")).toContainText("occurs twice");
  await page.getByRole("button", { name: "First 01:30 · UTC+01:00" }).click();
  await expect(
    page.getByRole("article", { name: "London time zone" }),
  ).toContainText("end UTC+00:00");
  await page.getByRole("button", { name: "Set meeting time" }).click();
  await page.getByRole("button", { name: "Second 01:30 · UTC+00:00" }).click();
  await expect(page.getByTestId("utc-instant")).toHaveText(
    "2026-10-25T01:30:00Z",
  );
  await expect(
    page
      .getByRole("group", { name: "London local hour band" })
      .getByRole("button"),
  ).toHaveCount(100);
});

test("anchor preserves the instant and displays a new calendar day", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Start in London", { exact: true }).fill("23:30");
  await page.getByRole("button", { name: "Set meeting time" }).click();
  const instant = await page.getByTestId("utc-instant").innerText();
  await page.getByLabel("Anchor calendar").selectOption("Asia/Taipei");
  await expect(page.getByTestId("utc-instant")).toHaveText(instant);
  await expect(page.getByLabel("Planning date")).toHaveValue("2026-09-18");
  await expect(
    page.getByRole("article", { name: "London time zone" }),
  ).toContainText("−1 day");
});

test("whole duration, invalid work hours and empty-team guard", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Duration", { exact: true }).selectOption("120");
  await expect(
    page.getByText("Some cities are outside work hours."),
  ).toBeVisible();
  const taipei = page.getByRole("article", { name: "Taipei time zone" });
  await taipei.getByRole("button", { name: /Work hours/ }).click();
  await page.getByLabel("Work ends in Taipei").selectOption("12");
  await page.getByRole("button", { name: "Save hours" }).click();
  await expect(page.getByRole("alert")).toContainText("start before the end");
  await expect(taipei).toContainText("13:00–22:00");
  await page.getByRole("button", { name: "Remove Taipei" }).click();
  await page.getByRole("button", { name: "Remove New York" }).click();
  await expect(
    page.getByRole("button", { name: "Remove London" }),
  ).toBeDisabled();
});

test("copy exact snapshot and clipboard failure gives a usable fallback", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.getByRole("button", { name: "Share this plan" }).click();
  await expect(page.getByRole("region", { name: "Share plan" })).toContainText(
    "Link copied",
  );
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(
    await page
      .getByLabel("Plan link · cities, work hours and meeting time only")
      .inputValue(),
  );
  await page.goto(copied);
  await page.reload();
  await expect(page.getByTestId("utc-instant")).toHaveText(
    "2026-09-17T13:00:00Z",
  );
  await page.evaluate(() => {
    Object.defineProperty(navigator.clipboard, "writeText", {
      value: () => Promise.reject(new Error("Denied")),
    });
  });
  await page.getByRole("button", { name: "Share this plan" }).click();
  await expect(page.getByRole("region", { name: "Share plan" })).toContainText(
    "Clipboard unavailable",
  );
  await expect(
    page.getByLabel("Plan link · cities, work hours and meeting time only"),
  ).toHaveValue(/#plan=/);
});

test("malformed, hostile and oversized URL payloads use safe defaults", async ({
  page,
}) => {
  for (const hash of [
    "#plan=%zz",
    "#plan=" +
      encodeURIComponent(
        JSON.stringify({
          ...defaultConfiguration(),
          anchorZone: "<img src=x onerror=alert(1)>",
        }),
      ),
    "#plan=" + "x".repeat(8193),
  ]) {
    await page.goto("/" + hash);
    await expect(page.getByRole("status")).toContainText("safe sample");
    await expect(page.getByRole("article")).toHaveCount(3);
    await expect(page.locator("img")).toHaveCount(0);
    await expect(page.getByTestId("utc-instant")).toHaveText(
      "2026-09-17T13:00:00Z",
    );
  }
});

test("range boundaries and six-city resource limit are explicit", async ({
  page,
}) => {
  await page.goto(
    "/" +
      encodeConfiguration({
        ...defaultConfiguration(),
        localDate: "2000-01-01",
        meetingInstant: "2000-01-01T13:00:00Z",
      }),
  );
  await page.getByRole("button", { name: "Previous date" }).click();
  await expect(page.getByRole("alert")).toContainText("2000 through 2099");
  await expect(page.getByLabel("Planning date")).toHaveValue("2000-01-01");
  for (const zone of ["Asia/Kolkata", "Asia/Tokyo", "Australia/Sydney"]) {
    await page.getByRole("button", { name: "Add a city", exact: true }).click();
    await page.getByLabel("City to add").selectOption(zone);
    await page.getByRole("button", { name: "Add to plan" }).click();
  }
  await expect(page.getByRole("article")).toHaveCount(6);
  await expect(
    page.getByRole("button", { name: "Six-city limit reached" }),
  ).toBeDisabled();
});

test("desktop, mobile, keyboard, reduced motion and text scaling; actual screenshots", async ({
  page,
}) => {
  await mkdir("docs/screenshots", { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto("/");
  await expect(page.getByText("This whole meeting fits.")).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "docs/screenshots/mobile.png",
    fullPage: true,
  });
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.evaluate(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("body *"),
    );
    const sizes = elements.map((element) =>
      parseFloat(getComputedStyle(element).fontSize),
    );
    elements.forEach((element, i) => {
      element.style.fontSize = `${sizes[i] * 2}px`;
    });
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Find shared time" }).click();
  await expect(page.getByText("This whole meeting fits.")).toBeVisible();
});

test("anchor date-range failure preserves plan and stale add form is safely rejected", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const config = {
    ...defaultConfiguration(),
    localDate: "2000-01-01",
    meetingInstant: "2000-01-01T00:00:00Z",
  };
  await page.goto("/" + encodeConfiguration(config));
  await page.getByLabel("Anchor calendar").selectOption("America/New_York");
  await expect(page.getByRole("alert")).toContainText("2000 through 2099");
  await expect(page.getByLabel("Anchor calendar")).toHaveValue("Europe/London");
  await expect(page.getByTestId("utc-instant")).toHaveText(
    config.meetingInstant,
  );
  await page.getByRole("button", { name: "Add a city", exact: true }).click();
  await page.getByLabel("City to add").selectOption("Asia/Kolkata");
  await page.evaluate(
    (hash) => {
      window.location.hash = hash;
    },
    encodeConfiguration({
      ...config,
      participants: [
        ...config.participants,
        { zone: "Asia/Kolkata", workStartHour: 9, workEndHour: 18 },
      ],
    }),
  );
  await expect(page.getByRole("article")).toHaveCount(4);
  await page.getByRole("button", { name: "Add to plan" }).click();
  await expect(page.getByRole("alert")).toContainText("only once");
  await expect(page.getByRole("article")).toHaveCount(4);
  expect(errors).toEqual([]);
});

test("delayed clipboard completion cannot announce a newer plan was copied", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    Object.defineProperty(navigator.clipboard, "writeText", {
      value: () =>
        new Promise<void>((resolve) => {
          (window as unknown as { finishCopy: () => void }).finishCopy =
            resolve;
        }),
    });
  });
  await page.getByRole("button", { name: "Share this plan" }).click();
  await page.getByLabel("Duration", { exact: true }).selectOption("30");
  await page.evaluate(() =>
    (window as unknown as { finishCopy: () => void }).finishCopy(),
  );
  await expect(
    page.getByRole("region", { name: "Share plan" }),
  ).not.toContainText("Link copied");
  await expect(
    page.getByLabel("Plan link · cities, work hours and meeting time only"),
  ).toHaveValue(/durationMinutes%22%3A30/);
});
