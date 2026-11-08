"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  DEFAULT_TEACHER_AVATAR,
  PROFILE_PICTURE_EVENT,
  ProfilePictureModal,
  TeacherIcon,
  getCachedProfilePicture,
  setCachedProfilePicture,
} from "@/components/pc/profile-picture-modal";
import { fetchMyProfile, updateMyProfilePicture } from "@/app/lib/api";
import { getClientSession, type SessionClaims } from "@/app/lib/session";

export const OPEN_TEACHER_AVATAR_MODAL_EVENT = "pc-open-teacher-avatar-modal";

interface NavPillItem {
  label: string;
  href: string;
  exact?: boolean;
  hoverBg: string;
  icon: string;
  menuLabel?: string;
}

const TEACHER_NAV_PILLS: readonly NavPillItem[] = [
  {
    label: "Dashboard",
    menuLabel: "Teacher Dashboard",
    href: "/teacher",
    exact: true,
    hoverBg: "hover:bg-pastel-butter/40",
    icon: "dashboard",
  },
  {
    label: "Classes & Attendance",
    href: "/teacher/attendance",
    hoverBg: "hover:bg-pastel-mint/40",
    icon: "co_present",
  },
  {
    label: "Lesson Plans",
    href: "/teacher/lessons",
    hoverBg: "hover:bg-pastel-peach/30",
    icon: "menu_book",
  },
  {
    label: "Assessments & Moderation",
    href: "/teacher/assessments",
    hoverBg: "hover:bg-pastel-lilac/40",
    icon: "assignment",
  },
  {
    label: "Messages",
    menuLabel: "Messages & Parent Notes",
    href: "/teacher/messages",
    hoverBg: "hover:bg-pastel-sky/40",
    icon: "chat_bubble",
  },
];

export default function TeacherLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/teacher";
  const [session] = useState<SessionClaims | null>(() => getClientSession());
  const userKey = session?.user_id || session?.email || "default-teacher";

  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>(() =>
    getCachedProfilePicture(userKey, "teacher"),
  );

  const rawName = session?.user_name?.trim();
  const displayEducatorName =
    !rawName || /^teacher\s*\d*$/i.test(rawName)
      ? "Ms. Sarah Jenkins"
      : rawName;

  useEffect(() => {
    let cancelled = false;

    async function syncProfilePicture() {
      try {
        const res = await fetchMyProfile();
        if (!cancelled && res.data?.avatar_url) {
          const synced = setCachedProfilePicture(
            userKey,
            "teacher",
            res.data.avatar_url,
          );
          setAvatarUrl(synced);
        }
      } catch {
        // Offline or demo session fallback uses localStorage cache
      }
    }
    void syncProfilePicture();

    const handleAvatarUpdated = (event: Event) => {
      const custom = event as CustomEvent<{
        role?: string;
        avatarUrl?: string;
      }>;
      if (custom.detail?.role === "teacher" && custom.detail.avatarUrl) {
        setAvatarUrl(custom.detail.avatarUrl);
      }
    };

    const handleOpenModalRequest = () => {
      setAvatarModalOpen(true);
    };

    window.addEventListener(PROFILE_PICTURE_EVENT, handleAvatarUpdated);
    window.addEventListener(
      OPEN_TEACHER_AVATAR_MODAL_EVENT,
      handleOpenModalRequest,
    );
    return () => {
      cancelled = true;
      window.removeEventListener(PROFILE_PICTURE_EVENT, handleAvatarUpdated);
      window.removeEventListener(
        OPEN_TEACHER_AVATAR_MODAL_EVENT,
        handleOpenModalRequest,
      );
    };
  }, [userKey]);

  const handleSaveAvatar = async (nextUrl: string | null) => {
    const resolved = setCachedProfilePicture(userKey, "teacher", nextUrl);
    setAvatarUrl(resolved);
    try {
      await updateMyProfilePicture(nextUrl);
    } catch {
      // Cached locally when backend is in unsigned demo mode
    }
  };

  const isRouteActive = (item: NavPillItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  const handleSignOut = () => {
    document.cookie =
      "pc_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/");
  };

  return (
    <div className="bg-paper font-sans text-crayon-charcoal antialiased min-h-screen flex flex-col selection:bg-pastel-butter selection:text-crayon-charcoal">
      {/* Floating Oil Pastel Pill Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-4 md:px-10 pt-2">
        <div className="h-20 max-w-7xl mx-auto bg-paper-card/95 backdrop-blur-xl border-2 border-pastel-butter/60 shadow-pastel rounded-full px-6 flex items-center justify-between transition-all">
          {/* Left: Hamburger Navigator + Brand */}
          <div className="flex items-center gap-3.5 shrink-0">
            <div
              className="relative group/menu"
              onMouseLeave={() => setMenuOpen(false)}
            >
              <button
                aria-label="Open Navigation Menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((prev) => !prev)}
                className="w-10 h-10 rounded-2xl bg-paper-tint hover:bg-pastel-butter/60 active:scale-95 border-2 border-pastel-butter/80 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer shadow-xs text-crayon-charcoal group-hover/menu:border-pastel-sun group-hover/menu:bg-pastel-butter"
                type="button"
              >
                <span className="w-4 h-0.5 rounded-full bg-crayon-charcoal transition-all" />
                <span className="w-4 h-0.5 rounded-full bg-crayon-charcoal transition-all" />
                <span className="w-4 h-0.5 rounded-full bg-crayon-charcoal transition-all" />
              </button>

              {/* School CRM Navigator Popover */}
              <div
                className={`absolute left-0 top-12 ${
                  menuOpen ? "flex" : "hidden group-hover/menu:flex"
                } hover:flex flex-col w-72 bg-paper-card/95 backdrop-blur-xl border-2 border-pastel-butter shadow-pastel-warm rounded-3xl p-4 z-50 transition-all`}
              >
                <div className="flex items-center justify-between pb-3 border-b border-pastel-butter/80 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-pastel-sun" />
                    <span className="text-xs font-black text-crayon-charcoal uppercase tracking-wider">
                      School CRM Navigator
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pastel-mint text-pastel-mint-deep">
                    Staff Hub
                  </span>
                </div>

                <div className="space-y-1">
                  {TEACHER_NAV_PILLS.map((item) => {
                    const active = isRouteActive(item);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-colors ${
                          active
                            ? "font-bold text-crayon-charcoal bg-pastel-butter/50 hover:bg-pastel-butter"
                            : `font-semibold text-crayon-espresso hover:text-crayon-charcoal ${item.hoverBg}`
                        }`}
                      >
                        <TeacherIcon name={item.icon} className="size-4 shrink-0" />
                        {item.menuLabel ?? item.label}
                      </Link>
                    );
                  })}
                </div>

                <div className="pt-2.5 mt-2 border-t border-pastel-butter/80">
                  <p className="text-[10px] font-extrabold text-crayon-muted uppercase tracking-wider px-2 mb-1.5">
                    Portal &amp; Tools
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Link
                      href="/teacher/lessons"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-1.5 p-2 rounded-xl bg-paper-tint hover:bg-pastel-butter/40 text-[11px] font-bold text-crayon-espresso transition-colors"
                    >
                      <TeacherIcon name="calendar_month" className="size-3.5 shrink-0" />
                      Calendar
                    </Link>
                    <Link
                      href="/teacher/safeguarding"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-1.5 p-2 rounded-xl bg-paper-tint hover:bg-pastel-peach/40 text-[11px] font-bold text-crayon-espresso transition-colors"
                    >
                      <TeacherIcon name="shield" className="size-3.5 shrink-0" />
                      Safeguard
                    </Link>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex items-center gap-1.5 p-2 rounded-xl bg-paper-tint hover:bg-pastel-lilac/40 text-[11px] font-bold text-crayon-espresso transition-colors text-left cursor-pointer"
                    >
                      <TeacherIcon name="swap_horiz" className="size-3.5 shrink-0" />
                      Switch Role
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setAvatarModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 p-2 rounded-xl bg-paper-tint hover:bg-pastel-mint/40 text-[11px] font-bold text-crayon-espresso transition-colors text-left cursor-pointer"
                    >
                      <TeacherIcon name="photo_camera" className="size-3.5 shrink-0" />
                      Photo
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <Link
              href="/teacher"
              className="flex items-center gap-3.5 focus:outline-none"
            >
              <div className="w-10 h-10 rounded-2xl bg-pastel-butter flex items-center justify-center border-2 border-pastel-sun/80 shadow-xs">
                <TeacherIcon
                  name="draw"
                  className="size-5 text-crayon-charcoal"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold text-crayon-charcoal tracking-tight leading-none">
                  ThePurpleCubby
                </span>
                <span className="text-xs font-semibold text-crayon-muted leading-none mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-pastel-mint-deep" />
                  Staff Portal
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Pill Navigation Bar */}
          <nav
            aria-label="Teacher primary navigation"
            className="hidden xl:flex items-center bg-paper-tint/80 border border-pastel-butter/50 p-1.5 rounded-full gap-1"
          >
            {TEACHER_NAV_PILLS.map((item) => {
              const active = isRouteActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "px-5 py-2 rounded-full transition-all duration-200 bg-crayon-charcoal text-paper font-bold shadow-xs text-sm"
                      : `text-sm font-semibold text-crayon-espresso hover:text-crayon-charcoal ${item.hoverBg} px-4 py-2 rounded-full transition-all duration-200`
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: Notification Bell & Educator Profile Avatar */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="relative">
              <button
                type="button"
                aria-label="Notifications"
                onClick={() => {
                  setNotificationsOpen((prev) => !prev);
                  setProfileMenuOpen(false);
                }}
                className="w-10 h-10 rounded-full bg-paper-tint hover:bg-pastel-butter/50 border border-pastel-butter/80 transition-colors flex items-center justify-center relative text-crayon-charcoal cursor-pointer"
              >
                <TeacherIcon name="notifications" className="size-5" />
                <span className="w-2.5 h-2.5 rounded-full bg-pastel-peach-deep absolute top-2 right-2 ring-2 ring-paper-card" />
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-12 w-80 bg-paper-card/95 backdrop-blur-xl border-2 border-pastel-butter shadow-pastel-warm rounded-3xl p-4 z-50 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-pastel-butter/80 pb-2">
                    <span className="text-xs font-extrabold text-crayon-charcoal uppercase tracking-wider">
                      Classroom Alerts
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pastel-peach text-pastel-peach-deep">
                      3 Unread
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNotificationsOpen(false);
                      router.push("/teacher/safeguarding");
                    }}
                    className="w-full text-left p-2.5 rounded-2xl bg-paper-tint hover:bg-pastel-peach/30 border border-pastel-peach/50 transition-colors"
                  >
                    <p className="text-xs font-bold text-crayon-charcoal">
                      Caregiver Notice Verified (08:15 AM)
                    </p>
                    <p className="text-[11px] text-crayon-espresso mt-0.5">
                      Leo Miller • Asthma Care Protocol cleared by Nurse.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNotificationsOpen(false);
                      router.push("/teacher/assessments");
                    }}
                    className="w-full text-left p-2.5 rounded-2xl bg-paper-tint hover:bg-pastel-lilac/30 border border-pastel-lilac/50 transition-colors"
                  >
                    <p className="text-xs font-bold text-crayon-charcoal">
                      Department Science Moderation
                    </p>
                    <p className="text-[11px] text-crayon-espresso mt-0.5">
                      3:30 PM • Library Annex with Dr. Robert Vance.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNotificationsOpen(false);
                      router.push("/teacher/attendance");
                    }}
                    className="w-full text-left p-2.5 rounded-2xl bg-paper-tint hover:bg-pastel-mint/30 border border-pastel-mint/50 transition-colors"
                  >
                    <p className="text-xs font-bold text-crayon-charcoal">
                      Homeroom 4B Roll Verified
                    </p>
                    <p className="text-[11px] text-crayon-espresso mt-0.5">
                      27 of 28 Present • 22 hrs remaining before 24h lock.
                    </p>
                  </button>
                </div>
              )}
            </div>

            <div className="relative flex items-center pl-1">
              <button
                type="button"
                aria-label="Educator Profile Menu"
                onClick={() => {
                  setProfileMenuOpen((prev) => !prev);
                  setNotificationsOpen(false);
                }}
                className="relative rounded-full focus:outline-none cursor-pointer group"
                title="Educator Profile & Picture"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={displayEducatorName}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-pastel-sun shadow-xs bg-paper-tint"
                  src={avatarUrl || DEFAULT_TEACHER_AVATAR}
                />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 top-12 w-64 bg-paper-card/95 backdrop-blur-xl border-2 border-pastel-butter shadow-pastel-warm rounded-3xl p-3.5 z-50 space-y-1.5">
                  <div className="pb-2 border-b border-pastel-butter/80 px-1 flex items-center gap-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={displayEducatorName}
                      src={avatarUrl || DEFAULT_TEACHER_AVATAR}
                      className="w-9 h-9 rounded-xl object-cover border border-pastel-sun"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-crayon-charcoal truncate">
                        {displayEducatorName}
                      </p>
                      <p className="text-[11px] font-medium text-crayon-muted truncate">
                        Homeroom 4B &amp; Gr 5 Science
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setAvatarModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold text-crayon-charcoal hover:bg-pastel-butter/50 text-left cursor-pointer"
                  >
                    <TeacherIcon name="photo_camera" className="size-4 shrink-0" />
                    Update Profile Picture
                  </button>
                  <Link
                    href="/teacher/safeguarding"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-crayon-espresso hover:bg-paper-tint hover:text-crayon-charcoal"
                  >
                    <TeacherIcon
                      name="medical_services"
                      className="size-4 shrink-0"
                    />
                    Safeguarding &amp; Health
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold text-pastel-peach-deep hover:bg-pastel-peach/30 text-left cursor-pointer"
                  >
                    <TeacherIcon name="logout" className="size-4 shrink-0" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Stage */}
      <main className="w-full pt-20 bg-paper flex-1">
        <div className="max-w-7xl mx-auto px-4 md:px-10 pt-6 pb-12">
          {children}
        </div>
      </main>

      {/* Oil Pastel Footer */}
      <footer className="w-full bg-paper-tint border-t-2 border-pastel-butter py-6 mt-10">
        <div className="max-w-7xl mx-auto px-4 md:px-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-base font-extrabold text-crayon-charcoal">
              ThePurpleCubby Inc.
            </span>
            <span className="text-xs font-semibold text-crayon-muted">
              © 2025 The Purple Cubby Inc.. All rights reserved.
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              className="text-xs font-bold text-crayon-espresso hover:text-crayon-charcoal transition-colors"
              href="/teacher/safeguarding"
            >
              Safeguarding Protocol
            </Link>
            <Link
              className="text-xs font-bold text-crayon-espresso hover:text-crayon-charcoal transition-colors"
              href="/teacher/lessons"
            >
              Academic Calendar
            </Link>
            <Link
              className="text-xs font-bold text-crayon-espresso hover:text-crayon-charcoal transition-colors"
              href="/teacher/messages"
            >
              Helpdesk
            </Link>
          </div>
        </div>
      </footer>

      <ProfilePictureModal
        open={avatarModalOpen}
        onOpenChange={setAvatarModalOpen}
        actorRole="teacher"
        actorName={displayEducatorName}
        currentAvatarUrl={avatarUrl || DEFAULT_TEACHER_AVATAR}
        onSaveAvatar={handleSaveAvatar}
      />
    </div>
  );
}
