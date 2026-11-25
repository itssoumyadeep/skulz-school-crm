import { test, expect, type Page } from "@playwright/test";

const API_BASE = "http://127.0.0.1:8000/api/v1";
const APP_BASE = "http://127.0.0.1:3000";

async function loginAs(page: Page, username: string, password = "1234") {
  const res = await page.request.post(`${API_BASE}/auth/login`, {
    data: { username, password },
  });
  expect(res.ok(), `Login failed for ${username}: ${res.status()}`).toBeTruthy();
  const body = await res.json();
  const token = body.data.access_token as string;
  await page.context().addCookies([
    {
      name: "pc_session",
      value: token,
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
  return token;
}

async function assertFivePointVisualHealth(page: Page) {
  // 1. Zero broken images (naturalWidth > 0)
  const brokenImages = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll("img"));
    return imgs
      .filter((img) => {
        const style = window.getComputedStyle(img);
        return style.display !== "none" && style.visibility !== "hidden" && (!img.complete || img.naturalWidth === 0);
      })
      .map((img) => img.src);
  });
  expect(brokenImages, "Found broken images").toEqual([]);

  // 2. Crisp SVG icons, zero unrendered material-symbols ligature spans
  const ligatures = await page.locator(".material-symbols-outlined").count();
  expect(ligatures, "Unrendered material-symbols-outlined ligatures found").toBe(0);
  const svgCount = await page.locator("svg").count();
  expect(svgCount).toBeGreaterThan(0);

  // 3. Warm Oil Pastel background token applied (not raw stark white/black)
  const bgColor = await page.evaluate(() => {
    const main = document.querySelector("div.bg-paper");
    return main ? window.getComputedStyle(main).backgroundColor : "";
  });
  expect(bgColor).toBe("rgb(252, 249, 242)");
}

test.describe("US-P2-01A — Admin Operational Console E2E Audit", () => {
  test("Admin logs in, verifies /admin overview, Cards/Compact switcher, and visual tokens", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await loginAs(page, "admin1_demo-school");
    const response = await page.goto(`${APP_BASE}/admin`);
    expect(response?.status()).toBe(200);
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: /Good morning,/i }),
    ).toBeVisible();
    await expect(page.getByText(/Admissions Pipeline/i).first()).toBeVisible();
    await expect(page.getByText(/Students & Attendance/i).first()).toBeVisible();
    await expect(page.getByText(/Governance & Roles/i).first()).toBeVisible();

    await assertFivePointVisualHealth(page);

    // US-AD-01: Live Pending Meds & Consent Alerts KPI + zero Google Font stylesheets
    await expect(
      page.getByText(/Pending Meds & Consent Alerts:/i).first(),
    ).toBeVisible();
    const googleFontCount = await page
      .locator('link[href*="fonts.googleapis.com"]')
      .count();
    expect(googleFontCount).toBe(0);

    // Toggle Compact View from Account Profile dropdown and verify reload persistence
    await page.getByRole("button", { name: "Account Profile" }).click();
    await page
      .getByTestId("admin-profile-menu")
      .getByRole("button", { name: "Compact View" })
      .click();
    await expect(page.getByText(/Compact Operational KPI Summary/i)).toBeVisible();

    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/Compact Operational KPI Summary/i)).toBeVisible();

    // Open ProfilePictureModal via Account Profile -> Update Photo and close cleanly
    await page.getByRole("button", { name: "Account Profile" }).click();
    await page
      .getByTestId("admin-profile-menu")
      .getByRole("button", { name: "Update Photo" })
      .click();
    const avatarDialog = page.getByRole("dialog");
    await expect(avatarDialog).toBeVisible();
    await avatarDialog
      .getByRole("button", { name: /cancel|close/i })
      .first()
      .click();
    await expect(avatarDialog).toHaveCount(0);

    // Toggle back to Cards View
    await page.getByRole("button", { name: "Cards", exact: true }).click();
    await expect(page.getByText(/BR-01-01 Docs Verified/i)).toBeVisible();

    expect(pageErrors).toEqual([]);
  });

  test("Admissions Kanban loads live pipeline, triggers BR-01-01 error banner and Owner Approval Required badge", async ({
    page,
  }) => {
    await loginAs(page, "admin1_demo-school");
    await page.goto(`${APP_BASE}/admin/admissions`);
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: /Admissions Kanban/i }),
    ).toBeVisible();

    // Open first Pending application card
    const pendingColumn = page.getByTestId("admissions-column-Pending");
    const firstCard = pendingColumn.locator("[data-testid^='application-card-']").first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    // Verify portaled modal opens
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Attempt Offer Seat without verified docs -> BR-01-01 HTTP 422 inline red error banner
    await dialog.getByRole("button", { name: /Offer Seat/i }).click();
    await expect(dialog.getByTestId("admissions-rule-error")).toBeVisible();

    // Click Override Decision as Admin -> Owner Approval Required badge appears
    await dialog.getByRole("button", { name: /Override Decision/i }).click();
    await expect(dialog.getByTestId("owner-approval-required-badge")).toBeVisible();
    await expect(dialog.getByText("Owner Approval Required")).toBeVisible();

    await assertFivePointVisualHealth(page);
  });

  test("Setup & Bulk Import validates rollback on bad row and imports a valid student visible in /admin/students", async ({
    page,
  }) => {
    await loginAs(page, "admin1_demo-school");
    await page.goto(`${APP_BASE}/admin/setup`);
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: /School Setup, Bulk Imports/i }),
    ).toBeVisible();
    await expect(page.getByText(/Portal Role Memberships/i)).toBeVisible();

    // Ensure students dataset is selected
    const datasetSelect = page.getByLabel("Target Dataset");
    await datasetSelect.selectOption("students");

    // 1. Negative rollback test (missing required parent_name & bad DOB causes full batch rollback)
    const textarea = page.getByLabel(/CSV Payload Preview/i);
    await textarea.fill("first_name,last_name,dob,grade,parent_name\nRollback,Child,not-a-date,Grade 4B,");
    await page.getByRole("button", { name: /Run Transactional Import/i }).click();
    await expect(page.getByTestId("csv-import-feedback")).toBeVisible();
    await expect(page.getByTestId("csv-import-feedback")).not.toContainText(
      /Atomically imported/i,
    );

    // 2. Positive Student CSV import using real required template columns
    const suffix = String(Date.now()).slice(-6);
    const firstName = "AdminQA";
    const lastName = `Learner${suffix}`;
    await textarea.fill(
      `first_name,last_name,dob,grade,parent_name,parent_email\n${firstName},${lastName},2016-05-12,Grade 4B,Jordan ${lastName},qa.${suffix}@example.com`,
    );
    await page.getByRole("button", { name: /Run Transactional Import/i }).click();
    await expect(page.getByTestId("csv-import-feedback")).toContainText(
      /Atomically imported/i,
    );

    // 3. Navigate to /admin/students and confirm imported student persists from PostgreSQL
    await page.goto(`${APP_BASE}/admin/students`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(`${firstName} ${lastName}`)).toBeVisible();

    await assertFivePointVisualHealth(page);
  });

  test("Data Governance renders live Data Classification Catalog and Immutable Audit Logs", async ({
    page,
  }) => {
    await loginAs(page, "admin1_demo-school");
    await page.goto(`${APP_BASE}/admin/governance`);
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: /Data Governance & Audit Ledger/i }),
    ).toBeVisible();
    await expect(page.getByText("Actors").first()).toBeVisible();
    await expect(page.getByText("Processes").first()).toBeVisible();
    await expect(page.getByText("Meta Data").first()).toBeVisible();
    await expect(page.getByText("CareEvent").first()).toBeVisible();
    await expect(page.getByText(/Immutable Tenant Audit Logs/i)).toBeVisible();

    // Open field inspector modal (z-[70])
    await page.getByRole("button", { name: "Inspect Fields" }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await assertFivePointVisualHealth(page);
  });

  test("Non-Admin roles (Teacher, Caregiver, Parent) are redirected away from /admin", async ({
    browser,
  }) => {
    for (const uname of [
      "teacher1_demo-school",
      "caregiver1_demo-school",
      "parent1_demo-school",
    ]) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await loginAs(page, uname);
      await page.goto(`${APP_BASE}/admin`);
      await expect(page).toHaveURL(/denied=role-mismatch/);
      await ctx.close();
    }
  });

  test("US-P2-01B Part 1: Attendance Timer Config, Health/Meds, Care History (+ Owner access) & Caregiver sync", async ({
    browser,
    page,
  }) => {
    test.setTimeout(60000);
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await loginAs(page, "admin1_demo-school");

    // 1. Admin Navigator Menu contains all new US-P2-01B modules
    await page.goto(`${APP_BASE}/admin`);
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Open Admin Navigator" }).click();
    const navMenu = page.getByTestId("admin-navigator-menu");
    await expect(navMenu.getByRole("link", { name: "Attendance Timer Config" })).toBeVisible();
    await expect(navMenu.getByRole("link", { name: "Health & Medications" })).toBeVisible();
    await expect(navMenu.getByRole("link", { name: "Child Care History" })).toBeVisible();
    await expect(navMenu.getByRole("link", { name: "Academics & Calendars" })).toBeVisible();
    await expect(navMenu.getByRole("link", { name: "Billing & Reconciliation" })).toBeVisible();
    await expect(navMenu.getByRole("link", { name: "Operations & Procurement" })).toBeVisible();

    // 2. /admin/attendance-config saves & persists across reload
    await page.goto(`${APP_BASE}/admin/attendance-config`);
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("heading", { name: /Attendance Timer & Late Check-In Rules/i }),
    ).toBeVisible();
    await page.getByLabel("Expected Start Time").fill("09:00");
    await page.getByLabel("Grace Period Minutes").fill("15");
    await page.getByLabel("Late Check-In Cutoff").fill("09:15");
    await page.getByRole("button", { name: /Save Attendance Timer Policy/i }).click();
    await expect(page.getByRole("status")).toContainText("09:15");

    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByLabel("Late Check-In Cutoff")).toHaveValue("09:15");

    // Restore non-blocking late-evening cutoff 23:59 so Caregiver E2E on-time checks pass at any hour
    await page.getByLabel("Expected Start Time").fill("23:44");
    await page.getByLabel("Grace Period Minutes").fill("15");
    await page.getByLabel("Late Check-In Cutoff").fill("23:59");
    await page.getByRole("button", { name: /Save Attendance Timer Policy/i }).click();
    await expect(page.getByRole("status")).toContainText("23:59");
    await assertFivePointVisualHealth(page);

    // 3. /caregiver consumes Attendance Config live without hardcoded 12m timer strings
    const cgCtx = await browser.newContext();
    const cgPage = await cgCtx.newPage();
    await loginAs(cgPage, "caregiver1_demo-school");
    const cfgPromise = cgPage.waitForResponse(
      (res) => res.url().includes("/api/v1/attendance/config") && res.status() === 200,
    );
    await cgPage.goto(`${APP_BASE}/caregiver`);
    await cfgPromise;
    await expect(cgPage.getByText("12 mins remaining")).toHaveCount(0);
    await expect(cgPage.getByText("Absent (SLA 12m)")).toHaveCount(0);
    await cgCtx.close();

    // 4. /admin/health-medications saves consents & renders alerts + med logs
    const healthGetPromise = page.waitForResponse(
      (res) =>
        res.url().includes("/health-record") &&
        res.request().method() === "GET" &&
        res.status() === 200,
    );
    await page.goto(`${APP_BASE}/admin/health-medications`);
    await healthGetPromise;
    await expect(
      page.getByRole("heading", { name: /Health, Medications & Parental Consent Setup/i }),
    ).toBeVisible();
    await page.getByLabel("Photo Media Consent").check();
    const healthPutPromise = page.waitForResponse(
      (res) =>
        res.url().includes("/health-record") &&
        res.request().method() === "PUT" &&
        res.status() === 200,
    );
    await page.getByRole("button", { name: /Save Health & Consents/i }).click();
    await healthPutPromise;
    await expect(page.getByRole("status")).toContainText(/Saved health record/i);
    await assertFivePointVisualHealth(page);

    // 5. /admin/history renders chronological child history + Owner permitted + Teacher denied
    await page.goto(`${APP_BASE}/admin/history`);
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("heading", { name: /Child Daily Care History Audit/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Select Audit Date" }).click();
    const historyCalendar = page.locator('[data-slot="calendar"]');
    await expect(historyCalendar).toBeVisible();
    await historyCalendar.locator("button.rdp-button_previous").click();
    await historyCalendar.locator("button.rdp-button_previous").click();
    await historyCalendar
      .locator("button[data-day]")
      .filter({ hasText: /^15$/ })
      .first()
      .click();
    await expect(
      page.getByText(/0 database records found for \d{4}-\d{2}-15/i),
    ).toBeVisible();
    await assertFivePointVisualHealth(page);

    const ownerCtx = await browser.newContext();
    const ownerPage = await ownerCtx.newPage();
    await loginAs(ownerPage, "owner1_demo-school");
    await ownerPage.goto(`${APP_BASE}/admin/history`);
    await ownerPage.waitForLoadState("networkidle");
    await expect(ownerPage).toHaveURL(/\/admin\/history/);
    await expect(
      ownerPage.getByRole("heading", { name: /Child Daily Care History Audit/i }),
    ).toBeVisible();
    await ownerCtx.close();

    const teacherCtx = await browser.newContext();
    const teacherPage = await teacherCtx.newPage();
    await loginAs(teacherPage, "teacher1_demo-school");
    await teacherPage.goto(`${APP_BASE}/admin/history`);
    await expect(teacherPage).toHaveURL(/denied=role-mismatch/);
    await teacherCtx.close();

    expect(pageErrors).toEqual([]);
  });

  test("US-P2-01B Part 2: Academics, Billing & Reconciliation, and Operations 3-Way Match", async ({
    page,
  }) => {
    test.setTimeout(60000);
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await loginAs(page, "admin1_demo-school");

    // 6. /admin/academics renders Calendars & Curriculums
    await page.goto(`${APP_BASE}/admin/academics`);
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("heading", { name: /Academic Calendars & Curriculums/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Curriculums \(/i }).click();
    await expect(
      page.getByRole("heading", { name: /Published Curriculums/i }),
    ).toBeVisible();
    await assertFivePointVisualHealth(page);

    // 7. /admin/billing renders Invoices, Fee Structures, Discounts, Reconciliation
    await page.goto(`${APP_BASE}/admin/billing`);
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("heading", { name: /Billing, Fee Structures & Reconciliation/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Fee Structures" }).click();
    await expect(
      page.getByRole("heading", { name: /Active Fee Plans/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Reconciliation" }).click();
    await expect(
      page.getByRole("heading", { name: /Monthly Financial Reconciliation/i }),
    ).toBeVisible();
    await assertFivePointVisualHealth(page);

    // 8. /admin/operations renders Staff, Payroll, Procurement 3-Way Match, Events
    await page.goto(`${APP_BASE}/admin/operations`);
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("heading", { name: /Operations, Payroll & Procurement/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Procurement 3-Way Match" }).click();
    await expect(
      page.getByRole("heading", { name: /Vendor Invoices & 3-Way Match Gate/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Events" }).click();
    await expect(
      page.getByRole("heading", { name: /Scheduled School Events/i }),
    ).toBeVisible();
    await assertFivePointVisualHealth(page);

    expect(pageErrors).toEqual([]);
  });

  test("US-AD-10 & US-AD-09: Parental care-provider consent toggle & Medication Administration CRUD", async ({
    page,
    browser,
  }) => {
    test.setTimeout(90000);
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await loginAs(page, "admin1_demo-school");

    const initialHealthGet = page.waitForResponse(
      (res) =>
        res.url().includes("/health-record") &&
        res.request().method() === "GET" &&
        res.status() === 200,
    );
    await page.goto(`${APP_BASE}/admin/health-medications`);
    await initialHealthGet;

    // Ensure Maya Lin is selected
    const mayaHeading = page.getByRole("heading", {
      name: /Maya Lin — Health & Consents/i,
    });
    if (!(await mayaHeading.isVisible())) {
      const mayaHealthGet = page.waitForResponse(
        (res) =>
          res.url().includes("/health-record") &&
          res.request().method() === "GET" &&
          res.status() === 200,
      );
      await page.getByRole("button", { name: /Maya Lin/i }).first().click();
      await mayaHealthGet;
    }
    await expect(mayaHeading).toBeVisible();

    // US-AD-10 Step 1: Uncheck parental consent & save
    const consentCheckbox = page.getByLabel(
      "Parent Consent: Share Health Info with Care Provider and Administer Medication",
    );
    await consentCheckbox.uncheck();
    const uncheckPutPromise = page.waitForResponse(
      (res) =>
        res.url().includes("/health-record") &&
        res.request().method() === "PUT" &&
        res.status() === 200,
    );
    await page.getByRole("button", { name: /Save Health & Consents/i }).click();
    const uncheckPutRes = await uncheckPutPromise;
    const idMatch = uncheckPutRes.url().match(/\/students\/([^/]+)\/health-record/);
    const mayaStudentId = idMatch ? idMatch[1] : "";
    expect(mayaStudentId).not.toBe("");
    await expect(
      page.getByText(/Consent Unchecked \/ Revoked · Care Provider Blocked/i),
    ).toBeVisible();

    // US-AD-10 Step 2: Verify Caregiver sees masked/blocked state & API rejects dose with HTTP 422
    const cgCtx = await browser.newContext();
    const cgPage = await cgCtx.newPage();
    const cgToken = await loginAs(cgPage, "caregiver1_demo-school");
    const cgMedsPromise = cgPage.waitForResponse(
      (res) =>
        res.url().includes("/api/v1/health/classroom-medications") &&
        res.status() === 200,
    );
    await cgPage.goto(`${APP_BASE}/caregiver`);
    await cgMedsPromise;
    await expect(
      cgPage.getByText(/Consent Missing — Blocked \(BR-07-01\)/i).first(),
    ).toBeVisible();

    const blockedDoseRes = await cgPage.request.post(
      `${API_BASE}/health/medication-log`,
      {
        headers: { Authorization: `Bearer ${cgToken}` },
        data: {
          student_id: mayaStudentId,
          medicine_name: "Amoxicillin",
          dose: "5mL",
        },
      },
    );
    expect(blockedDoseRes.status()).toBe(422);
    await cgCtx.close();

    // US-AD-10 Step 3: Re-check consent & verify consent_date + restored Caregiver access
    const saveHealthBtn = page.getByRole("button", { name: /Save Health & Consents/i });
    await expect(saveHealthBtn).toBeEnabled();
    await consentCheckbox.check();
    await expect(consentCheckbox).toBeChecked();
    const recheckPutPromise = page.waitForResponse(
      (res) =>
        res.url().includes("/health-record") &&
        res.request().method() === "PUT" &&
        res.status() === 200,
    );
    await saveHealthBtn.click();
    await recheckPutPromise;
    await expect(
      page.getByText(/Shared with Care Provider · Dose Logging Enabled/i),
    ).toBeVisible();
    await expect(page.getByText(/Consent Active · Signed/i)).toBeVisible();

    // US-AD-09: Admin Create / Modify / Delete Medication Administration
    await page
      .getByRole("button", { name: /Record Medication Administration/i })
      .click();
    const medModal = page.getByRole("dialog", {
      name: /Record Medication Administration/i,
    });
    await expect(medModal).toBeVisible();
    await expect(medModal.locator("#med-log-modal-title")).toContainText(
      /Record Medication Administration/i,
    );
    await medModal.getByLabel("Administration Student").selectOption(mayaStudentId);
    await medModal.getByLabel("Administration Medicine Name").fill("Ibuprofen E2E");
    await medModal.getByLabel("Administration Dose").fill("2.5mL");
    const forceCheckbox = medModal.getByLabel(
      /Additional Dose Same Day \(requires consent\)/i,
    );
    await forceCheckbox.check();

    const medCreatePromise = page.waitForResponse(
      (res) =>
        res.url().includes("/api/v1/health/medication-log") &&
        res.request().method() === "POST" &&
        res.status() === 201,
    );
    await medModal.getByRole("button", { name: "Save Administration" }).click();
    await medCreatePromise;
    await expect(
      page.getByText(/Maya Lin — Ibuprofen E2E \(2\.5mL\)/i),
    ).toBeVisible();

    // Edit the created medication administration log
    await page
      .getByRole("button", {
        name: "Edit medication log Ibuprofen E2E for Maya Lin",
      })
      .click();
    const editModal = page.getByRole("dialog", {
      name: /Modify Medication Administration/i,
    });
    await expect(editModal).toBeVisible();
    await editModal.getByLabel("Administration Dose").fill("3.0mL");
    const medPatchPromise = page.waitForResponse(
      (res) =>
        res.url().includes("/api/v1/health/medication-log/") &&
        res.request().method() === "PATCH" &&
        res.status() === 200,
    );
    await editModal.getByRole("button", { name: "Update Dose Log" }).click();
    await medPatchPromise;
    await expect(
      page.getByText(/Maya Lin — Ibuprofen E2E \(3\.0mL\)/i),
    ).toBeVisible();

    // Soft-delete the temporary medication log
    await page
      .getByRole("button", {
        name: "Delete medication log Ibuprofen E2E for Maya Lin",
      })
      .click();
    const deleteDialog = page.getByRole("dialog", {
      name: /Delete Medication Administration\?/i,
    });
    await expect(deleteDialog).toBeVisible();
    const medDeletePromise = page.waitForResponse(
      (res) =>
        res.url().includes("/api/v1/health/medication-log/") &&
        res.request().method() === "DELETE" &&
        res.status() === 200,
    );
    await deleteDialog.getByRole("button", { name: "Confirm Delete" }).click();
    await medDeletePromise;
    await expect(
      page.getByText(/Maya Lin — Ibuprofen E2E \(3\.0mL\)/i),
    ).toHaveCount(0);

    await assertFivePointVisualHealth(page);
    expect(pageErrors).toEqual([]);
  });

  test("US-AD-11 & US-CG-17: Admin 360 Student Card full lifecycle & History Supervisor Override", async ({
    page,
  }) => {
    test.setTimeout(90000);
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await loginAs(page, "admin1_demo-school");

    // 1. /admin/students: Create Student -> 360 Card 5 tabs -> Edit Name -> Soft-Delete Student
    await page.goto(`${APP_BASE}/admin/students`);
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Add New Student" }).click();
    const addDialog = page.getByRole("dialog", {
      name: /Add New Student \(BR-01-05 Atomic ID\)/i,
    });
    await expect(addDialog).toBeVisible();
    await addDialog.getByLabel("New Student Name").fill("E2E Card Learner");
    await addDialog.getByLabel("New Student Grade").fill("Room 1A");
    await addDialog.getByLabel("New Student Parent Name").fill("Pat E2E");
    await addDialog
      .getByLabel("New Student Parent Email")
      .fill("pate2e@example.com");
    await addDialog
      .getByLabel("New Student Parent Phone")
      .fill("416-555-0144");
    await addDialog.getByLabel("New Student Emergency Name").fill("Grandma E2E");
    await addDialog
      .getByLabel("New Student Emergency Phone")
      .fill("416-555-0145");
    await addDialog.getByLabel("New Student Pickup PIN").fill("7391");

    const createStudentPromise = page.waitForResponse(
      (res) =>
        res.url().endsWith("/api/v1/students") &&
        res.request().method() === "POST" &&
        res.status() === 201,
    );
    await addDialog.getByRole("button", { name: "Create Student" }).click();
    await createStudentPromise;

    const studentRow = page.locator("tr", { hasText: "E2E Card Learner" }).first();
    await expect(studentRow).toBeAttached();

    const drawer = page.getByRole("dialog", {
      name: /Student Card: E2E Card Learner/i,
    });
    await expect(drawer).toBeVisible({ timeout: 15000 });
    await expect(drawer.getByLabel("Student Full Name")).toBeVisible();

    // Navigate all 5 domain tabs and verify zero plaintext PIN leakage
    await drawer.getByRole("button", { name: "Guardians & Pickup" }).click();
    await expect(drawer.getByText(/Grandma E2E/i)).toBeVisible();
    await expect(drawer).not.toContainText("7391");

    await drawer.getByRole("button", { name: "Health & Medications" }).click();
    await expect(
      drawer.getByRole("heading", {
        name: /Health Profile, Prescriptions & Parental Share Consent/i,
      }),
    ).toBeVisible();

    await drawer.getByRole("button", { name: "Attendance & Daily Care" }).click();
    await expect(
      drawer.getByRole("heading", { name: /Attendance Ledger \(/i }),
    ).toBeVisible();

    await drawer.getByRole("button", { name: "Academics & Billing" }).click();
    await expect(
      drawer.getByRole("heading", { name: /Marks & Report Cards \(/i }),
    ).toBeVisible();

    // Return to Profile & Docs, update student name
    await drawer.getByRole("button", { name: "Profile & Docs" }).click();
    await drawer.getByLabel("Student Full Name").fill("E2E Card Learner Updated");
    const updateStudentPromise = page.waitForResponse(
      (res) =>
        res.url().includes("/api/v1/students/") &&
        res.request().method() === "PATCH" &&
        res.status() === 200,
    );
    await drawer.getByRole("button", { name: "Save Student Details" }).click();
    await updateStudentPromise;
    await expect(
      page.getByRole("heading", {
        name: /E2E Card Learner Updated — 360° Student Card/i,
      }),
    ).toBeVisible();

    // Soft-delete temporary test student via Student Card confirmation dialog
    await page
      .getByRole("dialog", { name: /Student Card: E2E Card Learner Updated/i })
      .getByRole("button", { name: "Delete Student" })
      .click();
    const confirmDeleteDialog = page.getByRole("dialog", {
      name: /Delete Student E2E Card Learner Updated\?/i,
    });
    await expect(confirmDeleteDialog).toBeVisible();
    const deleteStudentPromise = page.waitForResponse(
      (res) =>
        res.url().includes("/api/v1/students/") &&
        res.request().method() === "DELETE" &&
        res.status() === 200,
    );
    await confirmDeleteDialog
      .getByRole("button", { name: "Confirm Delete Student" })
      .click();
    await deleteStudentPromise;
    await expect(
      page.locator("tr", { hasText: "E2E Card Learner Updated" }),
    ).toHaveCount(0);
    await assertFivePointVisualHealth(page);

    // 2. US-CG-17: /admin/history cohort filter + Supervisor Override -> core_audit_log
    await page.goto(`${APP_BASE}/admin/history`);
    await page.waitForLoadState("networkidle");

    const cohortSelect = page.getByLabel("Filter Classroom or Cohort");
    if (await cohortSelect.isVisible()) {
      await cohortSelect.selectOption({ index: 1 });
      await cohortSelect.selectOption("all");
    }

    await page.getByRole("button", { name: "Supervisor Override" }).click();
    const overrideModal = page.getByRole("dialog", {
      name: /Supervisor Override \(BR-03-01\)/i,
    });
    await expect(overrideModal).toBeVisible();
    await overrideModal
      .getByLabel("Override Attendance Status")
      .selectOption("Present");
    await overrideModal
      .getByLabel("Mandatory Override Reason")
      .fill("Parent signed paper sheet verified by Principal");
    const overridePromise = page.waitForResponse(
      (res) =>
        res.url().includes("/api/v1/attendance/supervisor-override") &&
        res.request().method() === "POST" &&
        res.status() === 200,
    );
    await overrideModal
      .getByRole("button", { name: "Submit Override" })
      .click();
    await overridePromise;

    await expect(
      page.getByText(/Immutable Audit Trail \(core_audit_log/i),
    ).toBeVisible();
    await expect(
      page.getByText(/Parent signed paper sheet verified by Principal/i).first(),
    ).toBeVisible();
    await assertFivePointVisualHealth(page);

    expect(pageErrors).toEqual([]);
  });
});
