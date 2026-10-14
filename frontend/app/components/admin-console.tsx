"use client";

import Link from "next/link";
import useSWR from "swr";
import { Activity, Banknote, ClipboardList, GraduationCap } from "lucide-react";

import {
  fetchAdmissionsPipeline,
  fetchAnalyticsDashboard,
  type EnrollmentCase,
} from "@/app/lib/api";
import {
  createDataTableColumnHelper,
  DataTable,
  KpiCard,
  SectionPanel,
  StatusPill,
} from "@/components/pc";
import { Button } from "@/components/ui/button";

type DashboardRole = "admin" | "owner";
type AnalyticsDashboard = {
  enrollment_funnel?: Record<string, number>;
  financial?: {
    outstanding?: number;
    invoiced?: number;
    revenue?: number;
  };
  attendance?: {
    attendance_rate?: number | null;
    total_records?: number;
  };
};

const applicationColumns = createDataTableColumnHelper<EnrollmentCase>();

function statusVariant(status: string) {
  if (["Active", "Accepted"].includes(status)) return "success" as const;
  if (["Pending_Clarification", "Pending", "Under_Review"].includes(status)) {
    return "warning" as const;
  }
  if (status === "Rejected") return "danger" as const;
  return "info" as const;
}

function applicationColumnsFor(role: DashboardRole) {
  const admissionsHref =
    role === "owner" ? "/governance/owner/admissions" : "/admin/admissions";

  return [
    applicationColumns.accessor((application) => application.student.name, {
      id: "student",
      header: "Student",
      cell: ({ row }) => (
        <span className="font-medium text-foreground">
          {row.original.student.name || "Unnamed student"}
        </span>
      ),
    }),
    applicationColumns.accessor((application) => application.student.grade, {
      id: "grade",
      header: "Grade / programme",
    }),
    applicationColumns.accessor((application) => application.status, {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusPill variant={statusVariant(row.original.status)}>
          {row.original.status.replaceAll("_", " ")}
        </StatusPill>
      ),
    }),
    applicationColumns.accessor(
      (application) =>
        application.updated_at
          ? new Date(application.updated_at).toLocaleDateString()
          : "—",
      {
        id: "updated",
        header: "Last updated",
      },
    ),
    applicationColumns.display({
      id: "action",
      header: "Action",
      cell: () => (
        <Button asChild size="sm" variant="outline">
          <Link href={admissionsHref}>Open queue</Link>
        </Button>
      ),
    }),
  ];
}

export function AdminConsole({ role = "admin" }: { role?: DashboardRole }) {
  const {
    data: analyticsResponse,
    error: analyticsError,
    isLoading: analyticsLoading,
  } = useSWR(["tenant-analytics-dashboard", role], () =>
    fetchAnalyticsDashboard(),
  );
  const {
    data: applicationsResponse,
    error: applicationsError,
    isLoading: applicationsLoading,
  } = useSWR(["tenant-admissions-pipeline", role], fetchAdmissionsPipeline);

  const analytics = analyticsResponse?.data as AnalyticsDashboard | undefined;
  const applications = applicationsResponse?.data ?? [];
  const funnel = analytics?.enrollment_funnel ?? {};
  const financial = analytics?.financial ?? {};
  const attendance = analytics?.attendance ?? {};
  const pendingApplications = applications.filter(
    (application) =>
      !application.workflow_data.is_draft &&
      ["Pending", "Under_Review", "Pending_Clarification"].includes(
        application.status,
      ),
  ).length;
  const attendanceValue =
    attendance.total_records === 0
      ? "No records"
      : attendance.attendance_rate == null
        ? "—"
        : `${attendance.attendance_rate}%`;
  const currency = (amount?: number) =>
    new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: 0,
    }).format(amount ?? 0);
  const admissionsHref =
    role === "owner" ? "/governance/owner/admissions" : "/admin/admissions";

  return (
    <div className="space-y-6">
      {(analyticsError || applicationsError) && (
        <p className="text-sm text-destructive" role="alert">
          Dashboard data could not be loaded. Check your connection and try
          again.
        </p>
      )}

      <section
        aria-label="School overview"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <KpiCard
          label="Applications to review"
          value={
            applicationsLoading
              ? "Loading…"
              : applicationsError
                ? "Unavailable"
                : pendingApplications
          }
          icon={<ClipboardList aria-hidden="true" />}
          link={{ href: admissionsHref, label: "Open queue" }}
        />
        <KpiCard
          label="Outstanding balance"
          value={
            analyticsLoading
              ? "Loading…"
              : analyticsError
                ? "Unavailable"
                : currency(financial.outstanding)
          }
          icon={<Banknote aria-hidden="true" />}
        />
        <KpiCard
          label="Attendance rate"
          value={
            analyticsLoading
              ? "Loading…"
              : analyticsError
                ? "Unavailable"
                : attendanceValue
          }
          delta={
            attendance.total_records
              ? `${attendance.total_records} recorded sessions`
              : "No attendance records yet"
          }
          icon={<Activity aria-hidden="true" />}
        />
        <KpiCard
          label="Enrolled students"
          value={
            analyticsLoading
              ? "Loading…"
              : analyticsError
                ? "Unavailable"
                : (funnel.Active ?? 0)
          }
          icon={<GraduationCap aria-hidden="true" />}
          link={{ href: "/admin/students", label: "View records" }}
        />
      </section>

      <SectionPanel
        title="Admissions queue"
        action={
          <Button asChild variant="outline" size="sm">
            <Link href={admissionsHref}>View all applications</Link>
          </Button>
        }
      >
        {applicationsError ? (
          <p className="text-sm text-destructive">
            Admissions data could not be loaded.
          </p>
        ) : (
          <DataTable
            columns={applicationColumnsFor(role)}
            data={applications.slice(0, 8)}
            loading={applicationsLoading}
            pageSize={8}
          />
        )}
      </SectionPanel>

      <SectionPanel title="Enrollment funnel">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Pending", funnel.Pending ?? 0],
            ["Under review", funnel.Under_Review ?? 0],
            ["Offered", funnel.Offered ?? 0],
            ["Enrolled", funnel.Active ?? 0],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2"
            >
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className="font-semibold tabular-nums text-foreground">
                {analyticsLoading || analyticsError ? "—" : value}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Billed{" "}
          {analyticsLoading || analyticsError
            ? "—"
            : currency(financial.invoiced)}{" "}
          · Collected{" "}
          {analyticsLoading || analyticsError
            ? "—"
            : currency(financial.revenue)}
        </p>
      </SectionPanel>
    </div>
  );
}
