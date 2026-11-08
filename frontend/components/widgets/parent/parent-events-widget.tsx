"use client";

import { useState } from "react";
import { Calendar, MapPin, CheckCircle2, AlertCircle, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ParentEventsWidgetProps, EventDisplayItem } from "./parent-events-widget.types";

export function ParentEventsWidget({
  data,
  capabilities = { canRegister: true, canSignSlips: true },
  isLoading = false,
  error = null,
  readOnly = false,
  headerActions,
  footerSlot,
  onRegisterEvent,
  isRegistering = false,
}: ParentEventsWidgetProps) {
  const [selectedEvent, setSelectedEvent] = useState<EventDisplayItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    data.children[0]?.student_id || "",
  );
  const [signedSlip, setSignedSlip] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleOpenRegister = (event: EventDisplayItem) => {
    setSelectedEvent(event);
    setSignedSlip(false);
    setFormError(null);
    setModalOpen(true);
  };

  const handleConfirmRegister = async () => {
    if (!selectedEvent) return;
    if (!selectedStudentId) {
      setFormError("Please select which child will attend this event.");
      return;
    }
    if (selectedEvent.requires_permission_slip && !signedSlip) {
      setFormError("Parental permission slip signature is required for this event.");
      return;
    }

    setFormError(null);
    await onRegisterEvent(selectedEvent.event_id, selectedStudentId, signedSlip);
    setModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-24 bg-surface-container rounded-3xl" />
        <div className="h-64 bg-surface-container rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-on-surface tracking-tight">
            School Activities & Permission Slips
          </h2>
          <p className="text-xs text-on-surface-variant">
            {data.household_name} • Register for field trips, sports days, and campus events.
          </p>
        </div>
        {headerActions}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-error-container text-on-error-container text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Events Grid */}
      {data.events.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-surface-container-lowest border border-border">
          <Calendar className="w-8 h-8 text-muted mx-auto mb-2" />
          <p className="text-xs text-on-surface-variant font-medium">
            No upcoming events currently scheduled.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.events.map((evt) => (
            <div
              key={evt.event_id}
              className="p-5 rounded-3xl bg-surface-container-lowest border border-border shadow-xs flex flex-col justify-between space-y-4 hover:border-pastel-peach-deep/30 transition"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-pastel-sky/30 text-pastel-sky-deep">
                    {evt.status}
                  </span>
                  {evt.fee_amount > 0 ? (
                    <span className="text-xs font-bold text-on-surface">
                      ${evt.fee_amount.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-pastel-mint-deep">Free</span>
                  )}
                </div>

                <h3 className="text-base font-bold text-on-surface mb-1">
                  {evt.title}
                </h3>
                {evt.description && (
                  <p className="text-xs text-on-surface-variant line-clamp-2 mb-3">
                    {evt.description}
                  </p>
                )}

                <div className="space-y-1 text-xs text-on-surface-variant">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-muted shrink-0" />
                    <span>{evt.event_date} (Register by {evt.registration_deadline})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-muted shrink-0" />
                    <span>{evt.location}</span>
                  </div>
                  {evt.requires_permission_slip && (
                    <div className="flex items-center gap-2 text-pastel-peach-deep">
                      <FileCheck className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-medium">Permission Slip Required</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between">
                {evt.is_registered ? (
                  <span className="text-xs font-semibold text-pastel-mint-deep flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Registered
                    {evt.permission_slip_signed && " • Slip Signed"}
                  </span>
                ) : (
                  <div className="w-full flex justify-end">
                    {capabilities.canRegister && !readOnly && (
                      <Button
                        size="sm"
                        onClick={() => handleOpenRegister(evt)}
                        className="bg-primary text-on-primary hover:bg-primary/90 text-xs px-4 py-1.5 rounded-full shadow-xs"
                      >
                        Register Child
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Registration & Permission Slip Modal */}
      <Dialog open={modalOpen} onOpenChange={(val) => !isRegistering && setModalOpen(val)}>
        <DialogContent className="sm:max-w-md bg-surface-container-lowest border-border text-on-surface">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-on-surface">
              Register for {selectedEvent?.title}
            </DialogTitle>
            <p className="text-xs text-on-surface-variant">
              Date: {selectedEvent?.event_date} • Location: {selectedEvent?.location}
            </p>
          </DialogHeader>

          {formError && (
            <div className="p-3 rounded-lg bg-error-container text-on-error-container text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Select Child to Register
              </label>
              <Select
                value={selectedStudentId}
                onValueChange={setSelectedStudentId}
                disabled={isRegistering}
              >
                <SelectTrigger className="bg-surface border-border text-on-surface text-sm">
                  <SelectValue placeholder="Select child" />
                </SelectTrigger>
                <SelectContent className="bg-surface-container-lowest border-border text-on-surface">
                  {data.children.map((c) => (
                    <SelectItem key={c.student_id} value={c.student_id}>
                      {c.name} ({c.grade})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedEvent?.requires_permission_slip && (
              <div className="p-3 rounded-xl border border-border bg-surface-container-low/60 space-y-2">
                <h4 className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-pastel-peach-deep" />
                  Parental Consent & Permission Slip
                </h4>
                <div className="flex items-start space-x-2 pt-1">
                  <Checkbox
                    id="slip-consent"
                    checked={signedSlip}
                    onCheckedChange={(checked) => setSignedSlip(Boolean(checked))}
                    disabled={isRegistering}
                    className="mt-0.5"
                  />
                  <label
                    htmlFor="slip-consent"
                    className="text-xs text-on-surface-variant leading-relaxed cursor-pointer"
                  >
                    I hereby give permission for my child to participate in this school event, including transportation and supervised activities.
                  </label>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={isRegistering}
              className="border-border text-on-surface hover:bg-surface-container"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmRegister}
              disabled={isRegistering}
              className="bg-primary text-on-primary hover:bg-primary/90 font-semibold shadow-xs"
            >
              {isRegistering ? "Confirming Registration..." : "Confirm Registration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {footerSlot}
    </div>
  );
}
