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
const ROOM_1A_CLASS_ID = "00000000-0000-0000-0000-0000000001a0";
const MAYA_ID = "00000000-0000-0000-0000-000000007101";
const NOAH_ID = "00000000-0000-0000-0000-000000007104";

const CAREGIVER_SESSION = {
  sub: "00000000-0000-0000-0000-00000000c101",
  user_id: "00000000-0000-0000-0000-00000000c101",
  email: "clara.gomez@purplecubby.example",
  user_name: "Nurse Clara Gomez",
  role: "caregiver",
  tenant_id: TENANT_ID,
  assigned_class_ids: [ROOM_1A_CLASS_ID],
  assigned_grades: ["Toddler & Pre-K"],
  exp: Math.floor(Date.now() / 1000) + 86400,
};

const PRINCIPAL_SESSION = {
  sub: "00000000-0000-0000-0000-00000000a101",
  user_id: "00000000-0000-0000-0000-00000000a101",
  email: "principal1@purplecubby.example",
  user_name: "Principal",
  role: "principal",
  tenant_id: TENANT_ID,
  exp: Math.floor(Date.now() / 1000) + 86400,
};

const MAYA_PARENT_SESSION = {
  sub: "00000000-0000-0000-0000-00000000p101",
  user_id: "00000000-0000-0000-0000-00000000p101",
  email: "elena.lin@example.com",
  user_name: "Elena Lin",
  role: "parent",
  tenant_id: TENANT_ID,
  linked_student_ids: [MAYA_ID],
  exp: Math.floor(Date.now() / 1000) + 86400,
};

test.describe("Caregiver Tier 2 (US-CG-09 & US-CG-10) E2E", () => {
  test("US-CG-09: Drop-off symptom screener blocks positive symptoms (422), admits clean (200), allows Supervisor override", async ({
    page,
    context,
    request,
  }) => {
    const cgToken = signTestJwt(CAREGIVER_SESSION);
    const principalToken = signTestJwt(PRINCIPAL_SESSION);

    await context.addCookies([
      { name: "pc_session", value: cgToken, domain: "127.0.0.1", path: "/" },
    ]);

    await page.goto("http://127.0.0.1:3000/caregiver");
    await page.waitForLoadState("networkidle");

    // Find an unchecked child with "Log Late Arrival" (e.g. Noah Parker or Charlotte Taylor)
    const lateBtn = page.getByRole("button", { name: "Log Late Arrival" }).first();
    await expect(lateBtn).toBeVisible();
    await lateBtn.click();

    await expect(page.getByText("Drop-Off Health & Symptom Screener")).toBeVisible();

    // 1. Positive symptom block: tick Fever + 38.6C
    await page.getByLabel("Fever").check();
    await page.getByLabel(/Temperature/i).fill("38.6");
    const blockedPost = page.waitForResponse(
      (res) => res.url().includes("/api/v1/attendance/check-in") && res.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Confirm Screen & Check-In" }).click();
    expect((await blockedPost).status()).toBe(422);
    await expect(page.getByText(/Do Not Admit \/ Notify Director/i)).toBeVisible();

    // 2. Clean check-in: untick Fever + 36.7C
    await page.getByLabel("Fever").uncheck();
    await page.getByLabel(/Temperature/i).fill("36.7");
    const cleanPost = page.waitForResponse(
      (res) => res.url().includes("/api/v1/attendance/check-in") && res.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Confirm Screen & Check-In" }).click();
    expect((await cleanPost).status()).toBe(200);

    // 3. Supervisor override via Principal token
    const overrideRes = await request.post("http://127.0.0.1:8000/api/v1/attendance/check-in", {
      headers: { Authorization: `Bearer ${principalToken}` },
      data: {
        student_id: NOAH_ID,
        symptoms: ["cough"],
        temperature_c: 37.1,
        supervisor_override: true,
        override_reason: "Seasonal allergy cleared by Principal",
      },
    });
    expect(overrideRes.status()).toBe(200);
  });

  test("US-CG-10: Learning Portfolio, Developmental Summary & Parent shared-only visibility", async ({
    browser,
    request,
  }) => {
    const cgToken = signTestJwt(CAREGIVER_SESSION);
    const mayaParentToken = signTestJwt(MAYA_PARENT_SESSION);

    const cgContext = await browser.newContext();
    await cgContext.addCookies([
      { name: "pc_session", value: cgToken, domain: "127.0.0.1", path: "/" },
    ]);
    const cgPage = await cgContext.newPage();
    await cgPage.goto("http://127.0.0.1:3000/caregiver");
    await cgPage.waitForLoadState("networkidle");

    const mayaCard = cgPage
      .locator("div.rounded-3xl")
      .filter({ hasText: "Maya Lin" })
      .filter({ hasText: "Add Meal / Diaper Note" })
      .first();
    await mayaCard.getByRole("button", { name: "Add Meal / Diaper Note" }).click();

    // Switch to Learning Portfolio tab
    await cgPage.getByRole("button", { name: "Learning Portfolio" }).click();
    await expect(cgPage.getByText("Developmental Summary")).toBeVisible();

    // 1. Create shared observation
    await cgPage.getByLabel("Learning Framework").selectOption("ELECT");
    await cgPage.getByRole("button", { name: "Fine Motor" }).click();
    await cgPage.getByRole("button", { name: "Language" }).click();
    await cgPage
      .getByPlaceholder(/Describe observed play/i)
      .fill("Sorted colored blocks by size while naming colors");

    const sharedPost = cgPage.waitForResponse(
      (res) => res.url().includes("/api/v1/learning-observations") && res.request().method() === "POST",
    );
    await cgPage.getByRole("button", { name: "Save Observation" }).click();
    expect((await sharedPost).status()).toBe(201);

    await expect(cgPage.getByText(/Fine Motor:\s*[1-9]/)).toBeVisible();
    await expect(cgPage.getByText(/Language:\s*[1-9]/)).toBeVisible();

    // 2. Create unshared Draft observation
    await cgPage.getByRole("button", { name: "Cognitive" }).click();
    await cgPage
      .getByPlaceholder(/Describe observed play/i)
      .fill("Internal educator draft note hidden from parents");
    await cgPage.getByLabel("Share with family").uncheck();

    const draftPost = cgPage.waitForResponse(
      (res) => res.url().includes("/api/v1/learning-observations") && res.request().method() === "POST",
    );
    await cgPage.getByRole("button", { name: "Save Observation" }).click();
    expect((await draftPost).status()).toBe(201);

    // 3. Parent portal sees ONLY shared observation (Draft never leaks!)
    const pContext = await browser.newContext();
    await pContext.addCookies([
      { name: "pc_session", value: mayaParentToken, domain: "127.0.0.1", path: "/" },
    ]);
    const pPage = await pContext.newPage();
    await pPage.goto("http://127.0.0.1:3000/parent");
    await expect(
      pPage.getByText("Sorted colored blocks by size while naming colors").first(),
    ).toBeVisible();
    await expect(
      pPage.getByText("Internal educator draft note hidden from parents"),
    ).toHaveCount(0);

    // Verify Parent API also excludes Draft
    const pObsRes = await request.get(
      `http://127.0.0.1:8000/api/v1/learning-observations?student_id=${MAYA_ID}`,
      { headers: { Authorization: `Bearer ${mayaParentToken}` } },
    );
    expect(pObsRes.status()).toBe(200);
    const pObsJson = await pObsRes.json();
    const notes = (pObsJson.data.observations as Array<{ note: string }>).map((o) => o.note);
    expect(notes).toContain("Sorted colored blocks by size while naming colors");
    expect(notes).not.toContain("Internal educator draft note hidden from parents");

    await cgContext.close();
    await pContext.close();
  });
});
