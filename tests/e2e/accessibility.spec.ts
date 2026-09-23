import { expect, test } from "@playwright/test";
import { defaultConfiguration } from "../../src/domain/planner";
import { encodeConfiguration } from "../../src/domain/sharing";

test("hours editing opens, errors, saves and cancels with useful keyboard focus", async ({
  page,
}) => {
  await page.goto("/");
  const row = page.getByRole("article", { name: "London time zone" });
  const edit = row.getByRole("button", { name: /Work hours/ });
  await edit.focus();
  await page.keyboard.press("Enter");
  const start = page.getByLabel("Work starts in London");
  const end = page.getByLabel("Work ends in London");
  await expect(start).toBeFocused();
  await start.selectOption("20");
  await row.getByRole("button", { name: "Save hours", exact: true }).click();
  await expect(end).toHaveAttribute("aria-invalid", "true");
  await expect(end).toHaveAccessibleDescription(/start before the end/);
  await end.selectOption("23");
  await row.getByRole("button", { name: "Save hours", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(edit).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await expect(edit).toBeFocused();
  await expect(start).toHaveCount(0);
});

test("adding, removing and choosing a repeated instant never drops focus to the document", async ({
  page,
}) => {
  await page.goto("/");
  const add = page.getByRole("button", { name: "Add a city", exact: true });
  await add.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("City to add")).toBeFocused();
  await page.getByLabel("City to add").selectOption("Asia/Tokyo");
  await page.getByRole("button", { name: "Add to plan", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Tokyo", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Remove Tokyo", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(add).toBeFocused();
  await page.getByLabel("Planning date").fill("2026-10-25");
  const time = page.getByLabel("Start in London", { exact: true });
  await time.fill("01:30");
  await time.press("Enter");
  await page.getByRole("button", { name: /Second 01:30/ }).focus();
  await page.keyboard.press("Enter");
  await expect(time).toBeFocused();
  await expect(time).toHaveValue("01:30");
});

test("closing an add form after shared restore reaches a surviving focus target at capacity", async ({
  page,
}) => {
  const base = defaultConfiguration();
  const sharedHash = encodeConfiguration({
    ...base,
    localDate: "2026-10-25",
    meetingInstant: "2026-10-25T01:30:00Z",
    participants: [
      ...base.participants,
      ...["Asia/Kolkata", "Asia/Tokyo", "Australia/Sydney"].map((zone) => ({
        zone,
        workStartHour: 9,
        workEndHour: 18,
      })),
    ],
  });
  for (const action of ["cancel", "escape"] as const) {
    await page.goto("/" + sharedHash);
    await page
      .getByRole("button", { name: "Remove Tokyo", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Add a city", exact: true })
      .press("Enter");
    await expect(page.getByLabel("City to add")).toBeFocused();
    // The hashchange path restores a supported shared plan without a reload,
    // so the currently open add form can outlive the trigger's enabled state.
    await page.evaluate((hash) => {
      window.location.hash = hash;
    }, sharedHash);
    await expect(
      page.getByRole("button", { name: "Six-city limit reached" }),
    ).toBeDisabled();
    if (action === "cancel") {
      await page
        .getByRole("button", { name: "Cancel adding city" })
        .press("Enter");
    } else {
      await page.getByLabel("City to add").press("Escape");
    }
    await expect(page.getByLabel("City to add")).toHaveCount(0);
    await expect(
      page
        .getByRole("article", { name: "London time zone" })
        .getByRole("heading"),
    ).toBeFocused();
    await expect(page.getByLabel("Planning date")).toHaveValue("2026-10-25");
    await expect(
      page.getByLabel("Start in London", { exact: true }),
    ).toHaveValue("01:30");
    expect(new URL(page.url()).hash).toBe(sharedHash);
  }
});

test("skip link, field errors and enlarged narrow editors remain usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await page.goto(
    "/" +
      encodeConfiguration({
        ...defaultConfiguration(),
        localDate: "2026-10-25",
        meetingInstant: "2026-10-25T01:30:00Z",
      }),
  );
  const shareUrl = page.url();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to meeting controls" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByLabel("Start in London", { exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Set meeting time" }),
  ).toBeFocused();
  expect(
    await page
      .getByRole("button", { name: "Set meeting time" })
      .evaluate((node) => node.getBoundingClientRect().height),
  ).toBeGreaterThanOrEqual(44);
  await page.getByLabel("Meeting title").fill("   ");
  await page.getByRole("button", { name: "Download calendar file" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Meeting title")).toBeFocused();
  await expect(page.getByLabel("Meeting title")).toHaveAccessibleDescription(
    /1–80/,
  );
  await page.emulateMedia({ forcedColors: "none", reducedMotion: "reduce" });
  const row = page.getByRole("article", { name: "London time zone" });
  await row.getByRole("button", { name: /Work hours/ }).click();
  await page.evaluate(() => {
    const nodes = [
      ...document.querySelectorAll<HTMLElement>(
        "button,input,select,p,label,h1,h2,h3,strong,small",
      ),
    ];
    const sizes = nodes.map((node) =>
      parseFloat(getComputedStyle(node).fontSize),
    );
    nodes.forEach((node, i) => {
      node.style.fontSize = `${sizes[i] * 2}px`;
    });
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await row.screenshot({ path: "docs/screenshots/accessible-hours.png" });
  await page.getByLabel("Work starts in London").focus();
  await page.keyboard.press("Escape");
  await expect(row.getByRole("button", { name: /Work hours/ })).toBeFocused();
  await expect(page.getByLabel("Planning date")).toHaveValue("2026-10-25");
  expect(page.url()).toBe(shareUrl);
});
