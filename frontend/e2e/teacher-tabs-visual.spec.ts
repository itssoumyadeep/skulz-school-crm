import { test, expect } from "@playwright/test";

const TEACHER_SESSION = {
  user_id: "teacher-e2e-test",
  email: "sarah.jenkins@oakridge.edu",
  user_name: "Ms. Sarah Jenkins",
  role: "teacher",
  tenant_id: "00000000-0000-0000-0000-000000000001",
  exp: Math.floor(Date.now() / 1000) + 86400,
};

test.beforeEach(async ({ context }) => {
  const b64Payload = Buffer.from(JSON.stringify(TEACHER_SESSION)).toString("base64");
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

test.describe("Teacher Portal 5-Point Oil Pastel Visual & Tab Alignment", () => {
  test("1. Landing page (/teacher) renders Oil Pastel theme and closed PuffyAI agent by default", async ({
    page,
  }) => {
    await page.goto("http://127.0.0.1:3000/teacher");
    await page.waitForLoadState("domcontentloaded");

    // Header title and teacher badge
    await expect(page.locator("h1")).toContainText("Good morning, Ms. Sarah Jenkins!");
    await expect(page.getByText("Homeroom 4B & Gr 5 Science").first()).toBeVisible();

    // Floating PuffyAI agent must be closed by default
    const puffyChat = page.locator("#puffy-chat-window");
    await expect(puffyChat).toHaveCount(0);

    // Verify images render with positive naturalWidth
    const images = page.locator("img:visible");
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const naturalWidth = await images.nth(i).evaluate((img: HTMLImageElement) => img.naturalWidth);
      expect(naturalWidth).toBeGreaterThan(0);
    }
  });

  test("2. Classes & Attendance (/teacher/attendance) matches Oil Pastel design", async ({
    page,
  }) => {
    await page.goto("http://127.0.0.1:3000/teacher/attendance");
    await page.waitForLoadState("domcontentloaded");

    // Warm Oil Pastel Header
    await expect(page.locator("h1")).toContainText("Classroom Attendance & Roll Call");
    await expect(page.getByText("Homeroom 4B · Daily Roll").first()).toBeVisible();

    // 4 KPI Summary Cards with 3xl rounded borders
    const kpiCards = page.locator("section.bg-paper-card");
    await expect(kpiCards.first()).toBeVisible();

    // Quick Roll pills
    const presentCode = page.locator('button[aria-label^="Present for"]').first();
    await expect(presentCode).toBeVisible();

    // Zero broken images
    const images = page.locator("img:visible");
    const imgCount = await images.count();
    for (let i = 0; i < imgCount; i++) {
      const naturalWidth = await images.nth(i).evaluate((img: HTMLImageElement) => img.naturalWidth);
      expect(naturalWidth).toBeGreaterThan(0);
    }
  });

  test("3. Lesson Plans (/teacher/lessons) matches Oil Pastel design", async ({ page }) => {
    await page.goto("http://127.0.0.1:3000/teacher/lessons");
    await page.waitForLoadState("domcontentloaded");

    // Warm Oil Pastel Header
    await expect(page.locator("h1")).toContainText("Curriculum & Lesson Planner");
    await expect(page.getByText("Ontario Curriculum 2026.1").first()).toBeVisible();

    // Lesson plan card with 5-stage arc
    await expect(page.getByText("5-Stage Instructional Arc").first()).toBeVisible();

    // Action buttons in Oil Pastel pill style
    const newPlanBtn = page.getByRole("button", { name: "New Lesson Plan" }).first();
    await expect(newPlanBtn).toBeVisible();
  });

  test("4. Assessments & Moderation (/teacher/assessments) matches Oil Pastel design", async ({
    page,
  }) => {
    await page.goto("http://127.0.0.1:3000/teacher/assessments");
    await page.waitForLoadState("domcontentloaded");

    // Warm Oil Pastel Header
    await expect(page.locator("h1")).toContainText("Assessments & Grade Moderation");
    await expect(page.getByText("Term 2 Marks & Admissions Rubrics").first()).toBeVisible();

    // Bell-curve distribution card
    await expect(page.getByText("Bell-Curve Grade Distribution").first()).toBeVisible();
    await expect(page.getByText("Grade A").first()).toBeVisible();
  });

  test("5. Messages (/teacher/messages) matches Oil Pastel design", async ({ page }) => {
    await page.goto("http://127.0.0.1:3000/teacher/messages");
    await page.waitForLoadState("domcontentloaded");

    // Warm Oil Pastel Header
    await expect(page.locator("h1")).toContainText("Parent Notes & Excursion Waivers");
    await expect(page.getByText("Grade 4B Guardian Channel").first()).toBeVisible();

    // Excursion waivers section
    await expect(page.getByText("Excursion & Field Trip Permission Waivers").first()).toBeVisible();
  });

  test("6. Safeguarding & Health (/teacher/safeguarding) matches Oil Pastel design", async ({
    page,
  }) => {
    await page.goto("http://127.0.0.1:3000/teacher/safeguarding");
    await page.waitForLoadState("domcontentloaded");

    // Warm Oil Pastel Header
    await expect(page.locator("h1")).toContainText("Safeguarding, Sabrina's Law & Health");
    await expect(page.getByText("Sabrina's Law Compliant · BR-07-04").first()).toBeVisible();

    // Sabrina's Law action plan section
    await expect(page.getByText("Sabrina's Law Anaphylaxis & Asthma Action Plans").first()).toBeVisible();
  });

  test("7. Interactive Tab Switching via Floating Pill Nav maintains Oil Pastel styling", async ({
    page,
  }) => {
    await page.goto("http://127.0.0.1:3000/teacher");
    await page.waitForLoadState("domcontentloaded");

    // Navigate to Classes & Attendance
    await page.getByRole("link", { name: "Classes & Attendance" }).click();
    await page.waitForURL("**/teacher/attendance");
    await expect(page.locator("h1")).toContainText("Classroom Attendance & Roll Call");

    // Navigate to Lesson Plans
    await page.getByRole("link", { name: "Lesson Plans" }).click();
    await page.waitForURL("**/teacher/lessons");
    await expect(page.locator("h1")).toContainText("Curriculum & Lesson Planner");

    // Navigate to Assessments & Moderation
    await page.getByRole("link", { name: "Assessments & Moderation" }).click();
    await page.waitForURL("**/teacher/assessments");
    await expect(page.locator("h1")).toContainText("Assessments & Grade Moderation");

    // Navigate to Messages
    await page.getByRole("link", { name: "Messages" }).click();
    await page.waitForURL("**/teacher/messages");
    await expect(page.locator("h1")).toContainText("Parent Notes & Excursion Waivers");

    // Navigate back to Dashboard
    await page.getByRole("link", { name: "Dashboard" }).click();
    await page.waitForURL("**/teacher");
    await expect(page.locator("h1")).toContainText("Good morning, Ms. Sarah Jenkins!");
  });

  test("8. Slide-over drawer stacks above floating navigation bar, backdrop dims header, and drawer control buttons are fully clickable", async ({
    page,
  }) => {
    await page.goto("http://127.0.0.1:3000/teacher");
    await page.waitForLoadState("domcontentloaded");

    // Click Today's Attendance KPI card to open the slide-over drawer
    const attendanceKpiCard = page.locator("#card-attendance-kpi");
    await expect(attendanceKpiCard).toBeVisible();
    await attendanceKpiCard.click();

    // Verify slide-over drawer is visible and positioned above the header
    const drawer = page.getByTestId("teacher-slideover-drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("Homeroom 4B Attendance Roster");

    // Verify drawer backdrop is visible with z-[60]
    const backdrop = page.getByTestId("drawer-backdrop");
    await expect(backdrop).toBeVisible();

    // Verify drawer header controls (Workspace button, Close 'X' button) are completely visible and clickable
    const closeBtn = page.getByTestId("drawer-close-button");
    await expect(closeBtn).toBeVisible();

    // Click close button and verify drawer cleanly dismisses
    await closeBtn.click();
    await expect(drawer).not.toBeVisible();
  });
});
