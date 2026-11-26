"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Mail,
  MessageSquare,
  Send,
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
  DetailPanel,
  EmptyState,
  KpiCard,
  SectionPanel,
  StatusPill,
  createDataTableColumnHelper,
} from "@/components/pc";
import type {
  TeacherMessageLogItem,
  TeacherMessagesWidgetProps,
} from "./teacher-messages-widget.types";

const msgColumnHelper = createDataTableColumnHelper<TeacherMessageLogItem>();

export function TeacherMessagesWidget({
  data,
  capabilities,
  isLoading = false,
  error = null,
  readOnly = false,
  headerActions,
  footerSlot,
  onOpenComposeModal,
  onSendExcursionReminder,
}: TeacherMessagesWidgetProps) {
  const [channelFilter, setChannelFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMessage, setSelectedMessage] =
    useState<TeacherMessageLogItem | null>(null);

  const canCompose = Boolean(capabilities?.canComposeMessage) && !readOnly;
  const canRemind =
    Boolean(capabilities?.canSendExcursionReminder) && !readOnly;

  const filteredMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return data.messages.filter((msg) => {
      const matchesChannel =
        channelFilter === "ALL" || msg.channel === channelFilter;
      const matchesText =
        !q ||
        msg.subject.toLowerCase().includes(q) ||
        msg.recipientLabel.toLowerCase().includes(q) ||
        msg.body.toLowerCase().includes(q);
      return matchesChannel && matchesText;
    });
  }, [channelFilter, data.messages, searchQuery]);

  const pendingWaiversTotal = useMemo(
    () =>
      data.excursions.reduce(
        (acc, item) => acc + Math.max(0, item.totalCount - item.signedCount),
        0,
      ),
    [data.excursions],
  );

  const columns = useMemo(
    () => [
      msgColumnHelper.accessor("subject", {
        header: "Subject & Preview",
        cell: ({ row }) => (
          <div className="min-w-0 max-w-md">
            <p className="truncate font-semibold text-foreground">
              {row.original.subject}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {row.original.body}
            </p>
          </div>
        ),
      }),
      msgColumnHelper.accessor("recipientLabel", {
        header: "Recipient",
        cell: ({ row }) => (
          <div className="text-xs">
            <span className="font-medium text-foreground">
              {row.original.recipientLabel}
            </span>
            <span className="ml-1.5 text-muted-foreground">
              ({row.original.recipientRole})
            </span>
          </div>
        ),
      }),
      msgColumnHelper.accessor("channel", {
        header: "Channel",
        cell: ({ row }) => (
          <StatusPill variant="info">{row.original.channel}</StatusPill>
        ),
      }),
      msgColumnHelper.accessor("sentAtLabel", {
        header: "Sent",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.sentAtLabel}
          </span>
        ),
      }),
      msgColumnHelper.accessor("statusLabel", {
        header: "Delivery",
        cell: ({ row }) => (
          <StatusPill
            variant={
              row.original.statusLabel === "Delivered" ||
              row.original.statusLabel === "Sent"
                ? "success"
                : "neutral"
            }
            dot
          >
            {row.original.statusLabel}
          </StatusPill>
        ),
      }),
    ],
    [],
  );

  if (isLoading) {
    return (
      <div className="space-y-5" aria-busy="true">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="h-24 animate-pulse rounded-xl border border-border bg-paper-card" />
          <div className="h-24 animate-pulse rounded-xl border border-border bg-paper-card" />
          <div className="h-24 animate-pulse rounded-xl border border-border bg-paper-card" />
          <div className="h-24 animate-pulse rounded-xl border border-border bg-paper-card" />
        </div>
        <div className="h-80 animate-pulse rounded-xl border border-border bg-paper-card" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-danger/30 bg-error-container px-4 py-3 text-sm text-on-error-container"
        >
          <AlertTriangle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Classroom Outbox"
          value={data.messages.length}
          delta={`${data.homeroomLabel} guardian thread log`}
          accentBorder="border-pastel-sky"
          icon={<Mail />}
        />
        <KpiCard
          label="Guardian Read Rate"
          value={`${data.parentAckRatePct}%`}
          delta="Within 24 hours of dispatch"
          accentBorder="border-pastel-mint"
          badge={
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-pastel-mint text-pastel-mint-deep border border-pastel-mint-deep/20">
              High Sync
            </span>
          }
          icon={<CheckCircle2 />}
        />
        <KpiCard
          label="Pending Excursion Slips"
          value={pendingWaiversTotal}
          delta={`${data.excursions.length} active classroom events`}
          accentBorder="border-pastel-peach"
          icon={<Calendar />}
        />
        <KpiCard
          label="Emergency All-Channel"
          value="Principal Gate"
          delta="Standard parent notes enabled"
          accentBorder="border-pastel-butter"
          icon={<Users />}
        />
      </div>

      {/* Excursion & Field Trip Permission Slip Tracker */}
      <SectionPanel
        title="Excursion & Field Trip Permission Waivers"
        borderClass="border-pastel-sky"
        action={
          canCompose ? (
            <Button
              type="button"
              size="sm"
              onClick={() => onOpenComposeModal?.()}
              className="rounded-full bg-pastel-butter hover:bg-pastel-sun text-crayon-charcoal border border-pastel-sun font-extrabold text-xs shadow-pastel cursor-pointer"
            >
              <Send className="size-4" />
              Compose Parent Message
            </Button>
          ) : (
            headerActions
          )
        }
      >
        {data.excursions.length === 0 ? (
          <EmptyState
            icon={<Calendar />}
            title="No upcoming classroom excursions"
            description="Field trips requiring signed guardian permission slips will appear here."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {data.excursions.map((exc) => {
              const pct =
                exc.totalCount > 0
                  ? Math.round((exc.signedCount / exc.totalCount) * 100)
                  : 100;
              const pending = Math.max(0, exc.totalCount - exc.signedCount);
              return (
                <div
                  key={exc.eventId}
                  className="rounded-3xl border-2 border-pastel-butter/80 bg-paper-tint/60 p-6 shadow-xs flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-extrabold text-crayon-charcoal">
                        {exc.title}
                      </h3>
                      <p className="mt-1 text-xs font-semibold text-crayon-muted">
                        Event: {exc.eventDate} · Deadline:{" "}
                        {exc.registrationDeadline} · {exc.location}
                      </p>
                    </div>
                    <StatusPill
                      variant={pending === 0 ? "success" : "warning"}
                      dot
                    >
                      {exc.signedCount}/{exc.totalCount} Signed
                    </StatusPill>
                  </div>

                  <div className="my-4 h-2.5 w-full overflow-hidden rounded-full bg-paper-card border border-pastel-butter/60">
                    <div
                      className="h-full rounded-full bg-pastel-mint-deep transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-pastel-butter/60">
                    <span className="text-xs font-bold text-crayon-espresso">
                      {exc.feeAmount > 0
                        ? `Activity fee: CAD ${exc.feeAmount.toFixed(2)}`
                        : "No activity fee"}
                    </span>
                    {pending > 0 && canRemind && (
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() => onSendExcursionReminder?.(exc)}
                        className="rounded-full border border-pastel-butter bg-paper-card text-crayon-charcoal hover:bg-pastel-butter/50 text-xs font-bold shadow-xs cursor-pointer"
                      >
                        <Send className="size-3.5" />
                        Remind {pending} Families
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionPanel>

      {/* Sent Messages & Guardian Communications Ledger */}
      <SectionPanel
        title="Guardian & Classroom Communication Log"
        borderClass="border-pastel-butter"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search subject or guardian..."
              aria-label="Search messages"
              className="rounded-full border-2 border-pastel-butter bg-paper-card pl-4 pr-4 py-1 h-8 w-48 text-xs font-semibold text-crayon-charcoal placeholder:text-crayon-muted focus:border-pastel-sun shadow-xs"
            />
            <div className="w-36">
              <Select value={channelFilter} onValueChange={setChannelFilter}>
                <SelectTrigger aria-label="Filter channel" className="rounded-full border-2 border-pastel-butter bg-paper-card h-8 text-xs font-bold text-crayon-charcoal shadow-xs">
                  <SelectValue placeholder="Channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Channels</SelectItem>
                  <SelectItem value="In_App">In-App Portal</SelectItem>
                  <SelectItem value="Email">Email</SelectItem>
                  <SelectItem value="SMS">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        }
      >
        {filteredMessages.length === 0 ? (
          <EmptyState
            icon={<MessageSquare />}
            title="No messages match your filter"
            description="Send a homeroom update, praise note, or field trip reminder to guardians."
            action={
              canCompose ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onOpenComposeModal?.()}
                >
                  Send First Update
                </Button>
              ) : undefined
            }
          />
        ) : (
          <DataTable
            columns={columns}
            data={filteredMessages}
            pageSize={8}
            onRowClick={(row) => setSelectedMessage(row)}
          />
        )}
      </SectionPanel>

      {footerSlot}

      {/* Message Detail Drawer */}
      <DetailPanel
        open={selectedMessage !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedMessage(null);
        }}
        title={selectedMessage?.subject ?? "Message Details"}
        description={
          selectedMessage
            ? `To: ${selectedMessage.recipientLabel} (${selectedMessage.recipientRole}) · ${selectedMessage.channel} · ${selectedMessage.sentAtLabel}`
            : undefined
        }
        footerActions={
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedMessage(null)}
            >
              Close
            </Button>
            {selectedMessage && canCompose && (
              <Button
                type="button"
                onClick={() => {
                  const subj = `Follow-up: ${selectedMessage.subject}`;
                  setSelectedMessage(null);
                  onOpenComposeModal?.({ subject: subj });
                }}
              >
                Send Follow-Up
              </Button>
            )}
          </div>
        }
      >
        {selectedMessage && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <StatusPill variant="success" dot>
                {selectedMessage.statusLabel}
              </StatusPill>
              <StatusPill variant="info">{selectedMessage.channel}</StatusPill>
            </div>
            <div className="rounded-xl border border-border bg-paper-card p-4 text-sm whitespace-pre-wrap text-crayon-charcoal">
              {selectedMessage.body}
            </div>
          </div>
        )}
      </DetailPanel>
    </div>
  );
}
