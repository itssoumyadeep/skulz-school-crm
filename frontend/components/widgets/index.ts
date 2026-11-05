import type { ReactNode } from "react";

/**
 * Standard cross-project contract for all Tier 3 Functional Domain Widgets.
 *
 * Portability Rules:
 * 1. Widgets in `frontend/components/widgets/` must NEVER import from
 *    `@/app/lib/api`, `@/app/lib/session`, or `next/navigation`.
 * 2. All domain data enters via `data`, capability permissions via boolean
 *    `capabilities` flags (never hardcoded role names), and user actions exit
 *    via typed callback props.
 */
export interface WidgetBaseProps<
  TData,
  TCapabilities extends Record<string, boolean> = Record<string, boolean>,
> {
  /** Primary domain payload rendered by the widget */
  data: TData;
  /** Granular boolean capability flags (e.g. `{ canEdit: true, canApprove: false }`) */
  capabilities?: Partial<TCapabilities>;
  /** Renders skeleton/loading indicator when true */
  isLoading?: boolean;
  /** Renders error banner/alert when non-empty */
  error?: string | null;
  /** Forces all interactive controls into read-only/disabled mode */
  readOnly?: boolean;
  /** Optional slot for parent-injected action buttons in the widget header */
  headerActions?: ReactNode;
  /** Optional slot for parent-injected footer content */
  footerSlot?: ReactNode;
}

