"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { buildMockJwt, type UserRole } from "@/app/lib/session";

type CredentialEntry = {
  username: string;
  password: string;
  userName: string;
  email: string;
  userId: string;
  description: string;
  linkedStudentIds?: string[];
  vendorId?: string;
};

type PortalConfig = {
  role: UserRole;
  label: string;
  route: string;
  credentials: CredentialEntry[];
};

const portalConfigs: PortalConfig[] = [
  {
    role: "admin",
    label: "Admin Console",
    route: "/admin",
    credentials: [
      {
        username: "admin.ops.1",
        password: "AdminOps!2026",
        userName: "Alice Operations",
        email: "alice.ops@demo.school",
        userId: "10000000-0000-0000-0000-000000000001",
        description: "Admissions Registrar & Operations Lead",
      },
      {
        username: "admin.ops.2",
        password: "AdminOps!2027",
        userName: "Bob Manager",
        email: "bob.manager@demo.school",
        userId: "10000000-0000-0000-0000-000000000002",
        description: "Finance Administrator",
      },
    ],
  },
  {
    role: "principal",
    label: "Principal Portal",
    route: "/principal",
    credentials: [
      {
        username: "principal.main.1",
        password: "Principal!2026",
        userName: "Dr. Arthur Henderson",
        email: "principal@demo.school",
        userId: "20000000-0000-0000-0000-000000000001",
        description: "Executive Principal",
      },
      {
        username: "principal.main.2",
        password: "Principal!2027",
        userName: "Mrs. Clara Vance",
        email: "vp.vance@demo.school",
        userId: "20000000-0000-0000-0000-000000000002",
        description: "Vice Principal (Academic & Moderation)",
      },
    ],
  },
  {
    role: "teacher",
    label: "Teacher Portal",
    route: "/teacher",
    credentials: [
      {
        username: "teacher.room4a.1",
        password: "Teacher4A!2026",
        userName: "Ms. Emily Patel",
        email: "emily.patel@demo.school",
        userId: "30000000-0000-0000-0000-000000000001",
        description: "Class 4A Lead Teacher",
      },
      {
        username: "teacher.room5b.2",
        password: "Teacher5B!2027",
        userName: "Mr. Robert Miller",
        email: "robert.miller@demo.school",
        userId: "30000000-0000-0000-0000-000000000002",
        description: "Class 5B Lead Teacher",
      },
    ],
  },
  {
    role: "caregiver",
    label: "Caregiver Portal",
    route: "/caregiver",
    credentials: [
      {
        username: "caregiver.roomb.1",
        password: "CaregiverB!2026",
        userName: "Nurse Sarah Connor",
        email: "nurse.sarah@demo.school",
        userId: "40000000-0000-0000-0000-000000000001",
        description: "Infant Care & Health Coordinator",
      },
      {
        username: "caregiver.roomc.2",
        password: "CaregiverC!2027",
        userName: "Caregiver Thomas Reed",
        email: "thomas.reed@demo.school",
        userId: "40000000-0000-0000-0000-000000000002",
        description: "Toddler Care Coordinator",
      },
    ],
  },
  {
    role: "parent",
    label: "Parent Portal",
    route: "/parent",
    credentials: [
      {
        username: "parent.collins.1",
        password: "ParentHub!2026",
        userName: "Sarah Collins",
        email: "sarah.collins@example.com",
        userId: "11111111-aaaa-4111-8111-111111111111",
        description: "Parent of Ava (Gr 2) & Noah (KG)",
        linkedStudentIds: [
          "11111111-1111-4111-8111-111111111111",
          "22222222-2222-4222-8222-222222222222",
        ],
      },
      {
        username: "parent.miller.2",
        password: "ParentHub!2027",
        userName: "David Miller",
        email: "david.miller@example.com",
        userId: "22222222-bbbb-4222-8222-222222222222",
        description: "Parent of Lucas (Gr 1)",
        linkedStudentIds: ["33333333-3333-4333-8333-333333333333"],
      },
    ],
  },
  {
    role: "vendor",
    label: "Vendor Portal",
    route: "/vendor",
    credentials: [
      {
        username: "vendor.supply.1",
        password: "VendorSupply!2026",
        userName: "Lab Supplies Inc",
        email: "orders@labsupplies.example.com",
        userId: "70000000-0000-0000-0000-000000000001",
        vendorId: "77777777-7777-4777-8777-777777777777",
        description: "Educational Science & Lab Equipment Supplier",
      },
      {
        username: "vendor.catering.2",
        password: "VendorCatering!2027",
        userName: "Green Leaf Catering",
        email: "billing@greenleaf.example.com",
        userId: "70000000-0000-0000-0000-000000000002",
        vendorId: "88888888-8888-4888-8888-888888888888",
        description: "Fresh Meal & Cafeteria Catering Partner",
      },
    ],
  },
  {
    role: "owner",
    label: "Owner Console",
    route: "/governance/owner",
    credentials: [
      {
        username: "owner.network.1",
        password: "OwnerNet!2026",
        userName: "Helena Frost",
        email: "helena.frost@purplecubby.corp",
        userId: "80000000-0000-0000-0000-000000000001",
        description: "Institutional Network Founder & Owner",
      },
      {
        username: "owner.network.2",
        password: "OwnerNet!2027",
        userName: "Marcus Sterling",
        email: "marcus.sterling@purplecubby.corp",
        userId: "80000000-0000-0000-0000-000000000002",
        description: "Education Trust Managing Partner",
      },
    ],
  },
  {
    role: "board",
    label: "Board Portal",
    route: "/governance/board",
    credentials: [
      {
        username: "board.audit.1",
        password: "BoardAudit!2026",
        userName: "Patricia Sterling",
        email: "patricia.audit@board.purplecubby",
        userId: "90000000-0000-0000-0000-000000000001",
        description: "Audit & Risk Committee Chair",
      },
      {
        username: "board.audit.2",
        password: "BoardAudit!2027",
        userName: "Samuel Greenfield",
        email: "samuel.gov@board.purplecubby",
        userId: "90000000-0000-0000-0000-000000000002",
        description: "Governance Committee Member",
      },
    ],
  },
  {
    role: "trustee",
    label: "Trustee Portal",
    route: "/governance/trustee",
    credentials: [
      {
        username: "trustee.funds.1",
        password: "TrusteeFunds!2026",
        userName: "Brian O'Connor",
        email: "brian.funds@trustee.purplecubby",
        userId: "95000000-0000-0000-0000-000000000001",
        description: "Endowment Fund Trustee",
      },
      {
        username: "trustee.funds.2",
        password: "TrusteeFunds!2027",
        userName: "Evelyn Ross",
        email: "evelyn.ross@trustee.purplecubby",
        userId: "95000000-0000-0000-0000-000000000002",
        description: "Scholarship Foundation Trustee",
      },
    ],
  },
];

const processRegistry = [
  { code: "P01", title: "Enrollment & Admissions", status: "Implemented" },
  { code: "P02", title: "Billing & Fee Management", status: "Implemented" },
  { code: "P03", title: "Attendance & Rostering", status: "Implemented" },
  { code: "P04", title: "Academic Management", status: "Implemented" },
  { code: "P05", title: "HR & Payroll", status: "Implemented" },
  {
    code: "P06",
    title: "Communication & Notifications",
    status: "Implemented",
  },
  { code: "P07", title: "Health & Safety", status: "Implemented" },
  { code: "P08", title: "Procurement & Vendor", status: "Implemented" },
  { code: "P09", title: "Events & Activities", status: "Implemented" },
  { code: "P10", title: "Analytics & Reports", status: "Baseline Implemented" },
];

type AuthLandingProps = {
  deniedReason?: string;
};

export function AuthLanding({ deniedReason }: AuthLandingProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [tenantId, setTenantId] = useState("tenant-demo-001");
  const [status, setStatus] = useState("");

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupRole, setSignupRole] = useState<UserRole>("parent");
  const [signupStatus, setSignupStatus] = useState("");

  const credentialRows = useMemo(
    () =>
      portalConfigs.flatMap((portal) =>
        portal.credentials.map((entry, idx) => ({
          portal: portal.label,
          role: portal.role,
          route: portal.route,
          username: entry.username,
          password: entry.password,
          userName: entry.userName,
          description: entry.description,
          key: `${portal.role}-${idx}`,
        })),
      ),
    [],
  );

  const startSession = (portal: PortalConfig, cred?: CredentialEntry) => {
    const token = buildMockJwt(
      portal.role,
      tenantId.trim() || "tenant-demo-001",
      cred?.linkedStudentIds,
      {
        userId: cred?.userId,
        userName: cred?.userName,
        email: cred?.email,
        vendorId: cred?.vendorId,
      },
    );
    document.cookie = `pc_session=${encodeURIComponent(token)}; Path=/; Max-Age=86400; SameSite=Lax`;
    router.push(portal.route);
  };

  const login = () => {
    let foundPortal: PortalConfig | undefined;
    let foundCred: CredentialEntry | undefined;

    for (const portal of portalConfigs) {
      const match = portal.credentials.find(
        (entry) =>
          entry.username.toLowerCase() === username.trim().toLowerCase() &&
          entry.password === password,
      );
      if (match) {
        foundPortal = portal;
        foundCred = match;
        break;
      }
    }

    if (!foundPortal || !foundCred) {
      setStatus("Invalid credentials. Pick from the sample matrix below.");
      return;
    }

    setStatus(
      `Authenticated as ${foundCred.userName} (${foundPortal.label}). Redirecting...`,
    );
    startSession(foundPortal, foundCred);
  };

  const signUp = () => {
    if (!signupName.trim() || !signupEmail.trim()) {
      setSignupStatus("Name and email are required.");
      return;
    }

    const roleConfig = portalConfigs.find((entry) => entry.role === signupRole);
    setSignupStatus(
      `Sign-up captured for ${signupName}. For this mock build, use one of the sample credentials for ${roleConfig?.label ?? "selected role"}.`,
    );
  };

  return (
    <div className="theme-external relative min-h-screen overflow-hidden p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(73,155,214,0.28),transparent_45%),radial-gradient(circle_at_85%_15%,rgba(91,201,179,0.26),transparent_40%),linear-gradient(160deg,#f6fbff_0%,#dbeefc_46%,#cfe3f5_100%)]" />

      <main className="relative mx-auto w-full max-w-6xl">
        <section className="rounded-[34px] border border-white/45 bg-white/25 p-6 shadow-[0_22px_60px_rgba(11,60,94,0.2)] backdrop-blur-2xl lg:p-8">
          <p className="text-xs uppercase tracking-[0.24em] text-[#1e4f72]">
            Purple Cubby CRM
          </p>
          <h1 className="mt-2 text-4xl font-semibold text-[#16334f] lg:text-5xl">
            Login / Sign Up
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-[#214664]">
            Glassmorphism landing experience with role-aware portal access for
            all currently implemented operational and governance surfaces.
          </p>

          {deniedReason ? (
            <p className="mt-4 rounded-xl border border-[#6c9bbd66] bg-white/55 p-3 text-xs text-[#1f4c70]">
              Access blocked: {deniedReason}. Please authenticate with a
              matching portal account.
            </p>
          ) : null}

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <article className="rounded-2xl border border-white/50 bg-white/38 p-5 backdrop-blur-xl">
              <div className="mb-4 flex gap-2">
                <button
                  onClick={() => setTab("login")}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                    tab === "login"
                      ? "bg-[#1e638f] text-white"
                      : "border border-[#7ea8c4] text-[#1a4664]"
                  }`}
                >
                  Login
                </button>
                <button
                  onClick={() => setTab("signup")}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                    tab === "signup"
                      ? "bg-[#1e638f] text-white"
                      : "border border-[#7ea8c4] text-[#1a4664]"
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {tab === "login" ? (
                <div className="space-y-3">
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="w-full rounded-xl border border-white/50 bg-white/60 px-3 py-2 text-sm text-[#143752]"
                    placeholder="username"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-xl border border-white/50 bg-white/60 px-3 py-2 text-sm text-[#143752]"
                    placeholder="password"
                  />
                  <input
                    value={tenantId}
                    onChange={(event) => setTenantId(event.target.value)}
                    className="w-full rounded-xl border border-white/50 bg-white/60 px-3 py-2 text-sm text-[#143752]"
                    placeholder="tenant id"
                  />
                  <button
                    onClick={login}
                    className="rounded-xl bg-[#1b5b84] px-4 py-2 text-sm font-semibold text-white"
                  >
                    Start Role Session
                  </button>
                  <p className="text-xs text-[#194565]">{status}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    value={signupName}
                    onChange={(event) => setSignupName(event.target.value)}
                    className="w-full rounded-xl border border-white/50 bg-white/60 px-3 py-2 text-sm text-[#143752]"
                    placeholder="full name"
                  />
                  <input
                    value={signupEmail}
                    onChange={(event) => setSignupEmail(event.target.value)}
                    className="w-full rounded-xl border border-white/50 bg-white/60 px-3 py-2 text-sm text-[#143752]"
                    placeholder="email"
                  />
                  <select
                    value={signupRole}
                    onChange={(event) =>
                      setSignupRole(event.target.value as UserRole)
                    }
                    className="w-full rounded-xl border border-white/50 bg-white/60 px-3 py-2 text-sm text-[#143752]"
                  >
                    {portalConfigs.map((portal) => (
                      <option key={portal.role} value={portal.role}>
                        {portal.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={signUp}
                    className="rounded-xl bg-[#1b5b84] px-4 py-2 text-sm font-semibold text-white"
                  >
                    Create Account
                  </button>
                  <p className="text-xs text-[#194565]">{signupStatus}</p>
                </div>
              )}
            </article>

            <article className="rounded-2xl border border-white/50 bg-white/38 p-5 backdrop-blur-xl">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#1e4f72]">
                Isolated User Credentials (2 per portal)
              </h2>
              <p className="mt-1 text-[11px] text-[#214664]">
                Click any credential to quick-fill login. Each user has strict,
                isolated data access.
              </p>
              <div className="mt-3 max-h-[340px] overflow-auto rounded-xl border border-white/50 bg-white/55 p-2">
                <table className="w-full text-left text-xs">
                  <thead className="text-[#1f4c70]">
                    <tr>
                      <th className="px-2 py-2">Portal / User</th>
                      <th className="px-2 py-2">Username</th>
                      <th className="px-2 py-2">Password</th>
                    </tr>
                  </thead>
                  <tbody>
                    {credentialRows.map((row) => (
                      <tr
                        key={row.key}
                        onClick={() => {
                          setUsername(row.username);
                          setPassword(row.password);
                          setTab("login");
                        }}
                        className="cursor-pointer border-t border-[#78a1bc55] transition hover:bg-white/50"
                        title={`Click to fill: ${row.userName} - ${row.description}`}
                      >
                        <td className="px-2 py-2">
                          <span className="font-semibold">{row.portal}</span>
                          <span className="block text-[10px] text-[#234c6c]">
                            {row.userName}
                          </span>
                        </td>
                        <td className="px-2 py-2 font-mono">{row.username}</td>
                        <td className="px-2 py-2 font-mono">{row.password}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </div>

          <section className="mt-6 rounded-2xl border border-white/50 bg-white/40 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#1e4f72]">
              Processes Defined Till Now
            </h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {processRegistry.map((process) => (
                <div
                  key={process.code}
                  className="rounded-xl border border-[#7aa4c055] bg-white/60 p-3 text-sm"
                >
                  <p className="font-semibold text-[#173a57]">
                    {process.code} - {process.title}
                  </p>
                  <p className="mt-1 text-xs text-[#2b5b7e]">
                    {process.status}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}
