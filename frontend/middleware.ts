import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type Role =
  | "admin"
  | "principal"
  | "vice_principal"
  | "teacher"
  | "caregiver"
  | "parent"
  | "vendor"
  | "owner"
  | "board"
  | "trustee"
  | "staff";

type Claims = {
  role?: Role;
  tenant_id?: string;
  exp?: number;
};

type JwtHeader = {
  alg?: string;
  typ?: string;
};

const roleRules: Array<{ prefix: string; roles: Role[] }> = [
  { prefix: "/admin/history", roles: ["admin", "owner"] },
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/principal", roles: ["principal", "admin"] },
  { prefix: "/vice-principal", roles: ["vice_principal", "admin"] },
  { prefix: "/teacher", roles: ["teacher", "admin"] },
  { prefix: "/staff", roles: ["staff", "admin"] },
  { prefix: "/caregiver", roles: ["caregiver", "admin"] },
  { prefix: "/parent", roles: ["parent", "admin"] },
  { prefix: "/vendor", roles: ["vendor", "admin"] },
  { prefix: "/governance/owner", roles: ["owner", "admin"] },
  { prefix: "/governance/board", roles: ["board", "admin"] },
  { prefix: "/governance/trustee", roles: ["trustee", "admin"] },
  { prefix: "/governance", roles: ["owner", "board", "trustee", "admin"] },
];

function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function safeDecodeCookie(rawValue: string | undefined): string | undefined {
  if (!rawValue) {
    return undefined;
  }
  try {
    return decodeURIComponent(rawValue);
  } catch {
    return rawValue;
  }
}

function base64UrlToBytes(value: string): Uint8Array | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const bin = atob(padded);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) {
      bytes[i] = bin.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

function decodePart(value: string): string | null {
  try {
    const bytes = base64UrlToBytes(value);
    if (!bytes) return null;
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

async function verifyHs256Signature(
  signingInput: string,
  signatureB64Url: string,
  secret: string,
): Promise<boolean> {
  try {
    const sigBytes = base64UrlToBytes(signatureB64Url);
    if (!sigBytes) return false;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    return await crypto.subtle.verify(
      "HMAC",
      key,
      Uint8Array.from(sigBytes),
      new TextEncoder().encode(signingInput),
    );
  } catch {
    return false;
  }
}

async function validateAndGetClaims(
  token: string | undefined,
): Promise<{ claims: Claims | null; reason?: string }> {
  if (!token) {
    return { claims: null, reason: "missing-session" };
  }
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[0] || !parts[1]) {
    return { claims: null, reason: "invalid-session" };
  }

  const headerRaw = decodePart(parts[0]);
  const payloadRaw = decodePart(parts[1]);
  if (!headerRaw || !payloadRaw) {
    return { claims: null, reason: "invalid-session" };
  }

  let header: JwtHeader;
  let claims: Claims;
  try {
    header = JSON.parse(headerRaw) as JwtHeader;
    claims = JSON.parse(payloadRaw) as Claims;
  } catch {
    return { claims: null, reason: "invalid-session" };
  }

  const allowInsecureDevTokens =
    process.env.NODE_ENV !== "production" &&
    process.env.ALLOW_INSECURE_DEV_TOKENS === "true";

  if (header.alg !== "HS256") {
    if (!(allowInsecureDevTokens && header.alg === "none")) {
      return { claims: null, reason: "invalid-session" };
    }
  } else {
    const jwtSecret = process.env.JWT_SECRET_KEY?.trim();
    if (jwtSecret && !jwtSecret.startsWith("replace-me")) {
      const ok = await verifyHs256Signature(
        `${parts[0]}.${parts[1]}`,
        parts[2],
        jwtSecret,
      );
      if (!ok) {
        return { claims: null, reason: "invalid-session" };
      }
    }
  }

  return { claims };
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const rule = roleRules.find((entry) => matchesPrefix(path, entry.prefix));
  if (!rule) {
    return NextResponse.next();
  }

  const rawCookie = request.cookies.get("pc_session")?.value;
  const token = safeDecodeCookie(rawCookie);
  const { claims, reason } = await validateAndGetClaims(token);

  if (!claims?.role || !claims?.tenant_id) {
    return NextResponse.redirect(
      new URL(`/?denied=${reason ?? "missing-session"}`, request.url),
    );
  }

  if (claims.exp && claims.exp < Math.floor(Date.now() / 1000)) {
    return NextResponse.redirect(
      new URL("/?denied=expired-session", request.url),
    );
  }

  if (!rule.roles.includes(claims.role)) {
    return NextResponse.redirect(
      new URL("/?denied=role-mismatch", request.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/principal/:path*",
    "/vice-principal/:path*",
    "/teacher/:path*",
    "/staff/:path*",
    "/caregiver/:path*",
    "/parent/:path*",
    "/vendor/:path*",
    "/governance/:path*",
  ],
};
