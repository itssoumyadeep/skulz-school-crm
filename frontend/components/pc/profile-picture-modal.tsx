"use client";

import { useRef, useState, type ChangeEvent } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Bot,
  Calculator,
  Calendar,
  CalendarRange,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Clock,
  ExternalLink,
  FileCheck2,
  Flame,
  FlaskConical,
  GraduationCap,
  HeartPulse,
  LayoutDashboard,
  LayoutGrid,
  List,
  LogOut,
  MessageSquare,
  MessageSquareMore,
  Mic,
  Minus,
  PenTool,
  Pencil,
  Play,
  RotateCcw,
  Send,
  Settings,
  Shield,
  Siren,
  Sparkles,
  ArrowLeftRight,
  TrendingUp,
  Upload,
  User,
  UserCheck,
  Users,
  X,
  Zap,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";

function buildSvgDataUri(svgMarkup: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgMarkup.trim())}`;
}

export const DEFAULT_TEACHER_AVATAR = buildSvgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none">
  <rect width="160" height="160" rx="36" fill="rgb(254, 240, 138)"/>
  <circle cx="130" cy="30" r="38" fill="rgb(167, 243, 208)" fill-opacity="0.65"/>
  <circle cx="28" cy="132" r="42" fill="rgb(254, 205, 211)" fill-opacity="0.65"/>
  <path d="M36 152C38 122 57 108 80 108C103 108 122 122 124 152" fill="rgb(30, 27, 24)"/>
  <path d="M58 112L80 132L102 112" fill="rgb(233, 213, 255)"/>
  <path d="M44 74C44 48 59 32 80 32C101 32 116 48 116 74C116 94 108 108 98 114C103 100 104 84 102 72C92 72 68 70 56 62C52 76 54 96 60 112C49 106 44 92 44 74Z" fill="rgb(74, 52, 46)"/>
  <rect x="69" y="94" width="22" height="22" rx="10" fill="rgb(246, 198, 168)"/>
  <ellipse cx="80" cy="74" rx="26" ry="30" fill="rgb(251, 214, 188)"/>
  <path d="M52 68C54 46 68 36 84 36C99 36 110 46 110 66C97 64 84 60 72 52C65 60 59 65 52 68Z" fill="rgb(74, 52, 46)"/>
  <rect x="57" y="66" width="19" height="13" rx="6" stroke="rgb(30, 27, 24)" stroke-width="3" fill="rgb(255, 255, 255)" fill-opacity="0.45"/>
  <rect x="84" y="66" width="19" height="13" rx="6" stroke="rgb(30, 27, 24)" stroke-width="3" fill="rgb(255, 255, 255)" fill-opacity="0.45"/>
  <line x1="76" y1="72" x2="84" y2="72" stroke="rgb(30, 27, 24)" stroke-width="3"/>
  <circle cx="66.5" cy="72.5" r="2.6" fill="rgb(30, 27, 24)"/>
  <circle cx="93.5" cy="72.5" r="2.6" fill="rgb(30, 27, 24)"/>
  <circle cx="60" cy="83" r="4.5" fill="rgb(244, 63, 94)" fill-opacity="0.28"/>
  <circle cx="100" cy="83" r="4.5" fill="rgb(244, 63, 94)" fill-opacity="0.28"/>
  <path d="M71 87C74 91 86 91 89 87" stroke="rgb(190, 18, 60)" stroke-width="3" stroke-linecap="round"/>
</svg>
`);

export const DEFAULT_PARENT_AVATAR = buildSvgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none">
  <rect width="160" height="160" rx="36" fill="rgb(224, 242, 254)"/>
  <circle cx="128" cy="32" r="36" fill="rgb(254, 240, 138)" fill-opacity="0.7"/>
  <circle cx="30" cy="130" r="38" fill="rgb(233, 213, 255)" fill-opacity="0.7"/>
  <path d="M36 152C39 122 57 108 80 108C103 108 121 122 124 152" fill="rgb(3, 105, 161)"/>
  <rect x="69" y="94" width="22" height="22" rx="10" fill="rgb(238, 186, 152)"/>
  <ellipse cx="80" cy="74" rx="26" ry="29" fill="rgb(246, 198, 168)"/>
  <path d="M52 68C52 45 65 35 81 35C97 35 109 46 108 67C98 59 86 55 72 56C63 57 56 62 52 68Z" fill="rgb(30, 27, 24)"/>
  <circle cx="69" cy="73" r="2.8" fill="rgb(30, 27, 24)"/>
  <circle cx="91" cy="73" r="2.8" fill="rgb(30, 27, 24)"/>
  <path d="M71 86C75 91 85 91 89 86" stroke="rgb(126, 34, 206)" stroke-width="3" stroke-linecap="round"/>
</svg>
`);

export const CO_TEACHER_AVATAR_1 = buildSvgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <rect width="120" height="120" rx="60" fill="rgb(167, 243, 208)"/>
  <path d="M26 116C28 92 43 82 60 82C77 82 92 92 94 116" fill="rgb(6, 95, 70)"/>
  <ellipse cx="60" cy="54" rx="20" ry="22" fill="rgb(243, 194, 162)"/>
  <path d="M39 50C40 33 49 26 60 26C72 26 81 34 81 50C72 44 62 42 52 43C46 44 42 47 39 50Z" fill="rgb(30, 27, 24)"/>
  <circle cx="52" cy="54" r="2.3" fill="rgb(30, 27, 24)"/>
  <circle cx="68" cy="54" r="2.3" fill="rgb(30, 27, 24)"/>
  <path d="M53 64C56 67 64 67 67 64" stroke="rgb(30, 27, 24)" stroke-width="2.5" stroke-linecap="round"/>
</svg>
`);

export const CO_TEACHER_AVATAR_2 = buildSvgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <rect width="120" height="120" rx="60" fill="rgb(233, 213, 255)"/>
  <path d="M26 116C28 92 43 82 60 82C77 82 92 92 94 116" fill="rgb(126, 34, 206)"/>
  <ellipse cx="60" cy="54" rx="20" ry="22" fill="rgb(212, 154, 118)"/>
  <path d="M38 52C38 33 48 25 60 25C73 25 82 34 82 52C75 46 65 43 55 44C47 45 41 48 38 52Z" fill="rgb(30, 27, 24)"/>
  <circle cx="52" cy="54" r="2.3" fill="rgb(30, 27, 24)"/>
  <circle cx="68" cy="54" r="2.3" fill="rgb(30, 27, 24)"/>
  <path d="M53 64C56 67 64 67 67 64" stroke="rgb(30, 27, 24)" stroke-width="2.5" stroke-linecap="round"/>
</svg>
`);

export interface PresetAvatarOption {
  id: string;
  label: string;
  subtitle: string;
  url: string;
}

export const PRESET_AVATARS: readonly PresetAvatarOption[] = [
  {
    id: "educator-sarah",
    label: "Sunbeam Educator",
    subtitle: "Warm glasses & lilac collar",
    url: DEFAULT_TEACHER_AVATAR,
  },
  {
    id: "parent-sky",
    label: "Sky Caregiver",
    subtitle: "Cerulean portrait",
    url: DEFAULT_PARENT_AVATAR,
  },
  {
    id: "mentor-mint",
    label: "Mint STEM Lead",
    subtitle: "Emerald studio badge",
    url: CO_TEACHER_AVATAR_1,
  },
  {
    id: "mentor-lilac",
    label: "Lilac Arts Coach",
    subtitle: "Lavender studio badge",
    url: CO_TEACHER_AVATAR_2,
  },
  {
    id: "peach-guardian",
    label: "Coral Family Lead",
    subtitle: "Rose & buttercup tone",
    url: buildSvgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none">
        <rect width="160" height="160" rx="36" fill="rgb(254, 205, 211)"/>
        <circle cx="128" cy="34" r="34" fill="rgb(254, 240, 138)" fill-opacity="0.75"/>
        <path d="M36 152C39 122 57 108 80 108C103 108 121 122 124 152" fill="rgb(190, 18, 60)"/>
        <ellipse cx="80" cy="74" rx="26" ry="29" fill="rgb(226, 168, 132)"/>
        <path d="M49 72C49 46 63 34 80 34C98 34 111 46 111 72C102 62 90 58 78 58C65 58 55 63 49 72Z" fill="rgb(30, 27, 24)"/>
        <circle cx="69" cy="73" r="2.8" fill="rgb(30, 27, 24)"/>
        <circle cx="91" cy="73" r="2.8" fill="rgb(30, 27, 24)"/>
        <path d="M71 86C75 91 85 91 89 86" stroke="rgb(255, 255, 255)" stroke-width="3" stroke-linecap="round"/>
      </svg>
    `),
  },
  {
    id: "butter-scholar",
    label: "Marigold Homeroom",
    subtitle: "Sunflower & mint tone",
    url: buildSvgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none">
        <rect width="160" height="160" rx="36" fill="rgb(167, 243, 208)"/>
        <circle cx="34" cy="34" r="34" fill="rgb(254, 240, 138)" fill-opacity="0.75"/>
        <path d="M36 152C39 122 57 108 80 108C103 108 121 122 124 152" fill="rgb(30, 27, 24)"/>
        <ellipse cx="80" cy="74" rx="26" ry="29" fill="rgb(251, 214, 188)"/>
        <path d="M51 66C53 44 66 34 80 34C95 34 107 44 109 66C97 58 84 55 71 56C62 57 55 61 51 66Z" fill="rgb(180, 83, 9)"/>
        <circle cx="69" cy="73" r="2.8" fill="rgb(30, 27, 24)"/>
        <circle cx="91" cy="73" r="2.8" fill="rgb(30, 27, 24)"/>
        <path d="M71 86C75 91 85 91 89 86" stroke="rgb(6, 95, 70)" stroke-width="3" stroke-linecap="round"/>
      </svg>
    `),
  },
];

export const PROFILE_PICTURE_EVENT = "pc-profile-picture-updated";

export function getCachedProfilePicture(
  userKey: string,
  role: "teacher" | "parent",
): string {
  const defaultAvatar =
    role === "teacher" ? DEFAULT_TEACHER_AVATAR : DEFAULT_PARENT_AVATAR;
  if (typeof window === "undefined") {
    return defaultAvatar;
  }
  try {
    const stored =
      window.localStorage.getItem(`pc_avatar_${role}_${userKey}`) ??
      window.localStorage.getItem(`pc_avatar_${role}`);
    if (stored && stored.trim().length > 0) {
      return stored;
    }
  } catch {
    // Ignore localStorage access restrictions
  }
  return defaultAvatar;
}

export function setCachedProfilePicture(
  userKey: string,
  role: "teacher" | "parent",
  avatarUrl: string | null,
): string {
  const resolved =
    avatarUrl && avatarUrl.trim().length > 0
      ? avatarUrl.trim()
      : role === "teacher"
        ? DEFAULT_TEACHER_AVATAR
        : DEFAULT_PARENT_AVATAR;

  if (typeof window !== "undefined") {
    try {
      if (avatarUrl && avatarUrl.trim().length > 0) {
        window.localStorage.setItem(`pc_avatar_${role}_${userKey}`, resolved);
        window.localStorage.setItem(`pc_avatar_${role}`, resolved);
      } else {
        window.localStorage.removeItem(`pc_avatar_${role}_${userKey}`);
        window.localStorage.removeItem(`pc_avatar_${role}`);
      }
      window.dispatchEvent(
        new CustomEvent(PROFILE_PICTURE_EVENT, {
          detail: { role, userKey, avatarUrl: resolved },
        }),
      );
    } catch {
      // Ignore storage quota errors
    }
  }
  return resolved;
}

/**
 * Local SVG icon renderer for all Material Symbols ligature names used across the Teacher Portal.
 * Renders crisp Lucide SVG vectors so icons never fail or show raw ligature text.
 */
export function TeacherIcon({
  name,
  className = "size-4",
}: {
  name: string;
  className?: string;
}) {
  switch (name) {
    case "dashboard":
      return <LayoutDashboard aria-hidden="true" className={className} />;
    case "co_present":
      return <UserCheck aria-hidden="true" className={className} />;
    case "menu_book":
      return <BookOpen aria-hidden="true" className={className} />;
    case "assignment":
      return <ClipboardList aria-hidden="true" className={className} />;
    case "chat_bubble":
      return <MessageSquare aria-hidden="true" className={className} />;
    case "calendar_month":
      return <Calendar aria-hidden="true" className={className} />;
    case "shield":
      return <Shield aria-hidden="true" className={className} />;
    case "swap_horiz":
      return <ArrowLeftRight aria-hidden="true" className={className} />;
    case "settings":
      return <Settings aria-hidden="true" className={className} />;
    case "draw":
      return <PenTool aria-hidden="true" className={className} />;
    case "notifications":
      return <Bell aria-hidden="true" className={className} />;
    case "medical_services":
      return <HeartPulse aria-hidden="true" className={className} />;
    case "logout":
      return <LogOut aria-hidden="true" className={className} />;
    case "check":
      return <Check aria-hidden="true" className={className} />;
    case "school":
      return <GraduationCap aria-hidden="true" className={className} />;
    case "expand_more":
      return <ChevronDown aria-hidden="true" className={className} />;
    case "grid_view":
      return <LayoutGrid aria-hidden="true" className={className} />;
    case "view_list":
      return <List aria-hidden="true" className={className} />;
    case "trending_up":
      return <TrendingUp aria-hidden="true" className={className} />;
    case "open_in_new":
      return <ExternalLink aria-hidden="true" className={className} />;
    case "edit":
      return <Pencil aria-hidden="true" className={className} />;
    case "how_to_reg":
      return <UserCheck aria-hidden="true" className={className} />;
    case "science":
      return <FlaskConical aria-hidden="true" className={className} />;
    case "check_circle":
      return <CheckCircle2 aria-hidden="true" className={className} />;
    case "arrow_forward":
      return <ArrowRight aria-hidden="true" className={className} />;
    case "calculate":
      return <Calculator aria-hidden="true" className={className} />;
    case "local_fire_department":
      return <Flame aria-hidden="true" className={className} />;
    case "assignment_turned_in":
      return <FileCheck2 aria-hidden="true" className={className} />;
    case "auto_awesome":
      return <Sparkles aria-hidden="true" className={className} />;
    case "groups":
      return <Users aria-hidden="true" className={className} />;
    case "timer":
      return <Clock aria-hidden="true" className={className} />;
    case "bolt":
      return <Zap aria-hidden="true" className={className} />;
    case "play_arrow":
      return <Play aria-hidden="true" className={className} />;
    case "mic":
      return <Mic aria-hidden="true" className={className} />;
    case "calendar_view_day":
      return <CalendarRange aria-hidden="true" className={className} />;
    case "warning":
      return <AlertTriangle aria-hidden="true" className={className} />;
    case "rate_review":
      return <MessageSquareMore aria-hidden="true" className={className} />;
    case "send":
      return <Send aria-hidden="true" className={className} />;
    case "fact_check":
      return <ClipboardCheck aria-hidden="true" className={className} />;
    case "close":
      return <X aria-hidden="true" className={className} />;
    case "emergency":
      return <Siren aria-hidden="true" className={className} />;
    case "remove":
      return <Minus aria-hidden="true" className={className} />;
    case "smart_toy":
      return <Bot aria-hidden="true" className={className} />;
    case "person":
      return <User aria-hidden="true" className={className} />;
    case "arrow_upward":
      return <ArrowUp aria-hidden="true" className={className} />;
    case "photo_camera":
      return <Camera aria-hidden="true" className={className} />;
    default:
      return <Sparkles aria-hidden="true" className={className} />;
  }
}

export interface ProfilePictureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actorRole: "teacher" | "parent";
  actorName: string;
  currentAvatarUrl: string;
  onSaveAvatar: (nextAvatarUrl: string | null) => Promise<void> | void;
}

export function ProfilePictureModal({
  open,
  onOpenChange,
  actorRole,
  actorName,
  currentAvatarUrl,
  onSaveAvatar,
}: ProfilePictureModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedUrl, setSelectedUrl] = useState<string>(currentAvatarUrl);
  const [customUrlInput, setCustomUrlInput] = useState<string>("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!open) return null;

  const activePreview = selectedUrl || currentAvatarUrl;

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    if (!file.type.startsWith("image/")) {
      setUploadError("Please choose a PNG, JPG, or WebP image file.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setUploadError("Please choose an image smaller than 8 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (!result) {
        setUploadError("Could not read the selected image file.");
        return;
      }

      // Resize and center-crop on a 256x256 canvas so the data URL is compact and crisp
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const targetSize = 256;
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setSelectedUrl(result);
          return;
        }
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(
          img,
          sx,
          sy,
          minSide,
          minSide,
          0,
          0,
          targetSize,
          targetSize,
        );
        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.88);
        setSelectedUrl(compressedDataUrl);
      };
      img.onerror = () => {
        setSelectedUrl(result);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCustomUrl = () => {
    const trimmed = customUrlInput.trim();
    if (!trimmed) return;
    if (
      !trimmed.startsWith("https://") &&
      !trimmed.startsWith("http://") &&
      !trimmed.startsWith("data:image/") &&
      !trimmed.startsWith("/")
    ) {
      setUploadError("Enter a valid https:// or data:image/ URL.");
      return;
    }
    setUploadError(null);
    setSelectedUrl(trimmed);
    setCustomUrlInput("");
  };

  const handleSave = async () => {
    setIsSaving(true);
    setUploadError(null);
    try {
      await onSaveAvatar(activePreview);
      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Could not save profile picture.";
      setUploadError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefault = async () => {
    const fallback =
      actorRole === "teacher" ? DEFAULT_TEACHER_AVATAR : DEFAULT_PARENT_AVATAR;
    setSelectedUrl(fallback);
    setIsSaving(true);
    try {
      await onSaveAvatar(null);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={() => onOpenChange(false)}
        className="fixed inset-0 bg-crayon-charcoal/50 backdrop-blur-xs"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Update Profile Picture"
        className="relative z-10 w-full max-w-lg rounded-3xl border-2 border-pastel-butter bg-paper-card p-6 shadow-pastel-warm text-crayon-charcoal space-y-5"
      >
        <div className="flex items-start justify-between gap-3 border-b border-pastel-butter/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-pastel-butter border border-pastel-sun flex items-center justify-center text-crayon-charcoal">
              <Camera className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-crayon-charcoal">
                Update Profile Picture
              </h2>
              <p className="text-xs font-medium text-crayon-espresso">
                {actorRole === "teacher"
                  ? "Educator Staff Portal"
                  : "Parent & Family Portal"}{" "}
                • {actorName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full bg-paper-tint hover:bg-pastel-butter/60 flex items-center justify-center text-crayon-muted hover:text-crayon-charcoal cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Live Preview + Upload Photo Button */}
        <div className="flex flex-col sm:flex-row items-center gap-5 rounded-2xl bg-paper-tint p-4 border border-pastel-butter">
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activePreview}
                alt={actorName}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-pastel-sun shadow-pastel bg-paper-card"
              />
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-pastel-mint border-2 border-paper-card flex items-center justify-center text-pastel-mint-deep">
                <Check className="size-3.5" />
              </span>
            </div>
            {/* Circular topbar preview */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activePreview}
              alt={`${actorName} circular badge`}
              className="w-11 h-11 rounded-full object-cover ring-2 ring-pastel-sun shadow-xs bg-paper-card"
            />
          </div>

          <div className="flex-1 space-y-2 text-center sm:text-left">
            <p className="text-xs font-bold text-crayon-charcoal">
              Upload from Device or Choose a Studio Portrait
            </p>
            <p className="text-[11px] text-crayon-espresso leading-relaxed">
              Supports PNG, JPG, or WebP. Photos are automatically center-cropped
              to a crisp 256×256 square.
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-crayon-charcoal hover:bg-crayon-espresso text-paper text-xs font-extrabold shadow-xs transition cursor-pointer"
              >
                <Upload className="size-3.5" />
                <span>Upload Photo</span>
              </button>
              <button
                type="button"
                onClick={handleResetDefault}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-paper-card hover:bg-pastel-butter/50 border border-pastel-butter text-crayon-charcoal text-xs font-bold transition cursor-pointer"
              >
                <RotateCcw className="size-3.5" />
                <span>Reset Default</span>
              </button>
            </div>
          </div>
        </div>

        {/* Curated Oil Pastel Studio Portraits */}
        <div className="space-y-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-crayon-muted block">
            Or Pick an Illustrated Portrait
          </span>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
            {PRESET_AVATARS.map((preset) => {
              const isSelected = activePreview === preset.url;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setUploadError(null);
                    setSelectedUrl(preset.url);
                  }}
                  className={`group flex flex-col items-center gap-1.5 p-2 rounded-2xl border-2 transition cursor-pointer ${
                    isSelected
                      ? "border-pastel-peach-deep bg-pastel-butter/40 shadow-xs"
                      : "border-pastel-butter/70 bg-paper-tint hover:border-pastel-sun"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preset.url}
                    alt={preset.label}
                    className="w-12 h-12 rounded-xl object-cover"
                  />
                  <span className="text-[10px] font-bold text-crayon-charcoal text-center leading-tight line-clamp-1">
                    {preset.label.split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional Image URL Input */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-crayon-espresso block">
            Or paste an image URL
          </label>
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={customUrlInput}
              onChange={(e) => setCustomUrlInput(e.target.value)}
              placeholder="https://example.com/my-portrait.jpg"
              className="flex-1 rounded-full border border-pastel-butter bg-paper-tint px-3.5 py-2 text-xs text-crayon-charcoal placeholder:text-crayon-muted focus:outline-none focus:border-pastel-sun"
            />
            <button
              type="button"
              onClick={handleApplyCustomUrl}
              className="px-3.5 py-2 rounded-full bg-pastel-butter hover:bg-pastel-sun text-crayon-charcoal text-xs font-bold border border-pastel-sun cursor-pointer"
            >
              Preview URL
            </button>
          </div>
        </div>

        {uploadError && (
          <div
            role="alert"
            className="rounded-2xl border border-pastel-peach bg-pastel-peach/30 px-3.5 py-2 text-xs font-bold text-pastel-peach-deep"
          >
            {uploadError}
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 border-t border-pastel-butter/80 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-pastel-peach-deep hover:bg-crayon-charcoal text-paper text-xs font-extrabold shadow-pastel transition cursor-pointer disabled:opacity-50"
          >
            <Check className="size-4" />
            <span>{isSaving ? "Saving..." : "Save Profile Picture"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
