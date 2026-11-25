"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminOperationsWidget } from "@/components/widgets/admin";
import { usePortalViewMode } from "@/components/pc/view-mode-preference";
import {
  approvePayroll,
  approveVendorInvoice,
  computePayroll,
  createEvent,
  createStaff,
  fetchDeliveryRecords,
  fetchEvents,
  fetchPayrollRuns,
  fetchPurchaseOrders,
  fetchStaffList,
  fetchVendorInvoices,
  fetchVendors,
} from "@/app/lib/api";
import { getClientSession } from "@/app/lib/session";

function extractErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

export default function AdminOperationsPage() {
  const [viewMode] = usePortalViewMode("admin", "cards");
  const [staff, setStaff] = useState<Array<Record<string, unknown>>>([]);
  const [payrollRuns, setPayrollRuns] = useState<Array<Record<string, unknown>>>(
    [],
  );
  const [vendors, setVendors] = useState<Array<Record<string, unknown>>>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [deliveryRecords, setDeliveryRecords] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [vendorInvoices, setVendorInvoices] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [events, setEvents] = useState<Array<Record<string, unknown>>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadOperations = useCallback(async (showSpinner = false) => {
    if (showSpinner) {
      setIsLoading(true);
      setErrorMessage(null);
    }
    const [
      staffRes,
      payrollRes,
      vendorsRes,
      poRes,
      delivRes,
      vInvRes,
      eventsRes,
    ] = await Promise.allSettled([
      fetchStaffList(),
      fetchPayrollRuns(),
      fetchVendors(),
      fetchPurchaseOrders(),
      fetchDeliveryRecords(),
      fetchVendorInvoices(),
      fetchEvents(),
    ]);

    if (staffRes.status === "fulfilled") setStaff(staffRes.value.data?.staff ?? []);
    if (payrollRes.status === "fulfilled")
      setPayrollRuns(payrollRes.value.data?.payroll_runs ?? []);
    if (vendorsRes.status === "fulfilled")
      setVendors(vendorsRes.value.data?.vendors ?? []);
    if (poRes.status === "fulfilled")
      setPurchaseOrders(poRes.value.data?.purchase_orders ?? []);
    if (delivRes.status === "fulfilled")
      setDeliveryRecords(delivRes.value.data?.delivery_records ?? []);
    if (vInvRes.status === "fulfilled")
      setVendorInvoices(vInvRes.value.data?.vendor_invoices ?? []);
    if (eventsRes.status === "fulfilled") {
      const d = eventsRes.value.data;
      setEvents(Array.isArray(d?.events) ? (d.events as unknown as Array<Record<string, unknown>>) : []);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (active) void loadOperations(false);
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [loadOperations]);

  const runAction = async (fn: () => Promise<void>, okMsg: string, failMsg: string) => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await fn();
      await loadOperations(false);
      setSuccessMessage(okMsg);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, failMsg));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminOperationsWidget
      staff={staff}
      payrollRuns={payrollRuns}
      vendors={vendors}
      purchaseOrders={purchaseOrders}
      deliveryRecords={deliveryRecords}
      vendorInvoices={vendorInvoices}
      events={events}
      viewMode={viewMode}
      isLoading={isLoading}
      isSaving={isSaving}
      errorMessage={errorMessage}
      successMessage={successMessage}
      onCreateStaff={(payload) =>
        runAction(
          async () => {
            const today = new Date().toISOString().split("T")[0];
            const nextYear = new Date(Date.now() + 365 * 86400000)
              .toISOString()
              .split("T")[0];
            await createStaff({
              ...payload,
              start_date: today,
              dbs_expiry: nextYear,
            });
          },
          `Added staff member ${payload.name}.`,
          "Unable to create staff record.",
        )
      }
      onComputePayroll={(payload) =>
        runAction(
          async () => {
            await computePayroll(payload.period, {
              staff_id: payload.staff_id,
              base_salary: payload.base_salary,
            });
          },
          `Computed payroll for ${payload.period}.`,
          "Unable to compute payroll.",
        )
      }
      onApprovePayroll={(payrollId) =>
        runAction(
          async () => {
            const session = getClientSession();
            await approvePayroll(payrollId, {
              approved_by: session?.user_id || "00000000-0000-0000-0000-000000000001",
            });
          },
          "Approved payroll run.",
          "Unable to approve payroll run.",
        )
      }
      onApproveVendorInvoice={(vendorInvoiceId) =>
        runAction(
          async () => {
            await approveVendorInvoice(vendorInvoiceId);
          },
          "3-Way Match passed and vendor invoice approved.",
          "Vendor invoice failed 3-Way Match validation.",
        )
      }
      onCreateEvent={(payload) =>
        runAction(
          async () => {
            await createEvent(payload);
          },
          `Published event ${payload.title}.`,
          "Unable to create event.",
        )
      }
      onRefresh={() => void loadOperations(true)}
    />
  );
}
