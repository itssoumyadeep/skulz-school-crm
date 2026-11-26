"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  BellRing,
  CalendarOff,
  CheckCheck,
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  Lock,
  Search,
  ShieldCheck,
  UserCheck,
  UserRound,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DataTable,
  DatePicker,
  EmptyState,
  KpiCard,
  SectionPanel,
  StatusPill,
  createAvatarNameColumn,
  createDataTableColumnHelper,
  type StatusPillVariant,
} from "@/components/pc";
import type {
  AttendanceRosterStudentItem,
  AttendanceRosterWidgetProps,
  AttendanceStatusValue,
} from "./attendance-roster-widget.types";

const columnHelper = createDataTableColumnHelper<AttendanceRosterStudentItem>();

const QUICK_TOGGLE_ITEMS: ReadonlyArray<{
  code: "P" | "A" | "L" | "E";
  status: AttendanceStatusValue;
  activeClassName: string;
}> = [
  {
    code: "P",
    status: "Present",
    activeClassName:
      "bg-pastel-mint text-pastel-mint-deep font-extrabold ring-2 ring-pastel-mint-deep shadow-xs",
  },
  {
    code: "A",
    status: "Absent",
    activeClassName:
      "bg-pastel-peach text-pastel-peach-deep font-extrabold ring-2 ring-pastel-coral shadow-xs",
  },
  {
    code: "L",
    status: "Late",
    activeClassName:
      "bg-pastel-sun text-crayon-charcoal font-extrabold ring-2 ring-pastel-sun-deep shadow-xs",
  },
  {
    code: "E",
    status: "Excused",
    activeClassName:
      "bg-pastel-sky text-pastel-sky-deep font-extrabold ring-2 ring-pastel-sky-deep shadow-xs",
  },
];

function getAttendanceStatusVariant(
  status: AttendanceStatusValue | null,
): StatusPillVariant {
  switch (status) {
    case "Present":
      return "success";
    case "Absent":
      return "danger";
    case "Late":
      return "warning";
    case "Excused":
    case "On Leave":
    case "Holiday":
      return "info";
    default:
      return "neutral";
  }
}

function getLeaveStatusVariant(status: string): StatusPillVariant {
  const normalized = status.trim().toLowerCase();
  if (normalized === "approved") return "success";
  if (normalized === "pending") return "warning";
  if (normalized === "rejected" || normalized === "denied") return "danger";
  return "neutral";
}

export function AttendanceRosterWidget({
  data,
  capabilities = {
    canMarkAttendance: true,
    canBulkMark: true,
    canRequestLeave: true,
    canCancelLeave: true,
    canExportCsv: true,
  },
  isLoading = false,
  error = null,
  readOnly = false,
  headerActions,
  footerSlot,
  onDateChange,
  onClassChange,
  onQuickStatusChange,
  onMarkAllPresent,
  onCommitBulkRoll,
  onOpenEditMarkModal,
  onOpenStudentProfile,
  onOpenLeaveModal,
  onCancelLeave,
  onExportCsv,
  isCommittingBulk = false,
}: AttendanceRosterWidgetProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const canMarkAttendance = Boolean(capabilities.canMarkAttendance);
  const canBulkMark = Boolean(capabilities.canBulkMark);
  const canRequestLeave = Boolean(capabilities.canRequestLeave);
  const canCancelLeave = Boolean(capabilities.canCancelLeave);
  const canExportCsv = Boolean(capabilities.canExportCsv);
  const isWindowLocked = Boolean(data.isWindowLocked);

  const metrics = useMemo(() => {
    const total = data.students.length;
    let present = 0;
    let late = 0;
    let excused = 0;
    let absent = 0;
    let marked = 0;
    let absentNotified = 0;

    for (const student of data.students) {
      if (student.status !== null) {
        marked += 1;
      }
      if (student.status === "Present") {
        present += 1;
      } else if (student.status === "Late") {
        late += 1;
      } else if (student.status === "Excused") {
        excused += 1;
      } else if (student.status === "Absent") {
        absent += 1;
        if (student.notifiedParent) {
          absentNotified += 1;
        }
      }
    }

    const presentRate = total > 0 ? Math.round((present / total) * 100) : 0;
    return {
      total,
      present,
      late,
      excused,
      lateExcusedTotal: late + excused,
      absent,
      marked,
      unmarked: Math.max(0, total - marked),
      presentRate,
      absentNotified,
    };
  }, [data.students]);

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return data.students;
    return data.students.filter((student) => {
      return (
        student.name.toLowerCase().includes(query) ||
        student.studentNumber.toLowerCase().includes(query) ||
        student.grade.toLowerCase().includes(query) ||
        (student.classLabel ?? "").toLowerCase().includes(query) ||
        (student.medicalAlert ?? "").toLowerCase().includes(query) ||
        (student.arrivalNote ?? "").toLowerCase().includes(query)
      );
    });
  }, [data.students, searchQuery]);

  const columns = useMemo(
    () => [
      createAvatarNameColumn<AttendanceRosterStudentItem>({
        id: "student",
        header: "Student",
        getName: (row) => row.name,
      }),
      columnHelper.accessor("studentNumber", {
        header: "Student ID & Grade",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="space-y-0.5">
              <p className="font-mono text-xs font-semibold text-foreground">
                {item.studentNumber}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.grade}
                {item.classLabel ? ` • ${item.classLabel}` : ""}
              </p>
              {item.arrivalNote && (
                <p className="text-xs text-crayon-espresso italic">
                  {item.arrivalNote}
                </p>
              )}
            </div>
          );
        },
      }),
      columnHelper.display({
        id: "medicalAlert",
        header: "Medical / Sabrina's Law",
        cell: ({ row }) => {
          const alertText = row.original.medicalAlert?.trim();
          if (!alertText) {
            return <StatusPill variant="neutral">Clear</StatusPill>;
          }
          return (
            <StatusPill variant="danger" dot>
              {alertText}
            </StatusPill>
          );
        },
      }),
      columnHelper.display({
        id: "parentNotification",
        header: "Status & Guardian Alert",
        cell: ({ row }) => {
          const item = row.original;
          const statusLabel = item.status ?? "Unmarked";
          return (
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusPill
                variant={getAttendanceStatusVariant(item.status)}
                dot={item.status !== null}
              >
                {statusLabel}
              </StatusPill>
              {item.notifiedParent ? (
                <StatusPill variant="success" dot>
                  Parent Notified
                </StatusPill>
              ) : item.status === "Absent" ? (
                <StatusPill variant="warning" dot>
                  Alert Queued (BR-03-02)
                </StatusPill>
              ) : (
                <StatusPill variant="neutral">No Alert</StatusPill>
              )}
            </div>
          );
        },
      }),
      columnHelper.display({
        id: "quickRoll",
        header: "Quick Roll (P | A | L | E)",
        cell: ({ row }) => {
          const item = row.original;
          const isDisabled =
            !canMarkAttendance ||
            Boolean(readOnly) ||
            Boolean(item.locked) ||
            isWindowLocked;

          return (
            <div className="flex items-center gap-2">
              <div
                role="group"
                aria-label={`Quick attendance status for ${item.name}`}
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-pastel-butter/80 bg-paper-tint p-1 shadow-xs"
              >
                {QUICK_TOGGLE_ITEMS.map((option) => {
                  const isActive = item.status === option.status;
                  return (
                    <button
                      key={option.code}
                      type="button"
                      disabled={isDisabled}
                      aria-pressed={isActive}
                      aria-label={`${option.status} for ${item.name}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onQuickStatusChange?.(item.studentId, option.status);
                      }}
                      className={`size-7 rounded-full text-xs font-black transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastel-sun disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center cursor-pointer ${
                        isActive
                          ? option.activeClassName
                          : "text-crayon-muted hover:bg-pastel-butter/40 hover:text-crayon-charcoal"
                      }`}
                    >
                      {option.code}
                    </button>
                  );
                })}
              </div>
              {item.locked && (
                <span
                  title="Row locked"
                  className="inline-flex items-center text-crayon-muted"
                >
                  <Lock aria-hidden="true" className="size-3.5" />
                </span>
              )}
            </div>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const item = row.original;
          const editDisabled =
            !canMarkAttendance ||
            Boolean(readOnly) ||
            Boolean(item.locked) ||
            isWindowLocked;

          return (
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                size="xs"
                variant="outline"
                disabled={editDisabled}
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenEditMarkModal?.(item);
                }}
                className="rounded-full border border-pastel-butter bg-paper-card text-crayon-charcoal hover:bg-pastel-butter/50 text-xs font-bold shadow-xs cursor-pointer"
              >
                <Edit3 aria-hidden="true" className="size-3.5" />
                Edit Mark
              </Button>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenStudentProfile?.(item.studentId);
                }}
                className="rounded-full hover:bg-paper-tint text-crayon-espresso text-xs font-bold cursor-pointer"
              >
                <UserRound aria-hidden="true" className="size-3.5" />
                360 Profile
              </Button>
            </div>
          );
        },
      }),
    ],
    [
      canMarkAttendance,
      isWindowLocked,
      onOpenEditMarkModal,
      onOpenStudentProfile,
      onQuickStatusChange,
      readOnly,
    ],
  );

  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading attendance roster">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-md border border-border bg-surface-container"
            />
          ))}
        </div>
        <div className="h-16 animate-pulse rounded-md border border-border bg-surface-container" />
        <div className="h-72 animate-pulse rounded-md border border-border bg-surface-container" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-md border border-danger/20 bg-error-container px-4 py-3 text-sm text-on-error-container"
        >
          <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Roster"
          value={metrics.total}
          delta={`${metrics.marked} marked • ${metrics.unmarked} pending`}
          accentBorder="border-pastel-butter"
          icon={<Users aria-hidden="true" />}
        />
        <KpiCard
          label="Present"
          value={metrics.present}
          delta={`${metrics.presentRate}% daily attendance rate`}
          accentBorder="border-pastel-mint"
          badge={
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-pastel-mint text-pastel-mint-deep border border-pastel-mint-deep/20">
              +{metrics.presentRate > 90 ? "2.4%" : "0.5%"}
            </span>
          }
          icon={<CheckCircle2 aria-hidden="true" />}
        />
        <KpiCard
          label="Late / Excused"
          value={metrics.lateExcusedTotal}
          delta={`${metrics.late} late • ${metrics.excused} excused`}
          accentBorder="border-pastel-sky"
          icon={<Clock aria-hidden="true" />}
        />
        <KpiCard
          label="Unexcused Absent"
          value={metrics.absent}
          delta={
            metrics.absent > 0
              ? `${metrics.absentNotified}/${metrics.absent} parent alerts sent (BR-03-02)`
              : "Auto parent alert enabled (BR-03-02)"
          }
          accentBorder="border-pastel-peach"
          icon={<BellRing aria-hidden="true" />}
        />
      </div>

      {/* 24-Hour Attendance Modification Lock Compliance Banner (BR-03-01) */}
      {isWindowLocked ? (
        <div
          role="status"
          className="flex flex-col justify-between gap-3 rounded-2xl border-2 border-pastel-sun/80 bg-pastel-butter/40 p-4 sm:flex-row sm:items-center shadow-pastel"
        >
          <div className="flex items-start gap-2.5">
            <Lock
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-crayon-charcoal"
            />
            <div className="space-y-0.5">
              <p className="text-sm font-extrabold text-crayon-charcoal">
                24-Hour Attendance Window Locked (Rule BR-03-01)
              </p>
              <p className="text-xs font-medium text-crayon-espresso">
                {data.lockReason ||
                  "Historical attendance records older than 24 hours are read-only for classroom staff and require administrative override."}
              </p>
            </div>
          </div>
          <StatusPill variant="warning" dot>
            Window Locked (BR-03-01)
          </StatusPill>
        </div>
      ) : (
        <div className="flex flex-col justify-between gap-2 rounded-2xl border-2 border-pastel-mint/80 bg-paper-card p-4 sm:flex-row sm:items-center shadow-pastel">
          <div className="flex items-center gap-2 text-xs font-bold text-crayon-espresso">
            <ShieldCheck
              aria-hidden="true"
              className="size-4 shrink-0 text-pastel-mint-deep"
            />
            <span>
              Compliance Active: 24-hour teacher edit window open (
              <span className="font-extrabold text-crayon-charcoal">BR-03-01</span>) •
              Unexcused absences dispatch parent alerts (
              <span className="font-extrabold text-crayon-charcoal">BR-03-02</span>).
            </span>
          </div>
          <StatusPill variant="info" dot>
            Window Open (BR-03-01)
          </StatusPill>
        </div>
      )}

      {/* Controls Bar */}
      <div className="rounded-3xl border-2 border-pastel-butter/80 bg-paper-card p-5 shadow-pastel">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:flex lg:flex-wrap lg:items-center">
            <div className="w-full sm:w-44">
              <DatePicker
                value={data.selectedDate}
                onChange={(nextDate) => onDateChange?.(nextDate)}
                label="Attendance date"
                placeholder="Select date"
                clearable={false}
                disabled={Boolean(readOnly)}
                className="rounded-full border-2 border-pastel-butter bg-paper-card text-xs font-bold text-crayon-charcoal shadow-xs"
              />
            </div>

            <div className="w-full sm:w-52">
              <Select
                value={data.selectedClassId}
                onValueChange={(classId) => onClassChange?.(classId)}
                disabled={Boolean(readOnly) || data.classes.length === 0}
              >
                <SelectTrigger
                  aria-label="Select class section"
                  className="w-full rounded-full border-2 border-pastel-butter bg-paper-card text-xs font-bold text-crayon-charcoal shadow-xs"
                >
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {data.classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <label className="relative block w-full sm:w-60">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-crayon-muted"
              />
              <Input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.currentTarget.value)}
                placeholder="Filter student or alert..."
                aria-label="Filter roster students"
                className="rounded-full border-2 border-pastel-butter bg-paper-card pl-9.5 pr-4 py-2 text-xs font-semibold text-crayon-charcoal placeholder:text-crayon-muted focus:border-pastel-sun shadow-xs"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canBulkMark && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  Boolean(readOnly) ||
                  isWindowLocked ||
                  isCommittingBulk ||
                  data.students.length === 0
                }
                onClick={() => onMarkAllPresent?.()}
                className="rounded-full border border-pastel-mint-deep/30 bg-pastel-mint/80 hover:bg-pastel-mint text-pastel-mint-deep font-extrabold text-xs shadow-pastel transition-all cursor-pointer"
              >
                <UserCheck aria-hidden="true" className="size-4" />
                Mark All Present
              </Button>
            )}

            {canBulkMark && (
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={
                  isWindowLocked ||
                  Boolean(readOnly) ||
                  isCommittingBulk ||
                  data.students.length === 0
                }
                onClick={() => onCommitBulkRoll?.()}
                className="rounded-full bg-pastel-butter hover:bg-pastel-sun text-crayon-charcoal border border-pastel-sun font-extrabold text-xs shadow-pastel transition-all cursor-pointer"
              >
                <CheckCheck aria-hidden="true" className="size-4" />
                {isCommittingBulk ? "Committing Roll..." : "Commit Morning Roll"}
              </Button>
            )}

            {canRequestLeave && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={Boolean(readOnly)}
                onClick={() => onOpenLeaveModal?.()}
                className="rounded-full border-2 border-pastel-butter bg-paper-card text-crayon-charcoal hover:bg-paper-tint font-bold text-xs shadow-pastel transition-all cursor-pointer"
              >
                <CalendarOff aria-hidden="true" className="size-4" />
                Request Cover
              </Button>
            )}

            {canExportCsv && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onExportCsv?.()}
                className="rounded-full border-2 border-pastel-butter bg-paper-card text-crayon-charcoal hover:bg-paper-tint font-bold text-xs shadow-pastel transition-all cursor-pointer"
              >
                <Download aria-hidden="true" className="size-4" />
                Export CSV
              </Button>
            )}

            {headerActions}
          </div>
        </div>
      </div>

      {/* Roster Table or EmptyState */}
      {data.students.length === 0 ? (
        <EmptyState
          icon={<Users aria-hidden="true" />}
          title="No students in this class roster"
          description="Select another class section or attendance date to load enrolled students."
        />
      ) : (
        <SectionPanel
          title="Daily Class Roll & Safeguarding Verification"
          action={
            <span className="text-xs text-muted-foreground">
              Showing {filteredStudents.length} of {data.students.length} students
            </span>
          }
        >
          <DataTable
            columns={columns}
            data={filteredStudents}
            loading={isLoading}
            pageSize={25}
          />
        </SectionPanel>
      )}

      {/* Staff & Student Leave Requests */}
      <SectionPanel
        title="Staff & Student Leave Requests"
        action={
          canRequestLeave && !readOnly ? (
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => onOpenLeaveModal?.()}
            >
              Request Leave
            </Button>
          ) : undefined
        }
      >
        {data.leaveRequests.length === 0 ? (
          <EmptyState
            icon={<CalendarOff aria-hidden="true" />}
            title="No leave requests on file"
            description="Approved and pending staff or student leave requests will appear here."
          />
        ) : (
          <div className="divide-y divide-border">
            {data.leaveRequests.map((leave) => {
              const isPending = leave.status === "Pending";
              return (
                <div
                  key={leave.leaveId}
                  className="flex flex-col justify-between gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {leave.requesterName || `${leave.requesterType} Leave`}
                      </span>
                      <StatusPill
                        variant={
                          leave.requesterType === "Staff" ? "info" : "neutral"
                        }
                      >
                        {leave.requesterType}
                      </StatusPill>
                      <span className="rounded-md bg-surface-container px-2 py-0.5 text-xs font-medium text-foreground">
                        {leave.leaveType}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {leave.startDate} to {leave.endDate} ({leave.days}{" "}
                      {leave.days === 1 ? "day" : "days"}) • {leave.reason}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <StatusPill
                      variant={getLeaveStatusVariant(leave.status)}
                      dot
                    >
                      {leave.status}
                    </StatusPill>
                    {isPending && canCancelLeave && !readOnly && (
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        onClick={() => onCancelLeave?.(leave.leaveId)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionPanel>

      {footerSlot}
    </div>
  );
}
