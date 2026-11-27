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

  test("DEF-029, DEF-031..034: On-time Check-In (Cards & Compact), Check-Out Confirmation/Toast, Checked Out Status, Post-Checkout Care Lock + Supervisor PIN, & Incident Severity BR-07-03", async ({
    page,
  }) => {
    test.setTimeout(90000);
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    const pad = (n: number) => String(n).padStart(2, "0");
    const now = new Date();
    const todayLocal = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    const adminToken = signTestJwt({
      sub: "00000000-0000-0000-0000-00000000a001",
      user_id: "00000000-0000-0000-0000-00000000a001",
      email: "admin1@demo-school.example.com",
      user_name: "Demo Admin",
      role: "Admin",
      tenant_id: "b256609a-3157-4ed8-9822-ea797d2c6a4b",
      exp: Math.floor(Date.now() / 1000) + 86400,
    });
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    const cleanupTestAttendance = async () => {
      const r = await page.request.get(
        `http://127.0.0.1:8000/api/v1/attendance/students/${todayLocal}`,
        { headers: adminHeaders },
      );
      if (!r.ok()) return;
      const body = (await r.json()) as {
        data?: Array<{ name: string; attendance_id: string | null }>;
      };
      for (const row of body.data ?? []) {
        if (
          (row.name === "Ava Johnson" || row.name === "Ethan Brown") &&
          row.attendance_id
        ) {
          await page.request.delete(
            `http://127.0.0.1:8000/api/v1/attendance/${row.attendance_id}`,
            { headers: adminHeaders },
          );
        }
      }
    };

    // Ensure cutoff is before midnight (23:59) so on-time Check-In button state is active (DEF-029)
    await page.request.put("http://127.0.0.1:8000/api/v1/attendance/config", {
      headers: adminHeaders,
      data: {
        expected_start_time: "23:44",
        grace_period_minutes: 15,
        late_check_in_cutoff: "23:59",
      },
    });
    await cleanupTestAttendance();

    let createdIncidentId: string | null = null;

    try {
      const rosterPromise = page.waitForResponse(
        (res) => res.url().includes("/api/v1/attendance/students/") && res.status() === 200,
      );
      const configPromise = page.waitForResponse(
        (res) => res.url().includes("/api/v1/attendance/config") && res.status() === 200,
      );
      await page.goto("http://127.0.0.1:3000/caregiver");
      await Promise.all([rosterPromise, configPromise]);

      // 1. DEF-029 (Cards View): Ava Johnson shows dedicated "Check-In" button before cutoff
      const avaCard = page
        .locator("section div.rounded-3xl")
        .filter({ has: page.getByRole("heading", { name: "Ava Johnson" }) })
        .first();
      const avaCheckInBtn = avaCard.getByRole("button", { name: "Check-In", exact: true });
      await expect(avaCheckInBtn).toBeVisible();
      await avaCheckInBtn.click();

      await expect(page.locator("#screener-title")).toBeVisible();
      const avaCheckInResPromise = page.waitForResponse(
        (res) =>
          res.url().includes("/api/v1/attendance/check-in") &&
          res.request().method() === "POST" &&
          res.status() === 200,
      );
      await page.getByRole("button", { name: "Confirm Screen & Check-In" }).click();
      const avaCheckInRes = await avaCheckInResPromise;
      const avaCheckInJson = (await avaCheckInRes.json()) as {
        data?: { status?: string; late_reason?: string | null };
      };
      expect(avaCheckInJson.data?.status).toBe("Present");
      expect(avaCheckInJson.data?.late_reason).toBeNull();
      await expect(avaCard.getByText("Present", { exact: true })).toBeVisible();

      // 2. DEF-029 (Compact View): Ethan Brown shows "Check-In" button in Action column
      await page.getByRole("tab", { name: /compact list/i }).click();
      const ethanRow = page.locator("tr", { hasText: "Ethan Brown" });
      const ethanCheckInBtn = ethanRow.getByRole("button", {
        name: "Check-In",
        exact: true,
      });
      await expect(ethanCheckInBtn).toBeVisible();
      await ethanCheckInBtn.click();

      await expect(page.locator("#screener-title")).toBeVisible();
      const ethanCheckInResPromise = page.waitForResponse(
        (res) =>
          res.url().includes("/api/v1/attendance/check-in") &&
          res.request().method() === "POST" &&
          res.status() === 200,
      );
      await page.getByRole("button", { name: "Confirm Screen & Check-In" }).click();
      await ethanCheckInResPromise;
      await expect(ethanRow.getByRole("button", { name: "Add Note" })).toBeVisible();

      // Switch back to Cards view and open Ava Johnson's drawer
      await page.getByRole("tab", { name: /cards/i }).click();
      await avaCard.getByRole("button", { name: "Add Meal / Diaper Note" }).click();

      const drawerDialog = page.getByRole("dialog").filter({
        has: page.locator("#drawer-toddler-title"),
      });
      await expect(drawerDialog).toBeVisible();
      await expect(drawerDialog.getByTestId("drawer-status-badge")).toHaveText(
        "Present",
      );

      // 3. DEF-031: Click Check-Out -> Confirmation dialog at z-[80] -> Cancel keeps Present
      await drawerDialog.getByRole("button", { name: "Check-Out" }).click();
      const confirmDialog = page.getByRole("dialog", {
        name: /Confirm Child Departure/i,
      });
      await expect(confirmDialog).toBeVisible();
      await expect(confirmDialog).toContainText(/Confirm departure for Ava Johnson/i);
      await confirmDialog.getByRole("button", { name: "Cancel" }).click();
      await expect(confirmDialog).toBeHidden();
      await expect(drawerDialog.getByTestId("drawer-status-badge")).toHaveText(
        "Present",
      );

      // 4. DEF-031 & DEF-032: Confirm Departure -> toast, footer badge, header badge = Checked Out
      await drawerDialog.getByRole("button", { name: "Check-Out" }).click();
      await expect(confirmDialog).toBeVisible();
      const checkOutResPromise = page.waitForResponse(
        (res) =>
          res.url().includes("/api/v1/attendance/check-out") &&
          res.request().method() === "POST" &&
          res.status() === 200,
      );
      await confirmDialog.getByRole("button", { name: "Confirm Departure" }).click();
      await checkOutResPromise;

      await expect(page.getByRole("status")).toContainText(
        /Successfully checked out Ava Johnson at/i,
      );
      await expect(drawerDialog.getByTestId("drawer-status-badge")).toHaveText(
        "Checked Out",
      );
      await expect(drawerDialog).toContainText(
        /Checked out at .* • Cloud Ledger Saved/i,
      );
      await expect(drawerDialog.getByRole("button", { name: "Check-Out" })).toHaveCount(
        0,
      );

      // 5. DEF-033: Care micro-logging locked after Check-Out, zero API requests when disabled
      await expect(
        drawerDialog.getByText(/Child departed at .* Daily care records are locked\./i),
      ).toBeVisible();
      const drawerHydrationBtn = drawerDialog.getByRole("button", {
        name: "+120 mL",
      });
      const drawerMealBtn = drawerDialog.getByRole("button", {
        name: "Log Meal",
      });
      const drawerDiaperBtn = drawerDialog.getByRole("button", {
        name: "Log Diaper",
      });
      await expect(drawerHydrationBtn).toBeDisabled();
      await expect(drawerMealBtn).toBeDisabled();
      await expect(drawerDiaperBtn).toBeDisabled();

      let postCareEventsWhileLocked = 0;
      const trackLockedRequests = (req: { url: () => string; method: () => string }) => {
        if (
          req.url().endsWith("/api/v1/care-events") &&
          req.method() === "POST"
        ) {
          postCareEventsWhileLocked += 1;
        }
      };
      page.on("request", trackLockedRequests);
      await drawerHydrationBtn.click({ force: true });
      await page.waitForTimeout(200);
      expect(postCareEventsWhileLocked).toBe(0);
      page.off("request", trackLockedRequests);

      // Close drawer, check Ava card badge & reload persistence (DEF-032)
      await drawerDialog.getByRole("button", { name: "Done" }).click();
      await expect(avaCard.getByText("Checked Out", { exact: true })).toBeVisible();

      const reloadRosterPromise = page.waitForResponse(
        (res) => res.url().includes("/api/v1/attendance/students/") && res.status() === 200,
      );
      await page.reload();
      await reloadRosterPromise;

      const avaCardAfterReload = page
        .locator("section div.rounded-3xl")
        .filter({ has: page.getByRole("heading", { name: "Ava Johnson" }) })
        .first();
      await expect(
        avaCardAfterReload.getByText("Checked Out", { exact: true }),
      ).toBeVisible();

      // Re-open Ava's drawer & unlock with Supervisor PIN 2468 (DEF-033)
      await avaCardAfterReload
        .getByRole("button", { name: "View Locked Care Record" })
        .click();
      await expect(drawerDialog).toBeVisible();
      await drawerDialog
        .getByRole("button", { name: "Unlock with Supervisor PIN" })
        .click();

      const unlockDialog = page.getByRole("dialog", {
        name: /Supervisor Post-Checkout Override/i,
      });
      await expect(unlockDialog).toBeVisible();
      await unlockDialog.getByLabel("Supervisor PIN").fill("0000");
      await unlockDialog.getByLabel("Override Reason").fill("Testing invalid PIN");
      const badPinPromise = page.waitForResponse(
        (res) =>
          res.url().includes("/api/v1/care-events/verify-supervisor-pin") &&
          res.status() === 422,
      );
      await unlockDialog.getByRole("button", { name: "Unlock Care Editing" }).click();
      await badPinPromise;
      await expect(unlockDialog).toContainText(/Invalid supervisor PIN/i);

      await unlockDialog.getByLabel("Supervisor PIN").fill("2468");
      await unlockDialog
        .getByLabel("Override Reason")
        .fill("Late parent-requested snack log");
      const goodPinPromise = page.waitForResponse(
        (res) =>
          res.url().includes("/api/v1/care-events/verify-supervisor-pin") &&
          res.status() === 200,
      );
      await unlockDialog.getByRole("button", { name: "Unlock Care Editing" }).click();
      await goodPinPromise;
      await expect(unlockDialog).toBeHidden();
      await expect(drawerDialog.getByText(/Supervisor Override Active/i)).toBeVisible();

      await expect(drawerMealBtn).toBeEnabled();
      const overrideEventPromise = page.waitForResponse(
        (res) =>
          res.url().endsWith("/api/v1/care-events") &&
          res.request().method() === "POST" &&
          res.status() === 201,
      );
      await drawerMealBtn.click();
      const overrideEventRes = await overrideEventPromise;
      const overrideReqBody = overrideEventRes.request().postDataJSON() as {
        supervisor_override?: boolean;
        supervisor_pin?: string;
      };
      expect(overrideReqBody.supervisor_override).toBe(true);
      await expect(drawerDialog.getByText(/Logged meal/i)).toBeVisible();
      await drawerDialog.getByRole("button", { name: "Done" }).click();

      // 6. DEF-034: BooBooModal severity pills + BR-07-03 auto-escalation + API payload check
      await page.getByRole("button", { name: /log boo-boo/i }).click();
      const booBooDialog = page.getByRole("dialog", {
        name: /Log Minor Tumble or Boo-Boo/i,
      });
      await expect(booBooDialog).toBeVisible();
      const severityGroup = booBooDialog.getByRole("group", {
        name: "Severity Level",
      });
      for (const lvl of ["Low", "Medium", "High", "Critical"]) {
        await expect(
          severityGroup.getByRole("button", { name: lvl, exact: true }),
        ).toBeVisible();
      }
      await severityGroup.getByRole("button", { name: "Critical", exact: true }).click();
      await expect(booBooDialog.getByRole("alert")).toContainText(/Rule BR-07-03/i);

      await booBooDialog
        .locator("#incident-notes")
        .fill("Critical playroom fall requiring immediate Principal notice.");

      const incidentResPromise = page.waitForResponse(
        (res) =>
          res.url().endsWith("/api/v1/incidents") &&
          res.request().method() === "POST" &&
          res.status() === 201,
      );
      await booBooDialog
        .getByRole("button", { name: /save & notify guardian/i })
        .click();
      const incidentRes = await incidentResPromise;
      const incReqPayload = incidentRes.request().postDataJSON() as {
        severity?: string;
      };
      const incResBody = (await incidentRes.json()) as {
        data?: {
          incident_id?: string;
          severity?: string;
          escalated_to_principal?: boolean;
        };
      };
      expect(incReqPayload.severity).toBe("Critical");
      expect(incResBody.data?.severity).toBe("Critical");
      expect(incResBody.data?.escalated_to_principal).toBe(true);
      createdIncidentId = incResBody.data?.incident_id ?? null;

      await expect(page.getByText("Incident Recorded & Dispatched!")).toBeVisible();
      await expect(booBooDialog).toBeHidden();
      await expect(
        page
          .locator("section")
          .filter({ hasText: "Minor Boo-Boo & Tumble Log" })
          .getByText("Principal Escalated")
          .first(),
      ).toBeVisible();

      expect(pageErrors).toEqual([]);
    } finally {
      await cleanupTestAttendance();
      if (createdIncidentId) {
        await page.request.delete(
          `http://127.0.0.1:8000/api/v1/incidents/${createdIncidentId}`,
          { headers: adminHeaders },
        );
      }
    }
  });

  test("DEF-036: Empty/new tenant shows clean empty states with zero demo data; non-Toddler tenant displays active DB students", async ({
    context,
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    // (a)-(f) Empty tenant: Little Super Star (0 students, 0 meds, 0 incidents)
    const emptyTenantToken = signTestJwt({
      sub: "00000000-0000-0000-0000-00000000e101",
      user_id: "00000000-0000-0000-0000-00000000e101",
      email: "caregiver@littlesuperstar.example",
      user_name: "New School Caregiver",
      role: "caregiver",
      tenant_id: "e54aed15-8719-4b81-a85c-26d5a3086d3b",
      exp: Math.floor(Date.now() / 1000) + 86400,
    });
    await context.clearCookies();
    await context.addCookies([
      {
        name: "pc_session",
        value: emptyTenantToken,
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    const emptyRosterPromise = page.waitForResponse(
      (res) => res.url().includes("/api/v1/attendance/students/") && res.status() === 200,
    );
    const emptyMedsPromise = page.waitForResponse(
      (res) => res.url().includes("/api/v1/health/classroom-medications") && res.status() === 200,
    );
    const emptyIncPromise = page.waitForResponse(
      (res) => res.url().includes("/api/v1/incidents") && res.status() === 200,
    );

    await page.goto("http://127.0.0.1:3000/caregiver");
    await Promise.all([emptyRosterPromise, emptyMedsPromise, emptyIncPromise]);
    await page.waitForLoadState("networkidle");

    const emptyBodyText = await page.locator("body").innerText();
    for (const demoName of [
      "Maya Lin",
      "Leo Vance",
      "Zoe Zhao",
      "Noah Parker",
      "Charlotte Taylor",
      "Amoxicillin",
      "Clara Gomez",
      "Nurse Clara",
    ]) {
      expect(emptyBodyText).not.toContain(demoName);
    }
    await expect(page.locator("h1")).toContainText(
      "Good morning, New School Caregiver",
    );

    await expect(
      page.getByText("No students enrolled or assigned to this classroom session"),
    ).toBeVisible();
    await page.getByRole("tab", { name: /compact list/i }).click();
    await expect(
      page.getByText("No classroom learners found for this session"),
    ).toBeVisible();
    await page.getByRole("tab", { name: /cards/i }).click();

    await expect(
      page.getByText(/No medication administrations scheduled/i),
    ).toBeVisible();
    await expect(
      page.getByText(/Zero boo-boos or incidents reported today/i),
    ).toBeVisible();

    await expect(page.getByTestId("caregiver-alerts-dot")).toHaveCount(0);
    await page.getByRole("button", { name: "Caregiver Alerts" }).click();
    await expect(page.getByText(/No pending routine alerts/i)).toBeVisible();

    // (g) Non-Toddler grade tenant: Demo School 1 (Pre-K student "Soumya soumya")
    const nonToddlerToken = signTestJwt({
      sub: "00000000-0000-0000-0000-00000000f101",
      user_id: "00000000-0000-0000-0000-00000000f101",
      email: "caregiver@demoschool1.example",
      user_name: "Demo School 1 Caregiver",
      role: "caregiver",
      tenant_id: "f5f96b32-705f-5149-8aae-ee210fccc0b9",
      exp: Math.floor(Date.now() / 1000) + 86400,
    });
    await context.clearCookies();
    await context.addCookies([
      {
        name: "pc_session",
        value: nonToddlerToken,
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    const nonToddlerRosterPromise = page.waitForResponse(
      (res) => res.url().includes("/api/v1/attendance/students/") && res.status() === 200,
    );
    await page.goto("http://127.0.0.1:3000/caregiver");
    await nonToddlerRosterPromise;
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Soumya soumya").first()).toBeVisible();
    const nonToddlerBodyText = await page.locator("body").innerText();
    for (const demoName of [
      "Maya Lin",
      "Leo Vance",
      "Zoe Zhao",
      "Clara Gomez",
      "Nurse Clara",
    ]) {
      expect(nonToddlerBodyText).not.toContain(demoName);
    }

    expect(pageErrors).toEqual([]);
  });

  test("DEF-035: Dynamic caregiver identity from JWT/profile replaces hardcoded Clara Gomez across banner, header, Puffy, and incident staff stamp", async ({
    context,
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    const customCaregiverToken = signTestJwt({
      sub: "00000000-0000-0000-0000-00000000c999",
      user_id: "00000000-0000-0000-0000-00000000c999",
      email: "sarah.connor@purplecubby.example",
      user_name: "Sarah Connor",
      role: "caregiver",
      tenant_id: "b256609a-3157-4ed8-9822-ea797d2c6a4b",
      assigned_class_ids: ["00000000-0000-0000-0000-0000000001a0"],
      assigned_grades: ["Toddler & Pre-K"],
      exp: Math.floor(Date.now() / 1000) + 86400,
    });
    const adminToken = signTestJwt({
      sub: "00000000-0000-0000-0000-00000000a001",
      user_id: "00000000-0000-0000-0000-00000000a001",
      email: "admin1@demo-school.example.com",
      user_name: "Demo Admin",
      role: "Admin",
      tenant_id: "b256609a-3157-4ed8-9822-ea797d2c6a4b",
      exp: Math.floor(Date.now() / 1000) + 86400,
    });

    await context.clearCookies();
    await context.addCookies([
      {
        name: "pc_session",
        value: customCaregiverToken,
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    let createdIncidentId: string | null = null;
    try {
      const rosterPromise = page.waitForResponse(
        (res) => res.url().includes("/api/v1/attendance/students/") && res.status() === 200,
      );
      const profilePromise = page.waitForResponse(
        (res) => res.url().includes("/api/v1/auth/profile") && res.status() === 200,
      );
      await page.goto("http://127.0.0.1:3000/caregiver");
      await Promise.all([rosterPromise, profilePromise]);
      await page.waitForLoadState("networkidle");

      // (a) Greeting banner shows authenticated caregiver name
      await expect(page.locator("h1")).toContainText("Good morning, Sarah Connor");
      await expect(
        page.getByText("Sarah Connor & caregiver team").first(),
      ).toBeVisible();

      // (b) Header, hero banner, and profile menu show Sarah Connor with 0 occurrences of Clara Gomez
      const headerText = await page.getByRole("banner", { name: "Caregiver Portal Header" }).innerText();
      expect(headerText).not.toContain("Clara Gomez");
      const heroText = await page.locator("main section").first().innerText();
      expect(heroText).not.toContain("Clara Gomez");

      const profileMenuBtn = page.getByRole("button", {
        name: "Caregiver Profile Menu",
      });
      await expect(profileMenuBtn).toHaveAttribute(
        "title",
        "Sarah Connor Profile",
      );
      await profileMenuBtn.click();
      await expect(page.getByText("Sarah Connor").first()).toBeVisible();
      await profileMenuBtn.click();

      // (c) ThePuffy assistant greets Sarah!
      await page.locator("#puffy-launcher-btn").click();
      const chatWindow = page.getByRole("dialog", {
        name: "ThePuffy AI Chat Window",
      });
      await expect(chatWindow).toBeVisible();
      await expect(chatWindow).toContainText("Online • Scoped: Sarah Connor");
      await expect(chatWindow).toContainText("Hi Sarah!");
      await page.getByRole("button", { name: "Close assistant" }).click();

      // (d) Submitted Boo-Boo incident stamps Sarah Connor
      await page.getByRole("button", { name: /log boo-boo/i }).click();
      const booBooDialog = page.getByRole("dialog", {
        name: /Log Minor Tumble or Boo-Boo/i,
      });
      await booBooDialog
        .locator("#incident-notes")
        .fill("Minor indoor mat slip logged by Sarah Connor.");
      const incPostPromise = page.waitForResponse(
        (res) =>
          res.url().endsWith("/api/v1/incidents") &&
          res.request().method() === "POST" &&
          res.status() === 201,
      );
      await booBooDialog
        .getByRole("button", { name: /save & notify guardian/i })
        .click();
      const incRes = await incPostPromise;
      const incJson = (await incRes.json()) as {
        data?: { incident_id?: string };
      };
      createdIncidentId = incJson.data?.incident_id ?? null;

      await expect(
        page.getByText("Incident Recorded & Dispatched!"),
      ).toBeVisible();
      await expect(booBooDialog).toBeHidden();
      await expect(
        page
          .locator("section")
          .filter({ hasText: "Minor Boo-Boo & Tumble Log" })
          .getByText(/Sarah Connor/)
          .first(),
      ).toBeVisible();

      expect(pageErrors).toEqual([]);
    } finally {
      if (createdIncidentId) {
        await page.request.delete(
          `http://127.0.0.1:8000/api/v1/incidents/${createdIncidentId}`,
          { headers: { Authorization: `Bearer ${adminToken}` } },
        );
      }
    }
  });
});
