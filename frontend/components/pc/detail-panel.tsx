"use client";

import type { ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type DetailPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  children: ReactNode;
  footerActions: ReactNode;
  description?: ReactNode;
  headerActions?: ReactNode;
};

export function DetailPanel({
  open,
  onOpenChange,
  title,
  children,
  footerActions,
  description,
  headerActions,
}: DetailPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="h-dvh gap-0 overflow-hidden border-border bg-surface p-0 sm:max-w-xl"
      >
        <div className="flex h-full min-h-0 flex-col">
          <SheetHeader className="shrink-0 border-b border-border px-5 py-4 pr-14">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <SheetTitle className="text-lg">{title}</SheetTitle>
                {description && (
                  <SheetDescription className="mt-1">
                    {description}
                  </SheetDescription>
                )}
              </div>
              {headerActions && (
                <div className="flex shrink-0 items-center gap-2">
                  {headerActions}
                </div>
              )}
            </div>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {children}
          </div>
          <footer className="sticky bottom-0 z-10 shrink-0 border-t border-border bg-surface px-5 py-4">
            {footerActions}
          </footer>
        </div>
      </SheetContent>
    </Sheet>
  );
}
