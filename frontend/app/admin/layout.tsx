"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  Briefcase,
  Camera,
  ClipboardList,
  Clock,
  Database,
  FileClock,
  GraduationCap,
  HeartPulse,
  LayoutDashboard,
  LayoutGrid,
  List,
  LogOut,
  Menu,
  ShieldCheck,
  UploadCloud,
  Wallet,
  X,
} from "lucide-react";
import {
  DEFAULT_ADMIN_AVATAR,
  PROFILE_PICTURE_EVENT,
  ProfilePictureModal,
  getCachedProfilePicture,
  setCachedProfilePicture,
} from "@/components/pc/profile-picture-modal";
import {
  setCachedViewMode,
  usePortalViewMode,
} from "@/components/pc/view-mode-preference";
import {
  fetchMyProfile,
  updateMyProfilePicture,
  type TrialStatusSummary,
} from "@/app/lib/api";
import { getClientSession, type SessionClaims } from "@/app/lib/session";

const PRIMARY_DESKTOP_NAV_ITEMS = [
  { label: "Overview", href: "/admin", exact: true, icon: LayoutDashboard },
  { label: "Admissions", href: "/admin/admissions", exact: false, icon: ClipboardList },
  { label: "Students", href: "/admin/students", exact: false, icon: GraduationCap },
  { label: "Setup & Imports", href: "/admin/setup", exact: false, icon: UploadCloud },
  { label: "Data Governance", href: "/admin/governance", exact: false, icon: Database },
] as const;

const ADMIN_NAV_ITEMS = [
  { label: "Overview", href: "/admin", exact: true, icon: LayoutDashboard },
  { label: "Admissions", href: "/admin/admissions", exact: false, icon: ClipboardList },
  { label: "Students", href: "/admin/students", exact: false, icon: GraduationCap },
  { label: "Attendance Timer Config", href: "/admin/attendance-config", exact: false, icon: Clock },
  { label: "Health & Medications", href: "/admin/health-medications", exact: false, icon: HeartPulse },
  { label: "Child Care History", href: "/admin/history", exact: false, icon: FileClock },
  { label: "Academics & Calendars", href: "/admin/academics", exact: false, icon: BookOpen },
  { label: "Billing & Reconciliation", href: "/admin/billing", exact: false, icon: Wallet },
  { label: "Operations & Procurement", href: "/admin/operations", exact: false, icon: Briefcase },
  { label: "Setup & Imports", href: "/admin/setup", exact: false, icon: UploadCloud },
  { label: "Data Governance", href: "/admin/governance", exact: false, icon: Database },
] as const;

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/admin";
  const [session] = useState<SessionClaims | null>(() => getClientSession());
  const userKey = session?.user_id || session?.email || "default-admin";

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [trialInfo, setTrialInfo] = useState<TrialStatusSummary | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>(() =>
    getCachedProfilePicture(userKey, "admin"),
  );
  const [viewMode] = usePortalViewMode("admin", "cards");

  const menuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setProfileMenuOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function syncAvatar() {
      try {
        const res = await fetchMyProfile();
        if (!cancelled) {
          const remoteUrl = res.data?.avatar_url || null;
          setAvatarUrl(setCachedProfilePicture(userKey, "admin", remoteUrl));
          if (res.data?.trial) {
            setTrialInfo(res.data.trial);
          }
        }
      } catch {
        // Fallback to cached SVG avatar
      }
    }
    syncAvatar();
    const onAvatarUpdated = () => {
      setAvatarUrl(getCachedProfilePicture(userKey, "admin"));
    };
    window.addEventListener(PROFILE_PICTURE_EVENT, onAvatarUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener(PROFILE_PICTURE_EVENT, onAvatarUpdated);
    };
  }, [userKey]);

  const rawName = session?.user_name?.trim();
  const displayAdminName =
    !rawName || /^admin\s*\d*$/i.test(rawName) ? "Administrator Marcus" : rawName;

  const handleSaveAvatar = async (nextAvatarUrl: string | null) => {
    try {
      const res = await updateMyProfilePicture(nextAvatarUrl);
      const persisted = res.data?.avatar_url ?? nextAvatarUrl;
      setAvatarUrl(setCachedProfilePicture(userKey, "admin", persisted));
    } catch {
      setAvatarUrl(setCachedProfilePicture(userKey, "admin", nextAvatarUrl));
    }
  };

  const handleSignOut = () => {
    document.cookie = "pc_session=; Path=/; Max-Age=0; SameSite=Lax";
    router.push("/");
  };

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="relative min-h-screen bg-paper text-crayon-charcoal overflow-x-hidden">
      {/* Ambient Oil Pastel Background Blobs (z-0) */}
      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -left-24 -top-20 h-96 w-96 rounded-full bg-pastel-butter/40 blur-3xl" />
        <div className="absolute -right-24 top-1/4 h-96 w-96 rounded-full bg-pastel-sky/35 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-96 w-96 rounded-full bg-pastel-lilac/35 blur-3xl" />
      </div>

      {/* Floating Top Navigation Pill Header (z-40) */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-pastel-butter/70 bg-paper-card/90 backdrop-blur-xl shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          {/* Left: Hamburger + Brand */}
          <div className="flex items-center gap-3">
            <div ref={menuRef} className="relative">
              <button
                type="button"
                aria-label="Open Admin Navigator"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((prev) => !prev)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-paper-tint text-crayon-charcoal hover:bg-pastel-butter/50 transition-colors cursor-pointer"
              >
                {menuOpen ? (
                  <X className="size-5" aria-hidden="true" />
                ) : (
                  <Menu className="size-5" aria-hidden="true" />
                )}
              </button>

              {menuOpen && (
                <div
                  data-testid="admin-navigator-menu"
                  className="absolute left-0 top-12 z-[80] w-64 rounded-3xl border-2 border-pastel-butter bg-paper-card p-3 shadow-2xl space-y-1"
                >
                  <p className="px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-crayon-muted">
                    Admin Console Modules
                  </p>
                  {ADMIN_NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href, item.exact);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className={`flex items-center gap-2.5 rounded-2xl px-3 py-2 text-xs font-bold transition-colors ${
                          active
                            ? "bg-pastel-butter/70 text-crayon-charcoal"
                            : "text-crayon-espresso hover:bg-paper-tint"
                        }`}
                      >
                        <Icon className="size-4 text-terracotta" aria-hidden="true" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <Link href="/admin" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-terracotta text-on-primary shadow-sm">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </span>
              <div className="hidden sm:block">
                <span className="block text-sm font-extrabold tracking-tight text-crayon-charcoal leading-tight">
                  ThePurpleCubby
                </span>
                <span className="block text-[11px] font-semibold text-crayon-muted leading-tight">
                  Admin Operational Console
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Desktop Pill Nav */}
          <nav
            aria-label="Admin Portal Navigation"
            className="hidden lg:flex items-center gap-1 rounded-full border border-pastel-butter/80 bg-paper-tint p-1"
          >
            {PRIMARY_DESKTOP_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                    active
                      ? "bg-paper-card text-crayon-charcoal shadow-sm"
                      : "text-crayon-espresso hover:bg-pastel-butter/40"
                  }`}
                >
                  <Icon className="size-3.5 text-terracotta" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: Account Profile Menu */}
          <div ref={profileMenuRef} className="relative">
            <button
              type="button"
              aria-label="Account Profile"
              aria-expanded={profileMenuOpen}
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-full border border-pastel-butter bg-paper-tint py-1 pl-1 pr-3 hover:bg-pastel-butter/40 transition-colors cursor-pointer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarUrl || DEFAULT_ADMIN_AVATAR}
                alt={displayAdminName}
                className="h-8 w-8 rounded-full object-cover bg-pastel-lilac/40"
              />
              <span className="hidden md:inline text-xs font-bold text-crayon-charcoal">
                {displayAdminName}
              </span>
            </button>

            {profileMenuOpen && (
              <div
                data-testid="admin-profile-menu"
                className="absolute right-0 top-12 z-[80] w-64 rounded-3xl border-2 border-pastel-butter bg-paper-card p-3 shadow-2xl space-y-2"
              >
                <div className="border-b border-border px-2 pb-2">
                  <p className="text-xs font-extrabold text-crayon-charcoal">
                    {displayAdminName}
                  </p>
                  <p className="text-[11px] text-crayon-muted">
                    School Administrator
                  </p>
                </div>

                {/* Workspace View Switcher inside Account Profile */}
                <div className="px-2 py-1 space-y-1.5">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-crayon-muted">
                    Workspace View
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCachedViewMode("admin", "cards")}
                      className={`inline-flex items-center justify-center gap-1 rounded-full py-1.5 text-xs font-bold cursor-pointer ${
                        viewMode === "cards"
                          ? "bg-terracotta text-on-primary"
                          : "bg-paper-tint text-crayon-espresso hover:bg-pastel-butter/40"
                      }`}
                    >
                      <LayoutGrid className="size-3.5" aria-hidden="true" />
                      Cards View
                    </button>
                    <button
                      type="button"
                      onClick={() => setCachedViewMode("admin", "compact")}
                      className={`inline-flex items-center justify-center gap-1 rounded-full py-1.5 text-xs font-bold cursor-pointer ${
                        viewMode === "compact"
                          ? "bg-terracotta text-on-primary"
                          : "bg-paper-tint text-crayon-espresso hover:bg-pastel-butter/40"
                      }`}
                    >
                      <List className="size-3.5" aria-hidden="true" />
                      Compact View
                    </button>
                  </div>
                </div>

                <div className="border-t border-border pt-2 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setAvatarModalOpen(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-xs font-bold text-crayon-charcoal hover:bg-paper-tint cursor-pointer"
                  >
                    <Camera className="size-4 text-terracotta" aria-hidden="true" />
                    Update Photo
                  </button>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-xs font-bold text-error hover:bg-error-container/60 cursor-pointer"
                  >
                    <LogOut className="size-4" aria-hidden="true" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Stage (z-10) */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-12 pt-22 sm:px-6">
        {trialInfo?.is_trial && (
          <div
            data-testid="admin-trial-banner"
            className={`mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-4 py-2.5 text-xs font-bold ${
              trialInfo.is_expired
                ? "border-error bg-error-container text-on-error-container"
                : "border-pastel-butter bg-pastel-butter/50 text-crayon-charcoal"
            }`}
          >
            <span>
              {trialInfo.is_expired
                ? `Your ${trialInfo.trial_duration_days ?? 14}-day free trial has expired. Operational changes are paused until subscription activation.`
                : `${trialInfo.days_remaining ?? trialInfo.trial_duration_days ?? 14} day(s) remaining in your ${trialInfo.trial_duration_days ?? 14}-day free trial.`}
            </span>
            <Link
              href="/admin/billing"
              className="underline font-extrabold hover:opacity-80"
            >
              {trialInfo.is_expired ? "Activate Subscription" : "Manage Plan"}
            </Link>
          </div>
        )}
        {children}
      </main>

      <ProfilePictureModal
        open={avatarModalOpen}
        onOpenChange={setAvatarModalOpen}
        actorRole="admin"
        actorName={displayAdminName}
        currentAvatarUrl={avatarUrl || DEFAULT_ADMIN_AVATAR}
        onSaveAvatar={handleSaveAvatar}
      />
    </div>
  );
}
