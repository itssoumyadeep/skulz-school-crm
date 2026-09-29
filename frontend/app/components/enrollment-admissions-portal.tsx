"use client";

import { useMemo, useState } from "react";

type Actor = "parent" | "admin" | "vp" | "principal" | "teacher";

type TabConfig = {
  label: string;
  value: string;
};

const actorOptions: Record<Actor, string> = {
  parent: "Parent Portal",
  admin: "Admin Portal",
  vp: "VP Portal",
  principal: "Principal Portal",
  teacher: "Teacher Portal",
};

const parentTabs: TabConfig[] = [
  { label: "01 Inquiry", value: "inquiry" },
  { label: "02 Application", value: "application" },
  { label: "03 Documents", value: "documents" },
  { label: "04 Assessment", value: "assessment" },
  { label: "05 Offer", value: "offer" },
  { label: "06 Payment", value: "payment" },
  { label: "07 Confirmed", value: "confirmed" },
];

const adminTabs: TabConfig[] = [
  { label: "01 Queue", value: "queue" },
  { label: "02 Review", value: "review" },
  { label: "03 Verify Docs", value: "docs" },
  { label: "04 Schedule", value: "schedule" },
  { label: "05 Payment", value: "payment" },
  { label: "06 Student", value: "student" },
];

const vpTabs: TabConfig[] = [
  { label: "01 Admissions", value: "dashboard" },
  { label: "02 Edge Cases", value: "exceptions" },
  { label: "03 Decision Queue", value: "decision" },
  { label: "04 Class Assignment", value: "class" },
];

const principalTabs: TabConfig[] = [
  { label: "01 Dashboard", value: "dashboard" },
  { label: "02 Application", value: "application" },
  { label: "03 Decision", value: "decision" },
  { label: "04 Class Oversight", value: "class" },
];

const teacherTabs: TabConfig[] = [
  { label: "01 Schedule", value: "schedule" },
  { label: "02 Assessment", value: "assessment" },
  { label: "03 History", value: "history" },
];

const stepPillClass = {
  purple: "bg-[#f3edff] text-[#7c2ff2] border border-[#d8c1ff]",
  green: "bg-[#eaf9f4] text-[#069669] border border-[#b9e7d6]",
  amber: "bg-[#fff8e7] text-[#b97900] border border-[#f0d59a]",
  red: "bg-[#fff0f0] text-[#d74a4a] border border-[#efb5b5]",
  gray: "bg-[#f2f2f5] text-[#666] border border-[#e7e7ec]",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 text-[12px] font-semibold text-[#17171b]">
      {children}
    </div>
  );
}

function StatusPill({
  tone = "purple",
  children,
}: {
  tone?: keyof typeof stepPillClass;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[9px] font-semibold ${stepPillClass[tone]}`}
    >
      {children}
    </span>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
  fullWidth = false,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  type?: string;
  fullWidth?: boolean;
}) {
  return (
    <label
      className={`flex flex-col gap-1.5 text-[10px] text-[#5f5f68] ${fullWidth ? "col-span-full" : ""}`}
    >
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-[34px] rounded-md border border-[#e7e7ec] bg-white px-2.5 text-[12px] text-[#555] outline-none focus:border-[#7c2ff2] focus:ring-2 focus:ring-[#7c2ff2]/15"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  fullWidth = false,
}: {
  label: string;
  value: string;
  options: string[];
  onChange?: (value: string) => void;
  fullWidth?: boolean;
}) {
  return (
    <label
      className={`flex flex-col gap-1.5 text-[10px] text-[#5f5f68] ${fullWidth ? "col-span-full" : ""}`}
    >
      {label}
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-[34px] rounded-md border border-[#e7e7ec] bg-white px-2.5 text-[12px] text-[#555] outline-none focus:border-[#7c2ff2] focus:ring-2 focus:ring-[#7c2ff2]/15"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextAreaField({
  label,
  value,
  placeholder,
}: {
  label: string;
  value: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-[10px] text-[#5f5f68]">
      {label}
      <textarea
        value={value}
        placeholder={placeholder}
        className="min-h-[75px] rounded-md border border-[#e7e7ec] bg-white px-2.5 py-2 text-[12px] text-[#555] outline-none focus:border-[#7c2ff2] focus:ring-2 focus:ring-[#7c2ff2]/15"
      />
    </label>
  );
}

function InlineButton({
  children,
  tone = "default",
  onClick,
}: {
  children: React.ReactNode;
  tone?: "default" | "primary" | "success" | "danger";
  onClick?: () => void;
}) {
  const toneClasses = {
    default: "border border-[#e7e7ec] bg-white text-[#17171b]",
    primary: "border border-[#7c2ff2] bg-[#7c2ff2] text-white",
    success: "border border-[#069669] bg-[#069669] text-white",
    danger: "border border-[#efb5b5] bg-white text-[#d74a4a]",
  };

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-lg px-3 py-2 text-[12px] font-medium transition ${toneClasses[tone]}`}
    >
      {children}
    </button>
  );
}

function ParentPortal({
  activeTab,
  setActiveTab,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) {
  const tabContent = useMemo(() => {
    switch (activeTab) {
      case "inquiry":
        return (
          <div className="max-w-[820px] rounded-xl border border-[#e7e7ec] bg-white p-4 shadow-sm">
            <div className="mb-3 rounded-lg border border-[#d8c1ff] bg-[#f3edff] px-3 py-2.5 text-[11px] text-[#6040a1]">
              After submission, a secure link will be sent to your email to
              complete the full application.
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <FormField label="Student full name" value="Sienna Miller" />
              <SelectField
                label="Grade / programme"
                value="Kindergarten"
                options={["Kindergarten", "Pre-K", "Toddler"]}
              />
              <FormField label="Parent / guardian name" value="Emily Mercer" />
              <FormField label="Email" value="emily@example.com" />
              <FormField label="Phone" value="+1 555 018 2040" />
              <SelectField
                label="Preferred intake"
                value="Fall 2026"
                options={["Fall 2026", "Spring 2027"]}
              />
            </div>
            <div className="mt-4 flex gap-2">
              <InlineButton>Save draft</InlineButton>
              <InlineButton
                tone="primary"
                onClick={() => setActiveTab("application")}
              >
                Submit inquiry
              </InlineButton>
            </div>
          </div>
        );
      case "application":
        return (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[18px] font-semibold">
                  Application — Sienna Miller
                </div>
                <div className="mt-1 text-[12px] text-[#777780]">
                  Complete all required sections before submission.
                </div>
              </div>
              <StatusPill tone="amber">In progress</StatusPill>
            </div>
            <div className="mb-5 flex items-center gap-0 rounded-xl bg-transparent">
              {[
                { label: "Inquiry", done: true },
                { label: "Application", active: true },
                { label: "Documents" },
                { label: "Review" },
                { label: "Decision" },
              ].map((step, index) => (
                <div
                  key={step.label}
                  className="flex flex-1 items-center justify-center"
                >
                  <div className="flex flex-col items-center">
                    <div
                      className={`relative z-10 flex h-[21px] w-[21px] items-center justify-center rounded-full text-[9px] font-semibold ${
                        step.done
                          ? "bg-[#7c2ff2] text-white"
                          : step.active
                            ? "bg-[#7c2ff2] text-white"
                            : "bg-[#eee] text-[#888]"
                      }`}
                    >
                      {step.done ? "✓" : index + 2}
                    </div>
                    <span className="mt-2 text-[9px] text-[#777780]">
                      {step.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-[1.65fr_1fr]">
              <div className="rounded-xl border border-[#e7e7ec] bg-white p-4 shadow-sm">
                <SectionTitle>Student details</SectionTitle>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <FormField label="Legal first name" value="Sienna" />
                  <FormField label="Legal last name" value="Miller" />
                  <FormField label="Date of birth" value="2019-08-14" />
                  <FormField
                    label="Previous school"
                    value="Little Oaks Preschool"
                  />
                  <FormField
                    label="Home address"
                    value="18 Maple Avenue"
                    fullWidth
                  />
                </div>
              </div>
              <div className="rounded-xl border border-[#e7e7ec] bg-white p-4 shadow-sm">
                <SectionTitle>Application checklist</SectionTitle>
                <div className="space-y-3">
                  {[
                    ["Student details", "Complete"],
                    ["Family & contacts", "Complete"],
                    ["Documents", "3 files required"],
                    ["Consent & declaration", "Pending"],
                  ].map(([title, meta], index) => (
                    <div key={title} className="flex gap-3">
                      <div
                        className={`mt-1 h-2.5 w-2.5 rounded-full ${index < 2 ? "bg-[#7c2ff2]" : "bg-[#ccc]"}`}
                      />
                      <div>
                        <div className="text-[11px] font-semibold text-[#17171b]">
                          {title}
                        </div>
                        <div className="text-[9px] text-[#777780]">{meta}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <InlineButton
                tone="primary"
                onClick={() => setActiveTab("documents")}
              >
                Continue to documents
              </InlineButton>
            </div>
          </>
        );
      case "documents":
        return (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[18px] font-semibold">
                  Required documents
                </div>
                <div className="mt-1 text-[12px] text-[#777780]">
                  Upload clear copies. Admin will verify each document.
                </div>
              </div>
              <StatusPill tone="amber">2 of 3 uploaded</StatusPill>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                [
                  "Birth certificate",
                  "birth_certificate.pdf",
                  "1.2 MB",
                  "Pending verification",
                ],
                [
                  "Previous school records",
                  "school_records.pdf",
                  "2.4 MB",
                  "Pending verification",
                ],
                ["Student photo", "Upload file", "JPG or PNG", "Missing"],
              ].map(([title, name, size, status]) => (
                <div
                  key={title}
                  className="rounded-xl border border-[#e7e7ec] bg-white p-4 shadow-sm"
                >
                  <SectionTitle>{title}</SectionTitle>
                  <div className="rounded-lg border border-dashed border-[#cfcfd7] bg-[#fcfcfd] p-3 text-[11px] text-[#777]">
                    {name === "Upload file" ? "＋ " : "✓ "}
                    <strong className="text-[#333]">{name}</strong>
                    <div className="mt-1 text-[11px] text-[#777]">
                      {name === "Upload file"
                        ? "JPG or PNG"
                        : `Uploaded today · ${size}`}
                    </div>
                  </div>
                  <div className="mt-3">
                    {status === "Missing" ? (
                      <StatusPill tone="gray">Missing</StatusPill>
                    ) : (
                      <StatusPill tone="green">Pending verification</StatusPill>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <InlineButton>Save</InlineButton>
              <InlineButton
                tone="primary"
                onClick={() => setActiveTab("assessment")}
              >
                Continue
              </InlineButton>
            </div>
          </>
        );
      case "assessment":
        return (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[18px] font-semibold">
                  Assessment appointment
                </div>
                <div className="mt-1 text-[12px] text-[#777780]">
                  Choose an available assessment slot.
                </div>
              </div>
              <StatusPill tone="purple">Scheduling</StatusPill>
            </div>
            <div className="max-w-[850px] rounded-xl border border-[#e7e7ec] bg-white p-4 shadow-sm">
              <SectionTitle>Available slots</SectionTitle>
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  ["Tue · Sep 8", "10:00 AM · Room 2", "Available"],
                  ["Wed · Sep 9", "11:30 AM · Room 2", "Available"],
                  ["Thu · Sep 10", "02:00 PM · Room 4", "Available"],
                ].map(([date, time, tag], index) => (
                  <div
                    key={date}
                    className={`rounded-xl border p-4 ${index === 0 ? "border-[#7c2ff2] bg-white" : "border-[#e7e7ec] bg-white"}`}
                  >
                    <div className="font-semibold text-[#17171b]">{date}</div>
                    <div className="mt-1 text-[12px] text-[#777780]">
                      {time}
                    </div>
                    <div className="mt-3">
                      <StatusPill tone="purple">{tag}</StatusPill>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-[#d8c1ff] bg-[#f3edff] px-3 py-2.5 text-[11px] text-[#6040a1]">
                The assigned assessor will see this appointment in the Teacher
                portal. A calendar invitation will be sent after booking.
              </div>
              <div className="mt-4">
                <InlineButton
                  tone="primary"
                  onClick={() => setActiveTab("offer")}
                >
                  Confirm selected slot
                </InlineButton>
              </div>
            </div>
          </>
        );
      case "offer":
        return (
          <div className="max-w-[820px] rounded-xl border border-[#e7e7ec] bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[18px] font-semibold">
                  Admission decision
                </div>
                <div className="mt-1 text-[12px] text-[#777780]">
                  Your application has been reviewed.
                </div>
              </div>
              <StatusPill tone="green">Approved</StatusPill>
            </div>
            <div className="rounded-xl border border-[#b9e7d6] bg-[#eaf9f4] p-4 text-[#17171b]">
              <div className="font-semibold">
                Congratulations — Sienna has been offered a place.
              </div>
              <div className="mt-1 text-[12px]">
                Grade: Kindergarten · Intake: Fall 2026
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-[#777780]">
                  Offer date
                </div>
                <div className="mt-1 text-[14px] font-semibold">
                  Sep 12, 2026
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-[#777780]">
                  First invoice
                </div>
                <div className="mt-1 text-[14px] font-semibold">$320.00</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-[#777780]">
                  Response deadline
                </div>
                <div className="mt-1 text-[14px] font-semibold">
                  Sep 19, 2026
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-[#d8c1ff] bg-[#f3edff] px-3 py-2.5 text-[11px] text-[#6040a1]">
              Your offer letter and first invoice are attached. Payment confirms
              the seat and activates enrollment.
            </div>
            <div className="mt-4">
              <InlineButton
                tone="primary"
                onClick={() => setActiveTab("payment")}
              >
                Review & pay invoice
              </InlineButton>
            </div>
          </div>
        );
      case "payment":
        return (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[18px] font-semibold">
                  Confirm your seat
                </div>
                <div className="mt-1 text-[12px] text-[#777780]">
                  Payment of the first invoice activates enrollment.
                </div>
              </div>
              <StatusPill tone="amber">Payment due</StatusPill>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-[#e7e7ec] bg-white p-4 shadow-sm">
                <SectionTitle>Invoice INV-2026-089</SectionTitle>
                <div className="space-y-3 text-[12px] text-[#17171b]">
                  <div className="flex items-center justify-between">
                    <span>Enrollment / first term fee</span>
                    <span>$320.00</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Due date</span>
                    <span>Sep 19, 2026</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-[#f0f0f3] pt-2 font-semibold">
                    <span>Total</span>
                    <span>$320.00</span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-[#e7e7ec] bg-white p-4 shadow-sm">
                <SectionTitle>Payment method</SectionTitle>
                <SelectField
                  label="Saved card"
                  value="Visa •••• 4242"
                  options={["Visa •••• 4242"]}
                />
                <div className="mt-4">
                  <InlineButton
                    tone="primary"
                    onClick={() => setActiveTab("confirmed")}
                  >
                    Pay $320.00
                  </InlineButton>
                </div>
              </div>
            </div>
          </>
        );
      case "confirmed":
        return (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[18px] font-semibold">
                  Enrollment confirmed
                </div>
                <div className="mt-1 text-[12px] text-[#777780]">
                  The student profile has been created.
                </div>
              </div>
              <StatusPill tone="green">Active</StatusPill>
            </div>
            <div className="rounded-xl border border-[#b9e7d6] bg-[#eaf9f4] p-4 text-[#17171b]">
              <div className="font-semibold">
                Seat confirmed for Sienna Miller.
              </div>
              <div className="mt-1 text-[12px]">
                Student ID: STU-2026-0142 · Kindergarten · Section A
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                ["Class", "Kindergarten A", "Teacher: Sarah Jenkins"],
                ["Timetable", "View schedule", "Available in Parent portal"],
                ["School calendar", "Fall 2026", "View important dates"],
                ["Receipt", "Generated", "Download from Billing"],
              ].map(([label, value, sub]) => (
                <div
                  key={label}
                  className="rounded-xl border border-[#e7e7ec] bg-white p-4 shadow-sm"
                >
                  <div className="text-[10px] uppercase tracking-wide text-[#777780]">
                    {label}
                  </div>
                  <div className="mt-2 text-[16px] font-semibold text-[#17171b]">
                    {value}
                  </div>
                  <div className="mt-1 text-[11px] text-[#777780]">{sub}</div>
                </div>
              ))}
            </div>
          </>
        );
      default:
        return null;
    }
  }, [activeTab, setActiveTab]);

  return <>{tabContent}</>;
}

function AdminPortal({
  activeTab,
  setActiveTab,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) {
  const content = useMemo(() => {
    switch (activeTab) {
      case "queue":
        return (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[18px] font-semibold">
                  Admissions Queue
                </div>
                <div className="mt-1 text-[12px] text-[#777780]">
                  Manage inquiries, applications, verification and enrollment
                  conversion.
                </div>
              </div>
              <InlineButton tone="primary">Register New Student</InlineButton>
            </div>
            <div className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                ["Pending Registrations", "18", "+5.4% vs last month"],
                ["Document Verification", "7", "3 need attention"],
                ["Assessments This Week", "9", "2 unassigned"],
                ["Ready to Enrol", "5", "Awaiting payment"],
              ].map(([label, value, trend]) => (
                <div
                  key={label}
                  className="rounded-xl border border-[#e7e7ec] bg-white p-4 shadow-sm"
                >
                  <div className="text-[10px] uppercase tracking-wide text-[#777780]">
                    {label}
                  </div>
                  <div className="mt-2 text-[21px] font-bold text-[#17171b]">
                    {value}
                  </div>
                  <div className="mt-1 text-[10px] text-[#069669]">{trend}</div>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-[#e7e7ec] bg-white p-4 shadow-sm">
              <SectionTitle>Admission funnel</SectionTitle>
              <div className="space-y-3">
                {[
                  ["Applications", 100, "#7c2ff2"],
                  ["Document Verification", 85, "#8b3ff7"],
                  ["Assessment / Decision", 62, "#7c2ff2"],
                  ["Enrolled & invoiced", 48, "#069669"],
                ].map(([label, pct, color]) => (
                  <div key={label}>
                    <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-[#17171b]">
                      <span>{label}</span>
                      <span className="text-[#7c2ff2]">{pct}%</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-[#eee]">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-[#e7e7ec] bg-white p-4 shadow-sm">
              <SectionTitle>Application queue</SectionTitle>
              <table className="w-full border-collapse text-left text-[11px]">
                <thead>
                  <tr className="border-b border-[#f0f0f3] text-[9px] uppercase tracking-[0.4px] text-[#777780]">
                    <th className="pb-2 font-semibold">Student</th>
                    <th className="pb-2 font-semibold">Grade</th>
                    <th className="pb-2 font-semibold">Status</th>
                    <th className="pb-2 font-semibold">Applied</th>
                    <th className="pb-2 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    [
                      "Sienna Miller",
                      "Kindergarten",
                      "Docs pending",
                      "Sep 6",
                      "Review",
                    ],
                    [
                      "Lucas Vance",
                      "Pre-K",
                      "Assessment booked",
                      "Sep 5",
                      "Open",
                    ],
                    [
                      "Chloe Patel",
                      "Toddler",
                      "Ready for decision",
                      "Sep 4",
                      "Open",
                    ],
                  ].map(([student, grade, status, applied, action], index) => (
                    <tr
                      key={student}
                      className="border-b border-[#f4f4f6] last:border-none"
                    >
                      <td className="py-3 font-medium">{student}</td>
                      <td className="py-3">{grade}</td>
                      <td className="py-3">
                        <StatusPill
                          tone={
                            status.includes("Docs")
                              ? "amber"
                              : status.includes("Assessment")
                                ? "purple"
                                : "green"
                          }
                        >
                          {status}
                        </StatusPill>
                      </td>
                      <td className="py-3">{applied}</td>
                      <td className="py-3">
                        <button
                          className="rounded-md border border-[#e7e7ec] bg-white px-2 py-1 text-[11px]"
                          onClick={() =>
                            setActiveTab(
                              index === 0
                                ? "docs"
                                : index === 1
                                  ? "schedule"
                                  : "review",
                            )
                          }
                        >
                          {action}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        );
      case "review":
        return (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[18px] font-semibold">
                  Application Review — Chloe Patel
                </div>
                <div className="mt-1 text-[12px] text-[#777780]">
                  Complete application package · Toddler
                </div>
              </div>
              <StatusPill tone="green">Ready for decision</StatusPill>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-[#e7e7ec] bg-white p-4 shadow-sm">
                <SectionTitle>Applicant summary</SectionTitle>
                <table className="w-full text-[11px]">
                  <tbody>
                    {[
                      ["Student", "Chloe Patel"],
                      ["DOB", "Jan 18, 2024"],
                      ["Parent", "Emily Patel"],
                      ["Documents", "3 / 3 verified"],
                      ["Assessment", "84 / 100"],
                      ["Available seats", "4"],
                    ].map(([label, value]) => (
                      <tr
                        key={label}
                        className="border-b border-[#f4f4f6] last:border-none"
                      >
                        <td className="py-2 text-[#777780]">{label}</td>
                        <td className="py-2 font-semibold text-[#17171b]">
                          {value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="rounded-xl border border-[#e7e7ec] bg-white p-4 shadow-sm">
                <SectionTitle>Admin review notes</SectionTitle>
                <textarea className="min-h-[120px] w-full rounded-md border border-[#e7e7ec] bg-white px-2.5 py-2 text-[12px] text-[#555]">
                  Application complete. All required documents verified.
                </textarea>
                <div className="mt-4 rounded-lg border border-[#d8c1ff] bg-[#f3edff] px-3 py-2.5 text-[11px] text-[#6040a1]">
                  VP reviews edge cases and participates in the admission
                  decision. Principal makes the final decision.
                </div>
              </div>
            </div>
            <div className="mt-4">
              <InlineButton tone="primary">
                Send to VP / Principal decision queue
              </InlineButton>
            </div>
          </>
        );
      case "docs":
        return (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[18px] font-semibold">
                  Document Verification
                </div>
                <div className="mt-1 text-[12px] text-[#777780]">
                  Verify each uploaded file against the configured checklist.
                </div>
              </div>
              <StatusPill tone="amber">1 flagged</StatusPill>
            </div>
            <div className="rounded-xl border border-[#e7e7ec] bg-white p-4 shadow-sm">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-[#f0f0f3] text-[9px] uppercase tracking-[0.4px] text-[#777780]">
                    <th className="pb-2 font-semibold">Document</th>
                    <th className="pb-2 font-semibold">Uploaded</th>
                    <th className="pb-2 font-semibold">Status</th>
                    <th className="pb-2 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Birth certificate", "Sep 6", "Verified", "View"],
                    ["Previous school records", "Sep 6", "Verified", "View"],
                    ["Student photo", "—", "Missing", "Remind parent"],
                  ].map(([doc, uploaded, status, action]) => (
                    <tr
                      key={doc}
                      className="border-b border-[#f4f4f6] last:border-none"
                    >
                      <td className="py-3 font-medium">{doc}</td>
                      <td className="py-3">{uploaded}</td>
                      <td className="py-3">
                        <StatusPill
                          tone={status === "Missing" ? "red" : "green"}
                        >
                          {status}
                        </StatusPill>
                      </td>
                      <td className="py-3">
                        {action === "Remind parent" ? (
                          <button className="rounded-md border border-[#e7e7ec] bg-white px-2 py-1 text-[11px]">
                            Remind parent
                          </button>
                        ) : (
                          action
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 rounded-lg border border-[#f0d59a] bg-[#fff8e7] px-3 py-2.5 text-[11px] text-[#775300]">
              Missing documents trigger an automated reminder to the Parent. VP
              can flag edge cases such as age waivers or transfer students.
            </div>
          </>
        );
      case "schedule":
        return (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[18px] font-semibold">
                  Assessment Scheduling
                </div>
                <div className="mt-1 text-[12px] text-[#777780]">
                  Book a slot and assign the assessor.
                </div>
              </div>
              <InlineButton tone="primary">Create slot</InlineButton>
            </div>
            <div className="rounded-xl border border-[#e7e7ec] bg-white p-4 shadow-sm">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-[#f0f0f3] text-[9px] uppercase tracking-[0.4px] text-[#777780]">
                    <th className="pb-2 font-semibold">Date</th>
                    <th className="pb-2 font-semibold">Time</th>
                    <th className="pb-2 font-semibold">Student</th>
                    <th className="pb-2 font-semibold">Assessor</th>
                    <th className="pb-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    [
                      "Sep 8",
                      "10:00 AM",
                      "Sienna Miller",
                      "Sarah Jenkins",
                      "Confirmed",
                    ],
                    [
                      "Sep 9",
                      "11:30 AM",
                      "Lucas Vance",
                      "Michael Reed",
                      "Confirmed",
                    ],
                    [
                      "Sep 10",
                      "02:00 PM",
                      "Open",
                      "Unassigned",
                      "Needs assignment",
                    ],
                  ].map(([date, time, student, assessor, status]) => (
                    <tr
                      key={`${date}-${student}`}
                      className="border-b border-[#f4f4f6] last:border-none"
                    >
                      <td className="py-3">{date}</td>
                      <td className="py-3">{time}</td>
                      <td className="py-3">{student}</td>
                      <td className="py-3">{assessor}</td>
                      <td className="py-3">
                        <StatusPill
                          tone={status === "Confirmed" ? "green" : "amber"}
                        >
                          {status}
                        </StatusPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        );
      case "payment":
        return (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[18px] font-semibold">
                  Enrollment Payment Tracking
                </div>
                <div className="mt-1 text-[12px] text-[#777780]">
                  Confirm payment before activating the seat.
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-[#e7e7ec] bg-white p-4 shadow-sm">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-[#f0f0f3] text-[9px] uppercase tracking-[0.4px] text-[#777780]">
                    <th className="pb-2 font-semibold">Student</th>
                    <th className="pb-2 font-semibold">Invoice</th>
                    <th className="pb-2 font-semibold">Amount</th>
                    <th className="pb-2 font-semibold">Status</th>
                    <th className="pb-2 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    [
                      "Sienna Miller",
                      "INV-2026-089",
                      "$320.00",
                      "Awaiting",
                      "Record offline",
                    ],
                    [
                      "Chloe Patel",
                      "INV-2026-090",
                      "$280.00",
                      "Paid",
                      "Receipt",
                    ],
                  ].map(([student, invoice, amount, status, action]) => (
                    <tr
                      key={student}
                      className="border-b border-[#f4f4f6] last:border-none"
                    >
                      <td className="py-3 font-medium">{student}</td>
                      <td className="py-3">{invoice}</td>
                      <td className="py-3">{amount}</td>
                      <td className="py-3">
                        <StatusPill
                          tone={status === "Paid" ? "green" : "amber"}
                        >
                          {status}
                        </StatusPill>
                      </td>
                      <td className="py-3">
                        {action === "Record offline" ? (
                          <button className="rounded-md border border-[#e7e7ec] bg-white px-2 py-1 text-[11px]">
                            Record offline
                          </button>
                        ) : (
                          action
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        );
      case "student":
        return (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[18px] font-semibold">
                  Student Created — Sienna Miller
                </div>
                <div className="mt-1 text-[12px] text-[#777780]">
                  System-generated profile after confirmed payment.
                </div>
              </div>
              <StatusPill tone="green">Active</StatusPill>
            </div>
            <div className="rounded-xl border border-[#b9e7d6] bg-[#eaf9f4] p-4 text-[#17171b]">
              <div className="font-semibold">
                Student ID generated: STU-2026-0142
              </div>
              <div className="mt-1 text-[12px]">
                Health profile creation initiated · emergency contacts linked ·
                class assignment pending.
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {[
                ["Identity", "Sienna Miller", "Kindergarten · Fall 2026"],
                ["Billing", "INV-2026-089 · Paid", "Receipt generated"],
                ["Next action", "Assign class", "VP / Principal workflow"],
              ].map(([title, value, sub]) => (
                <div
                  key={title}
                  className="rounded-xl border border-[#e7e7ec] bg-white p-4 shadow-sm"
                >
                  <SectionTitle>{title}</SectionTitle>
                  <div className="font-semibold text-[#17171b]">{value}</div>
                  <div className="mt-1 text-[11px] text-[#777780]">{sub}</div>
                </div>
              ))}
            </div>
          </>
        );
      default:
        return null;
    }
  }, [activeTab]);

  return <>{content}</>;
}

function VpPortal({
  activeTab,
  setActiveTab,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) {
  const content = useMemo(() => {
    switch (activeTab) {
      case "dashboard":
        return (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[18px] font-semibold">
                  VP Admissions Workspace
                </div>
                <div className="mt-1 text-[12px] text-[#777780]">
                  School-level admissions oversight and approval actions.
                </div>
              </div>
            </div>
            <div className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                ["Pending Admissions", "12", "3 ready for decision"],
                ["Document Exceptions", "2", "Needs review"],
                ["Assessment Scores", "9", "This week"],
                ["Seats Available", "17", "Across grades"],
              ].map(([label, value, trend]) => (
                <div
                  key={label}
                  className="rounded-xl border border-[#e7e7ec] bg-white p-4 shadow-sm"
                >
                  <div className="text-[10px] uppercase tracking-wide text-[#777780]">
                    {label}
                  </div>
                  <div className="mt-2 text-[21px] font-bold text-[#17171b]">
                    {value}
                  </div>
                  <div className="mt-1 text-[10px] text-[#069669]">{trend}</div>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-[#e7e7ec] bg-white p-4 shadow-sm">
              <SectionTitle>Admissions requiring VP attention</SectionTitle>
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-[#f0f0f3] text-[9px] uppercase tracking-[0.4px] text-[#777780]">
                    <th className="pb-2 font-semibold">Student</th>
                    <th className="pb-2 font-semibold">Grade</th>
                    <th className="pb-2 font-semibold">Reason</th>
                    <th className="pb-2 font-semibold">Score</th>
                    <th className="pb-2 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    [
                      "Sienna Miller",
                      "Kindergarten",
                      "Transfer record",
                      "—",
                      "Review",
                    ],
                    [
                      "Chloe Patel",
                      "Toddler",
                      "Complete package",
                      "84",
                      "Decision",
                    ],
                  ].map(([student, grade, reason, score, action]) => (
                    <tr
                      key={student}
                      className="border-b border-[#f4f4f6] last:border-none"
                    >
                      <td className="py-3 font-medium">{student}</td>
                      <td className="py-3">{grade}</td>
                      <td className="py-3">{reason}</td>
                      <td className="py-3">{score}</td>
                      <td className="py-3">
                        <button
                          className="rounded-md border border-[#e7e7ec] bg-white px-2 py-1 text-[11px]"
                          onClick={() =>
                            setActiveTab(
                              action === "Review" ? "exceptions" : "decision",
                            )
                          }
                        >
                          {action}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        );
      case "exceptions":
        return (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[18px] font-semibold">
                  Document Exceptions
                </div>
                <div className="mt-1 text-[12px] text-[#777780]">
                  Review edge cases before the application proceeds.
                </div>
              </div>
              <StatusPill tone="amber">2 open</StatusPill>
            </div>
            <div className="rounded-xl border border-[#e7e7ec] bg-white p-4 shadow-sm">
              <div className="rounded-lg border border-[#f0d59a] bg-[#fff8e7] px-3 py-2.5 text-[11px] text-[#775300]">
                <div className="font-semibold">
                  Sienna Miller — Transfer student
                </div>
                <div className="mt-1">
                  Previous school record needs VP review before verification can
                  be finalised.
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <InlineButton>Flag for more information</InlineButton>
                <InlineButton tone="success">Clear exception</InlineButton>
              </div>
            </div>
          </>
        );
      case "decision":
        return (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[18px] font-semibold">
                  Admission Decision Queue
                </div>
                <div className="mt-1 text-[12px] text-[#777780]">
                  Review the complete application package and recommend a
                  decision.
                </div>
              </div>
              <StatusPill tone="purple">Principal approval required</StatusPill>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-[#e7e7ec] bg-white p-4 shadow-sm">
                <SectionTitle>Chloe Patel · Toddler</SectionTitle>
                <table className="w-full text-[11px]">
                  <tbody>
                    {[
                      ["Documents", "3 / 3 verified"],
                      ["Assessment", "84 / 100"],
                      ["Seats", "4 available"],
                      ["Application", "Complete"],
                    ].map(([label, value]) => (
                      <tr
                        key={label}
                        className="border-b border-[#f4f4f6] last:border-none"
                      >
                        <td className="py-2 text-[#777780]">{label}</td>
                        <td className="py-2 font-semibold text-[#17171b]">
                          {value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="rounded-xl border border-[#e7e7ec] bg-white p-4 shadow-sm">
                <SectionTitle>Decision</SectionTitle>
                <select className="w-full rounded-md border border-[#e7e7ec] bg-white px-2.5 py-2 text-[12px] text-[#555]">
                  <option>Recommend Approved</option>
                  <option>Recommend Waitlisted</option>
                  <option>Recommend Rejected</option>
                </select>
                <textarea
                  className="mt-4 min-h-[100px] w-full rounded-md border border-[#e7e7ec] bg-white px-2.5 py-2 text-[12px] text-[#555]"
                  placeholder="Reason / comments"
                />
                <div className="mt-4">
                  <InlineButton tone="primary">
                    Submit to Principal
                  </InlineButton>
                </div>
              </div>
            </div>
          </>
        );
      case "class":
        return (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[18px] font-semibold">
                  Class Assignment
                </div>
                <div className="mt-1 text-[12px] text-[#777780]">
                  Assign confirmed students based on age, grade and capacity.
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-[#e7e7ec] bg-white p-4 shadow-sm">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-[#f0f0f3] text-[9px] uppercase tracking-[0.4px] text-[#777780]">
                    <th className="pb-2 font-semibold">Student</th>
                    <th className="pb-2 font-semibold">Grade</th>
                    <th className="pb-2 font-semibold">Section</th>
                    <th className="pb-2 font-semibold">Capacity</th>
                    <th className="pb-2 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#f4f4f6] last:border-none">
                    <td className="py-3 font-medium">Sienna Miller</td>
                    <td className="py-3">Kindergarten</td>
                    <td className="py-3">
                      <select className="rounded-md border border-[#e7e7ec] bg-white px-2 py-1 text-[11px]">
                        <option>A</option>
                        <option>B</option>
                      </select>
                    </td>
                    <td className="py-3">21 / 24</td>
                    <td className="py-3">
                      <button className="rounded-md border border-[#7c2ff2] bg-[#7c2ff2] px-2 py-1 text-[11px] text-white">
                        Assign
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        );
      default:
        return null;
    }
  }, [activeTab, setActiveTab]);

  return <>{content}</>;
}

function PrincipalPortal({
  activeTab,
  setActiveTab,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) {
  const content = useMemo(() => {
    switch (activeTab) {
      case "dashboard":
        return (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[18px] font-semibold">
                  Principal Admissions Workspace
                </div>
                <div className="mt-1 text-[12px] text-[#777780]">
                  Final admission decisions, capacity and pipeline oversight.
                </div>
              </div>
              <InlineButton>View Admissions Ledger</InlineButton>
            </div>
            <div className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                ["Enrolled Students", "384", "+2.4% vs last month"],
                ["Pending Admissions", "12", "+15% vs last month"],
                ["Decision Queue", "3", "Needs action"],
                ["Available Seats", "17", "Current capacity"],
              ].map(([label, value, trend]) => (
                <div
                  key={label}
                  className="rounded-xl border border-[#e7e7ec] bg-white p-4 shadow-sm"
                >
                  <div className="text-[10px] uppercase tracking-wide text-[#777780]">
                    {label}
                  </div>
                  <div className="mt-2 text-[21px] font-bold text-[#17171b]">
                    {value}
                  </div>
                  <div className="mt-1 text-[10px] text-[#069669]">{trend}</div>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-[#e7e7ec] bg-white p-4 shadow-sm">
              <SectionTitle>Recent Admission Pipelines</SectionTitle>
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-[#f0f0f3] text-[9px] uppercase tracking-[0.4px] text-[#777780]">
                    <th className="pb-2 font-semibold">Student</th>
                    <th className="pb-2 font-semibold">Grade</th>
                    <th className="pb-2 font-semibold">Status</th>
                    <th className="pb-2 font-semibold">Applied</th>
                    <th className="pb-2 font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    [
                      "Sienna Miller",
                      "Kindergarten",
                      "VP review",
                      "Sep 6",
                      "Open",
                    ],
                    [
                      "Chloe Patel",
                      "Toddler",
                      "Decision ready",
                      "Sep 4",
                      "Decide",
                    ],
                  ].map(([student, grade, status, applied, action]) => (
                    <tr
                      key={student}
                      className="border-b border-[#f4f4f6] last:border-none"
                    >
                      <td className="py-3 font-medium">{student}</td>
                      <td className="py-3">{grade}</td>
                      <td className="py-3">
                        <StatusPill
                          tone={
                            status.includes("Decision") ? "purple" : "amber"
                          }
                        >
                          {status}
                        </StatusPill>
                      </td>
                      <td className="py-3">{applied}</td>
                      <td className="py-3">
                        <button
                          className="rounded-md border border-[#e7e7ec] bg-white px-2 py-1 text-[11px]"
                          onClick={() =>
                            setActiveTab(
                              action === "Decide" ? "decision" : "application",
                            )
                          }
                        >
                          {action}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        );
      case "application":
        return (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[18px] font-semibold">
                  Complete Application Package
                </div>
                <div className="mt-1 text-[12px] text-[#777780]">
                  Chloe Patel · Toddler · Ready for final decision
                </div>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                ["Application", "Complete", "All required fields submitted"],
                ["Documents", "3 / 3 verified", "No exceptions"],
                ["Assessment", "84 / 100", "Assessor: Michael Reed"],
              ].map(([title, value, sub]) => (
                <div
                  key={title}
                  className="rounded-xl border border-[#e7e7ec] bg-white p-4 shadow-sm"
                >
                  <SectionTitle>{title}</SectionTitle>
                  <div className="font-semibold text-[#17171b]">{value}</div>
                  <div className="mt-1 text-[11px] text-[#777780]">{sub}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-[#d8c1ff] bg-[#f3edff] px-3 py-2.5 text-[11px] text-[#6040a1]">
              Decision must be Approved, Waitlisted, or Rejected. After
              notification is dispatched, the decision is immutable.
            </div>
          </>
        );
      case "decision":
        return (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[18px] font-semibold">
                  Admission Decision
                </div>
                <div className="mt-1 text-[12px] text-[#777780]">
                  Chloe Patel · Toddler
                </div>
              </div>
              <StatusPill tone="purple">Principal approval</StatusPill>
            </div>
            <div className="max-w-[900px] rounded-xl border border-[#e7e7ec] bg-white p-4 shadow-sm">
              <SectionTitle>Final decision</SectionTitle>
              <div className="grid gap-3 md:grid-cols-3">
                <InlineButton
                  tone="success"
                  onClick={() =>
                    window.alert("Approved — notification queued.")
                  }
                >
                  ✓ Approve
                </InlineButton>
                <InlineButton
                  onClick={() =>
                    window.alert("Waitlisted — notification queued.")
                  }
                >
                  Waitlist
                </InlineButton>
                <InlineButton
                  tone="danger"
                  onClick={() =>
                    window.alert("Rejected — notification queued.")
                  }
                >
                  Reject
                </InlineButton>
              </div>
              <div className="mt-4">
                <TextAreaField
                  label="Decision reason / notes"
                  value=""
                  placeholder="Required for audit trail"
                />
              </div>
              <div className="mt-4 rounded-lg border border-[#f0d59a] bg-[#fff8e7] px-3 py-2.5 text-[11px] text-[#775300]">
                The decision triggers an automated Parent notification. Once
                dispatched, the decision cannot be edited.
              </div>
            </div>
          </>
        );
      case "class":
        return (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[18px] font-semibold">
                  Capacity & Class Oversight
                </div>
                <div className="mt-1 text-[12px] text-[#777780]">
                  Monitor assignments after enrollment confirmation.
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-[#e7e7ec] bg-white p-4 shadow-sm">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-[#f0f0f3] text-[9px] uppercase tracking-[0.4px] text-[#777780]">
                    <th className="pb-2 font-semibold">Grade</th>
                    <th className="pb-2 font-semibold">Section A</th>
                    <th className="pb-2 font-semibold">Section B</th>
                    <th className="pb-2 font-semibold">Total capacity</th>
                    <th className="pb-2 font-semibold">Available</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Kindergarten", "21 / 24", "18 / 24", "48", "9"],
                    ["Pre-K", "22 / 24", "20 / 24", "48", "6"],
                    ["Toddler", "18 / 20", "—", "20", "2"],
                  ].map(([grade, a, b, total, avail]) => (
                    <tr
                      key={grade}
                      className="border-b border-[#f4f4f6] last:border-none"
                    >
                      <td className="py-3 font-medium">{grade}</td>
                      <td className="py-3">{a}</td>
                      <td className="py-3">{b}</td>
                      <td className="py-3">{total}</td>
                      <td className="py-3">
                        <StatusPill
                          tone={Number(avail) <= 2 ? "amber" : "green"}
                        >
                          {avail}
                        </StatusPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        );
      default:
        return null;
    }
  }, [activeTab]);

  return <>{content}</>;
}

function TeacherPortal({
  activeTab,
  setActiveTab,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) {
  const content = useMemo(() => {
    switch (activeTab) {
      case "schedule":
        return (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[18px] font-semibold">
                  Assessment Schedule
                </div>
                <div className="mt-1 text-[12px] text-[#777780]">
                  Assigned admissions assessments appear here.
                </div>
              </div>
              <StatusPill tone="purple">2 assigned</StatusPill>
            </div>
            <div className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                ["Today's Assessments", "1", "10:00 AM"],
                ["This Week", "2", "Both confirmed"],
                ["Pending Scores", "1", "Action required"],
                ["Average Score", "84%", "This intake"],
              ].map(([label, value, trend]) => (
                <div
                  key={label}
                  className="rounded-xl border border-[#e7e7ec] bg-white p-4 shadow-sm"
                >
                  <div className="text-[10px] uppercase tracking-wide text-[#777780]">
                    {label}
                  </div>
                  <div className="mt-2 text-[21px] font-bold text-[#17171b]">
                    {value}
                  </div>
                  <div className="mt-1 text-[10px] text-[#069669]">{trend}</div>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-[#e7e7ec] bg-white p-4 shadow-sm">
              <SectionTitle>Today's agenda</SectionTitle>
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-[#f0f0f3] text-[9px] uppercase tracking-[0.4px] text-[#777780]">
                    <th className="pb-2 font-semibold">Time</th>
                    <th className="pb-2 font-semibold">Student</th>
                    <th className="pb-2 font-semibold">Grade</th>
                    <th className="pb-2 font-semibold">Room</th>
                    <th className="pb-2 font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#f4f4f6] last:border-none">
                    <td className="py-3">10:00 AM</td>
                    <td className="py-3">Sienna Miller</td>
                    <td className="py-3">Kindergarten</td>
                    <td className="py-3">Room 2</td>
                    <td className="py-3">
                      <button
                        className="rounded-md border border-[#7c2ff2] bg-[#7c2ff2] px-2 py-1 text-[11px] text-white"
                        onClick={() => setActiveTab("assessment")}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        );
      case "assessment":
        return (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[18px] font-semibold">
                  Admission Assessment — Sienna Miller
                </div>
                <div className="mt-1 text-[12px] text-[#777780]">
                  Kindergarten · Sep 8 · 10:00 AM · Room 2
                </div>
              </div>
              <StatusPill tone="purple">In progress</StatusPill>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-[#e7e7ec] bg-white p-4 shadow-sm">
                <SectionTitle>Assessment criteria</SectionTitle>
                {[
                  ["Communication", 85],
                  ["Social interaction", 80],
                  ["Early numeracy", 88],
                  ["Fine motor skills", 82],
                  ["Independence", 85],
                ].map(([label, value]) => (
                  <div key={label} className="mb-3">
                    <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-[#17171b]">
                      <span>{label}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={value}
                      className="w-full accent-[#7c2ff2]"
                      readOnly
                    />
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-[#e7e7ec] bg-white p-4 shadow-sm">
                <SectionTitle>Assessor notes</SectionTitle>
                <textarea className="min-h-[110px] w-full rounded-md border border-[#e7e7ec] bg-white px-2.5 py-2 text-[12px] text-[#555]">
                  Engaged well with the activities and followed instructions.
                </textarea>
                <div className="mt-4">
                  <SelectField
                    label="Recommendation"
                    value="Recommend Admission"
                    options={[
                      "Recommend Admission",
                      "Needs further review",
                      "Not recommended",
                    ]}
                  />
                </div>
                <div className="mt-4">
                  <InlineButton
                    tone="primary"
                    onClick={() =>
                      window.alert(
                        "Assessment submitted to VP / Principal review queue.",
                      )
                    }
                  >
                    Submit assessment
                  </InlineButton>
                </div>
              </div>
            </div>
          </>
        );
      case "history":
        return (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[18px] font-semibold">
                  Assessment History
                </div>
                <div className="mt-1 text-[12px] text-[#777780]">
                  Previously completed admissions assessments.
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-[#e7e7ec] bg-white p-4 shadow-sm">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-[#f0f0f3] text-[9px] uppercase tracking-[0.4px] text-[#777780]">
                    <th className="pb-2 font-semibold">Student</th>
                    <th className="pb-2 font-semibold">Grade</th>
                    <th className="pb-2 font-semibold">Date</th>
                    <th className="pb-2 font-semibold">Score</th>
                    <th className="pb-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    [
                      "Chloe Patel",
                      "Toddler",
                      "Sep 4",
                      "84 / 100",
                      "Submitted",
                    ],
                    ["Lucas Vance", "Pre-K", "Sep 5", "81 / 100", "Submitted"],
                  ].map(([student, grade, date, score, status]) => (
                    <tr
                      key={student}
                      className="border-b border-[#f4f4f6] last:border-none"
                    >
                      <td className="py-3 font-medium">{student}</td>
                      <td className="py-3">{grade}</td>
                      <td className="py-3">{date}</td>
                      <td className="py-3">{score}</td>
                      <td className="py-3">
                        <StatusPill tone="green">{status}</StatusPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        );
      default:
        return null;
    }
  }, [activeTab]);

  return <>{content}</>;
}

export function EnrollmentAdmissionsPortal() {
  const [actor, setActor] = useState<Actor>("parent");
  const [activeTabByActor, setActiveTabByActor] = useState<
    Record<string, string>
  >({
    parent: "inquiry",
    admin: "queue",
    vp: "dashboard",
    principal: "dashboard",
    teacher: "schedule",
  });

  const tabs = useMemo(
    () => ({
      parent: parentTabs,
      admin: adminTabs,
      vp: vpTabs,
      principal: principalTabs,
      teacher: teacherTabs,
    }),
    [],
  );

  const activeTab = activeTabByActor[actor] ?? tabs[actor][0].value;

  const handleActorChange = (nextActor: Actor) => {
    setActor(nextActor);
    setActiveTabByActor((prev) => ({
      ...prev,
      [nextActor]: prev[nextActor] ?? tabs[nextActor][0].value,
    }));
  };

  const setActiveTab = (tab: string) => {
    setActiveTabByActor((prev) => ({ ...prev, [actor]: tab }));
  };

  return (
    <div className="min-h-screen bg-[#f8f8fb] text-[#17171b]">
      <div className="flex min-h-screen">
        <aside className="flex w-[58px] flex-col items-center border-r border-[#e7e7ec] bg-white px-0 py-3">
          <div className="mb-2 grid h-[24px] w-[24px] place-items-center rounded-[7px] bg-[#7c2ff2] text-[11px] font-bold text-white">
            P
          </div>
          {[
            { label: "Home", active: true },
            { label: "Grid" },
            { label: "Apps" },
            { label: "Check" },
            { label: "Dot" },
          ].map((nav, index) => (
            <div
              key={nav.label}
              className={`mt-2 grid h-[32px] w-[32px] place-items-center rounded-[8px] text-[16px] text-[#777] ${nav.active ? "bg-[#f3edff] text-[#7c2ff2]" : ""}`}
            >
              {index === 0
                ? "⌂"
                : index === 1
                  ? "▦"
                  : index === 2
                    ? "◫"
                    : index === 3
                      ? "✓"
                      : "◌"}
            </div>
          ))}
          <div className="mt-auto grid h-[32px] w-[32px] place-items-center rounded-[8px] text-[16px] text-[#777]">
            ⚙
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <header className="flex h-[58px] items-center gap-3 border-b border-[#e7e7ec] bg-white px-6">
            <div className="text-[16px] font-semibold">
              P01 — Enrollment & Admissions
            </div>
            <span className="rounded-[5px] bg-[#f3edff] px-2 py-0.5 text-[9px] font-semibold text-[#7c2ff2]">
              Prototype
            </span>

            <select
              value={actor}
              onChange={(e) => handleActorChange(e.target.value as Actor)}
              className="ml-4 h-[30px] w-[145px] rounded-md border border-[#e7e7ec] bg-white px-2 text-[12px] focus:border-[#7c2ff2] focus:outline-none"
            >
              {Object.entries(actorOptions).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>

            <div className="ml-auto flex items-center gap-3">
              <input
                className="h-[29px] w-[235px] rounded-md border border-[#e7e7ec] bg-[#fbfbfc] px-2.5 text-[12px] text-[#aaa] placeholder:text-[#aaa]"
                placeholder="Search anything..."
              />
              <div className="text-[18px] text-[#777]">♧</div>
              <div className="grid h-[27px] w-[27px] place-items-center rounded-full bg-[#d8c4b5] text-[10px] font-semibold text-[#17171b]">
                EM
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] p-6">
            <div className="mb-4 flex flex-wrap gap-2">
              {tabs[actor].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`rounded-md border px-3 py-2 text-[10px] font-medium transition ${
                    activeTab === tab.value
                      ? "border-[#d8c1ff] bg-[#f3edff] text-[#7c2ff2]"
                      : "border-[#e7e7ec] bg-white text-[#666]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {actor === "parent" && (
              <ParentPortal activeTab={activeTab} setActiveTab={setActiveTab} />
            )}
            {actor === "admin" && (
              <AdminPortal activeTab={activeTab} setActiveTab={setActiveTab} />
            )}
            {actor === "vp" && (
              <VpPortal activeTab={activeTab} setActiveTab={setActiveTab} />
            )}
            {actor === "principal" && (
              <PrincipalPortal
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
            )}
            {actor === "teacher" && (
              <TeacherPortal
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
