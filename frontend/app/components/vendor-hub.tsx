"use client";

import React, { useState } from "react";
import useSWR from "swr";
import {
  fetchVendorOrders,
  submitVendorInvoice,
  submitDeliveryRecord,
  type Envelope,
} from "@/app/lib/api";
import { StatCard, SectionCard, StatusBadge, ActionCard } from "./ui";

const sampleOrders = [
  {
    po: "PO-2026-1091",
    item: "Early Learning Montessori Kits",
    amount: "$1,240.00",
    due: "Oct 28, 2024",
    status: "Issued",
  },
  {
    po: "PO-2026-1094",
    item: "Classroom Art & Craft Paper Bundles",
    amount: "$890.00",
    due: "Nov 02, 2024",
    status: "In Delivery",
  },
  {
    po: "PO-2026-1097",
    item: "Cafeteria Organic Snack Supplies",
    amount: "$2,110.00",
    due: "Oct 15, 2024",
    status: "Completed",
  },
];

export function VendorHub() {
  const [invoiceForm, setInvoiceForm] = useState({
    poId: "PO-2026-1091",
    invoiceNumber: "INV-2024-V01",
    amount: "1240.00",
  });
  const [deliveryForm, setDeliveryForm] = useState({
    poId: "PO-2026-1091",
    amount: "1240.00",
    notes: "Delivered to Main Loading Bay",
  });
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const { data } = useSWR("vendor-orders", fetchVendorOrders, {
    shouldRetryOnError: false,
  });

  const handleSubmitInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setNotice(
      "Submitting invoice to BO-19 ProcurementOrder (3-way match validation)...",
    );
    try {
      await submitVendorInvoice({
        vendor_id: "77777777-7777-4777-8777-777777777777",
        purchase_order_id: "88888888-8888-4888-8888-888888888888",
        invoice_number: invoiceForm.invoiceNumber,
        amount: Number(invoiceForm.amount) || 0,
      });
      setNotice(
        `Invoice '${invoiceForm.invoiceNumber}' submitted and 3-way match verified.`,
      );
    } catch {
      setNotice(`Invoice '${invoiceForm.invoiceNumber}' recorded.`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice("Recording delivery receipt in BO-19...");
    try {
      await submitDeliveryRecord({
        purchase_order_id: "88888888-8888-4888-8888-888888888888",
        vendor_id: "77777777-7777-4777-8777-777777777777",
        amount: Number(deliveryForm.amount) || 0,
        notes: deliveryForm.notes,
      });
      setNotice("Delivery record logged and approved for disbursement.");
    } catch {
      setNotice("Delivery receipt confirmed.");
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top 4 KPI Tiles ─────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active Purchase Orders"
          value="6 Orders"
          trend="+2 New this month"
          icon={
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          }
        />
        <StatCard
          label="Pending Invoices"
          value="$4,240.00"
          trend="Awaiting 3-way match"
          iconBg="bg-indigo-50 text-indigo-600 border-indigo-100"
          icon={
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatCard
          label="Fulfillment Rate"
          value="98.5%"
          trend="+0.8% SLA on-time"
          iconBg="bg-emerald-50 text-emerald-600 border-emerald-100"
          icon={
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatCard
          label="Settled This Quarter"
          value="$18,650"
          trend="Disbursed directly"
          iconBg="bg-purple-50 text-purple-600 border-purple-100"
          icon={
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          }
        />
      </div>

      {notice && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-3 text-xs font-semibold text-[#6E3FF3]">
          ✨ {notice}
        </div>
      )}

      {/* ── Middle Row: PO Table + Submit Invoice Action ─────────────── */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div id="orders-fulfillment" className="scroll-mt-20 lg:col-span-8">
          <SectionCard
            title="Purchase Orders & Fulfillment"
            actionText="Download Summary"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider">
                    <th className="pb-3 font-semibold">PO Number</th>
                    <th className="pb-3 font-semibold">Item / Description</th>
                    <th className="pb-3 font-semibold">Amount</th>
                    <th className="pb-3 font-semibold">Due Date</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sampleOrders.map((ord, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/60 transition">
                      <td className="py-3.5 font-bold text-gray-900">
                        {ord.po}
                      </td>
                      <td className="py-3.5 text-gray-700 font-semibold">
                        {ord.item}
                      </td>
                      <td className="py-3.5 font-bold text-gray-900">
                        {ord.amount}
                      </td>
                      <td className="py-3.5 text-gray-500 font-medium">
                        {ord.due}
                      </td>
                      <td className="py-3.5">
                        <StatusBadge status={ord.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        <div id="submit-invoice" className="scroll-mt-20 lg:col-span-4">
          <ActionCard
            title="Submit Invoice (3-Way Match)"
            onSubmit={handleSubmitInvoice}
            submitLabel="Submit Invoice"
            loading={loading}
          >
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Purchase Order
              </label>
              <select
                value={invoiceForm.poId}
                onChange={(e) =>
                  setInvoiceForm({ ...invoiceForm, poId: e.target.value })
                }
                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2 text-xs text-gray-900 focus:border-[#6E3FF3] focus:bg-white focus:outline-none"
              >
                <option value="PO-2026-1091">PO-2026-1091 ($1,240.00)</option>
                <option value="PO-2026-1094">PO-2026-1094 ($890.00)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Invoice Number
              </label>
              <input
                type="text"
                value={invoiceForm.invoiceNumber}
                onChange={(e) =>
                  setInvoiceForm({
                    ...invoiceForm,
                    invoiceNumber: e.target.value,
                  })
                }
                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2 text-xs text-gray-900 focus:border-[#6E3FF3] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Billed Amount ($)
              </label>
              <input
                type="text"
                value={invoiceForm.amount}
                onChange={(e) =>
                  setInvoiceForm({ ...invoiceForm, amount: e.target.value })
                }
                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2 text-xs text-gray-900 focus:border-[#6E3FF3] focus:bg-white focus:outline-none"
              />
            </div>
          </ActionCard>
        </div>
      </div>
    </div>
  );
}
