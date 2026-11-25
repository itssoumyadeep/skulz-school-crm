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

const OTHER_PARENT_SESSION = {
  sub: "00000000-0000-0000-0000-00000000p999",
  user_id: "00000000-0000-0000-0000-00000000p999",
  email: "other.parent@example.com",
  user_name: "Other Parent",
  role: "parent",
  tenant_id: TENANT_ID,
  linked_student_ids: [NOAH_ID],
  exp: Math.floor(Date.now() / 1000) + 86400,
};

// Valid 1x1 PNG with an eXIf/tEXt metadata chunk so browser renders naturalWidth === 1 and we verify metadata stripping
function buildPngWithMetadata(): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.from([
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde,
  ]);
  // tEXt chunk with GPS_SECRET
  const textPayload = Buffer.from("GPS_LAT_43.6532_SECRET");
  const textLen = Buffer.alloc(4);
  textLen.writeUInt32BE(textPayload.length, 0);
  const textChunk = Buffer.concat([
    textLen,
    Buffer.from("tEXt"),
    textPayload,
    Buffer.from([0x00, 0x00, 0x00, 0x00]),
  ]);
  const idat = Buffer.from([
    0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54,
    0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00,
    0x03, 0x01, 0x01, 0x00, 0x18, 0xdd, 0x8d, 0xb0,
  ]);
  const iend = Buffer.from([
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
    0xae, 0x42, 0x60, 0x82,
  ]);
  return Buffer.concat([sig, ihdr, textChunk, idat, iend]);
}

test.describe("Caregiver MVP-2 (US-CG-06..US-CG-08) E2E", () => {
  test("US-CG-06: Micro-logs, batch actions, dynamic summary strip, topical consent gate & reload persistence", async ({
    page,
    context,
  }) => {
    const cgToken = signTestJwt(CAREGIVER_SESSION);
    await context.addCookies([
      { name: "pc_session", value: cgToken, domain: "127.0.0.1", path: "/" },
    ]);

    const careInitPromise = page.waitForResponse(
      (res) => res.url().includes("/api/v1/care-events") && res.request().method() === "GET",
    );
    await page.goto("http://127.0.0.1:3000/caregiver");
    await careInitPromise;

    // 1. Tap +120 mL hydration on Maya Lin's card
    const mayaCard = page
      .locator("div.rounded-3xl")
      .filter({ hasText: "Maya Lin" })
      .filter({ hasText: "Add Meal / Diaper Note" })
      .first();
    const waterPost = page.waitForResponse(
      (res) => res.url().includes("/api/v1/care-events") && res.request().method() === "POST",
    );
    await mayaCard.getByRole("button", { name: "+120 mL" }).click();
    const waterRes = await waterPost;
    expect(waterRes.status()).toBe(201);

    // 2. Open Maya Lin's Add Meal / Diaper Note drawer
    await mayaCard.getByRole("button", { name: "Add Meal / Diaper Note" }).click();
    await expect(page.getByText("Today's Routine & Quick Care Micro-Logs")).toBeVisible();

    // Topical consent is true for Maya -> Barrier Cream checkbox enabled
    const barrierCheckbox = page.getByLabel("Barrier Cream / Sunscreen");
    await expect(barrierCheckbox).toBeEnabled();
    await barrierCheckbox.check();

    const diaperPost = page.waitForResponse(
      (res) => res.url().includes("/api/v1/care-events") && res.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Log Diaper" }).click();
    expect((await diaperPost).status()).toBe(201);

    const mealPost = page.waitForResponse(
      (res) => res.url().includes("/api/v1/care-events") && res.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Log Meal" }).click();
    expect((await mealPost).status()).toBe(201);

    await page.getByRole("button", { name: "Done" }).click();

    // 3. Switch to Compact List & trigger Quick Batch Meal Log + All Asleep
    await page.getByRole("tab", { name: /compact list/i }).click();
    const batchMealPost = page.waitForResponse(
      (res) => res.url().includes("/api/v1/care-events") && res.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Quick Batch Meal Log" }).click();
    expect((await batchMealPost).status()).toBe(201);

    const batchNapPost = page.waitForResponse(
      (res) => res.url().includes("/api/v1/care-events") && res.request().method() === "POST",
    );
    await page.getByRole("button", { name: "All Asleep" }).click();
    expect((await batchNapPost).status()).toBe(201);

    // Verify dynamic summary strip updates (DEF-025)
    await expect(page.getByText(/\d+% Logged/).first()).toBeVisible();
    await expect(page.getByText(/\d+ Asleep/).first()).toBeVisible();

    // 4. Reload persistence check
    const reloadCareGet = page.waitForResponse(
      (res) => res.url().includes("/api/v1/care-events") && res.request().method() === "GET",
    );
    await page.reload();
    expect((await reloadCareGet).status()).toBe(200);
  });

  test("US-CG-07: Live Parent daily-report feed, 5-min undo & cross-parent 403 isolation", async ({
    browser,
    request,
  }) => {
    test.setTimeout(60000);
    const cgToken = signTestJwt(CAREGIVER_SESSION);
    const mayaParentToken = signTestJwt(MAYA_PARENT_SESSION);
    const otherParentToken = signTestJwt(OTHER_PARENT_SESSION);

    // Session A: Caregiver logs nap event + sends one-tap note for Maya Lin
    const cgContext = await browser.newContext();
    await cgContext.addCookies([
      { name: "pc_session", value: cgToken, domain: "127.0.0.1", path: "/" },
    ]);
    const cgPage = await cgContext.newPage();
    await cgPage.goto("http://127.0.0.1:3000/caregiver");
    await cgPage.waitForLoadState("networkidle");

    // Pick Maya Lin & tap one-tap template chip
    await cgPage.getByRole("button", { name: /Ate all hearty lunch/i }).click();
    const msgPost = cgPage.waitForResponse(
      (res) => res.url().includes("/api/v1/messages") && res.request().method() === "POST",
    );
    await cgPage.getByRole("button", { name: "Send Note" }).click();
    expect((await msgPost).status()).toBe(201);

    // Log a nap_start event via Maya's drawer
    const mayaCardA = cgPage
      .locator("div.rounded-3xl")
      .filter({ hasText: "Maya Lin" })
      .filter({ hasText: "Add Meal / Diaper Note" })
      .first();
    await mayaCardA.getByRole("button", { name: "Add Meal / Diaper Note" }).click();
    const napPost = cgPage.waitForResponse(
      (res) => res.url().includes("/api/v1/care-events") && res.request().method() === "POST",
    );
    await cgPage.getByRole("button", { name: /Start Nap|End Nap/ }).click();
    expect((await napPost).status()).toBe(201);

    // Session B: Parent opens /parent and sees Live Daily-Report Feed for Maya Lin
    const pContext = await browser.newContext();
    await pContext.addCookies([
      { name: "pc_session", value: mayaParentToken, domain: "127.0.0.1", path: "/" },
    ]);
    const pPage = await pContext.newPage();
    const feedGet = pPage.waitForResponse(
      (res) => res.url().includes(`/api/v1/parent/children/${MAYA_ID}/feed`),
    );
    await pPage.goto("http://127.0.0.1:3000/parent");
    expect((await feedGet).status()).toBe(200);
    await expect(pPage.getByText("Live Daily-Report Feed")).toBeVisible();
    await expect(pPage.getByText(/Ate all hearty lunch/i).first()).toBeVisible();

    // Undo in Session A -> disappears from Session B feed
    const undoDel = cgPage.waitForResponse(
      (res) => res.url().includes("/api/v1/care-events/") && res.request().method() === "DELETE",
    );
    await cgPage.getByRole("button", { name: "Hide / Undo" }).first().click();
    expect((await undoDel).status()).toBe(200);

    await pPage.reload();
    await expect(pPage.getByText("Live Daily-Report Feed")).toBeVisible();

    // Negative: unlinked parent gets 403
    const forbiddenRes = await request.get(
      `http://127.0.0.1:8000/api/v1/parent/children/${MAYA_ID}/feed`,
      { headers: { Authorization: `Bearer ${otherParentToken}` } },
    );
    expect(forbiddenRes.status()).toBe(403);

    await cgContext.close();
    await pContext.close();
  });

  test("US-CG-08: Photo moment EXIF strip, signed URL render, photo_consent gate & delete", async ({
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

    // 1. Positive: Maya Lin has photoConsent=true
    const mayaCard8 = cgPage
      .locator("div.rounded-3xl")
      .filter({ hasText: "Maya Lin" })
      .filter({ hasText: "Add Meal / Diaper Note" })
      .first();
    await mayaCard8.getByRole("button", { name: "Add Meal / Diaper Note" }).click();
    await expect(cgPage.getByText("Photo Consent Verified")).toBeVisible();

    const pngBytes = buildPngWithMetadata();
    await cgPage.getByLabel("Select photo or video moment").setInputFiles({
      name: "maya-moment.png",
      mimeType: "image/png",
      buffer: pngBytes,
    });
    await cgPage.getByPlaceholder(/Caption/i).fill("Watercolor sunflowers");

    const mediaPost = cgPage.waitForResponse(
      (res) => res.url().includes("/api/v1/care-media") && res.request().method() === "POST",
    );
    await cgPage.getByRole("button", { name: "Upload Moment" }).click();
    const mediaRes = await mediaPost;
    expect(mediaRes.status()).toBe(201);
    const mediaJson = await mediaRes.json();
    const signedUrl: string = mediaJson.data.signed_url;

    // Verify metadata was stripped from served image
    const fileRes = await request.get(`http://127.0.0.1:8000${signedUrl}`);
    expect(fileRes.status()).toBe(200);
    const downloadedBuf = await fileRes.body();
    expect(downloadedBuf.toString("latin1")).not.toContain("GPS_LAT_43.6532_SECRET");

    // Verify Parent feed renders signed image with naturalWidth > 0
    const pContext = await browser.newContext();
    await pContext.addCookies([
      { name: "pc_session", value: mayaParentToken, domain: "127.0.0.1", path: "/" },
    ]);
    const pPage = await pContext.newPage();
    await pPage.goto("http://127.0.0.1:3000/parent");
    await expect(pPage.getByText("Watercolor sunflowers").first()).toBeVisible();
    const momentImg = pPage.locator('img[alt="Watercolor sunflowers"]').first();
    await expect(momentImg).toBeVisible();
    await expect
      .poll(async () =>
        momentImg.evaluate((img: HTMLImageElement) =>
          img.complete ? img.naturalWidth : 0,
        ),
      )
      .toBeGreaterThan(0);

    // 2. Negative: Noah Parker (photo_consent=False) blocked via API -> 422
    const blockedRes = await request.post("http://127.0.0.1:8000/api/v1/care-media", {
      headers: { Authorization: `Bearer ${cgToken}` },
      multipart: {
        file: {
          name: "noah.png",
          mimeType: "image/png",
          buffer: pngBytes,
        },
        student_ids: NOAH_ID,
        caption: "Blocked test",
      },
    });
    expect(blockedRes.status()).toBe(422);

    // 3. Delete uploaded moment -> 404 on signed_url & removed from Parent feed
    const delMedia = cgPage.waitForResponse(
      (res) => res.url().includes("/api/v1/care-media/") && res.request().method() === "DELETE",
    );
    await cgPage.getByRole("button", { name: "Delete" }).first().click();
    expect((await delMedia).status()).toBe(200);

    const fileAfterDel = await request.get(`http://127.0.0.1:8000${signedUrl}`);
    expect(fileAfterDel.status()).toBe(404);

    await pPage.reload();
    await expect(pPage.getByText("Watercolor sunflowers")).toHaveCount(0);

    await cgContext.close();
    await pContext.close();
  });
});
