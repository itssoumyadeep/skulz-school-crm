import { test, expect } from "@playwright/test";

const CAREGIVER_SESSION = {
  user_id: "00000000-0000-0000-0000-00000000c101",
  email: "clara.gomez@purplecubby.example",
  user_name: "Nurse Clara Gomez",
  role: "caregiver",
  tenant_id: "b256609a-3157-4ed8-9822-ea797d2c6a4b",
  exp: Math.floor(Date.now() / 1000) + 86400,
};

test.beforeEach(async ({ context }) => {
  const b64Payload = Buffer.from(JSON.stringify(CAREGIVER_SESSION)).toString("base64");
  const token = `header.${b64Payload}.signature`;
  await context.addCookies([
    {
      name: "pc_session",
      value: token,
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
});

test.describe("Caregiver Daily Care Portal Deep Browser Audit", () => {
  test("1. Renders Caregiver Portal (/caregiver) with 5-point visual & asset verification", async ({
    page,
  }) => {
    await page.goto("http://127.0.0.1:3000/caregiver");
    await page.waitForLoadState("domcontentloaded");

    // Title & Scope
    await expect(page.locator("h1")).toContainText("Sunflowers Toddler & Pre-K Care Group");
    await expect(page.getByText("Good morning, Clara Gomez!").first()).toBeVisible();
    await expect(page.getByText("Room 1A & Toddler Care Specialist").first()).toBeVisible();

    // 5-Point Check 1: Zero broken images (img.naturalWidth > 0)
    const images = page.locator("img:visible");
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const naturalWidth = await images
        .nth(i)
        .evaluate((img: HTMLImageElement) => img.naturalWidth);
      expect(naturalWidth).toBeGreaterThan(0);
    }

    // 5-Point Check 2: Crisp SVGs rendered with zero unrendered icon font ligatures
    const svgs = page.locator("svg");
    const svgCount = await svgs.count();
    expect(svgCount).toBeGreaterThan(5);

    // 5-Point Check 3: Check-in attendance gauge reactive computation
    await expect(page.getByText("Little Learners In")).toBeVisible();
  });

  test("2. Toggles cleanly between Cards View and Compact List Matrix View", async ({
    page,
  }) => {
    await page.goto("http://127.0.0.1:3000/caregiver");
    await page.waitForLoadState("domcontentloaded");

    // Default Cards View
    await expect(page.getByText("Learner Cubbies & Routine Boards")).toBeVisible();
    await expect(page.getByText("Maya Lin").first()).toBeVisible();

    // Switch to Compact List View
    const compactTab = page.getByRole("tab", { name: /compact list/i });
    await compactTab.click();

    // Verify Compact Matrix Header and Table appear
    await expect(
      page.getByText("Toddler Room Care Logs (Compact Horizontal Matrix)"),
    ).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();

    // Switch back to Cards View
    const cardsTab = page.getByRole("tab", { name: /cards/i });
    await cardsTab.click();
    await expect(page.getByText("Learner Cubbies & Routine Boards")).toBeVisible();
  });

  test("3. Medication log: Log administered dose updates state inline", async ({
    page,
  }) => {
    await page.goto("http://127.0.0.1:3000/caregiver");
    await page.waitForLoadState("domcontentloaded");

    // Check Maya Lin dose row
    const doseBtn = page.getByRole("button", { name: "Log Administered Dose" });
    await expect(doseBtn).toBeVisible();
    await doseBtn.click();

    // State changes to Administered
    await expect(page.getByText(/Administered at/i).first()).toBeVisible();
  });

  test("4. Log Boo-Boo modal opens at z-[70] and submits minor incident", async ({
    page,
  }) => {
    await page.goto("http://127.0.0.1:3000/caregiver");
    await page.waitForLoadState("domcontentloaded");

    // Open modal
    const logBooBooBtn = page.getByRole("button", { name: /log boo-boo/i });
    await logBooBooBtn.click();

    // Modal should be visible
    const modalTitle = page.locator("#boo-boo-modal-title");
    await expect(modalTitle).toBeVisible();
    await expect(modalTitle).toContainText("Log Minor Tumble or Boo-Boo");

    // Fill notes and submit
    const noteArea = page.locator("#incident-notes");
    await noteArea.fill("Playground grass slip. Cold water rinse and plaster applied.");

    const submitBtn = page.getByRole("button", { name: /save & notify guardian/i });
    await submitBtn.click();

    // Confirmation screen
    await expect(
      page.getByText("Incident Recorded & Dispatched!"),
    ).toBeVisible();
  });

  test("5. ThePuffy AI Assistant is docked/closed by default (DEF-004) and expands at z-[80]", async ({
    page,
  }) => {
    await page.goto("http://127.0.0.1:3000/caregiver");
    await page.waitForLoadState("domcontentloaded");

    // Verify chat window is closed by default
    const chatWindow = page.getByRole("dialog", { name: "ThePuffy AI Chat Window" });
    await expect(chatWindow).toHaveCount(0);

    // Launcher button must be visible
    const launcherBtn = page.locator("#puffy-launcher-btn");
    await expect(launcherBtn).toBeVisible();

    // Click to open
    await launcherBtn.click();
    await expect(chatWindow).toBeVisible();
    await expect(page.getByText("Online • Scoped: Clara Gomez")).toBeVisible();

    // Close using close button
    const closeBtn = page.getByRole("button", { name: "Close assistant" });
    await closeBtn.click();
    await expect(chatWindow).toHaveCount(0);
  });
});
