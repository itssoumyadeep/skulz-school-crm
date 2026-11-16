import { test, expect } from "@playwright/test";

test.describe("Teacher Dashboard Exhaustive Audit & Stacking Context Suite", () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate as teacher1_demo-school
    await page.goto("http://127.0.0.1:3000/");
    await page.waitForLoadState("domcontentloaded");
    await page.locator('input[name="identity"]').fill("teacher1_demo-school");
    await page.locator('input[name="password"]').fill("1234");
    await page.locator('button[type="submit"]:has-text("Sign in")').click();
    await page.waitForURL("**/teacher", { timeout: 15000 });
    await expect(page.locator("h1")).toContainText("Good morning");
  });

  test("1. Data Source Audit: Check all text and identify hardcoded strings vs dynamic", async ({
    page,
  }) => {
    // Educator name
    const greeting = await page.locator("h1").innerText();
    console.log("Greeting:", greeting);
    expect(greeting).toMatch(/Sarah Jenkins/);

    // Assigned classes pill
    const assignedClasses = await page
      .locator("span.inline-flex.items-center:has-text('Homeroom')")
      .first()
      .innerText();
    console.log("Assigned Classes Label:", assignedClasses);

    // Today's attendance KPI card
    const attendanceKpi = page.locator("#card-attendance-kpi");
    const kpiText = await attendanceKpi.innerText();
    console.log("Attendance KPI Text:\n", kpiText);

    // Class schedule summary widget (Sunny yellow widget)
    const scheduleSummary = page.locator("text=Class Schedule").locator("..");
    console.log("Schedule Summary Text:\n", await scheduleSummary.innerText());

    // Homeroom 4B Roll mini-card
    const homeroomRoll = page.locator("h2:has-text('Homeroom 4B Roll')").locator("..");
    console.log("Homeroom Roll Text:\n", await homeroomRoll.innerText());

    // Switch to compact view to inspect compact elements
    await page.getByRole("button", { name: "Compact List" }).click();
    await page.waitForTimeout(500);

    const compactTable = page.locator("table");
    await expect(compactTable).toBeVisible();
    const compactHeaders = await page.locator("h2:has-text('Compact')").allInnerTexts();
    console.log("Compact Headers:", compactHeaders);

    const tripCard = page.locator("h3:has-text('Trip Slips')").locator("..");
    console.log("Trip Slips Card:\n", await tripCard.innerText());

    // Switch back to Cards view
    await page.getByRole("button", { name: "Cards" }).click();
  });

  test("2. Header & Navigation: Test hamburger, pills, notifications, profile menu", async ({
    page,
  }) => {
    // Brand link
    const brand = page.getByRole("link", { name: /ThePurpleCubby.*Staff Portal/ });
    await expect(brand).toBeVisible();

    // Nav pills
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Classes & Attendance" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Lesson Plans" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Assessments & Moderation" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Messages" })).toBeVisible();

    // Notification bell
    const notifBtn = page.getByRole("button", { name: "Notifications" });
    await notifBtn.click();
    await expect(page.locator("text=Classroom Alerts")).toBeVisible();
    await expect(page.locator("text=3 Unread")).toBeVisible();
    // Close notifications
    await page.keyboard.press("Escape");
    await expect(page.locator("text=Classroom Alerts")).not.toBeVisible();

    // Profile avatar menu
    const profileBtn = page.getByRole("button", { name: "Educator Profile Menu" });
    await profileBtn.click();
    await expect(page.locator("text=Update Profile Picture")).toBeVisible();
    await expect(page.locator("text=Safeguarding & Health")).toBeVisible();
    await expect(page.locator("button:has-text('Sign Out')")).toBeVisible();
    // Close profile menu
    await page.keyboard.press("Escape");
    await expect(page.locator("text=Update Profile Picture")).not.toBeVisible();

    // Hamburger navigator
    const hamburgerBtn = page.getByRole("button", { name: "Open Navigation Menu" });
    await hamburgerBtn.click();
    await expect(page.getByTestId("school-crm-navigator-menu")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("school-crm-navigator-menu")).not.toBeVisible();
  });

  test("3. Greeting & Class Switcher: Test dropdown and view switcher", async ({
    page,
  }) => {
    // Class dropdown
    const classBtn = page.locator("button:has-text('Primary Homeroom')");
    await classBtn.click();
    await expect(page.locator("text=Grade 5 • Lab 204 (24)")).toBeVisible();
    await page.locator("text=Grade 5 • Lab 204 (24)").click();
    // Verify selection changed
    await expect(page.locator("text=Earth Science (24 Students)")).toBeVisible();

    // Switch back to Grade 4
    await page.locator("button:has-text('Earth Science (24 Students)')").click();
    await page.locator("text=Grade 4 • Room 12B (28)").click();
    await expect(page.locator("text=Primary Homeroom (28 Students)")).toBeVisible();

    // View switcher toggling
    const compactBtn = page.getByRole("button", { name: "Compact List" });
    await compactBtn.click();
    await expect(page.locator("table")).toBeVisible();

    const cardsBtn = page.getByRole("button", { name: "Cards" });
    await cardsBtn.click();
    await expect(page.locator("#card-attendance-kpi")).toBeVisible();
  });

  test("4. Quick Roll Rows & Drawers: Test P/L/E buttons and slide-over drawers", async ({
    page,
  }) => {
    // Homeroom Roll card and first featured student row
    const pButton = page.getByRole("button", { name: "P", exact: true }).first();
    const lButton = page.getByRole("button", { name: "L", exact: true }).first();
    const eButton = page.getByRole("button", { name: "E", exact: true }).first();

    await pButton.click();
    await lButton.click();
    await eButton.click();

    // Open Medical Drawer from student 1 card
    const student1Row = page.locator("div.cursor-pointer:has-text('Doctor Note')").first();
    await student1Row.click();
    const slideDrawer = page.getByTestId("teacher-slideover-drawer");
    await expect(slideDrawer).toBeVisible();
    await expect(slideDrawer).toContainText("Medical & Safeguarding");

    // Close drawer
    await page.getByTestId("drawer-close-button").click();
    await expect(slideDrawer).not.toBeVisible();

    // Period 2 card opens Lesson drawer
    const period2Card = page.locator("#card-period-2");
    await period2Card.click();
    await expect(slideDrawer).toBeVisible();
    await expect(slideDrawer).toContainText("Period 2: Grade 5 Earth Science");

    // Click "Mark Lesson Completed" primary drawer action
    const drawerActionBtn = slideDrawer.locator("button:has-text('Mark Lesson Completed')");
    await drawerActionBtn.click();
    await expect(slideDrawer).not.toBeVisible();

    // Period 3 card launch button opens Lesson drawer
    await page.locator("button:has-text('Launch Presentation')").click();
    await expect(slideDrawer).toBeVisible();
    await expect(slideDrawer).toContainText("Period 3: Grade 4 Mathematics");
    await page.getByTestId("drawer-close-button").click();
    await expect(slideDrawer).not.toBeVisible();
  });

  test("5. Modals & Stacking Context Check: LeaveRequestModal, DatePicker, Select z-index", async ({
    page,
  }) => {
    // Click "+ New Request" or "Submit Leave / Substitute Cover Request" to open LeaveRequestModal
    const newRequestBtn = page.locator("button:has-text('+ New Request')");
    await newRequestBtn.click();

    // Check LeaveRequestModal is open
    const modal = page.locator('[role="dialog"]:has-text("Submit Staff Leave")');
    await expect(modal).toBeVisible();

    // Check modal stacking context
    const modalBox = await modal.boundingBox();
    console.log("Modal bounding box:", modalBox);

    // Click the Select dropdown for Leave Type
    const selectTrigger = modal.locator('[data-slot="select-trigger"]');
    await expect(selectTrigger).toBeVisible();
    await selectTrigger.click();

    // Locate the select popover content
    const selectContent = page.locator('[data-slot="select-content"]');
    await expect(selectContent).toBeVisible();

    // Check z-index of select content vs modal
    const selectZIndex = await selectContent.evaluate((el) => window.getComputedStyle(el).zIndex);
    const modalZIndex = await modal.evaluate((el) => window.getComputedStyle(el).zIndex);
    console.log(`Select Content zIndex: ${selectZIndex}, Modal Content zIndex: ${modalZIndex}`);

    // Click an option in the select dropdown
    const sickOption = page.locator('[data-slot="select-item"]:has-text("Sick / Medical Leave")');
    await expect(sickOption).toBeVisible();
    await sickOption.click();
    await expect(selectContent).not.toBeVisible();

    // Now test the DatePicker button inside LeaveRequestModal!
    // Locate the Start Date button
    const datePickerTriggers = modal.locator('button[aria-haspopup="dialog"]');
    const startDateBtn = datePickerTriggers.first();
    await expect(startDateBtn).toBeVisible();
    await startDateBtn.click();

    // Find the PopoverPrimitive.Content
    const popoverContent = page.locator('[data-radix-popper-content-wrapper]');
    await expect(popoverContent).toBeVisible();
    const popoverZIndex = await popoverContent.first().locator("> *").evaluate((el) => window.getComputedStyle(el).zIndex);
    console.log(`Popover Content zIndex: ${popoverZIndex}, Modal Content zIndex: ${modalZIndex}`);

    // Verify calendar is rendered and interactive
    const calendarTable = page.locator('.rdp, table[role="grid"]');
    console.log("Calendar table count:", await calendarTable.count());

    // Close Leave modal
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
  });

  test("6. ThePuffy AI Agent: Docked pill toggle, suggestions, prompt sending", async ({
    page,
  }) => {
    // Docked button
    const puffyBtn = page.getByRole("button", { name: "ThePuffy AI Agent" });
    await expect(puffyBtn).toBeVisible();

    // Chat card is initially closed
    await expect(page.locator("text=Online • Scoped:").first()).not.toBeVisible();

    // Click to open
    await puffyBtn.click();
    await expect(page.locator("text=Online • Scoped:").first()).toBeVisible();

    // Click a suggested action: "Record Attendance Override"
    await page.locator("button:has-text('Record Attendance Override')").click();
    await expect(page.locator("text=Attendance Override Ready")).toBeVisible();

    // Close the slide drawer that "Record Attendance Override" opened
    const slideDrawer = page.getByTestId("teacher-slideover-drawer");
    if (await slideDrawer.isVisible()) {
      await page.getByTestId("drawer-close-button").click();
      await expect(slideDrawer).not.toBeVisible();
    }

    // Type a prompt and send
    const input = page.locator('input[placeholder="Ask ThePuffy anything..."]');
    await input.fill("What is the classroom agenda for this afternoon?");
    await page.locator('button[title="Send"]').click();

    // Verify response message rendered
    await expect(
      page.locator("text=Feedback comments and rubric checkpoints aligned")
    ).toBeVisible();

    // Close ThePuffy
    await page.locator('button[title="Close"]').click();
    await expect(page.locator("text=Online • Scoped:").first()).not.toBeVisible();
  });
});
