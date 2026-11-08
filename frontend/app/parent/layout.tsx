"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Home,
  CreditCard,
  Calendar,
  Camera,
  GraduationCap,
} from "lucide-react";
import { AppShell, type SidebarNavItem } from "@/components/pc/app-shell";
import {
  DEFAULT_PARENT_AVATAR,
  PROFILE_PICTURE_EVENT,
  ProfilePictureModal,
  getCachedProfilePicture,
  setCachedProfilePicture,
} from "@/components/pc/profile-picture-modal";
import { fetchMyProfile, updateMyProfilePicture } from "@/app/lib/api";
import { getClientSession, type SessionClaims } from "@/app/lib/session";

const PARENT_NAVIGATION: readonly SidebarNavItem[] = [
  {
    label: "Family Overview",
    icon: <Home className="w-4 h-4" />,
    href: "/parent",
    exact: true,
  },
  {
    label: "Invoices & Billing",
    icon: <CreditCard className="w-4 h-4" />,
    href: "/parent/billing",
  },
  {
    label: "Events & Slips",
    icon: <Calendar className="w-4 h-4" />,
    href: "/parent/events",
  },
  {
    label: "New Application",
    icon: <GraduationCap className="w-4 h-4" />,
    href: "/apply",
  },
];

export default function ParentLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [session] = useState<SessionClaims | null>(() => getClientSession());
  const userKey = session?.user_id || session?.email || "default-parent";
  const displayParentName = session?.user_name || "Elena Lin";

  const [avatarUrl, setAvatarUrl] = useState<string>(() =>
    getCachedProfilePicture(userKey, "parent"),
  );
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function syncProfilePicture() {
      try {
        const res = await fetchMyProfile();
        if (!cancelled && res.data?.avatar_url) {
          const synced = setCachedProfilePicture(
            userKey,
            "parent",
            res.data.avatar_url,
          );
          setAvatarUrl(synced);
        }
      } catch {
        // Offline or demo session fallback uses localStorage cache
      }
    }
    void syncProfilePicture();

    const handleAvatarEvent = (event: Event) => {
      const custom = event as CustomEvent<{
        role?: string;
        avatarUrl?: string;
      }>;
      if (custom.detail?.role === "parent" && custom.detail.avatarUrl) {
        setAvatarUrl(custom.detail.avatarUrl);
      }
    };
    window.addEventListener(PROFILE_PICTURE_EVENT, handleAvatarEvent);
    return () => {
      cancelled = true;
      window.removeEventListener(PROFILE_PICTURE_EVENT, handleAvatarEvent);
    };
  }, [userKey]);

  const handleSaveAvatar = async (nextUrl: string | null) => {
    const resolved = setCachedProfilePicture(userKey, "parent", nextUrl);
    setAvatarUrl(resolved);
    try {
      await updateMyProfilePicture(nextUrl);
    } catch {
      // Cached locally when backend is in unsigned demo mode
    }
  };

  const handleSignOut = () => {
    document.cookie =
      "pc_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/apply");
  };

  return (
    <AppShell
      navigation={PARENT_NAVIGATION}
      brand={{
        name: "Maple Leaf Academy",
        description: "Parent & Family Portal",
        mark: (
          <div className="w-8 h-8 rounded-xl bg-pastel-peach-deep text-white flex items-center justify-center font-bold text-xs shadow-xs">
            ML
          </div>
        ),
      }}
      title="Parent Portal"
      user={{
        name: displayParentName,
        email: session?.email || "parent@family.example",
        avatarUrl: avatarUrl || DEFAULT_PARENT_AVATAR,
      }}
      userMenuActions={[
        {
          label: "Update Profile Picture",
          onSelect: () => setAvatarModalOpen(true),
        },
      ]}
      onSignOut={handleSignOut}
    >
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-5">
        {/* Parent Profile Header Strip with Quick Photo Upload Trigger */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-pastel-butter bg-paper-card px-4 py-3 shadow-pastel">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAvatarModalOpen(true)}
              className="group relative rounded-2xl focus:outline-none cursor-pointer"
              title="Update Parent Profile Picture"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarUrl || DEFAULT_PARENT_AVATAR}
                alt={displayParentName}
                className="w-12 h-12 rounded-2xl object-cover border-2 border-pastel-sun shadow-xs"
              />
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-crayon-charcoal text-paper flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                <Camera className="size-3" />
              </span>
            </button>
            <div>
              <p className="text-sm font-extrabold text-crayon-charcoal">
                {displayParentName}
              </p>
              <p className="text-xs font-medium text-crayon-muted">
                Verified Parent &amp; Guardian Account
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAvatarModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-pastel-butter hover:bg-pastel-sun text-crayon-charcoal text-xs font-bold border border-pastel-sun shadow-xs transition cursor-pointer"
          >
            <Camera className="size-3.5" />
            <span>Update Profile Picture</span>
          </button>
        </div>

        {children}
      </div>

      <ProfilePictureModal
        open={avatarModalOpen}
        onOpenChange={setAvatarModalOpen}
        actorRole="parent"
        actorName={displayParentName}
        currentAvatarUrl={avatarUrl || DEFAULT_PARENT_AVATAR}
        onSaveAvatar={handleSaveAvatar}
      />
    </AppShell>
  );
}
