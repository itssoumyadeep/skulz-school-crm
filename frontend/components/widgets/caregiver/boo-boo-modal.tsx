"use client";

import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Bandage, X, ShieldAlert, Clock, CheckCircle2 } from "lucide-react";
import type { CaregiverToddler } from "./caregiver-overview-widget.types";

interface BooBooModalProps {
  isOpen: boolean;
  onClose: () => void;
  toddlers: CaregiverToddler[];
  selectedToddlerId?: string;
  onSubmit: (incident: {
    studentId: string;
    studentName: string;
    incidentType: string;
    description: string;
    actionsTaken: string;
  }) => void;
}

const emptySubscribe = () => () => {};

export function BooBooModal({
  isOpen,
  onClose,
  toddlers,
  selectedToddlerId,
  onSubmit,
}: BooBooModalProps) {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const [studentId, setStudentId] = useState(
    selectedToddlerId || (toddlers[0]?.studentId ?? ""),
  );
  const [incidentType, setIncidentType] = useState("Skin Scrape");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen || !isClient) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const selectedToddler =
      toddlers.find((t) => t.studentId === studentId) || toddlers[0];
    const studentName = selectedToddler?.name ?? "Toddler";

    onSubmit({
      studentId: studentId || selectedToddler?.studentId || "",
      studentName,
      incidentType,
      description: description || "Minor tumble during playroom session.",
      actionsTaken:
        "Treated with saline wash and soft plaster by Nurse Clara. Monitored for comfort.",
    });

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setSubmitting(false);
      onClose();
    }, 900);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="boo-boo-modal-title"
    >
      {/* Dimming Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-lg rounded-3xl bg-surface-container-lowest p-6 sm:p-8 shadow-2xl border-t-8 border-terracotta z-[70] flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-terracotta/20 text-terracotta flex items-center justify-center shadow-sm">
              <Bandage className="w-6 h-6" />
            </div>
            <div>
              <h3
                id="boo-boo-modal-title"
                className="text-xl font-bold text-on-surface tracking-tight"
              >
                Log Minor Tumble or Boo-Boo
              </h3>
              <p className="text-xs font-medium text-on-surface-variant flex items-center gap-1.5 mt-0.5">
                <ShieldAlert className="w-3.5 h-3.5 text-secondary" />
                Rule BR-07-02: Instant parent alert timestamp &amp; 1h SLA
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-mint/20 text-mint flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-on-surface">
              Incident Recorded &amp; Dispatched!
            </h4>
            <p className="text-xs text-on-surface-variant max-w-xs">
              Nurse Clara digital stamp signed. 1-Hour guardian SLA timer initiated with parental mobile receipt.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Learner Select */}
            <div>
              <label
                htmlFor="learner-select"
                className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5"
              >
                Select Learner
              </label>
              <select
                id="learner-select"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full rounded-2xl bg-surface-container-low px-4 py-2.5 text-sm font-medium text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-terracotta/40"
              >
                {toddlers.map((toddler) => (
                  <option key={toddler.studentId} value={toddler.studentId}>
                    {toddler.name} ({toddler.cubbyLabel})
                  </option>
                ))}
              </select>
            </div>

            {/* Incident Type Pills */}
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Incident Classification
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Skin Scrape", tone: "bg-terracotta text-on-primary" },
                  { label: "Bump / Bruise", tone: "bg-surface-container text-on-surface" },
                  { label: "Small Pinch", tone: "bg-surface-container text-on-surface" },
                ].map((item) => {
                  const isSelected = incidentType === item.label;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setIncidentType(item.label)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-center border ${
                        isSelected
                          ? "bg-terracotta text-on-primary border-terracotta shadow-sm scale-[1.02]"
                          : "bg-surface-container text-on-surface-variant border-transparent hover:bg-surface-container-high"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Note Area */}
            <div>
              <label
                htmlFor="incident-notes"
                className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5"
              >
                Care Administered &amp; Nurse Note
              </label>
              <textarea
                id="incident-notes"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Cleaned with saline, applied cold pack or fun plaster, gentle reassurance given..."
                className="w-full rounded-2xl bg-surface-container-low p-3.5 text-sm text-on-surface placeholder:text-on-surface-variant/60 border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-terracotta/40 resize-none"
              />
            </div>

            {/* 1-Hour SLA Notice Banner */}
            <div className="p-3 rounded-2xl bg-cream border border-outline-variant/30 flex items-center justify-between text-xs text-on-surface-variant">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-4 h-4 text-secondary" />
                Mandatory 1-Hour Guardian SLA
              </span>
              <span className="px-2 py-0.5 rounded-full bg-mint/20 text-green-800 font-bold text-[11px]">
                Ready to Dispatch
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-full bg-terracotta hover:opacity-90 active:scale-95 text-on-primary font-bold text-xs shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Bandage className="w-4 h-4" />
                <span>Save &amp; Notify Guardian</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
