"use client";

import { useEffect, useId, useMemo } from "react";
import { useWatch } from "react-hook-form";
import { z } from "zod";
import { Megaphone, ShieldAlert, Sparkles, Users } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormModal,
  SelectField,
  StatusPill,
  TextAreaField,
  TextField,
  useZodForm,
  type SelectFieldOption,
} from "@/components/pc";
import type {
  BroadcastComposerModalProps,
  BroadcastComposerSubmitPayload,
} from "./broadcast-composer-modal.types";

const COHORT_PARENT_VALUE = "__COHORT_PARENT__";
const MAX_MESSAGE_LENGTH = 1000;

const TEMPLATE_VARIABLES = [
  "{{student_name}}",
  "{{homeroom}}",
  "{{event_date}}",
  "{{teacher_name}}",
] as const;

const CHANNEL_OPTIONS: readonly SelectFieldOption[] = [
  { value: "In_App", label: "In-App Portal Notification" },
  { value: "Email", label: "Guardian / Staff Email Dispatch" },
  { value: "SMS", label: "SMS Mobile Text Alert" },
];

const broadcastComposerFormSchema = z.object({
  audienceTarget: z.string().min(1, "Please select an audience or recipient"),
  channel: z.enum(["In_App", "Email", "SMS"]),
  subject: z.string().min(3, "Subject must be at least 3 characters"),
  body: z
    .string()
    .min(8, "Message body must be at least 8 characters")
    .max(
      MAX_MESSAGE_LENGTH,
      `Message body cannot exceed ${MAX_MESSAGE_LENGTH} characters`,
    ),
  isEmergencyBroadcast: z.boolean(),
});

export function BroadcastComposerModal({
  open,
  onOpenChange,
  recipients,
  defaultRecipientId,
  defaultSubject = "",
  defaultBody = "",
  canSendEmergencyBroadcast = false,
  isSubmitting = false,
  onSubmitBroadcast,
}: BroadcastComposerModalProps) {
  const emergencyCheckboxId = useId();
  const allowEmergencyBroadcast = canSendEmergencyBroadcast === true;

  const normalizedRecipients = useMemo(
    () =>
      recipients.map((item, idx) => ({
        ...item,
        safeId: item.id.trim() || `recipient-${idx}`,
      })),
    [recipients],
  );

  const audienceOptions = useMemo<SelectFieldOption[]>(() => {
    const cohortOption: SelectFieldOption = {
      value: COHORT_PARENT_VALUE,
      label: "Homeroom Parent Cohort (All Guardians)",
    };

    const individualOptions: SelectFieldOption[] = normalizedRecipients.map(
      (item) => ({
        value: item.safeId,
        label: item.subtitle
          ? `${item.label} — ${item.subtitle}`
          : item.label,
      }),
    );

    return [cohortOption, ...individualOptions];
  }, [normalizedRecipients]);

  const resolvedDefaultAudience = useMemo(() => {
    if (defaultRecipientId) {
      const matched = normalizedRecipients.find(
        (item) => item.id === defaultRecipientId,
      );
      if (matched) return matched.safeId;
    }
    return COHORT_PARENT_VALUE;
  }, [defaultRecipientId, normalizedRecipients]);

  const form = useZodForm(broadcastComposerFormSchema, {
    defaultValues: {
      audienceTarget: resolvedDefaultAudience,
      channel: "In_App",
      subject: defaultSubject,
      body: defaultBody,
      isEmergencyBroadcast: false,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        audienceTarget: resolvedDefaultAudience,
        channel: "In_App",
        subject: defaultSubject,
        body: defaultBody,
        isEmergencyBroadcast: false,
      });
    }
  }, [open, resolvedDefaultAudience, defaultSubject, defaultBody, form]);

  const watchedAudience = useWatch({
    control: form.control,
    name: "audienceTarget",
  });
  const watchedChannel = useWatch({
    control: form.control,
    name: "channel",
  });
  const watchedBody = useWatch({
    control: form.control,
    name: "body",
  });
  const watchedEmergency = useWatch({
    control: form.control,
    name: "isEmergencyBroadcast",
  });

  const selectedRecipient = useMemo(
    () =>
      normalizedRecipients.find((item) => item.safeId === watchedAudience) ??
      null,
    [normalizedRecipients, watchedAudience],
  );

  const bodyLength = (watchedBody ?? "").length;
  const smsSegments = Math.max(1, Math.ceil(Math.max(bodyLength, 1) / 160));
  const isEmergencyActive =
    allowEmergencyBroadcast && Boolean(watchedEmergency);

  const handleInsertVariable = (token: (typeof TEMPLATE_VARIABLES)[number]) => {
    const current = form.getValues("body") ?? "";
    const needsSpace =
      current.length > 0 && !/\s$/.test(current);
    const nextValue = `${current}${needsSpace ? " " : ""}${token}`;
    if (nextValue.length > MAX_MESSAGE_LENGTH) return;
    form.setValue("body", nextValue, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    const matchedRecipient = normalizedRecipients.find(
      (item) => item.safeId === values.audienceTarget,
    );

    const payload: BroadcastComposerSubmitPayload = {
      recipientId:
        values.audienceTarget === COHORT_PARENT_VALUE
          ? undefined
          : matchedRecipient?.id || undefined,
      recipientRole: matchedRecipient ? matchedRecipient.role : "Parent",
      channel: values.channel,
      subject: values.subject.trim(),
      body: values.body.trim(),
      isEmergencyBroadcast: allowEmergencyBroadcast
        ? Boolean(values.isEmergencyBroadcast)
        : false,
    };

    await onSubmitBroadcast(payload);
  });

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title="Compose Announcement or Guardian Message"
      description="Dispatch targeted updates to an individual guardian, staff member, or full homeroom parent cohort."
      submitLabel={
        isEmergencyActive
          ? "Dispatch Emergency Broadcast"
          : "Send Communication"
      }
      loading={isSubmitting}
      onSubmit={handleSubmit}
    >
      <div className="space-y-4 pr-1">
        {/* Audience & Delivery Channel */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField
            control={form.control}
            name="audienceTarget"
            label="Audience / Recipient"
            options={audienceOptions}
            disabled={isSubmitting}
          />
          <SelectField
            control={form.control}
            name="channel"
            label="Delivery Channel"
            options={CHANNEL_OPTIONS}
            disabled={isSubmitting}
          />
        </div>

        {/* Audience Summary Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-paper px-3.5 py-2.5 text-xs">
          <span className="inline-flex items-center gap-2 font-medium text-crayon-charcoal">
            <Users className="size-3.5 text-pastel-sky-deep" aria-hidden="true" />
            {selectedRecipient
              ? `Direct Recipient: ${selectedRecipient.label}`
              : "Cohort Broadcast: All Linked Homeroom Guardians"}
          </span>
          <StatusPill variant={selectedRecipient ? "info" : "success"} dot>
            {selectedRecipient
              ? `${selectedRecipient.role} Channel`
              : "Parent Cohort"}
          </StatusPill>
        </div>

        {/* Subject */}
        <TextField
          control={form.control}
          name="subject"
          label="Message Subject"
          placeholder="e.g., Weekly Classroom Update & Field Trip Reminder"
          disabled={isSubmitting}
        />

        {/* 1-Click Template Variable Chips */}
        <div className="space-y-1.5 rounded-xl border border-border bg-surface-container-low p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-crayon-charcoal">
              <Sparkles
                className="size-3.5 text-pastel-lilac-deep"
                aria-hidden="true"
              />
              1-Click Merge Variable Chips
            </span>
            <span className="text-xs text-muted-foreground">
              Click to insert into message body
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {TEMPLATE_VARIABLES.map((token) => (
              <button
                key={token}
                type="button"
                disabled={isSubmitting}
                onClick={() => handleInsertVariable(token)}
                className="rounded-full border border-border bg-pastel-lilac/40 px-2.5 py-1 font-mono text-xs font-semibold text-pastel-lilac-deep transition-colors hover:bg-pastel-lilac/70 disabled:opacity-50"
              >
                {token}
              </button>
            ))}
          </div>
        </div>

        {/* Message Body + Live Character Counter */}
        <div className="space-y-1.5">
          <TextAreaField
            control={form.control}
            name="body"
            label="Message Body"
            rows={5}
            placeholder="Dear {{student_name}}'s family, here is an update from {{homeroom}}..."
            disabled={isSubmitting}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {watchedChannel === "SMS"
                ? `Estimated SMS segments: ${smsSegments} (160 chars per segment)`
                : "Merge variables resolve automatically per recipient at dispatch"}
            </span>
            <span
              className={`font-medium tabular-nums ${
                bodyLength > MAX_MESSAGE_LENGTH - 80
                  ? "text-pastel-peach-deep"
                  : "text-muted-foreground"
              }`}
            >
              {bodyLength} / {MAX_MESSAGE_LENGTH} characters
            </span>
          </div>
        </div>

        {/* Capability-Gated Emergency All-Channel Broadcast Toggle */}
        {allowEmergencyBroadcast && (
          <div
            className={`rounded-xl border p-3.5 transition-colors ${
              isEmergencyActive
                ? "border-danger/40 bg-error-container text-on-error-container"
                : "border-border bg-paper text-crayon-charcoal"
            }`}
          >
            <div className="flex items-start gap-3">
              <Checkbox
                id={emergencyCheckboxId}
                checked={isEmergencyActive}
                disabled={isSubmitting}
                onCheckedChange={(checked) =>
                  form.setValue("isEmergencyBroadcast", Boolean(checked), {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                className="mt-0.5"
              />
              <div className="flex-1 space-y-1">
                <label
                  htmlFor={emergencyCheckboxId}
                  className="flex cursor-pointer flex-wrap items-center gap-2 text-xs font-bold"
                >
                  {isEmergencyActive ? (
                    <ShieldAlert className="size-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <Megaphone
                      className="size-4 shrink-0 text-pastel-peach-deep"
                      aria-hidden="true"
                    />
                  )}
                  <span>Emergency All-Channel Broadcast Override</span>
                  <StatusPill
                    variant={isEmergencyActive ? "danger" : "warning"}
                    dot
                  >
                    {isEmergencyActive ? "All Channels Armed" : "Authorized"}
                  </StatusPill>
                </label>
                <p
                  className={`text-xs ${
                    isEmergencyActive
                      ? "text-on-error-container"
                      : "text-crayon-muted"
                  }`}
                >
                  Simultaneously dispatches high-priority alerts across In-App, Email, and SMS with urgent campus safeguarding priority.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </FormModal>
  );
}
