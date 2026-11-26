"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu,
  X,
  Search,
  Bell,
  MessageSquare,
  Camera,
  LogOut,
  Sparkles,
  Flower2,
  Calendar,
  Baby,
  Heart,
  Layers,
  LayoutGrid,
  List,
} from "lucide-react";
import {
  DEFAULT_CAREGIVER_AVATAR,
  PROFILE_PICTURE_EVENT,
  ProfilePictureModal,
  getCachedProfilePicture,
  setCachedProfilePicture,
} from "@/components/pc/profile-picture-modal";
import {
  setCachedViewMode,
  usePortalViewMode,
} from "@/components/pc/view-mode-preference";
import { fetchMyProfile, updateMyProfilePicture } from "@/app/lib/api";
import { getClientSession, type SessionClaims } from "@/app/lib/session";

interface CaregiverLayoutProps {
  children: ReactNode;
}

export default function CaregiverLayout({ children }: CaregiverLayoutProps) {
  const router = useRouter();
  const [session] = useState<SessionClaims | null>(() => getClientSession());
  const userKey = session?.user_id || session?.email || "clara.gomez";

  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>(() =>
    getCachedProfilePicture(userKey, "caregiver"),
  );
  const [viewMode] = usePortalViewMode("caregiver", "cards");

  const menuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Outside click listener (DEF-007 compliant)
  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(target)
      ) {
        setNotificationsOpen(false);
      }
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(target)
      ) {
        setProfileMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setNotificationsOpen(false);
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Sync profile picture from backend API and custom events
  useEffect(() => {
    let isCancelled = false;
    async function loadProfilePicture() {
      try {
        const response = await fetchMyProfile();
        if (
          !isCancelled &&
          response?.data?.avatar_url &&
          response.data.avatar_url.trim().length > 0
        ) {
          const fetchedUrl = response.data.avatar_url.trim();
          setCachedProfilePicture(userKey, "caregiver", fetchedUrl);
          setAvatarUrl(fetchedUrl);
        }
      } catch {
        // Fallback to local cached avatar if API is offline
      }
    }
    loadProfilePicture();

    const handleProfileUpdate = (event: Event) => {
      const custom = event as CustomEvent<{
        role: string;
        userKey: string;
        avatarUrl: string;
      }>;
      if (custom.detail?.avatarUrl) {
        setAvatarUrl(custom.detail.avatarUrl);
      }
    };

    window.addEventListener(PROFILE_PICTURE_EVENT, handleProfileUpdate);
    return () => {
      isCancelled = true;
      window.removeEventListener(PROFILE_PICTURE_EVENT, handleProfileUpdate);
    };
  }, [userKey]);

  const handleSaveAvatar = async (nextUrl: string | null) => {
    try {
      await updateMyProfilePicture(nextUrl);
      setCachedProfilePicture(userKey, "caregiver", nextUrl);
      setAvatarUrl(nextUrl || DEFAULT_CAREGIVER_AVATAR);
      setAvatarModalOpen(false);
    } catch {
      // Local optimistic update
      setCachedProfilePicture(userKey, "caregiver", nextUrl);
      setAvatarUrl(nextUrl || DEFAULT_CAREGIVER_AVATAR);
      setAvatarModalOpen(false);
    }
  };

  const handleSignOut = () => {
    document.cookie =
      "pc_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    router.push("/");
  };

  const displayCaregiverName = "Nurse Clara Gomez";

  return (
    <div className="min-h-screen bg-paper flex flex-col relative selection:bg-pastel-butter selection:text-crayon-charcoal">
      {/* FLOATING TOPBAR PILL (DEF-006: z-40 strictly below drawers/modals) */}
      <header
        className="fixed top-3 inset-x-0 z-40 flex justify-center px-4 pointer-events-none"
        aria-label="Caregiver Portal Header"
      >
        <div className="w-full max-w-7xl bg-paper-card/90 backdrop-blur-xl border-2 border-pastel-butter/80 shadow-pastel-warm rounded-full px-4 sm:px-6 py-2.5 flex items-center justify-between pointer-events-auto transition-all">
          {/* Left: Navigator Menu & Logo */}
          <div className="flex items-center gap-3">
            <div ref={menuRef} className="relative">
              <button
                type="button"
                aria-label="Open Navigator Menu"
                onClick={() => {
                  setMenuOpen((prev) => !prev);
                  setNotificationsOpen(false);
                  setProfileMenuOpen(false);
                }}
                className="w-10 h-10 rounded-full bg-paper-tint hover:bg-pastel-butter/50 border border-pastel-butter/80 transition-colors flex items-center justify-center text-crayon-charcoal cursor-pointer"
              >
                {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>

              {/* Navigator Popover */}
              {menuOpen && (
                <div
                  data-testid="caregiver-navigator-menu"
                  className="absolute left-0 top-12 w-72 bg-paper-card/95 backdrop-blur-xl border-2 border-pastel-butter shadow-pastel-warm rounded-3xl p-4 z-50 space-y-2 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="pb-2 border-b border-pastel-butter/80 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-pastel-butter text-secondary flex items-center justify-center">
                      <Baby className="size-4" />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-crayon-charcoal">
                        The Purple Cubby
                      </p>
                      <p className="text-[10px] font-semibold text-crayon-muted">
                        Early Years &amp; Daily Care
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Link
                      href="/caregiver"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-2xl text-xs font-bold text-crayon-charcoal bg-pastel-butter/40 transition-colors"
                    >
                      <Layers className="size-4 text-secondary" />
                      <span>Sunflowers Room 1A</span>
                    </Link>
                    <Link
                      href="/teacher"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-2xl text-xs font-semibold text-crayon-espresso hover:bg-paper-tint transition-colors"
                    >
                      <Sparkles className="size-4 text-pastel-mint-deep" />
                      <span>Switch to Teacher Portal</span>
                    </Link>
                    <Link
                      href="/parent"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-2xl text-xs font-semibold text-crayon-espresso hover:bg-paper-tint transition-colors"
                    >
                      <Heart className="size-4 text-terracotta" />
                      <span>Switch to Parent Portal</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Brand Logo & Title */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-terracotta text-on-primary flex items-center justify-center shadow-xs">
                <Baby className="size-5" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-extrabold text-on-surface tracking-tight">
                  ThePurpleCubby
                </span>
                <span className="text-[10px] font-semibold text-on-surface-variant hidden sm:inline">
                  Attendance &amp; Mood
                </span>
              </div>
            </div>

            {/* Sub-Badges */}
            <div className="h-6 w-px bg-outline-variant/40 hidden md:block" />
            <div className="hidden lg:flex items-center gap-1.5 bg-surface-container-low px-3.5 py-1 rounded-full text-xs font-medium text-on-surface border border-outline-variant/30">
              <Flower2 className="size-3.5 text-terracotta" />
              <span>Little Sprout Campus • Early Years</span>
            </div>
            <div className="hidden xl:flex items-center gap-1.5 bg-pastel-butter/30 px-3 py-1 rounded-full text-xs font-bold text-secondary border border-pastel-butter/50">
              <Calendar className="size-3.5 text-secondary" />
              <span>Spring Play Quest in 3 Days</span>
            </div>
          </div>

          {/* Right: Search, Alerts, Messages, Caregiver Profile */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Search */}
            <button
              type="button"
              aria-label="Search records"
              onClick={() => alert("Search: type student name or guardian PIN...")}
              className="w-9 h-9 rounded-full bg-paper-tint hover:bg-pastel-butter/50 border border-pastel-butter/80 transition-colors flex items-center justify-center text-crayon-charcoal cursor-pointer"
            >
              <Search className="size-4" />
            </button>

            {/* Alerts Bell */}
            <div ref={notificationsRef} className="relative">
              <button
                type="button"
                aria-label="Caregiver Alerts"
                onClick={() => {
                  setNotificationsOpen((prev) => !prev);
                  setProfileMenuOpen(false);
                  setMenuOpen(false);
                }}
                className="w-9 h-9 rounded-full bg-paper-tint hover:bg-pastel-butter/50 border border-pastel-butter/80 transition-colors flex items-center justify-center relative text-crayon-charcoal cursor-pointer"
              >
                <Bell className="size-4" />
                <span className="w-2.5 h-2.5 rounded-full bg-terracotta absolute top-1.5 right-1.5 ring-2 ring-paper-card" />
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-12 w-80 bg-paper-card/95 backdrop-blur-xl border-2 border-pastel-butter shadow-pastel-warm rounded-3xl p-4 z-50 space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between border-b border-pastel-butter/80 pb-2">
                    <span className="text-xs font-extrabold text-crayon-charcoal uppercase tracking-wider">
                      Caregiver Routine Alerts
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pastel-peach text-terracotta">
                      2 Actions Due
                    </span>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-paper-tint border border-pastel-peach/50 text-xs">
                    <p className="font-bold text-crayon-charcoal">
                      Medication Schedule (11:30 AM)
                    </p>
                    <p className="text-[11px] text-crayon-espresso mt-0.5">
                      Maya Lin • Amoxicillin 125mg/5mL pending nurse dose.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-paper-tint border border-pastel-butter/50 text-xs">
                    <p className="font-bold text-crayon-charcoal">
                      Unconfirmed Absences (BR-03-01)
                    </p>
                    <p className="text-[11px] text-crayon-espresso mt-0.5">
                      Noah Parker &amp; Charlotte Taylor • Follow-up SLA active.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Parent & Discussions */}
            <button
              type="button"
              aria-label="Parent Discussions"
              onClick={() => alert("Parent Discussions Feed: 1 unread message from Maya Lin's grandmother.")}
              className="w-9 h-9 rounded-full bg-paper-tint hover:bg-pastel-butter/50 border border-pastel-butter/80 transition-colors flex items-center justify-center relative text-crayon-charcoal cursor-pointer"
            >
              <MessageSquare className="size-4" />
              <span className="w-2.5 h-2.5 rounded-full bg-cerulean absolute top-1.5 right-1.5 ring-2 ring-paper-card" />
            </button>

            <div className="h-6 w-px bg-outline-variant/40 mx-1 hidden sm:block" />

            {/* Profile Avatar & Menu */}
            <div ref={profileMenuRef} className="relative flex items-center">
              <button
                type="button"
                aria-label="Caregiver Profile Menu"
                onClick={() => {
                  setProfileMenuOpen((prev) => !prev);
                  setNotificationsOpen(false);
                  setMenuOpen(false);
                }}
                className="relative rounded-full focus:outline-none cursor-pointer group"
                title="Nurse Clara Gomez Profile"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  suppressHydrationWarning
                  alt={displayCaregiverName}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-pastel-butter shadow-xs bg-paper-tint"
                  src={avatarUrl || DEFAULT_CAREGIVER_AVATAR}
                />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 top-12 w-64 bg-paper-card/95 backdrop-blur-xl border-2 border-pastel-butter shadow-pastel-warm rounded-3xl p-3.5 z-50 space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
                  <div className="pb-2 border-b border-pastel-butter/80 px-1 flex items-center gap-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      suppressHydrationWarning
                      alt={displayCaregiverName}
                      src={avatarUrl || DEFAULT_CAREGIVER_AVATAR}
                      className="w-9 h-9 rounded-xl object-cover border border-pastel-butter"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-crayon-charcoal truncate">
                        {displayCaregiverName}
                      </p>
                      <p className="text-[11px] font-medium text-crayon-muted truncate">
                        Room 1A • Sunflowers Toddler
                      </p>
                    </div>
                  </div>
                  <div className="py-1.5 border-b border-pastel-butter/80 px-1 space-y-1">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-crayon-muted px-1">
                      Workspace View
                    </p>
                    <div
                      role="group"
                      aria-label="Account Profile View Mode"
                      className="grid grid-cols-2 gap-1 bg-paper-tint p-1 rounded-2xl border border-pastel-butter/80"
                    >
                      <button
                        type="button"
                        aria-pressed={viewMode === "cards"}
                        onClick={() => {
                          setCachedViewMode("caregiver", "cards");
                          setProfileMenuOpen(false);
                        }}
                        className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          viewMode === "cards"
                            ? "bg-paper-card text-crayon-charcoal shadow-xs"
                            : "text-crayon-muted hover:text-crayon-charcoal"
                        }`}
                      >
                        <LayoutGrid className="size-3.5 shrink-0" />
                        <span>Cards View</span>
                      </button>
                      <button
                        type="button"
                        aria-pressed={viewMode === "compact"}
                        onClick={() => {
                          setCachedViewMode("caregiver", "compact");
                          setProfileMenuOpen(false);
                        }}
                        className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          viewMode === "compact"
                            ? "bg-paper-card text-crayon-charcoal shadow-xs"
                            : "text-crayon-muted hover:text-crayon-charcoal"
                        }`}
                      >
                        <List className="size-3.5 shrink-0" />
                        <span>Compact View</span>
                      </button>
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
                    <Camera className="size-4 shrink-0 text-secondary" />
                    <span>Update Profile Picture</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold text-pastel-peach-deep hover:bg-pastel-peach/30 text-left cursor-pointer"
                  >
                    <LogOut className="size-4 shrink-0" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* MAIN WORKSPACE CANVAS */}
      <main className="w-full pt-20 bg-paper flex-1 relative overflow-hidden flex flex-col">
        {/* DEF-008: Ambient Pastel Background Glow System at z-0 pointer-events-none */}
        <div className="absolute -top-10 left-1/4 w-[32rem] h-[32rem] bg-pastel-butter/40 rounded-full blur-3xl pointer-events-none z-0" />
        <div className="absolute top-36 right-10 w-96 h-96 bg-pastel-mint/35 rounded-full blur-3xl pointer-events-none z-0" />
        <div className="absolute top-[30rem] left-8 w-96 h-96 bg-pastel-peach/30 rounded-full blur-3xl pointer-events-none z-0" />
        <div className="absolute bottom-24 right-1/4 w-80 h-80 bg-pastel-lilac/25 rounded-full blur-3xl pointer-events-none z-0" />

        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 md:px-8 pt-6 pb-12 relative z-10 flex-1">
          {children}
        </div>
      </main>

      {/* Profile Picture Modal (z-[70]) */}
      <ProfilePictureModal
        open={avatarModalOpen}
        onOpenChange={setAvatarModalOpen}
        actorRole="caregiver"
        actorName={displayCaregiverName}
        currentAvatarUrl={avatarUrl || DEFAULT_CAREGIVER_AVATAR}
        onSaveAvatar={handleSaveAvatar}
      />
    </div>
  );
}
