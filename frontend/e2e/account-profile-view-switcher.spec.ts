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

const TENANT_ID = "b256609a-3157-4ed8-9822-ea797d2c6a4b";

test.describe("Account Profile Cards / Compact View Switcher", () => {
  test("Caregiver Profile Menu toggles between Compact View and Cards View and persists", async ({
    browser,
  }) => {
    const token = signTestJwt({
      sub: "00000000-0000-0000-0000-00000000c101",
      user_id: "00000000-0000-0000-0000-00000000c101",
      email: "clara.gomez@purplecubby.example",
      user_name: "Nurse Clara Gomez",
      role: "caregiver",
      tenant_id: TENANT_ID,
      assigned_class_ids: ["00000000-0000-0000-0000-0000000001a0"],
      assigned_grades: ["Toddler & Pre-K"],
      exp: Math.floor(Date.now() / 1000) + 86400,
    });

    const context = await browser.newContext();
    await context.addCookies([
      { name: "pc_session", value: token, domain: "127.0.0.1", path: "/" },
    ]);
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:3000/caregiver");
    await page.waitForLoadState("networkidle");

    // 1. Open top-right Caregiver Profile Menu
    await page.getByRole("button", { name: "Caregiver Profile Menu" }).click();
    const profileGroup = page.getByRole("group", { name: "Account Profile View Mode" });
    await expect(profileGroup).toBeVisible();
    await expect(profileGroup.getByRole("button", { name: "Cards View" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // 2. Switch to Compact View inside Account Profile
    await profileGroup.getByRole("button", { name: "Compact View" }).click();
    await expect(page.getByText("Toddler Room Care Logs (Compact Horizontal Matrix)")).toBeVisible();

    // 3. Reload page and verify Compact View persisted + active inside Account Profile
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Toddler Room Care Logs (Compact Horizontal Matrix)")).toBeVisible();

    await page.getByRole("button", { name: "Caregiver Profile Menu" }).click();
    await expect(
      page.getByRole("group", { name: "Account Profile View Mode" }).getByRole("button", { name: "Compact View" }),
    ).toHaveAttribute("aria-pressed", "true");

    // 4. Switch back to Cards View
    await page
      .getByRole("group", { name: "Account Profile View Mode" })
      .getByRole("button", { name: "Cards View" })
      .click();
    await expect(page.getByText("Learner Cubbies & Routine Boards")).toBeVisible();

    await context.close();
  });

  test("Teacher Profile Menu toggles between Compact View and Cards View and persists", async ({
    browser,
  }) => {
    const token = signTestJwt({
      sub: "00000000-0000-0000-0000-00000000ef01",
      user_id: "00000000-0000-0000-0000-00000000ef01",
      email: "sarah.jenkins@purplecubby.example",
      user_name: "Ms. Sarah Jenkins",
      role: "teacher",
      tenant_id: TENANT_ID,
      assigned_class_ids: ["00000000-0000-0000-0000-000000000402"],
      assigned_grades: ["Grade 4", "Grade 5"],
      exp: Math.floor(Date.now() / 1000) + 86400,
    });

    const context = await browser.newContext();
    await context.addCookies([
      { name: "pc_session", value: token, domain: "127.0.0.1", path: "/" },
    ]);
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:3000/teacher");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Educator Profile Menu" }).click();
    const profileGroup = page.getByRole("group", { name: "Account Profile View Mode" });
    await expect(profileGroup).toBeVisible();
    await profileGroup.getByRole("button", { name: "Compact View" }).click();
    await expect(page.getByText(/Homeroom Roster & Medical Safeguards \(Compact\)/i)).toBeVisible();

    await page.getByRole("button", { name: "Educator Profile Menu" }).click();
    await expect(
      page.getByRole("group", { name: "Account Profile View Mode" }).getByRole("button", { name: "Compact View" }),
    ).toHaveAttribute("aria-pressed", "true");
    await page
      .getByRole("group", { name: "Account Profile View Mode" })
      .getByRole("button", { name: "Cards View" })
      .click();
    await expect(page.getByText("Homeroom 4B Roll")).toBeVisible();

    await context.close();
  });
});
