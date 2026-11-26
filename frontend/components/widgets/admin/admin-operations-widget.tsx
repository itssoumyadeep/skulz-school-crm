"use client";

import { useState } from "react";
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  PackageCheck,
  Plus,
  RefreshCw,
  Users,
} from "lucide-react";
import type { AdminOperationsWidgetProps } from "./admin-operations-widget.types";

export function AdminOperationsWidget({
  staff,
  payrollRuns,
  vendors,
  purchaseOrders,
  deliveryRecords,
  vendorInvoices,
  events,
  isLoading = false,
  isSaving = false,
  errorMessage = null,
  successMessage = null,
  onCreateStaff,
  onComputePayroll,
  onApprovePayroll,
  onApproveVendorInvoice,
  onCreateEvent,
  onRefresh,
}: AdminOperationsWidgetProps) {
  const [tab, setTab] = useState<"staff" | "payroll" | "procurement" | "events">(
    "staff",
  );
  const [staffName, setStaffName] = useState("");
  const [staffRole, setStaffRole] = useState("Teacher");
  const [staffDept, setStaffDept] = useState("Early Learning");
  const [staffSalary, setStaffSalary] = useState(48000);
  const [dbsRef, setDbsRef] = useState("DBS-2026-991");

  const [payrollPeriod, setPayrollPeriod] = useState(
    new Date().toISOString().slice(0, 7),
  );
  const [payrollStaffId, setPayrollStaffId] = useState("");
  const [payrollBaseSalary, setPayrollBaseSalary] = useState(4200);

  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState(() =>
    new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
  );
  const [eventLocation, setEventLocation] = useState("Main Courtyard");

  const selectedPayrollStaffId =
    payrollStaffId || String(staff[0]?.staff_id ?? "");

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName.trim()) return;
    await onCreateStaff({
      name: staffName.trim(),
      role: staffRole.trim() || "Staff",
      dept: staffDept.trim() || "Operations",
      employment_type: "Full_Time",
      salary: Number(staffSalary) || 45000,
      dbs_ref: dbsRef.trim() || "DBS-2026-NEW",
    });
    setStaffName("");
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;
    await onCreateEvent({
      title: eventTitle.trim(),
      event_date: eventDate,
      registration_deadline: eventDate,
      location: eventLocation.trim() || "Campus",
      capacity: 60,
      fee_amount: 0,
    });
    setEventTitle("");
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border-2 border-pastel-lilac bg-paper-card p-6 shadow-pastel-warm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-terracotta">
              US-AD-07 &amp; US-AD-08 · HR, Payroll, 3-Way Match &amp; Events
            </p>
            <h1 className="text-2xl font-extrabold text-crayon-charcoal">
              Operations, Payroll &amp; Procurement
            </h1>
            <p className="mt-1 text-xs text-crayon-espresso">
              {staff.length} Staff · {payrollRuns.length} Payroll Runs · {vendorInvoices.length} Vendor Invoices · {events.length} Events
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex flex-wrap rounded-full border border-pastel-butter bg-paper-tint p-1 text-xs font-bold">
              {(
                [
                  ["staff", "Staff & HR", Users],
                  ["payroll", "Payroll", Briefcase],
                  ["procurement", "Procurement 3-Way Match", PackageCheck],
                  ["events", "Events", Calendar],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 cursor-pointer ${
                    tab === id
                      ? "bg-paper-card text-crayon-charcoal shadow-sm"
                      : "text-crayon-muted"
                  }`}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 rounded-full border border-pastel-butter bg-paper-tint px-4 py-2 text-xs font-bold text-crayon-charcoal hover:bg-pastel-butter/40 cursor-pointer"
              >
                <RefreshCw
                  className={`size-3.5 ${isLoading ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                Refresh
              </button>
            )}
          </div>
        </div>
      </section>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-2xl border-2 border-error/40 bg-error-container px-5 py-3 text-sm font-semibold text-on-error-container"
        >
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div
          role="status"
          className="rounded-2xl border-2 border-pastel-mint bg-pastel-mint/40 px-5 py-3 text-sm font-semibold text-pastel-mint-deep"
        >
          {successMessage}
        </div>
      )}

      {tab === "staff" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleStaffSubmit}
            className="lg:col-span-4 rounded-3xl border-2 border-pastel-sky bg-paper-card p-6 shadow-pastel-warm space-y-3"
          >
            <h2 className="text-base font-extrabold text-crayon-charcoal">
              Register Staff Member
            </h2>
            <input
              type="text"
              placeholder="Full Name"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              className="w-full rounded-2xl border border-border bg-paper-tint px-3.5 py-2 text-xs font-semibold"
              required
            />
            <input
              type="text"
              placeholder="Role (e.g. Teacher, CareGiver)"
              value={staffRole}
              onChange={(e) => setStaffRole(e.target.value)}
              className="w-full rounded-2xl border border-border bg-paper-tint px-3.5 py-2 text-xs font-semibold"
            />
            <input
              type="text"
              placeholder="Department"
              value={staffDept}
              onChange={(e) => setStaffDept(e.target.value)}
              className="w-full rounded-2xl border border-border bg-paper-tint px-3.5 py-2 text-xs font-semibold"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Annual Salary"
                value={staffSalary}
                onChange={(e) => setStaffSalary(Number(e.target.value) || 0)}
                className="w-full rounded-2xl border border-border bg-paper-tint px-3 py-2 text-xs font-semibold"
              />
              <input
                type="text"
                placeholder="DBS Ref"
                value={dbsRef}
                onChange={(e) => setDbsRef(e.target.value)}
                className="w-full rounded-2xl border border-border bg-paper-tint px-3 py-2 text-xs font-semibold"
              />
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-full bg-terracotta px-4 py-2 text-xs font-bold text-on-primary cursor-pointer"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              Add Staff
            </button>
          </form>

          <section className="lg:col-span-8 rounded-3xl border-2 border-pastel-butter bg-paper-card p-6 shadow-pastel-warm space-y-3">
            <h2 className="text-base font-extrabold text-crayon-charcoal">
              Staff Directory ({staff.length})
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {staff.length === 0 ? (
                <p className="py-8 text-center text-xs text-crayon-muted">
                  No staff records found.
                </p>
              ) : (
                staff.map((member, idx) => (
                  <div
                    key={String(member.staff_id ?? idx)}
                    className="flex items-center justify-between rounded-2xl bg-paper-tint px-4 py-3 text-xs"
                  >
                    <div>
                      <p className="font-extrabold text-crayon-charcoal">
                        {String(member.name ?? "Staff Member")}
                      </p>
                      <p className="text-crayon-muted">
                        {String(member.role ?? "Staff")} · {String(member.dept ?? member.department ?? "General")} · DBS {String(member.dbs_ref ?? "On File")}
                      </p>
                    </div>
                    <span className="rounded-full bg-pastel-mint/60 px-2.5 py-0.5 font-bold text-pastel-mint-deep">
                      {String(member.status ?? "Active")}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}

      {tab === "payroll" && (
        <section className="rounded-3xl border-2 border-pastel-mint bg-paper-card p-6 shadow-pastel-warm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <h2 className="text-lg font-extrabold text-crayon-charcoal">
              Payroll Computation &amp; Approval
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Select Staff for Payroll"
                value={selectedPayrollStaffId}
                onChange={(e) => setPayrollStaffId(e.target.value)}
                className="rounded-2xl border border-border bg-paper-tint px-3 py-2 text-xs font-bold"
              >
                {staff.map((s) => (
                  <option key={String(s.staff_id)} value={String(s.staff_id)}>
                    {String(s.name ?? s.staff_id)}
                  </option>
                ))}
              </select>
              <input
                type="month"
                value={payrollPeriod}
                onChange={(e) => setPayrollPeriod(e.target.value)}
                className="rounded-2xl border border-border bg-paper-tint px-3 py-2 text-xs font-bold"
              />
              <input
                type="number"
                aria-label="Base Salary"
                value={payrollBaseSalary}
                onChange={(e) =>
                  setPayrollBaseSalary(Number(e.target.value) || 0)
                }
                className="w-28 rounded-2xl border border-border bg-paper-tint px-3 py-2 text-xs font-bold"
              />
              <button
                type="button"
                disabled={isSaving || !selectedPayrollStaffId}
                onClick={() =>
                  void onComputePayroll({
                    period: payrollPeriod,
                    staff_id: selectedPayrollStaffId,
                    base_salary: payrollBaseSalary,
                  })
                }
                className="rounded-full bg-terracotta px-4 py-2 text-xs font-bold text-on-primary cursor-pointer"
              >
                Compute Payroll
              </button>
            </div>
          </div>
          {payrollRuns.length === 0 ? (
            <p className="py-8 text-center text-xs text-crayon-muted">
              No payroll runs generated yet.
            </p>
          ) : (
            <div className="space-y-2">
              {payrollRuns.map((run, idx) => (
                <div
                  key={String(run.payroll_id ?? idx)}
                  className="flex items-center justify-between rounded-2xl bg-paper-tint px-4 py-3 text-xs"
                >
                  <div>
                    <p className="font-extrabold text-crayon-charcoal">
                      Period {String(run.period ?? payrollPeriod)} · Net ${String(run.net_pay ?? run.total_net ?? 0)}
                    </p>
                    <p className="text-crayon-muted">
                      Status: {String(run.status ?? "Draft")}
                    </p>
                  </div>
                  {String(run.status ?? "") !== "Approved" && run.payroll_id ? (
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => void onApprovePayroll(String(run.payroll_id))}
                      className="inline-flex items-center gap-1 rounded-full bg-mint px-3.5 py-1.5 font-bold text-on-primary cursor-pointer"
                    >
                      <CheckCircle2 className="size-3.5" aria-hidden="true" />
                      Approve
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "procurement" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border-2 border-pastel-sky bg-paper-card p-4 text-xs">
              <p className="font-bold text-crayon-muted uppercase">Vendors</p>
              <p className="mt-1 text-2xl font-extrabold">{vendors.length}</p>
            </div>
            <div className="rounded-3xl border-2 border-pastel-butter bg-paper-card p-4 text-xs">
              <p className="font-bold text-crayon-muted uppercase">Purchase Orders</p>
              <p className="mt-1 text-2xl font-extrabold">{purchaseOrders.length}</p>
            </div>
            <div className="rounded-3xl border-2 border-pastel-mint bg-paper-card p-4 text-xs">
              <p className="font-bold text-crayon-muted uppercase">Delivery Records</p>
              <p className="mt-1 text-2xl font-extrabold">{deliveryRecords.length}</p>
            </div>
          </div>

          <section className="rounded-3xl border-2 border-pastel-peach bg-paper-card p-6 shadow-pastel-warm space-y-3">
            <h2 className="text-base font-extrabold text-crayon-charcoal">
              Vendor Invoices &amp; 3-Way Match Gate (PO + Delivery + Invoice)
            </h2>
            {vendorInvoices.length === 0 ? (
              <p className="py-8 text-center text-xs text-crayon-muted">
                No vendor invoices pending review.
              </p>
            ) : (
              <div className="space-y-2">
                {vendorInvoices.map((inv, idx) => (
                  <div
                    key={String(inv.vendor_invoice_id ?? idx)}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-paper-tint px-4 py-3 text-xs"
                  >
                    <div>
                      <p className="font-extrabold text-crayon-charcoal">
                        Invoice #{String(inv.invoice_number ?? String(inv.vendor_invoice_id ?? "").slice(0, 8))} · ${String(inv.amount ?? 0)}
                      </p>
                      <p className="text-crayon-muted">
                        Status: {String(inv.status ?? "Pending")} · Match: {String(inv.match_status ?? inv.three_way_match ?? "Pending")}
                      </p>
                    </div>
                    {String(inv.status ?? "") !== "Approved" && inv.vendor_invoice_id ? (
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() =>
                          void onApproveVendorInvoice(String(inv.vendor_invoice_id))
                        }
                        className="rounded-full bg-terracotta px-4 py-1.5 font-bold text-on-primary cursor-pointer"
                      >
                        Approve 3-Way Match
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {tab === "events" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleEventSubmit}
            className="lg:col-span-4 rounded-3xl border-2 border-pastel-sky bg-paper-card p-6 shadow-pastel-warm space-y-3"
          >
            <h2 className="text-base font-extrabold text-crayon-charcoal">
              Create Community Event
            </h2>
            <input
              type="text"
              placeholder="Event Title"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              className="w-full rounded-2xl border border-border bg-paper-tint px-3.5 py-2 text-xs font-semibold"
              required
            />
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full rounded-2xl border border-border bg-paper-tint px-3.5 py-2 text-xs font-semibold"
            />
            <input
              type="text"
              placeholder="Location"
              value={eventLocation}
              onChange={(e) => setEventLocation(e.target.value)}
              className="w-full rounded-2xl border border-border bg-paper-tint px-3.5 py-2 text-xs font-semibold"
            />
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-full bg-terracotta px-4 py-2 text-xs font-bold text-on-primary cursor-pointer"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              Publish Event
            </button>
          </form>

          <section className="lg:col-span-8 rounded-3xl border-2 border-pastel-butter bg-paper-card p-6 shadow-pastel-warm space-y-3">
            <h2 className="text-base font-extrabold text-crayon-charcoal">
              Scheduled School Events ({events.length})
            </h2>
            {events.length === 0 ? (
              <p className="py-8 text-center text-xs text-crayon-muted">
                No school events scheduled yet.
              </p>
            ) : (
              <div className="space-y-2">
                {events.map((ev, idx) => (
                  <div
                    key={String(ev.event_id ?? idx)}
                    className="flex items-center justify-between rounded-2xl bg-paper-tint px-4 py-3 text-xs"
                  >
                    <div>
                      <p className="font-extrabold text-crayon-charcoal">
                        {String(ev.title ?? "Event")}
                      </p>
                      <p className="text-crayon-muted">
                        {String(ev.event_date ?? "")} · {String(ev.location ?? "")}
                      </p>
                    </div>
                    <span className="rounded-full bg-pastel-sky/60 px-2.5 py-0.5 font-bold text-pastel-sky-deep">
                      {String(ev.status ?? "Open")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
