"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Shared portal view-mode preference helpers (`cards` vs `compact`) for Tier 2/3/4 composition. */

export type PortalViewMode = "cards" | "compact";
export type PortalViewScope = "caregiver" | "teacher" | "admin";

export const PORTAL_VIEW_MODE_EVENT = "pc:portal-view-mode";

const STORAGE_KEY_PREFIX = "pc_view_mode_";

export function getCachedViewMode(
  portal: PortalViewScope,
  fallback: PortalViewMode = "cards",
): PortalViewMode {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${portal}`);
    return raw === "compact" || raw === "cards" ? raw : fallback;
  } catch {
    return fallback;
  }
}

export function setCachedViewMode(
  portal: PortalViewScope,
  mode: PortalViewMode,
): PortalViewMode {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(`${STORAGE_KEY_PREFIX}${portal}`, mode);
    } catch {
      // Ignore storage quota errors in private mode
    }
    window.dispatchEvent(
      new CustomEvent(PORTAL_VIEW_MODE_EVENT, {
        detail: { portal, mode },
      }),
    );
  }
  return mode;
}

export function usePortalViewMode(
  portal: PortalViewScope,
  fallback: PortalViewMode = "cards",
): [PortalViewMode, (mode: PortalViewMode) => void] {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === "undefined") return () => {};
      const onCustom = (event: Event) => {
        const detail = (
          event as CustomEvent<{ portal?: string; mode?: PortalViewMode }>
        ).detail;
        if (!detail?.portal || detail.portal === portal) {
          onStoreChange();
        }
      };
      const onStorage = (event: StorageEvent) => {
        if (!event.key || event.key === `${STORAGE_KEY_PREFIX}${portal}`) {
          onStoreChange();
        }
      };
      window.addEventListener(PORTAL_VIEW_MODE_EVENT, onCustom);
      window.addEventListener("storage", onStorage);
      return () => {
        window.removeEventListener(PORTAL_VIEW_MODE_EVENT, onCustom);
        window.removeEventListener("storage", onStorage);
      };
    },
    [portal],
  );

  const mode = useSyncExternalStore(
    subscribe,
    () => getCachedViewMode(portal, fallback),
    () => fallback,
  );

  const updateMode = useCallback(
    (nextMode: PortalViewMode) => {
      setCachedViewMode(portal, nextMode);
    },
    [portal],
  );

  return [mode, updateMode];
}
