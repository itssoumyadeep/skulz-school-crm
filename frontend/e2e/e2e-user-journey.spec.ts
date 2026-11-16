import { test, expect } from "@playwright/test";

test.describe("Full End-to-End User Journey: Real Authentication & Teacher Workflow", () => {
  test("E2E Use Case: Sign In -> Dashboard -> Slide-Over Drawer -> Sub-Tab Navigation", async ({
    page,
  }) => {
    // 1. Visit the root Sign-In portal
    await page.goto("http://127.0.0.1:3000/");
    await page.waitForLoadState("domcontentloaded");

    // Verify Sign In form is present
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

    // 2. Submit live credentials for Teacher 1 in demo-school
    const identityInput = page.locator('input[name="identity"]');
    const passwordInput = page.locator('input[name="password"]');

    await identityInput.fill("teacher1_demo-school");
    await passwordInput.fill("1234");

    // Click Sign In button
    const submitBtn = page.locator('button[type="submit"]:has-text("Sign in")');
    await submitBtn.click();

    // 3. Verify automatic redirect to /teacher portal with active JWT session
    await page.waitForURL("**/teacher", { timeout: 15000 });
    await expect(page.locator("h1")).toContainText("Good morning");

    // Floating PuffyAI agent should be closed by default
    await expect(page.locator("#puffy-chat-window")).toHaveCount(0);

    // 4. Trigger the interactive Slide-Over Drawer
    const attendanceKpiCard = page.locator("#card-attendance-kpi");
    await expect(attendanceKpiCard).toBeVisible();
    await attendanceKpiCard.click();

    // Verify slide-over drawer is rendered via Body Portal at z-[70]
    const drawer = page.getByTestId("teacher-slideover-drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("Homeroom 4B Attendance Roster");

    // Verify drawer close button is in front, clickable, and closes the drawer cleanly
    const closeBtn = page.getByTestId("drawer-close-button");
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(drawer).not.toBeVisible();

    // 5. Navigate to Classes & Attendance tab
    await page.getByRole("link", { name: "Classes & Attendance" }).click();
    await page.waitForURL("**/teacher/attendance");
    await expect(page.locator("h1")).toContainText("Classroom Attendance & Roll Call");

    // 6. Navigate to Lesson Plans tab
    await page.getByRole("link", { name: "Lesson Plans" }).click();
    await page.waitForURL("**/teacher/lessons");
    await expect(page.locator("h1")).toContainText("Curriculum & Lesson Planner");

    // 7. Navigate back to Dashboard
    await page.getByRole("link", { name: "Dashboard" }).click();
    await page.waitForURL("**/teacher");
    await expect(page.locator("h1")).toContainText("Good morning");
  });

  test("Hamburger Navigator: Click to open, stays open on hover-out, closes on click-outside or item selection", async ({
    page,
  }) => {
    // 1. Authenticate & load teacher portal
    await page.goto("http://127.0.0.1:3000/");
    await page.locator('input[name="identity"]').fill("teacher1_demo-school");
    await page.locator('input[name="password"]').fill("1234");
    await page.locator('button[type="submit"]:has-text("Sign in")').click();
    await page.waitForURL("**/teacher");

    const hamburgerBtn = page.getByRole("button", { name: "Open Navigation Menu" });
    const navMenu = page.getByTestId("school-crm-navigator-menu");

    // Initially menu is closed
    await expect(navMenu).not.toBeVisible();

    // Hovering over the hamburger button must NOT open the menu
    await hamburgerBtn.hover();
    await expect(navMenu).not.toBeVisible();

    // Clicking the hamburger button opens the menu
    await hamburgerBtn.click();
    await expect(navMenu).toBeVisible();
    await expect(navMenu).toContainText("School CRM Navigator");

    // Moving mouse away (hover-out) must NOT close the menu (it stays open!)
    await page.mouse.move(600, 150);
    await expect(navMenu).toBeVisible();

    // Clicking outside the menu closes it
    await page.mouse.click(600, 150);
    await expect(navMenu).not.toBeVisible();

    // Clicking the hamburger button again re-opens it
    await hamburgerBtn.click();
    await expect(navMenu).toBeVisible();

    // Selecting an item inside the menu closes it and navigates
    const lessonPlansItem = navMenu.getByRole("link", { name: "Lesson Plans" });
    await lessonPlansItem.click();
    await page.waitForURL("**/teacher/lessons");
    await expect(navMenu).not.toBeVisible();
  });
});
