import { test, expect } from "@playwright/test";

test.describe("Teacher Portal Sub-Pages Exhaustive Deep Audit Suite", () => {
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

  test("1. /teacher/attendance: DB audit, exhaustive clicks, modal & drawer stacking context", async ({
    page,
  }) => {
    await page.goto("http://127.0.0.1:3000/teacher/attendance");
    await page.waitForLoadState("networkidle");

    // Header check
    await expect(page.locator("h1")).toContainText("Classroom Attendance & Roll Call");
    await expect(page.getByText("Homeroom 4B · Daily Roll").first()).toBeVisible();

    // Audit Roster Data: check students rendered
    const rows = page.locator("table tbody tr");
    const rowCount = await rows.count();
    console.log("Attendance Table Row Count:", rowCount);
    expect(rowCount).toBeGreaterThan(0);

    // Click quick mark toggles on the first student (P, L, E, A) using aria-label^="[Status] for"
    const firstRow = rows.first();
    const aBtn = firstRow.locator('button[aria-label^="Absent for"]');
    const lBtn = firstRow.locator('button[aria-label^="Late for"]');
    const eBtn = firstRow.locator('button[aria-label^="Excused for"]');
    const pBtn = firstRow.locator('button[aria-label^="Present for"]');

    await aBtn.click();
    await lBtn.click();
    await eBtn.click();
    await pBtn.click();

    // Click "Mark All Present"
    const markAllPresentBtn = page.getByRole("button", { name: "Mark All Present" });
    await expect(markAllPresentBtn).toBeVisible();
    await markAllPresentBtn.click();
    await expect(page.getByText("All students staged as Present.")).toBeVisible();

    // Click "Commit Morning Roll"
    const commitRollBtn = page.getByRole("button", { name: "Commit Morning Roll" });
    await expect(commitRollBtn).toBeVisible();
    await commitRollBtn.click();
    await expect(page.getByText(/Committed|Saved.*attendance/)).toBeVisible();

    // Search filter input
    const searchInput = page.getByLabel("Filter roster students");
    await expect(searchInput).toBeVisible();
    await searchInput.fill("Lucas");
    await page.waitForTimeout(300);
    const filteredCount = await page.locator("table tbody tr").count();
    console.log("Filtered count for 'Lucas':", filteredCount);
    await searchInput.clear();
    await page.waitForTimeout(300);

    // Class Select Dropdown
    const classSelect = page.getByRole("combobox", { name: "Select class section" });
    await expect(classSelect).toBeVisible();
    await classSelect.click();
    const selectOptions = page.locator('[data-slot="select-item"]');
    const optCount = await selectOptions.count();
    console.log("Class select options count:", optCount);
    await selectOptions.first().click();

    // DatePicker button
    const datePickerBtn = page.locator('button[aria-haspopup="dialog"]:has-text("2026")');
    if (await datePickerBtn.isVisible()) {
      await datePickerBtn.click();
      const popover = page.locator('[data-radix-popper-content-wrapper]');
      await expect(popover).toBeVisible();
      await page.keyboard.press("Escape");
    }

    // Open Student Profile Drawer
    const profile360Btn = firstRow.getByRole("button", { name: "360 Profile" });
    await expect(profile360Btn).toBeVisible();
    await profile360Btn.click();

    // Verify Drawer is visible
    const sheetDrawer = page.locator('[role="dialog"][data-state="open"]');
    await expect(sheetDrawer).toBeVisible();
    await expect(sheetDrawer).toContainText("Overview");

    // Close drawer via Escape
    await page.keyboard.press("Escape");
    await expect(sheetDrawer).not.toBeVisible();

    // Open AttendanceMarkModal ("Edit Mark")
    const editMarkBtn = firstRow.getByRole("button", { name: "Edit Mark" });
    await expect(editMarkBtn).toBeVisible();
    await editMarkBtn.click();

    // Verify modal open & stacking context
    const markModal = page.locator('[role="dialog"]:has-text("Edit Attendance Mark")');
    await expect(markModal).toBeVisible();

    // Stacking context check: open SelectField inside modal
    const markSelectTrigger = markModal.locator('[data-slot="select-trigger"]').first();
    await expect(markSelectTrigger).toBeVisible();
    await markSelectTrigger.click();

    const markSelectContent = page.locator('[data-slot="select-content"]');
    await expect(markSelectContent).toBeVisible();

    const selectZ = await markSelectContent.evaluate((el) => window.getComputedStyle(el).zIndex);
    const modalZ = await markModal.evaluate((el) => window.getComputedStyle(el).zIndex);
    console.log(`Edit Mark Modal zIndex: ${modalZ}, Select Content zIndex: ${selectZ}`);
    expect(Number(selectZ)).toBeGreaterThanOrEqual(Number(modalZ));

    // Select "Excused Absence"
    await page.locator('[data-slot="select-item"]:has-text("Excused Absence")').click();

    // Test input note
    const noteArea = markModal.locator('textarea[name="note"]');
    await noteArea.fill("Dentist appointment verified via office note.");

    // Submit mark
    const saveMarkBtn = markModal.getByRole("button", { name: "Save Attendance Mark" });
    await saveMarkBtn.click();
    await expect(markModal).not.toBeVisible();

    // Open LeaveRequestModal ("Request Cover")
    const requestCoverBtn = page.getByRole("button", { name: "Request Cover" }).first();
    await requestCoverBtn.click();
    const leaveModal = page.locator('[role="dialog"]:has-text("Submit Staff Leave")');
    await expect(leaveModal).toBeVisible();

    // Check DatePicker inside LeaveRequestModal
    const leaveDatePickers = leaveModal.locator('button[aria-haspopup="dialog"]');
    await leaveDatePickers.first().click();
    const leavePopover = page.locator('[data-radix-popper-content-wrapper]');
    await expect(leavePopover).toBeVisible();

    const popoverZ = await leavePopover.locator("> *").evaluate((el) => window.getComputedStyle(el).zIndex);
    console.log(`Leave Modal zIndex: ${modalZ}, Popover Content zIndex: ${popoverZ}`);
    expect(Number(popoverZ)).toBeGreaterThanOrEqual(Number(modalZ));

    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await expect(leaveModal).not.toBeVisible();
  });

  test("2. /teacher/lessons: DB audit, curriculum cards, LessonPlanModal, AssignmentModal", async ({
    page,
  }) => {
    await page.goto("http://127.0.0.1:3000/teacher/lessons");
    await page.waitForLoadState("networkidle");

    // Header check
    await expect(page.locator("h1")).toContainText("Curriculum & Lesson Planner");

    // Audit cards: articles with week badge
    const lessonCards = page.locator("article:has-text('Week')");
    const count = await lessonCards.count();
    console.log("Lesson Plan Cards Count:", count);
    expect(count).toBeGreaterThan(0);

    // Toggle lesson status
    const statusBtn = page.getByRole("button", { name: /Mark Completed|In Progress|Completed/ }).first();
    if (await statusBtn.isVisible()) {
      await statusBtn.click();
      await page.waitForTimeout(400);
    }

    // Open LessonPlanModal ("New Lesson Plan")
    const newLessonBtn = page.getByRole("button", { name: "New Lesson Plan" }).first();
    await newLessonBtn.click();

    const lessonModal = page.locator('[role="dialog"]:has-text("Create Weekly Lesson Plan")');
    await expect(lessonModal).toBeVisible();

    // Test form controls inside LessonPlanModal (all inputs)
    const lessonTopicInput = lessonModal.locator('input[name="topic"]');
    await lessonTopicInput.fill("Photosynthesis & Chlorophyll Inquiry");

    const hookInput = lessonModal.locator('input[name="hook"]');
    await hookInput.fill("Leaf chromatography observation with dark vs green leaves.");

    const directInput = lessonModal.locator('input[name="directInstruction"]');
    await directInput.fill("Explain chloroplasts and solar photon absorption.");

    const guidedInput = lessonModal.locator('input[name="guidedPractice"]');
    await guidedInput.fill("Small group microscope slide preparation.");

    const synthesisInput = lessonModal.locator('input[name="independentSynthesis"]');
    await synthesisInput.fill("Sketch diagram of photosynthesis equation.");

    const exitInput = lessonModal.locator('input[name="exitTicket"]');
    await exitInput.fill("Name the two chemical inputs and outputs.");

    // Check SelectField inside lessonModal
    const currSelectTrigger = lessonModal.locator('[data-slot="select-trigger"]').first();
    await currSelectTrigger.click();
    const currSelectContent = page.locator('[data-slot="select-content"]');
    await expect(currSelectContent).toBeVisible();

    const selectZ = await currSelectContent.evaluate((el) => window.getComputedStyle(el).zIndex);
    const modalZ = await lessonModal.evaluate((el) => window.getComputedStyle(el).zIndex);
    console.log(`Lesson Modal zIndex: ${modalZ}, Select Content zIndex: ${selectZ}`);
    expect(Number(selectZ)).toBeGreaterThanOrEqual(Number(modalZ));

    await page.locator('[data-slot="select-item"]').first().click();

    // Close lesson modal
    const cancelLessonBtn = lessonModal.getByRole("button", { name: "Cancel" });
    await cancelLessonBtn.click();
    await expect(lessonModal).not.toBeVisible();

    // Open AssignmentModal ("Publish Homework")
    const publishHomeworkBtn = page.getByRole("button", { name: "Publish Homework" }).first();
    await publishHomeworkBtn.click();

    const assignModal = page.locator('[role="dialog"]:has-text("Publish Homework & Coursework")');
    await expect(assignModal).toBeVisible();

    // Check DateField inside AssignmentModal
    const assignDateBtn = assignModal.locator('button[aria-haspopup="dialog"]');
    await assignDateBtn.click();
    const assignPopover = page.locator('[data-radix-popper-content-wrapper]');
    await expect(assignPopover).toBeVisible();

    const datePopZ = await assignPopover.locator("> *").evaluate((el) => window.getComputedStyle(el).zIndex);
    const assignModZ = await assignModal.evaluate((el) => window.getComputedStyle(el).zIndex);
    console.log(`Assignment Modal zIndex: ${assignModZ}, DatePicker Popover zIndex: ${datePopZ}`);
    expect(Number(datePopZ)).toBeGreaterThanOrEqual(Number(assignModZ));

    await page.keyboard.press("Escape");

    // Close AssignmentModal
    const cancelAssignBtn = assignModal.getByRole("button", { name: "Cancel" });
    await cancelAssignBtn.click();
    await expect(assignModal).not.toBeVisible();
  });

  test("3. /teacher/assessments: DB audit, marks moderation, ReportCard preview, Applicant rubric", async ({
    page,
  }) => {
    await page.goto("http://127.0.0.1:3000/teacher/assessments");
    await page.waitForLoadState("networkidle");

    // Header check
    await expect(page.locator("h1")).toContainText("Assessments & Grade Moderation");

    // Exam select switch
    const examSelect = page.getByRole("combobox", { name: "Select examination" });
    if (await examSelect.isVisible()) {
      await examSelect.click();
      const examOptions = page.locator('[data-slot="select-item"]');
      console.log("Exam options count:", await examOptions.count());
      if ((await examOptions.count()) > 1) {
        await examOptions.nth(1).click();
      } else {
        await page.keyboard.press("Escape");
      }
    }

    // Inspect mark rows
    const markInputs = page.locator('input[type="number"]');
    console.log("Mark Inputs Count:", await markInputs.count());
    if ((await markInputs.count()) > 0) {
      await markInputs.first().fill("95");
      const saveRowBtn = page.getByRole("button", { name: "Save Mark" }).first();
      if (await saveRowBtn.isVisible()) {
        await saveRowBtn.click();
        await page.waitForTimeout(400);
      }
    }

    // Click "Save Draft Marks"
    const saveAllMarksBtn = page.getByRole("button", { name: "Save Draft Marks" });
    if (await saveAllMarksBtn.isVisible()) {
      await saveAllMarksBtn.click();
      await page.waitForTimeout(400);
    }

    // Preview Report Card Drawer
    const previewReportBtn = page.getByRole("button", { name: "Preview Report Card" }).first();
    await expect(previewReportBtn).toBeVisible();
    await previewReportBtn.click();

    // Verify Report Card Sheet Drawer
    const reportDrawer = page.locator('[role="dialog"][data-state="open"]');
    await expect(reportDrawer).toBeVisible();
    await expect(reportDrawer).toContainText("Report Card");

    // Close Report Card Drawer via Escape
    await page.keyboard.press("Escape");
    await expect(reportDrawer).not.toBeVisible();

    // Admissions Applicant Assessment Rubric Modal
    const scoreApplicantBtn = page.getByRole("button", { name: "Score Rubric" }).first();
    if (await scoreApplicantBtn.isVisible()) {
      await scoreApplicantBtn.click();
      const rubricModal = page.locator('[role="dialog"]:has-text("Admissions Assessment Rubric")');
      await expect(rubricModal).toBeVisible();

      // Check inputs inside Rubric Modal
      const litInput = rubricModal.locator('input[name="literacyNumeracy"]');
      if (await litInput.isVisible()) {
        await litInput.fill("32");
      }

      // Close Rubric Modal
      const closeRubricBtn = rubricModal.getByRole("button", { name: "Cancel" });
      await closeRubricBtn.click();
      await expect(rubricModal).not.toBeVisible();
    }
  });

  test("4. /teacher/messages: DB audit, channel tabs, BroadcastComposerModal, excursion reminders", async ({
    page,
  }) => {
    await page.goto("http://127.0.0.1:3000/teacher/messages");
    await page.waitForLoadState("networkidle");

    // Header check
    await expect(page.locator("h1")).toContainText("Parent Notes & Excursion Waivers");

    // Channel filter select
    const channelSelect = page.getByRole("combobox", { name: "Filter message channel" });
    if (await channelSelect.isVisible()) {
      await channelSelect.click();
      const channelOpts = page.locator('[data-slot="select-item"]');
      console.log("Channel options count:", await channelOpts.count());
      await page.locator('[data-slot="select-item"]:has-text("In-App")').click();
      await page.waitForTimeout(300);
      await channelSelect.click();
      await page.locator('[data-slot="select-item"]:has-text("All Channels")').click();
    }

    // Message search
    const msgSearch = page.getByLabel("Search messages");
    if (await msgSearch.isVisible()) {
      await msgSearch.fill("ROM");
      await page.waitForTimeout(300);
      await msgSearch.clear();
    }

    // Click "Send Reminder" on excursion waiver card
    const sendReminderBtn = page.getByRole("button", { name: "Send Reminder" }).first();
    if (await sendReminderBtn.isVisible()) {
      await sendReminderBtn.click();

      // Broadcast Composer Modal opens prefilled
      const composerModal = page.locator('[role="dialog"]:has-text("Compose Announcement or Guardian Message")');
      await expect(composerModal).toBeVisible();

      // Check fields
      const subjInput = composerModal.locator('input[name="subject"]');
      const val = await subjInput.inputValue();
      console.log("Prefilled broadcast subject:", val);
      expect(val).toContain("Reminder");

      // Check Channel Select inside Broadcast Modal
      const chanTrigger = composerModal.locator('[data-slot="select-trigger"]').nth(1);
      if (await chanTrigger.isVisible()) {
        await chanTrigger.click();
        const chanContent = page.locator('[data-slot="select-content"]');
        await expect(chanContent).toBeVisible();
        await page.keyboard.press("Escape");
      }

      // Close modal
      const cancelComposerBtn = composerModal.getByRole("button", { name: "Cancel" });
      await cancelComposerBtn.click();
      await expect(composerModal).not.toBeVisible();
    }

    // Click "New Parent Message" in header
    const newMsgBtn = page.getByRole("button", { name: "New Parent Message" });
    await newMsgBtn.click();
    const composerModal2 = page.locator('[role="dialog"]:has-text("Compose Announcement or Guardian Message")');
    await expect(composerModal2).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(composerModal2).not.toBeVisible();
  });

  test("5. /teacher/safeguarding: DB audit, Sabrina's law cards, Medication Modal, Incident Modal", async ({
    page,
  }) => {
    await page.goto("http://127.0.0.1:3000/teacher/safeguarding");
    await page.waitForLoadState("networkidle");

    // Header check
    await expect(page.locator("h1")).toContainText("Safeguarding, Sabrina's Law & Health");

    // Medical alert cards: article with Consent Verified
    const alertCards = page.locator("article:has-text('Consent')");
    const alertCount = await alertCards.count();
    console.log("Sabrina's Law Alert Cards Count:", alertCount);
    expect(alertCount).toBeGreaterThan(0);

    // Click "360 Profile" on first alert card
    const profileBtn = page.getByRole("button", { name: "360 Profile" }).first();
    if (await profileBtn.isVisible()) {
      await profileBtn.click();
      const profileDrawer = page.locator('[role="dialog"][data-state="open"]');
      await expect(profileDrawer).toBeVisible();

      // Check tabs inside profile drawer: Demographics, Safeguarding, Academics
      const healthTab = profileDrawer.getByRole("tab", { name: "Safeguarding & Health" });
      if (await healthTab.isVisible()) {
        await healthTab.click();
      }

      // Close profile drawer via Escape
      await page.keyboard.press("Escape");
      await expect(profileDrawer).not.toBeVisible();
    }

    // Open MedicationLogModal ("Log Medication")
    const logMedBtn = page.getByRole("button", { name: "Log Medication" }).first();
    await expect(logMedBtn).toBeVisible();
    await logMedBtn.click();

    const medModal = page.locator('[role="dialog"]:has-text("Log Medication Administration")');
    await expect(medModal).toBeVisible();

    // Check student select inside Medication Modal
    const medStudentSelect = medModal.locator('[data-slot="select-trigger"]').first();
    await medStudentSelect.click();
    const medStudentContent = page.locator('[data-slot="select-content"]');
    await expect(medStudentContent).toBeVisible();

    const medSelZ = await medStudentContent.evaluate((el) => window.getComputedStyle(el).zIndex);
    const medModZ = await medModal.evaluate((el) => window.getComputedStyle(el).zIndex);
    console.log(`Medication Modal zIndex: ${medModZ}, Select Content zIndex: ${medSelZ}`);
    expect(Number(medSelZ)).toBeGreaterThanOrEqual(Number(medModZ));

    await page.locator('[data-slot="select-item"]').first().click();

    // Fill dose & notes
    await medModal.locator('input[name="dose"]').fill("1 puff via spacer");
    await medModal.locator('textarea[name="notes"]').fill("Observed normal resting breathing after 5 mins.");

    // Close Medication Modal
    const cancelMedBtn = medModal.getByRole("button", { name: "Cancel" });
    await cancelMedBtn.click();
    await expect(medModal).not.toBeVisible();

    // Open IncidentReportModal ("Report Incident")
    const reportIncBtn = page.getByRole("button", { name: "Report Incident" }).first();
    await expect(reportIncBtn).toBeVisible();
    await reportIncBtn.click();

    const incModal = page.locator('[role="dialog"]:has-text("Report Classroom Safeguarding or Injury Incident")');
    await expect(incModal).toBeVisible();

    // Check DateField inside IncidentReportModal
    const incDateBtn = incModal.locator('button[aria-haspopup="dialog"]');
    await incDateBtn.click();
    const incPopover = page.locator('[data-radix-popper-content-wrapper]');
    await expect(incPopover).toBeVisible();

    const incPopZ = await incPopover.locator("> *").evaluate((el) => window.getComputedStyle(el).zIndex);
    const incModZ = await incModal.evaluate((el) => window.getComputedStyle(el).zIndex);
    console.log(`Incident Modal zIndex: ${incModZ}, Popover Content zIndex: ${incPopZ}`);
    expect(Number(incPopZ)).toBeGreaterThanOrEqual(Number(incModZ));
    await page.keyboard.press("Escape");

    // Check Body Zone buttons
    const headZoneBtn = incModal.getByRole("button", { name: "Head" });
    if (await headZoneBtn.isVisible()) {
      await headZoneBtn.click();
    }

    // Close Incident Modal
    const cancelIncBtn = incModal.getByRole("button", { name: "Cancel" });
    await cancelIncBtn.click();
    await expect(incModal).not.toBeVisible();

    // Quick Observation section
    const obsText = page.locator('textarea[name="generalNotes"]');
    if (await obsText.isVisible()) {
      await obsText.fill("EpiPen pouch verified and student in high spirits.");
      const submitObsBtn = page.getByRole("button", { name: "Save Wellbeing Observation" });
      if (await submitObsBtn.isVisible()) {
        await submitObsBtn.click();
        await page.waitForTimeout(400);
      }
    }
  });
});
