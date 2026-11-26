"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  initClientTelemetry,
  sanitizeRoutePath,
  trackTelemetryEvent,
} from "@/app/lib/telemetry";

export function TelemetryProvider() {
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    initClientTelemetry();
  }, []);

  useEffect(() => {
    trackTelemetryEvent("route_viewed", {
      route: sanitizeRoutePath(pathname),
    });
  }, [pathname]);

  return null;
}
