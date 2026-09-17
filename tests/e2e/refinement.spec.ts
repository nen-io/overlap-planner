import { expect, test } from "@playwright/test";
import { defaultConfiguration } from "../../src/domain/planner";
import { encodeConfiguration } from "../../src/domain/sharing";

test("keyboard adjustment keeps the meeting slider focused across consecutive minutes", async ({
  page,
}) => {
  await page.goto("/");
  const slider = page.getByRole("slider");
  const initial = Number(await slider.inputValue());
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(slider).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(slider).toHaveValue(String(initial + 120000));
});

test("suggestions expose each city time and select an exact start without changing duration", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Duration", { exact: true }).selectOption("30");
  const suggestions = page.getByRole("region", {
    name: "Shared start suggestions",
  });
  await expect(suggestions).toContainText("7 starts for all 3 cities");
  const choice = suggestions.getByRole("button", { name: /14:15 UTC\+01:00/ });
  await expect(choice).toContainText("TPE 21:15");
  await expect(choice).toContainText("NYC 09:15");
  await choice.click();
  await expect(choice).toBeFocused();
  await expect(choice).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("utc-instant")).toHaveText(
    "2026-09-17T13:15:00Z",
  );
  await expect(page.getByLabel("Duration", { exact: true })).toHaveValue("30");
  await page.reload();
  await expect(page.getByLabel("Start in London", { exact: true })).toHaveValue(
    "14:15",
  );
});

test("a moving slider refreshes an invalid clock draft without replacing controls", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Start in London", { exact: true }).fill("25:00");
  await page.getByRole("button", { name: "Set meeting time" }).click();
  await expect(
    page.getByLabel("Start in London", { exact: true }),
  ).toHaveAttribute("aria-invalid", "true");
  await page.getByRole("slider").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("slider")).toBeFocused();
  await expect(page.getByLabel("Start in London", { exact: true })).toHaveValue(
    "14:01",
  );
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("restoring a shared plan retires the old work-hour editor instead of letting stale hours overwrite it", async ({
  page,
}) => {
  await page.goto("/");
  const london = page.getByRole("article", { name: "London time zone" });
  await london.getByRole("button", { name: /Work hours/ }).click();
  await page.getByLabel("Work starts in London").selectOption("10");
  const restored = defaultConfiguration();
  restored.participants[0] = {
    ...restored.participants[0],
    workStartHour: 8,
    workEndHour: 16,
  };
  await page.evaluate((hash) => {
    window.location.hash = hash;
  }, encodeConfiguration(restored));
  await expect(london).toContainText("08:00–16:00");
  await expect(page.getByLabel("Work starts in London")).toHaveCount(0);
  await london.getByRole("button", { name: /Work hours/ }).click();
  await expect(page.getByLabel("Work starts in London")).toHaveValue("8");
  await expect(page.getByLabel("Work ends in London")).toHaveValue("16");
});

test("repeated-hour suggestions stay distinct and pagination remains bounded", async ({
  page,
}) => {
  const config = {
    ...defaultConfiguration(),
    localDate: "2026-10-25",
    meetingInstant: "2026-10-25T00:00:00Z",
    durationMinutes: 30,
    participants: [{ zone: "Europe/London", workStartHour: 0, workEndHour: 3 }],
  };
  await page.goto("/" + encodeConfiguration(config));
  const suggestions = page.getByRole("region", {
    name: "Shared start suggestions",
  });
  await expect(suggestions).toContainText("15 starts for all 1 city");
  const first = suggestions.getByRole("button", { name: /01:00 UTC\+01:00/ });
  await first.click();
  await expect(page.getByTestId("utc-instant")).toHaveText(
    "2026-10-25T00:00:00Z",
  );
  await suggestions
    .getByRole("button", { name: "Later shared starts" })
    .click();
  const second = suggestions.getByRole("button", { name: /01:00 UTC\+00:00/ });
  await second.click();
  await expect(page.getByTestId("utc-instant")).toHaveText(
    "2026-10-25T01:00:00Z",
  );
  await expect(second).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Duration", { exact: true }).selectOption("120");
  await expect(
    suggestions.getByRole("button", { name: "Later shared starts" }),
  ).toBeDisabled();
});

test("shared starts fit a narrow screen and enlarged text", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/");
  await page.getByLabel("Duration", { exact: true }).selectOption("30");
  const suggestions = page.getByRole("region", {
    name: "Shared start suggestions",
  });
  await expect(
    suggestions.getByRole("button", { name: /14:15 UTC\+01:00/ }),
  ).toBeVisible();
  await page.evaluate(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("body *"),
    );
    const sizes = elements.map((el) =>
      parseFloat(getComputedStyle(el).fontSize),
    );
    elements.forEach((el, i) => {
      el.style.fontSize = `${sizes[i] * 2}px`;
    });
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
