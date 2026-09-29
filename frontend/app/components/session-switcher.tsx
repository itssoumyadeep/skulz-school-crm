"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buildMockJwt, type UserRole } from "@/app/lib/session";

const roleRoutes: Record<UserRole, string> = {
  admin: "/admin",
  principal: "/principal",
  teacher: "/teacher",
  caregiver: "/caregiver",
  parent: "/parent",
  vendor: "/vendor",
  owner: "/governance/owner",
  board: "/governance/board",
  trustee: "/governance/trustee",
};

export function SessionSwitcher() {
  const [role, setRole] = useState<UserRole>("admin");
  const [tenantId, setTenantId] = useState("tenant-demo-001");
  const [linkedStudents, setLinkedStudents] = useState(
    "11111111-1111-4111-8111-111111111111,22222222-2222-4222-8222-222222222222",
  );
  const router = useRouter();

  const startSession = () => {
    const linkedStudentIds =
      role === "parent"
        ? linkedStudents
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
        : undefined;
    const token = buildMockJwt(
      role,
      tenantId.trim() || "tenant-demo-001",
      linkedStudentIds,
    );
    document.cookie = `pc_session=${encodeURIComponent(token)}; Path=/; Max-Age=86400; SameSite=Lax`;
    router.push(roleRoutes[role]);
  };

  return (
    <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface2)] p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
        Sprint 6-7 Session Emulator
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <select
          value={role}
          onChange={(event) => setRole(event.target.value as UserRole)}
          className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
        >
          <option value="admin">Admin</option>
          <option value="principal">Principal</option>
          <option value="teacher">Teacher</option>
          <option value="caregiver">Caregiver</option>
          <option value="parent">Parent</option>
          <option value="vendor">Vendor</option>
          <option value="owner">Owner</option>
          <option value="board">Board</option>
          <option value="trustee">Trustee</option>
        </select>
        <input
          value={tenantId}
          onChange={(event) => setTenantId(event.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
          placeholder="tenant id"
        />
        <button
          onClick={startSession}
          className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-semibold"
        >
          Start Role Session
        </button>
      </div>
      {role === "parent" ? (
        <input
          value={linkedStudents}
          onChange={(event) => setLinkedStudents(event.target.value)}
          className="mt-3 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs"
          placeholder="comma-separated linked student UUIDs"
        />
      ) : null}
    </div>
  );
}
