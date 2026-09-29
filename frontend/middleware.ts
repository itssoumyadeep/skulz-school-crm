import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type Role =
  | "admin"
  | "principal"
  | "teacher"
  | "caregiver"
  | "parent"
  | "vendor"
  | "owner"
  | "board"
  | "trustee";

type Claims = {
  role?: Role;
  tenant_id?: string;
  exp?: number;
};

const roleRules: Array<{ prefix: string; roles: Role[] }> = [
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/principal", roles: ["principal", "admin"] },
  { prefix: "/teacher", roles: ["teacher", "admin"] },
  { prefix: "/caregiver", roles: ["caregiver", "admin"] },
  { prefix: "/parent", roles: ["parent", "admin"] },
  { prefix: "/vendor", roles: ["vendor", "admin"] },
  { prefix: "/governance/owner", roles: ["owner", "admin"] },
  { prefix: "/governance/board", roles: ["board", "admin"] },
  { prefix: "/governance/trustee", roles: ["trustee", "admin"] },
];

function decodePart(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return atob(padded);
  } catch {
    return null;
  }
}

function getClaims(token: string | undefined): Claims | null {
  if (!token) {
    return null;
  }
  const payloadPart = token.includes(".") ? token.split(".")[1] : token;
  const decoded = decodePart(payloadPart);
  if (!decoded) {
    return null;
  }
  try {
    return JSON.parse(decoded) as Claims;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const rule = roleRules.find((entry) => path.startsWith(entry.prefix));
  if (!rule) {
    return NextResponse.next();
  }

  const token = request.cookies.get("pc_session")?.value;
  const claims = getClaims(token);

  if (!claims?.role || !claims?.tenant_id) {
    return NextResponse.redirect(
      new URL("/?denied=missing-session", request.url),
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
    "/teacher/:path*",
    "/caregiver/:path*",
    "/parent/:path*",
    "/vendor/:path*",
    "/governance/:path*",
  ],
};
