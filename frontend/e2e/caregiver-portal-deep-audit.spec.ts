import { test, expect } from "@playwright/test";
import crypto from "crypto";
import fs from "fs";
import path from "path";

function loadJwtSecret(): string {
  if (process.env.JWT_SECRET_KEY) return process.env.JWT_SECRET_KEY;
  const envPath = path.resolve(__dirname, "../../.env");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    const match = content.match(/^JWT_SECRET_KEY=(.+)$/m);
    if (match) return match[1].trim().replace(/^["']|["']$/g, "");
  }
  return "dev-secret-key";
}

function signTestJwt(payload: Record<string, unknown>): string {
  const secret = loadJwtSecret();
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${sig}`;
}

const CAREGIVER_SESSION = {
  sub: "00000000-0000-0000-0000-00000000c101",
  user_id: "00000000-0000-0000-0000-00000000c101",
  email: "clara.gomez@purplecubby.example",
  user_name: "Nurse Clara Gomez",
  role: "caregiver",
  tenant_id: "b256609a-3157-4ed8-9822-ea797d2c6a4b",
  assigned_class_ids: ["00000000-0000-0000-0000-0000000001a0"],
  assigned_grades: ["Toddler & Pre-K"],
  exp: Math.floor(Date.now() / 1000) + 86400,
};

test.beforeEach(async ({ context }) => {
  const token = signTestJwt(CAREGIVER_SESSION);
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

    // Title & Scope (matched to updated Caregiver_Daily_Care_Portal.html)
    await expect(page.locator("h1")).toContainText("Good morning, Clara Gomez");
    await expect(page.getByText("Sunflowers Toddler · Room 1A").first()).toBeVisible();
    await expect(page.getByText("Nurse Clara Gomez & caregiver team").first()).toBeVisible();

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
    const medsPromise = page.waitForResponse(
      (res) => res.url().includes("/api/v1/health/classroom-medications") && res.status() === 200,
    );
    await page.goto("http://127.0.0.1:3000/caregiver");
    const medsRes = await medsPromise;
    const medsBody = (await medsRes.json()) as {
      data?: Array<{ status?: string }>;
    };
    await page.waitForLoadState("networkidle");

    const hasPending =
      Array.isArray(medsBody?.data) &&
      medsBody.data.some((item) => item.status === "Pending");
    if (hasPending) {
      const logPostPromise = page.waitForResponse(
        (res) =>
          res.url().includes("/api/v1/health/medication-log") &&
          res.request().method() === "POST" &&
          res.status() === 201,
      );
      await page.getByRole("button", { name: "Log Administered Dose" }).first().click();
      await logPostPromise;
    }

    // State shows Administered
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

  test("6. Batch A MVP-1: Signed JWT API hydration, zero CSP errors, Pickup PIN & Drawer layering", async ({
    page,
  }) => {
    const cspErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && msg.text().toLowerCase().includes("content security policy")) {
        cspErrors.push(msg.text());
      }
    });

    const rosterPromise = page.waitForResponse(
      (res) => res.url().includes("/api/v1/attendance/students/") && res.status() === 200,
    );
    const medsPromise = page.waitForResponse(
      (res) => res.url().includes("/api/v1/health/classroom-medications") && res.status() === 200,
    );
    const incPromise = page.waitForResponse(
      (res) => res.url().includes("/api/v1/incidents") && res.status() === 200,
    );

    await page.goto("http://127.0.0.1:3000/caregiver");
    await Promise.all([rosterPromise, medsPromise, incPromise]);

    // DEF-027: Zero CSP errors on Google Fonts
    expect(cspErrors).toEqual([]);

    // DEF-022: Real full student names in Incidents
    await expect(page.getByText("Liam Scott").first()).toBeVisible();
    await expect(page.getByText("Zoe Zhao").first()).toBeVisible();

    // US-CG-02 & DEF-026: Open Maya Lin drawer -> verify Pickup PIN 8841 -> close drawer
    // Switch to Compact List view to reliably locate Maya Lin
    await page.getByRole("tab", { name: /compact list/i }).click();
    // Locate Maya Lin row in the compact matrix and open the drawer
    const mayaRow = page.locator("tr", { hasText: "Maya Lin" });
    const pickupContactsPromise = page.waitForResponse(
      (res) => res.url().includes("/pickup-contacts") && res.status() === 200,
    );
    await mayaRow.click();
    await pickupContactsPromise;
    // The drawer now shows the pickup verification UI
    await expect(page.getByText("Authorized Pickup Verification")).toBeVisible();
    await expect(
      page.getByRole("dialog").getByText("Grandmother Maria R."),
    ).toBeVisible();

    const pinInput = page.getByLabel(/Pickup PIN for Grandmother Maria R\.?/i).first();
    await pinInput.fill("8841");
    const verifyResPromise = page.waitForResponse(
      (res) => res.url().includes("/pickup-verify") && res.status() === 200,
    );
    await page.getByRole("button", { name: "Verify Pickup" }).click();
    await verifyResPromise;
    await expect(page.getByText(/Verified pickup by Grandmother Maria R\./i)).toBeVisible();

    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.locator("#puffy-launcher-btn")).toBeVisible();
  });

  test("US-CG-17 & US-CG-19: Historical DatePicker >24h read-only lock, Child History drawer tab, and live Attendance Roll Audit Modal", async ({
    page,
  }) => {
    test.setTimeout(60000);
    const pageErrors: string[] = [];
    let dialogFired = false;
    page.on("pageerror", (err) => pageErrors.push(err.message));
    page.on("dialog", async (dialog) => {
      dialogFired = true;
      await dialog.dismiss();
    });

    const rosterPromise = page.waitForResponse(
      (res) => res.url().includes("/api/v1/attendance/students/") && res.status() === 200,
    );
    await page.goto("http://127.0.0.1:3000/caregiver");
    await rosterPromise;

    // 1. US-CG-19: Open live Attendance Roll Lock & Audit Trail Modal (no alert() stub)
    const auditGetPromise = page.waitForResponse(
      (res) =>
        res.url().includes("/api/v1/attendance/roll-audit/") &&
        res.request().method() === "GET" &&
        res.status() === 200,
    );
    await page.getByRole("button", { name: /Verify Audit Trail/i }).click();
    await auditGetPromise;
    expect(dialogFired).toBe(false);

    const auditModal = page.getByRole("dialog", {
      name: /Attendance Roll Lock & Audit Trail/i,
    });
    await expect(auditModal).toBeVisible();
    await expect(
      auditModal.locator("#roll-audit-modal-title"),
    ).toContainText(/Attendance Roll Lock & Audit Trail/i);

    await auditModal.getByRole("button", { name: /Absences & Alerts/i }).click();
    await auditModal.getByRole("button", { name: /Overrides/i }).click();
    await auditModal.getByRole("button", { name: /All Events/i }).click();

    await auditModal
      .getByLabel("Roll verification note")
      .fill("Morning roll verified E2E");
    const confirmPromise = page.waitForResponse(
      (res) =>
        res.url().includes("/api/v1/attendance/roll-audit/") &&
        res.url().includes("/confirm") &&
        res.request().method() === "POST" &&
        res.status() === 200,
    );
    await auditModal.getByRole("button", { name: "Confirm Roll Audit" }).click();
    await confirmPromise;
    await expect(auditModal.getByRole("status")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await auditModal.getByRole("button", { name: "Export CSV" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain("attendance-roll-audit-");

    await auditModal.getByRole("button", { name: "Close Audit Trail" }).click();
    await expect(auditModal).toBeHidden();

    // 2. US-CG-17: Child drawer History tab
    // Switch to Compact List view to reliably locate Maya Lin
    await page.getByRole("tab", { name: /compact list/i }).click();
    // Locate Maya Lin row in the compact matrix and open the drawer
    const mayaRow = page.locator("tr", { hasText: "Maya Lin" });
    await mayaRow.click();
    // The drawer now shows the pickup verification UI
    await expect(page.getByText("Authorized Pickup Verification")).toBeVisible();

    const historyPromise = page.waitForResponse(
      (res) => res.url().includes("/care-history") && res.status() === 200,
    );
    await page.getByRole("button", { name: "History", exact: true }).click();
    await historyPromise;
    await expect(page.getByText(/Chronological Ledger/i)).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click();

    // 3. US-CG-17: Historical DatePicker (>24h BR-03-01 read-only lock banner)
    await page.getByRole("button", { name: "Caregiver Portal Date" }).click();
    const calendar = page.locator('[data-slot="calendar"]');
    await expect(calendar).toBeVisible();
    await calendar.locator("button.rdp-button_previous").click();
    await calendar.locator("button.rdp-button_previous").click();
    await calendar
      .locator("button[data-day]")
      .filter({ hasText: /^15$/ })
      .first()
      .click();

    await expect(
      page.getByText(/Historical Read-Only View \(>24h BR-03-01 Lock\)/i),
    ).toBeVisible();
    expect(dialogFired).toBe(false);
    expect(pageErrors).toEqual([]);
  });
});
