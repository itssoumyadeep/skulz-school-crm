"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AdminOverviewWidget,
  type AdminDashboardMetrics,
  type AdminRecentActivityItem,
} from "@/components/widgets/admin";
import {
  DEFAULT_ADMIN_AVATAR,
  getCachedProfilePicture,
} from "@/components/pc/profile-picture-modal";
import { usePortalViewMode } from "@/components/pc/view-mode-preference";
import {
  fetchAdmissionsPipeline,
  fetchAnalyticsDashboard,
  fetchAuditLogs,
  fetchClassroomHealthAlerts,
  fetchClassroomMedications,
  fetchDataClassification,
  fetchRoleMemberships,
  fetchSchoolSequences,
  fetchSchoolSetupContext,
  fetchStudents,
} from "@/app/lib/api";
import { getClientSession } from "@/app/lib/session";

const EMPTY_METRICS: AdminDashboardMetrics = {
  schoolName: "School Tenant",
  schoolCode: "—",
  region: "—",
  subscriptionTier: "Standard",
  asOfDate: new Date().toISOString().split("T")[0],
  activeApplications: 0,
  underReviewApplications: 0,
  offeredApplications: 0,
  acceptedApplications: 0,
  docsVerifiedPercent: 0,
  totalStudents: 0,
  activeStudents: 0,
  attendanceRate: 0,
  totalAttendanceRecords: 0,
  invoicedTotal: 0,
  outstandingTotal: 0,
  collectionEfficiency: 0,
  totalIncidents: 0,
  escalatedIncidents: 0,
  complianceScore: 0,
  activeRoleMemberships: 0,
  catalogModelCount: 0,
  nextStudentNumberPreview: "STU-2026-0001",
  pendingMedicationsCount: 0,
  activeHealthAlertsCount: 0,
  missingConsentAlertsCount: 0,
};

export default function AdminOverviewPage() {
  const router = useRouter();
  const [session] = useState(() => getClientSession());
  const userKey = session?.user_id || session?.email || "default-admin";
  const [viewMode, setViewMode] = usePortalViewMode("admin", "cards");
  const [metrics, setMetrics] = useState<AdminDashboardMetrics>(EMPTY_METRICS);
  const [recentAuditLogs, setRecentAuditLogs] = useState<AdminRecentActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDashboard = useCallback(async (showSpinner = false) => {
    if (showSpinner) {
      setIsLoading(true);
      setErrorMessage(null);
    }
    const [
      setupRes,
      analyticsRes,
      pipelineRes,
      studentsRes,
      seqRes,
      rolesRes,
      catalogRes,
      auditRes,
      medsRes,
      alertsRes,
    ] = await Promise.allSettled([
      fetchSchoolSetupContext(),
      fetchAnalyticsDashboard(),
      fetchAdmissionsPipeline(),
      fetchStudents(),
      fetchSchoolSequences(),
      fetchRoleMemberships(),
      fetchDataClassification(),
      fetchAuditLogs({ limit: 10 }),
      fetchClassroomMedications(),
      fetchClassroomHealthAlerts(),
    ]);

    const school =
      setupRes.status === "fulfilled" ? setupRes.value.data?.school : null;
    const analytics =
      analyticsRes.status === "fulfilled"
        ? (analyticsRes.value.data as Record<string, Record<string, number> | string>)
        : null;
    const pipeline =
      pipelineRes.status === "fulfilled" && Array.isArray(pipelineRes.value.data)
        ? pipelineRes.value.data
        : [];
    const students =
      studentsRes.status === "fulfilled" && Array.isArray(studentsRes.value.data)
        ? studentsRes.value.data
        : [];
    const sequences =
      seqRes.status === "fulfilled" && Array.isArray(seqRes.value.data)
        ? seqRes.value.data
        : [];
    const roles =
      rolesRes.status === "fulfilled" && Array.isArray(rolesRes.value.data)
        ? rolesRes.value.data
        : [];
    const catalog =
      catalogRes.status === "fulfilled" ? catalogRes.value.data : null;
    const audits =
      auditRes.status === "fulfilled" && Array.isArray(auditRes.value.data)
        ? auditRes.value.data
        : [];
    const meds =
      medsRes.status === "fulfilled" && Array.isArray(medsRes.value.data)
        ? medsRes.value.data
        : [];
    const alerts =
      alertsRes.status === "fulfilled" && Array.isArray(alertsRes.value.data)
        ? alertsRes.value.data
        : [];

    if (
      setupRes.status === "rejected" &&
      analyticsRes.status === "rejected" &&
      pipelineRes.status === "rejected"
    ) {
      setErrorMessage(
        "Unable to load Admin Operational Console metrics from Django API.",
      );
    }

    const totalDocs = pipeline.reduce(
      (sum, app) => sum + (Array.isArray(app.documents) ? app.documents.length : 0),
      0,
    );
    const verifiedDocs = pipeline.reduce(
      (sum, app) =>
        sum +
        (Array.isArray(app.documents)
          ? app.documents.filter((d) => Boolean(d.verified)).length
          : 0),
      0,
    );
    const docsVerifiedPercent =
      totalDocs > 0 ? Math.round((verifiedDocs / totalDocs) * 100) : 0;

    const studentSeq = sequences.find(
      (s) => s.sequence_type.toUpperCase() === "STUDENT" || s.sequence_type === "STU",
    ) ?? sequences[0];
    const nextNum = studentSeq
      ? `STU-${studentSeq.year}-${String(studentSeq.last_value + 1).padStart(4, "0")}`
      : "STU-2026-0001";

    const funnel = (analytics?.enrollment_funnel ?? {}) as Record<string, number>;
    const financial = (analytics?.financial ?? {}) as Record<string, number>;
    const attendance = (analytics?.attendance ?? {}) as Record<string, number>;
    const compliance = (analytics?.compliance ?? {}) as Record<string, number>;

    setMetrics({
      schoolName: school?.name || "The Purple Cubby Demo School",
      schoolCode: school?.school_code || "demo-school",
      region: school?.region || "CA-ON",
      subscriptionTier: school?.subscription_tier || "Enterprise",
      asOfDate:
        typeof analytics?.as_of === "string"
          ? analytics.as_of
          : new Date().toISOString().split("T")[0],
      activeApplications: pipeline.length,
      underReviewApplications: Number(funnel.Under_Review ?? 0),
      offeredApplications: Number(funnel.Offered ?? 0),
      acceptedApplications: Number(funnel.Accepted ?? 0),
      docsVerifiedPercent,
      totalStudents: students.length,
      activeStudents: students.filter((s) => s.status === "Active").length,
      attendanceRate: Number(attendance.attendance_rate ?? 0),
      totalAttendanceRecords: Number(attendance.total_records ?? 0),
      invoicedTotal: Number(financial.invoiced ?? 0),
      outstandingTotal: Number(financial.outstanding ?? 0),
      collectionEfficiency: Number(financial.collection_efficiency ?? 0),
      totalIncidents: Number(compliance.total_incidents ?? 0),
      escalatedIncidents: Number(compliance.escalated_incidents ?? 0),
      complianceScore: Number(compliance.compliance_score ?? 0),
      activeRoleMemberships: roles.filter((r) => r.is_active).length,
      catalogModelCount: Array.isArray(catalog?.elements)
        ? catalog.elements.length
        : 0,
      nextStudentNumberPreview: nextNum,
      pendingMedicationsCount: meds.filter((m) => m.status === "Pending").length,
      activeHealthAlertsCount: alerts.length,
      missingConsentAlertsCount:
        meds.filter((m) => !m.consent_flag).length +
        alerts.filter((a) => !a.parent_consent_on_file).length,
    });

    setRecentAuditLogs(
      audits.map((log) => ({
        id: log.log_id,
        action: log.action,
        entity: log.entity,
        entityId: log.entity_id,
        timestamp: log.timestamp,
      })),
    );
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (active) void loadDashboard(false);
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [loadDashboard]);

  const rawName = session?.user_name?.trim();
  const displayAdminName =
    !rawName || /^admin\s*\d*$/i.test(rawName) ? "Administrator Marcus" : rawName;

  return (
    <AdminOverviewWidget
      adminName={displayAdminName}
      avatarUrl={getCachedProfilePicture(userKey, "admin") || DEFAULT_ADMIN_AVATAR}
      metrics={metrics}
      recentAuditLogs={recentAuditLogs}
      viewMode={viewMode}
      isLoading={isLoading}
      errorMessage={errorMessage}
      onChangeViewMode={setViewMode}
      onRefresh={() => void loadDashboard(true)}
      onNavigate={(target) => router.push(`/admin/${target}`)}
    />
  );
}
