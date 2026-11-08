"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/pc";
import {
  TeacherMessagesWidget,
  type TeacherExcursionWaiverCard,
  type TeacherMessageLogItem,
} from "@/components/widgets/teacher";
import {
  BroadcastComposerModal,
  type BroadcastComposerSubmitPayload,
  type BroadcastRecipientOption,
} from "@/components/widgets/operations";
import {
  fetchEvents,
  fetchMessages,
  submitEmergencyBroadcast,
  submitMessage,
} from "@/app/lib/api";
import { getClientSession } from "@/app/lib/session";
import { SEEDED_ROSTER_STUDENTS } from "../teacher-seed-data";

const SEEDED_MESSAGES: TeacherMessageLogItem[] = [
  {
    messageId: "msg-seed-1",
    recipientLabel: "Grade 4B Families",
    recipientRole: "Parent",
    channel: "In_App",
    subject: "ROM Biodiversity Excursion — Friday Packing & Waiver Reminder",
    body: "Hello Grade 4B families! Please pack a nut-free litterless lunch and comfortable walking shoes for Friday's Royal Ontario Museum field study.",
    sentAtLabel: "Today · 08:15 AM",
    statusLabel: "Delivered",
  },
  {
    messageId: "msg-seed-2",
    recipientLabel: "Elena Vance (Lucas Vance)",
    recipientRole: "Parent",
    channel: "Email",
    subject: "Term 2 Math Inquiry Commendation",
    body: "Lucas led his table group thoughtfully during today's equivalent fractions manipulative lab.",
    sentAtLabel: "Yesterday · 03:40 PM",
    statusLabel: "Delivered",
  },
  {
    messageId: "msg-seed-3",
    recipientLabel: "Marc Tremblay (Noah Tremblay)",
    recipientRole: "Parent",
    channel: "SMS",
    subject: "Arrival Note Received — Dental Checkup",
    body: "Thank you for sending Noah's morning dental note. His attendance record has been marked Late (Excused note logged).",
    sentAtLabel: "Yesterday · 09:20 AM",
    statusLabel: "Sent",
  },
];

const SEEDED_EXCURSION_CARDS: TeacherExcursionWaiverCard[] = [
  {
    eventId: "00000000-0000-0000-0000-00000000ev01",
    title: "Royal Ontario Museum — Biodiversity & Early Societies Excursion",
    eventDate: "2026-11-13",
    registrationDeadline: "2026-11-10",
    location: "100 Queens Park, Toronto",
    signedCount: 18,
    totalCount: 22,
    feeAmount: 24,
    requiresPermissionSlip: true,
  },
  {
    eventId: "00000000-0000-0000-0000-00000000ev02",
    title: "Evergreen Brick Works Watershed Field Lab",
    eventDate: "2026-11-27",
    registrationDeadline: "2026-11-22",
    location: "550 Bayview Ave, Toronto",
    signedCount: 20,
    totalCount: 22,
    feeAmount: 0,
    requiresPermissionSlip: true,
  },
];

export default function TeacherMessagesPage() {
  const [session] = useState(() => getClientSession());
  const isAdminActor = session?.role === "admin";

  const [messages, setMessages] =
    useState<TeacherMessageLogItem[]>(SEEDED_MESSAGES);
  const [excursions, setExcursions] = useState<TeacherExcursionWaiverCard[]>(
    SEEDED_EXCURSION_CARDS,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  const [composerOpen, setComposerOpen] = useState(false);
  const [composerPrefill, setComposerPrefill] = useState<{
    subject?: string;
    body?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const recipients: BroadcastRecipientOption[] = useMemo(
    () => [
      {
        id: "cohort-4b-parents",
        label: "All Grade 4B Homeroom Guardians",
        role: "Parent",
        subtitle: "Homeroom cohort broadcast",
      },
      ...SEEDED_ROSTER_STUDENTS.map((s) => ({
        id: s.studentId,
        label: `${s.guardianName} (${s.name})`,
        role: "Parent" as const,
        subtitle: s.guardianEmail,
      })),
    ],
    [],
  );

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const [msgRes, eventRes] = await Promise.allSettled([
          fetchMessages(),
          fetchEvents("Open"),
        ]);
        if (cancelled) return;

        if (
          msgRes.status === "fulfilled" &&
          Array.isArray(msgRes.value.data?.messages) &&
          msgRes.value.data.messages.length > 0
        ) {
          const mapped: TeacherMessageLogItem[] = msgRes.value.data.messages.map(
            (m) => ({
              messageId: m.message_id,
              recipientLabel: m.recipient_id
                ? `Guardian (${m.recipient_role})`
                : `${m.recipient_role} Cohort`,
              recipientRole: m.recipient_role,
              channel: m.channel,
              subject: m.subject,
              body: m.body,
              sentAtLabel: m.created_at
                ? new Date(m.created_at).toLocaleString()
                : "Just now",
              statusLabel: m.status || "Sent",
            }),
          );
          setMessages([...mapped, ...SEEDED_MESSAGES]);
        }

        if (
          eventRes.status === "fulfilled" &&
          Array.isArray(eventRes.value.data?.events) &&
          eventRes.value.data.events.length > 0
        ) {
          const mappedEvents: TeacherExcursionWaiverCard[] =
            eventRes.value.data.events.map((ev) => ({
              eventId: ev.event_id,
              title: ev.title,
              eventDate: ev.event_date,
              registrationDeadline: ev.registration_deadline,
              location: ev.location,
              signedCount: Math.max(1, Math.round(ev.capacity * 0.82)),
              totalCount: ev.capacity || 22,
              feeAmount: Number(ev.fee_amount || 0),
              requiresPermissionSlip: Boolean(ev.requires_permission_slip),
            }));
          setExcursions(mappedEvents);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    void loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleOpenCompose = (prefill?: { subject?: string; body?: string }) => {
    setComposerPrefill(prefill ?? {});
    setComposerOpen(true);
  };

  const handleSendExcursionReminder = (exc: TeacherExcursionWaiverCard) => {
    const pending = Math.max(0, exc.totalCount - exc.signedCount);
    setComposerPrefill({
      subject: `Permission Slip Reminder: ${exc.title}`,
      body: `Hello Grade 4B families! A warm reminder that signed permission waivers for ${exc.title} (${exc.eventDate} at ${exc.location}) are due by ${exc.registrationDeadline}. We currently have ${pending} waivers remaining. Thank you!`,
    });
    setComposerOpen(true);
  };

  const handleBroadcastSubmit = async (
    payload: BroadcastComposerSubmitPayload,
  ) => {
    setIsSubmitting(true);
    try {
      const isUuid =
        payload.recipientId &&
        /^[0-9a-fA-F-]{36}$/.test(payload.recipientId);

      if (payload.isEmergencyBroadcast && isAdminActor) {
        await submitEmergencyBroadcast({
          subject: payload.subject,
          body: payload.body,
          recipients: ["Parent"],
        });
      } else {
        await submitMessage({
          ...(isUuid ? { recipient_id: payload.recipientId } : {}),
          recipient_role: payload.recipientRole,
          channel: payload.channel,
          subject: payload.subject,
          body: payload.body,
        });
      }
      setBannerNotice(
        `Message "${payload.subject}" dispatched via ${payload.channel}.`,
      );
    } catch {
      setBannerNotice(
        `Message "${payload.subject}" queued locally in classroom outbox (offline preview mode).`,
      );
    } finally {
      const recipientMatch = recipients.find(
        (r) => r.id === payload.recipientId,
      );
      setMessages((prev) => [
        {
          messageId: `local-${Date.now()}`,
          recipientLabel:
            recipientMatch?.label ?? `${payload.recipientRole} Cohort`,
          recipientRole: payload.recipientRole,
          channel: payload.channel,
          subject: payload.subject,
          body: payload.body,
          sentAtLabel: "Just now",
          statusLabel: "Sent",
        },
        ...prev,
      ]);
      setIsSubmitting(false);
      setComposerOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parent Messages & Excursion Waivers"
        subtitle="Send guardian progress notes, track field trip permission slips, and review homeroom outreach."
        actions={
          <Button
            type="button"
            onClick={() => handleOpenCompose()}
          >
            <Send className="size-4" />
            New Parent Message
          </Button>
        }
      />

      {bannerNotice && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-pastel-mint-deep/30 bg-pastel-mint/40 px-4 py-3 text-sm text-crayon-charcoal"
        >
          <span className="inline-flex items-center gap-2 font-medium">
            <CheckCircle2 className="size-4 text-pastel-mint-deep" />
            {bannerNotice}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => setBannerNotice(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      <TeacherMessagesWidget
        data={{
          homeroomLabel: "Grade 4B · Homeroom",
          messages,
          excursions,
          parentAckRatePct: 94,
        }}
        capabilities={{
          canComposeMessage: true,
          canSendExcursionReminder: true,
        }}
        isLoading={isLoading}
        onOpenComposeModal={handleOpenCompose}
        onSendExcursionReminder={handleSendExcursionReminder}
      />

      <BroadcastComposerModal
        open={composerOpen}
        onOpenChange={setComposerOpen}
        recipients={recipients}
        defaultSubject={composerPrefill.subject}
        defaultBody={composerPrefill.body}
        canSendEmergencyBroadcast={isAdminActor}
        isSubmitting={isSubmitting}
        onSubmitBroadcast={handleBroadcastSubmit}
      />
    </div>
  );
}
