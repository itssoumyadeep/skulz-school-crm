const TELEMETRY_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ??
  (typeof window !== "undefined"
    ? "/api/v1"
    : "http://127.0.0.1:8000/api/v1");

const TELEMETRY_ENABLED =
  String(process.env.NEXT_PUBLIC_TELEMETRY_ENABLED ?? "true").toLowerCase() !==
  "false";

const SENSITIVE_KEYS = [
  "password",
  "token",
  "secret",
  "email",
  "phone",
  "dob",
  "pickup_pin",
  "supervisor_pin",
  "allergies",
  "conditions",
  "medications",
  "health",
  "student_name",
  "full_name",
];

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const JWT_RE = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}(?:\.[A-Za-z0-9_-]*)?/g;
const UUID_SEGMENT_RE =
  /\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;
const NUMERIC_SEGMENT_RE = /\/\d+(?=\/|$)/g;

let clientTelemetryInitialized = false;

export function createRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `crm-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export function sanitizeRoutePath(pathname: string): string {
  if (!pathname) return "/";
  return pathname
    .split("?")[0]
    .replace(UUID_SEGMENT_RE, "/:id")
    .replace(NUMERIC_SEGMENT_RE, "/:id")
    .slice(0, 200);
}

export function scrubProperties(
  props?: Record<string, unknown>,
): Record<string, unknown> {
  if (!props || typeof props !== "object") {
    return {};
  }
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    const lower = key.toLowerCase();
    if (SENSITIVE_KEYS.some((tok) => lower.includes(tok))) {
      clean[key] = "[REDACTED]";
      continue;
    }
    if (typeof value === "string") {
      clean[key] = value
        .replace(JWT_RE, "[REDACTED_JWT]")
        .replace(EMAIL_RE, "[REDACTED_EMAIL]")
        .slice(0, 256);
    } else if (
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      clean[key] = value;
    }
  }
  return clean;
}

export function trackTelemetryEvent(
  eventName: string,
  properties: Record<string, unknown> = {},
  options: { statusCode?: number; durationMs?: number; path?: string } = {},
): void {
  if (!TELEMETRY_ENABLED || typeof window === "undefined") {
    return;
  }
  try {
    const safePath = sanitizeRoutePath(
      options.path ?? window.location.pathname ?? "/",
    );
    const reqId = createRequestId();
    void fetch(`${TELEMETRY_API_BASE.replace(/\/+$/, "")}/telemetry/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": reqId,
      },
      body: JSON.stringify({
        app: "skool_crm_web",
        events: [
          {
            event_name: String(eventName || "unknown").slice(0, 80),
            path: safePath,
            status_code:
              typeof options.statusCode === "number"
                ? options.statusCode
                : null,
            duration_ms:
              typeof options.durationMs === "number"
                ? options.durationMs
                : null,
            properties: scrubProperties(properties),
          },
        ],
      }),
      keepalive: true,
    }).catch(() => {
      // Telemetry failures must remain silent.
    });
  } catch {
    // Ignore client telemetry serialization errors.
  }
}

export function initClientTelemetry(): void {
  if (
    clientTelemetryInitialized ||
    typeof window === "undefined" ||
    !TELEMETRY_ENABLED
  ) {
    return;
  }
  clientTelemetryInitialized = true;

  window.addEventListener("error", (event) => {
    trackTelemetryEvent("client_error", {
      message: event?.message || "window_error",
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason =
      event?.reason instanceof Error
        ? event.reason.message
        : String(event?.reason || "unhandled_rejection");
    trackTelemetryEvent("client_unhandled_rejection", { message: reason });
  });

  if (typeof PerformanceObserver === "function") {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last && typeof last.startTime === "number") {
          trackTelemetryEvent(
            "web_vital_lcp",
            { metric: "LCP" },
            { durationMs: Math.round(last.startTime) },
          );
          lcpObserver.disconnect();
        }
      });
      lcpObserver.observe({
        type: "largest-contentful-paint",
        buffered: true,
      });
    } catch {
      // Ignore if browser does not support LCP observer.
    }
  }
}
