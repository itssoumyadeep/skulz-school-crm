export type UserRole =
  | "admin"
  | "principal"
  | "teacher"
  | "caregiver"
  | "parent"
  | "vendor"
  | "owner"
  | "board"
  | "trustee";

export type SessionClaims = {
  sub?: string;
  user_id?: string;
  user_name?: string;
  email?: string;
  role: UserRole;
  tenant_id: string;
  exp: number;
  linked_student_ids?: string[];
  vendor_id?: string;
};

function padBase64(input: string): string {
  const remainder = input.length % 4;
  if (remainder === 0) {
    return input;
  }
  return `${input}${"=".repeat(4 - remainder)}`;
}

function base64UrlEncode(input: string): string {
  if (typeof window === "undefined") {
    return "";
  }
  return window
    .btoa(input)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string): string {
  if (typeof window === "undefined") {
    return "";
  }
  const padded = padBase64(input.replace(/-/g, "+").replace(/_/g, "/"));
  return window.atob(padded);
}

export function buildMockJwt(
  role: UserRole,
  tenantId: string,
  linkedStudentIds?: string[],
  userMeta?: {
    userId?: string;
    userName?: string;
    email?: string;
    vendorId?: string;
  },
): string {
  const claims: SessionClaims = {
    sub: userMeta?.userId || userMeta?.email || `${role}-user`,
    user_id: userMeta?.userId,
    user_name: userMeta?.userName,
    email: userMeta?.email,
    vendor_id: userMeta?.vendorId,
    role,
    tenant_id: tenantId,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    ...(linkedStudentIds?.length
      ? { linked_student_ids: linkedStudentIds }
      : {}),
  };
  const header = base64UrlEncode(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payload = base64UrlEncode(JSON.stringify(claims));
  return `${header}.${payload}.sig`;
}

export function parseClaimsFromToken(token: string): SessionClaims | null {
  try {
    const part = token.includes(".") ? token.split(".")[1] : token;
    const decoded = base64UrlDecode(part);
    const parsed = JSON.parse(decoded) as SessionClaims;
    if (!parsed.role || !parsed.tenant_id) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  const found = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.split("=")[1]) : null;
}

export function getClientSession(): SessionClaims | null {
  const token = getCookieValue("pc_session");
  if (!token) {
    return null;
  }
  return parseClaimsFromToken(token);
}
