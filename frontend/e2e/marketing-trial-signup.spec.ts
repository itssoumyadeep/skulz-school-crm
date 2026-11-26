import { test, expect } from "@playwright/test";
import { execFileSync } from "child_process";
import path from "path";

const MARKETING_URL = "http://localhost:5173/start-free-trial";
const CRM_ROOT = path.resolve(__dirname, "../..");
const PYTHON_BIN = path.join(CRM_ROOT, ".venv/bin/python");

function cleanupTrialTestRecords(email: string, schoolCode?: string | null) {
  const script = `
import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
from django.contrib.auth import get_user_model
from django.db import connection
from core.models import AuditLog, PortalRoleMembership, Tenant

email = ${JSON.stringify(email)}
school_code = ${JSON.stringify(schoolCode || "")}
User = get_user_model()
users = list(User.objects.filter(email__iexact=email))
tenant_ids = set()
if school_code:
    tenant_ids.update(Tenant.objects.filter(subdomain=school_code).values_list("tenant_id", flat=True))
for u in users:
    suffix = u.username.rpartition("_")[2]
    if suffix:
        tenant_ids.update(Tenant.objects.filter(subdomain=suffix).values_list("tenant_id", flat=True))

for tid in tenant_ids:
    with connection.cursor() as cur:
        cur.execute("SELECT set_config('app.current_tenant_id', %s, FALSE)", [str(tid)])
    PortalRoleMembership.objects.filter(tenant_id=tid).delete()
    AuditLog.objects.filter(tenant_id=tid).delete()
    Tenant.objects.filter(tenant_id=tid).delete()

for u in users:
    u.delete()
print("cleaned", len(users), "users,", len(tenant_ids), "tenants")
`;
  execFileSync(PYTHON_BIN, ["-c", script], { cwd: CRM_ROOT, stdio: "pipe" });
}

test.describe("US-MKT-01 — Marketing App Start Free Trial Integration", () => {
  const uniqueTag = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const testEmail = `e2e.trial.${uniqueTag}@example.com`;
  const daycareName = `E2E Sunny Cubs ${uniqueTag}`;
  const strongPassword = `Vx!7qT2#pL9z@Mk8`;
  let createdSchoolCode: string | null = null;

  test.afterAll(() => {
    cleanupTrialTestRecords(testEmail, createdSchoolCode);
  });

  test("provisions daycare from localhost:5173/start-free-trial, hands off to localhost:3000 sign-in, and handles duplicate 409", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const telemetryBodies: string[] = [];
    const telemetryStatuses: number[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => pageErrors.push(err.message));
    page.on("response", async (res) => {
      if (
        res.url().includes("/api/v1/telemetry/events") &&
        res.request().method() === "POST"
      ) {
        telemetryStatuses.push(res.status());
        const postData = res.request().postData() || "";
        telemetryBodies.push(postData);
      }
    });

    const marketingRes = await page.goto(MARKETING_URL, {
      waitUntil: "networkidle",
    });
    expect(marketingRes).not.toBeNull();
    const marketingHeaders = marketingRes!.headers();
    expect(marketingHeaders["x-frame-options"]).toBe("DENY");
    expect(marketingHeaders["x-content-type-options"]).toBe("nosniff");
    expect(marketingHeaders["content-security-policy"]).toBeTruthy();

    await expect(page.getByTestId("trial-policy-copy")).toContainText(
      "days free. No credit card required.",
    );

    // Verify exact 5 CRM API fields and role alignment
    await expect(page.locator('input[name="daycare_name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    const roleSelect = page.locator('select[name="role"]');
    await expect(roleSelect).toBeVisible();
    const optionValues = await roleSelect
      .locator("option")
      .evaluateAll((opts) =>
        opts.map((o) => (o as HTMLOptionElement).value).filter(Boolean),
      );
    expect(optionValues).toEqual(["Admin", "Owner", "Teacher"]);
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirm_password"]')).toBeVisible();

    // Verify rendered images & icons on marketing form
    const brokenImgs = await page.locator("img").evaluateAll((imgs) =>
      imgs
        .filter((img) => {
          const el = img as HTMLImageElement;
          const style = window.getComputedStyle(el);
          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            el.naturalWidth === 0
          );
        })
        .map((img) => (img as HTMLImageElement).src),
    );
    expect(brokenImgs).toEqual([]);
    expect(await page.locator("svg").count()).toBeGreaterThan(0);

    // Fill exact 5 fields and submit
    await page.locator('input[name="daycare_name"]').fill(daycareName);
    await page.locator('input[name="email"]').fill(testEmail);
    await roleSelect.selectOption("Admin");
    await page.locator('input[name="password"]').fill(strongPassword);
    await page.locator('input[name="confirm_password"]').fill(strongPassword);

    const [trialResponse] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes("/api/v1/auth/trial-signup") &&
          res.request().method() === "POST",
      ),
      page
        .getByRole("button", { name: "Create Account & Start Trial" })
        .click(),
    ]);

    expect(trialResponse.status()).toBe(201);
    expect(trialResponse.headers()["x-request-id"]).toBeTruthy();
    const trialJson = await trialResponse.json();
    expect(trialJson.data.tenant.code).toMatch(/^SC[A-Z0-9]{7}$/);
    expect(trialJson.data.trial.trial_duration_days).toBeGreaterThanOrEqual(1);
    expect(trialJson.data.trial.is_expired).toBe(false);
    expect(trialJson.data.user.username).toBe(
      `${testEmail}_${trialJson.data.tenant.code}`,
    );
    expect(trialJson.data.access_token).toBeUndefined();
    createdSchoolCode = trialJson.data.tenant.code;

    // Verify Daycare Created confirmation card
    await expect(
      page.getByRole("heading", { name: "Your Daycare Workspace Is Ready!" }),
    ).toBeVisible();
    await expect(page.getByTestId("trial-school-code")).toHaveText(
      createdSchoolCode!,
    );
    await expect(page.getByTestId("trial-login-username")).toHaveText(
      trialJson.data.user.username,
    );
    await expect(page.getByTestId("trial-assigned-role")).toHaveText("Admin");

    // Click handoff link -> CRM Sign-In with ?username=...
    const signInCta = page.getByRole("link", {
      name: "Sign In to Your Daycare Portal",
    });
    await expect(signInCta).toHaveAttribute(
      "href",
      `http://localhost:3000/?username=${encodeURIComponent(trialJson.data.user.username)}`,
    );

    await Promise.all([
      page.waitForURL(/http:\/\/localhost:3000\/\?username=/),
      signInCta.click(),
    ]);

    const usernameInput = page.locator(
      '#sign-in-panel input[name="identity"]',
    );
    await expect(usernameInput).toHaveValue(trialJson.data.user.username);

    await page
      .locator('#sign-in-panel input[name="password"]')
      .fill(strongPassword);
    await Promise.all([
      page.waitForURL(/\/admin$/),
      page.locator('#sign-in-panel button[type="submit"]').click(),
    ]);
    await expect(page).toHaveURL(/http:\/\/localhost:3000\/admin$/);
    await expect(page.getByTestId("admin-trial-banner")).toContainText(
      "remaining in your",
    );

    // Check healthz/readyz probe & security headers
    const healthProbe = await page.request.get(
      "http://127.0.0.1:8000/api/v1/healthz",
    );
    expect(healthProbe.status()).toBe(200);
    expect(healthProbe.headers()["x-content-type-options"]).toBe("nosniff");
    expect(healthProbe.headers()["x-frame-options"]).toBe("DENY");
    expect(healthProbe.headers()["x-request-id"]).toBeTruthy();

    // Negative test: duplicate email returns 409 inline error on marketing page
    await page.goto(MARKETING_URL, { waitUntil: "networkidle" });
    await page.locator('input[name="daycare_name"]').fill(daycareName);
    await page.locator('input[name="email"]').fill(testEmail);
    await page.locator('select[name="role"]').selectOption("Admin");
    await page.locator('input[name="password"]').fill(strongPassword);
    await page.locator('input[name="confirm_password"]').fill(strongPassword);

    const [dupResponse] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes("/api/v1/auth/trial-signup") &&
          res.request().method() === "POST",
      ),
      page
        .getByRole("button", { name: "Create Account & Start Trial" })
        .click(),
    ]);
    expect(dupResponse.status()).toBe(409);
    await expect(page.getByRole("alert")).toContainText(
      "An account with this email already exists.",
    );

    expect(pageErrors).toEqual([]);
    // Verify telemetry ingested (HTTP 202) and zero PII leaked in payloads
    expect(telemetryStatuses.some((s) => s === 202)).toBe(true);
    const joinedTelemetry = telemetryBodies.join("\n");
    expect(joinedTelemetry).not.toContain(testEmail);
    expect(joinedTelemetry).not.toContain(strongPassword);
    // Ignore benign 409 console resource error from intentional duplicate-email check
    const unexpectedConsoleErrors = consoleErrors.filter(
      (msg) => !msg.includes("status of 409"),
    );
    expect(unexpectedConsoleErrors).toEqual([]);
  });
});
