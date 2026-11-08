"use client";

import {
  AlertCircle,
  BookOpen,
  CreditCard,
  HeartPulse,
  Mail,
  MessageSquare,
  Phone,
  PlusCircle,
  ShieldAlert,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AttendancePercentCell,
  DetailPanel,
  EmptyState,
  SectionPanel,
  StatusPill,
  type StatusPillVariant,
} from "@/components/pc";
import type { StudentProfileDrawerProps } from "./student-profile-drawer.types";

function getInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?"
  );
}

function getStudentStatusVariant(status?: string): StatusPillVariant {
  const normalized = (status ?? "").trim().toLowerCase();
  if (normalized === "active" || normalized === "enrolled") return "success";
  if (normalized === "pending" || normalized === "waitlisted") return "warning";
  if (normalized === "withdrawn" || normalized === "suspended") return "danger";
  return "info";
}

export function StudentProfileDrawer({
  data,
  capabilities = {
    showHealth: true,
    showAcademics: true,
    showBilling: false,
    canMessageGuardian: true,
    canLogHealthNote: false,
  },
  isLoading = false,
  error = null,
  readOnly = false,
  headerActions,
  footerSlot,
  open,
  onOpenChange,
  onMessageGuardian,
  onLogHealthNote,
}: StudentProfileDrawerProps) {
  const showHealth = capabilities?.showHealth !== false;
  const showAcademics = capabilities?.showAcademics !== false;
  const showBilling = capabilities?.showBilling === true;
  const canMessageGuardian = Boolean(capabilities?.canMessageGuardian);
  const canLogHealthNote = Boolean(capabilities?.canLogHealthNote);

  const primaryGuardian = data?.guardians[0];

  const footerContent = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>{footerSlot}</div>
      <div className="flex items-center gap-2">
        {canMessageGuardian && data && (
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={Boolean(readOnly)}
            onClick={() =>
              onMessageGuardian?.(data.studentId, primaryGuardian?.name)
            }
          >
            <MessageSquare aria-hidden="true" />
            Message Guardian
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onOpenChange(false)}
        >
          Close
        </Button>
      </div>
    </div>
  );

  return (
    <DetailPanel
      open={open}
      onOpenChange={onOpenChange}
      title={
        data ? (
          <span className="inline-flex flex-wrap items-center gap-2">
            <span>{data.name}</span>
            {data.status && (
              <StatusPill variant={getStudentStatusVariant(data.status)} dot>
                {data.status}
              </StatusPill>
            )}
          </span>
        ) : (
          "Student 360 Profile"
        )
      }
      description={
        data
          ? `${data.studentNumber} • ${data.grade}${
              data.section ? ` (${data.section})` : ""
            }`
          : "Holistic student demographics, safeguarding, and academic summary"
      }
      headerActions={headerActions}
      footerActions={footerContent}
    >
      <div className="space-y-5">
        {error && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-md border border-danger/20 bg-error-container px-3.5 py-2.5 text-xs text-on-error-container"
          >
            <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4" aria-busy="true">
            <div className="h-24 animate-pulse rounded-md bg-surface-container" />
            <div className="h-10 animate-pulse rounded-md bg-surface-container" />
            <div className="h-48 animate-pulse rounded-md bg-surface-container" />
          </div>
        ) : !data ? (
          <EmptyState
            icon={<UserRound aria-hidden="true" />}
            title="No student selected"
            description="Select a student from the class roster to inspect their 360 profile."
          />
        ) : (
          <>
            {/* Top Identity & KPI Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-paper-card p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-pastel-lilac text-sm font-bold text-pastel-lilac-deep">
                  {getInitials(data.name)}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {data.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ID: {data.studentNumber} • {data.grade}
                    {data.section ? ` • Section ${data.section}` : ""}
                  </p>
                  {data.dob && (
                    <p className="text-xs text-muted-foreground">
                      Date of Birth: {data.dob}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {typeof data.attendanceRate === "number" && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>Attendance:</span>
                    <AttendancePercentCell value={data.attendanceRate} />
                  </div>
                )}
                {data.gpa && (
                  <StatusPill variant="info">GPA {data.gpa}</StatusPill>
                )}
              </div>
            </div>

            {/* High-Priority Allergy Banner when Safeguarding visible */}
            {showHealth &&
              data.health &&
              data.health.allergies.length > 0 && (
                <div className="flex items-start gap-2.5 rounded-md border border-danger/20 bg-error-container px-3.5 py-2.5 text-xs text-on-error-container">
                  <ShieldAlert
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0"
                  />
                  <div>
                    <p className="font-semibold">
                      Sabrina&apos;s Law / Medical Alert:{" "}
                      {data.health.allergies.join(", ")}
                    </p>
                    {data.health.actionPlanNote && (
                      <p className="mt-0.5">{data.health.actionPlanNote}</p>
                    )}
                  </div>
                </div>
              )}

            {/* Capability-Gated Tabs */}
            <Tabs defaultValue="overview" className="w-full space-y-4">
              <TabsList className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                {showHealth && (
                  <TabsTrigger value="health">
                    Safeguarding &amp; Health
                  </TabsTrigger>
                )}
                {showAcademics && (
                  <TabsTrigger value="academics">Academics</TabsTrigger>
                )}
                {showBilling && (
                  <TabsTrigger value="billing">Billing</TabsTrigger>
                )}
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <SectionPanel title="Household Guardians">
                  {data.guardians.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No guardian records linked to this student profile.
                    </p>
                  ) : (
                    <div className="divide-y divide-border">
                      {data.guardians.map((guardian, idx) => (
                        <div
                          key={`${guardian.name}-${idx}`}
                          className="flex flex-col justify-between gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-foreground">
                                {guardian.name}
                              </span>
                              <StatusPill variant="neutral">
                                {guardian.relationship}
                              </StatusPill>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              {guardian.phone && (
                                <span className="inline-flex items-center gap-1">
                                  <Phone
                                    aria-hidden="true"
                                    className="size-3"
                                  />
                                  {guardian.phone}
                                </span>
                              )}
                              {guardian.email && (
                                <span className="inline-flex items-center gap-1">
                                  <Mail aria-hidden="true" className="size-3" />
                                  {guardian.email}
                                </span>
                              )}
                            </div>
                          </div>

                          {canMessageGuardian && !readOnly && (
                            <Button
                              type="button"
                              size="xs"
                              variant="outline"
                              onClick={() =>
                                onMessageGuardian?.(
                                  data.studentId,
                                  guardian.name,
                                )
                              }
                            >
                              <MessageSquare aria-hidden="true" />
                              Message
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </SectionPanel>

                <SectionPanel title="Emergency Pickup & Medical Contacts">
                  {!data.emergencyContacts ||
                  data.emergencyContacts.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Primary guardians serve as emergency contacts.
                    </p>
                  ) : (
                    <div className="divide-y divide-border">
                      {data.emergencyContacts.map((contact, idx) => (
                        <div
                          key={`${contact.name}-${idx}`}
                          className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {contact.name}{" "}
                              <span className="text-xs text-muted-foreground">
                                ({contact.relationship})
                              </span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {contact.phone}
                            </p>
                          </div>
                          <StatusPill
                            variant={
                              contact.medicalConsent ? "success" : "neutral"
                            }
                            dot={Boolean(contact.medicalConsent)}
                          >
                            {contact.medicalConsent
                              ? "Medical Consent"
                              : "Pickup Contact"}
                          </StatusPill>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionPanel>
              </TabsContent>

              {/* Safeguarding & Health Tab */}
              {showHealth && (
                <TabsContent value="health" className="space-y-4">
                  <SectionPanel
                    title="Allergies, Conditions & Medications"
                    action={
                      canLogHealthNote && !readOnly ? (
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          onClick={() => onLogHealthNote?.(data.studentId)}
                        >
                          <PlusCircle aria-hidden="true" />
                          Log Health Note
                        </Button>
                      ) : undefined
                    }
                  >
                    {!data.health ? (
                      <EmptyState
                        icon={<HeartPulse aria-hidden="true" />}
                        title="No medical profile recorded"
                        description="Health and safeguarding details have not been submitted yet."
                      />
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-foreground">
                            Documented Allergies
                          </p>
                          {data.health.allergies.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                              No known allergies on file.
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {data.health.allergies.map((allergy) => (
                                <StatusPill
                                  key={allergy}
                                  variant="danger"
                                  dot
                                >
                                  {allergy}
                                </StatusPill>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-foreground">
                            Chronic Conditions
                          </p>
                          {data.health.conditions.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                              None reported.
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {data.health.conditions.map((condition) => (
                                <StatusPill
                                  key={condition}
                                  variant="warning"
                                  dot
                                >
                                  {condition}
                                </StatusPill>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-foreground">
                            Authorized School Medications
                          </p>
                          {data.health.medications.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                              No scheduled medications stored on campus.
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {data.health.medications.map((medication) => (
                                <StatusPill key={medication} variant="info">
                                  {medication}
                                </StatusPill>
                              ))}
                            </div>
                          )}
                        </div>

                        {data.health.actionPlanNote && (
                          <div className="rounded-md border border-border bg-pastel-peach/25 p-3 text-xs text-crayon-charcoal">
                            <p className="font-semibold">
                              Individual Emergency Care Plan
                            </p>
                            <p className="mt-1">{data.health.actionPlanNote}</p>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Stethoscope
                              aria-hidden="true"
                              className="size-3.5"
                            />
                            <span>
                              Physician:{" "}
                              {data.health.doctorName || "Not listed"}
                              {data.health.doctorPhone
                                ? ` (${data.health.doctorPhone})`
                                : ""}
                            </span>
                          </div>
                          <StatusPill
                            variant={
                              data.health.consentOnFile ? "success" : "warning"
                            }
                            dot
                          >
                            {data.health.consentOnFile
                              ? "Emergency Consent On File"
                              : "Consent Pending"}
                          </StatusPill>
                        </div>
                      </div>
                    )}
                  </SectionPanel>
                </TabsContent>
              )}

              {/* Academics Tab */}
              {showAcademics && (
                <TabsContent value="academics" className="space-y-4">
                  <SectionPanel title="Recent Formative & Summative Assessments">
                    {!data.academics ||
                    data.academics.recentAssessments.length === 0 ? (
                      <EmptyState
                        icon={<BookOpen aria-hidden="true" />}
                        title="No assessments recorded"
                        description="Published subject marks and competency evaluations will appear here."
                      />
                    ) : (
                      <div className="divide-y divide-border">
                        {data.academics.recentAssessments.map((item, idx) => (
                          <div
                            key={`${item.title}-${idx}`}
                            className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                          >
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {item.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {item.subject}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold tabular-nums text-foreground">
                                {item.scoreLabel}
                              </span>
                              <StatusPill variant="success">
                                {item.grade}
                              </StatusPill>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </SectionPanel>

                  {data.academics?.teacherNotes && (
                    <SectionPanel title="Educator Pedagogic Notes">
                      <p className="text-xs leading-relaxed text-crayon-espresso">
                        {data.academics.teacherNotes}
                      </p>
                    </SectionPanel>
                  )}
                </TabsContent>
              )}

              {/* Billing Tab (Explicitly opt-in via capabilities.showBilling === true) */}
              {showBilling && (
                <TabsContent value="billing" className="space-y-4">
                  <SectionPanel title="Household Tuition & Fee Standing">
                    {!data.billing ? (
                      <EmptyState
                        icon={<CreditCard aria-hidden="true" />}
                        title="No billing summary available"
                        description="Tuition ledger balances have not been loaded for this student."
                      />
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-paper-card p-4">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Outstanding Household Balance
                          </p>
                          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                            ${data.billing.outstandingBalance.toFixed(2)}
                          </p>
                        </div>
                        <StatusPill
                          variant={
                            data.billing.outstandingBalance <= 0
                              ? "success"
                              : "warning"
                          }
                          dot
                        >
                          {data.billing.statusLabel}
                        </StatusPill>
                      </div>
                    )}
                  </SectionPanel>
                </TabsContent>
              )}
            </Tabs>
          </>
        )}
      </div>
    </DetailPanel>
  );
}
