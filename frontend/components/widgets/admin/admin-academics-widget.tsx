"use client";

import { useState } from "react";
import {
  BookOpen,
  CalendarDays,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import type { AdminAcademicsWidgetProps } from "./admin-academics-widget.types";

export function AdminAcademicsWidget({
  calendars,
  curriculums,
  viewMode,
  isLoading = false,
  isSaving = false,
  errorMessage = null,
  successMessage = null,
  onCreateCalendar,
  onDeleteCalendar,
  onCreateCurriculum,
  onDeleteCurriculum,
  onRefresh,
}: AdminAcademicsWidgetProps) {
  const [activeTab, setActiveTab] = useState<"calendars" | "curriculums">(
    "calendars",
  );
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [termName, setTermName] = useState("Fall Term");
  const [termStart, setTermStart] = useState("2026-09-08");
  const [termEnd, setTermEnd] = useState("2026-12-18");
  const [holidaysText, setHolidaysText] = useState("2026-10-12, 2026-11-11");

  const [grade, setGrade] = useState("Toddler & Pre-K");
  const [version, setVersion] = useState("2.0");
  const [subjectsText, setSubjectsText] = useState(
    "Sensory Discovery, Early Numeracy, Language & Story Circle",
  );
  const [outcomesText, setOutcomesText] = useState(
    "Demonstrates self-regulation, Identifies patterns, Communicates needs clearly",
  );

  const handleAddCalendar = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCreateCalendar({
      academic_year: academicYear.trim(),
      terms: [
        {
          name: termName.trim() || "Term 1",
          start_date: termStart,
          end_date: termEnd,
        },
      ],
      holidays: holidaysText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
  };

  const handleAddCurriculum = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCreateCurriculum({
      grade: grade.trim(),
      version: version.trim() || "1.0",
      subjects: subjectsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name) => ({ name })),
      learning_outcomes: outcomesText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border-2 border-pastel-mint bg-paper-card p-6 shadow-pastel-warm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-terracotta">
              US-AD-06 · Academic Governance
            </p>
            <h1 className="text-2xl font-extrabold text-crayon-charcoal">
              Academic Calendars &amp; Curriculums
            </h1>
            <p className="mt-1 text-xs text-crayon-espresso">
              Configure academic year schedules, statutory holidays, and versioned grade-level ELECT/Montessori curriculum maps.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-full border border-pastel-butter bg-paper-tint p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab("calendars")}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 cursor-pointer ${
                  activeTab === "calendars"
                    ? "bg-paper-card text-crayon-charcoal shadow-sm"
                    : "text-crayon-muted"
                }`}
              >
                <CalendarDays className="size-3.5" aria-hidden="true" />
                Calendars ({calendars.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("curriculums")}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 cursor-pointer ${
                  activeTab === "curriculums"
                    ? "bg-paper-card text-crayon-charcoal shadow-sm"
                    : "text-crayon-muted"
                }`}
              >
                <BookOpen className="size-3.5" aria-hidden="true" />
                Curriculums ({curriculums.length})
              </button>
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

      {activeTab === "calendars" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleAddCalendar}
            className="lg:col-span-5 rounded-3xl border-2 border-pastel-sky bg-paper-card p-6 shadow-pastel-warm space-y-4"
          >
            <h2 className="text-base font-extrabold text-crayon-charcoal">
              Publish Academic Calendar
            </h2>
            <label className="block space-y-1 text-xs font-bold text-crayon-charcoal">
              <span>Academic Year</span>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full rounded-2xl border border-border bg-paper-tint px-3.5 py-2 text-xs font-semibold text-crayon-charcoal"
                required
              />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="block space-y-1 text-xs font-bold text-crayon-charcoal">
                <span>Primary Term</span>
                <input
                  type="text"
                  value={termName}
                  onChange={(e) => setTermName(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-paper-tint px-3 py-2 text-xs font-semibold text-crayon-charcoal"
                />
              </label>
              <label className="block space-y-1 text-xs font-bold text-crayon-charcoal">
                <span>Start Date</span>
                <input
                  type="date"
                  value={termStart}
                  onChange={(e) => setTermStart(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-paper-tint px-3 py-2 text-xs font-semibold text-crayon-charcoal"
                />
              </label>
              <label className="block space-y-1 text-xs font-bold text-crayon-charcoal">
                <span>End Date</span>
                <input
                  type="date"
                  value={termEnd}
                  onChange={(e) => setTermEnd(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-paper-tint px-3 py-2 text-xs font-semibold text-crayon-charcoal"
                />
              </label>
            </div>
            <label className="block space-y-1 text-xs font-bold text-crayon-charcoal">
              <span>Holiday ISO Dates (comma separated)</span>
              <input
                type="text"
                value={holidaysText}
                onChange={(e) => setHolidaysText(e.target.value)}
                className="w-full rounded-2xl border border-border bg-paper-tint px-3.5 py-2 text-xs font-semibold text-crayon-charcoal"
              />
            </label>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-full bg-terracotta px-4 py-2 text-xs font-bold text-on-primary shadow-sm hover:opacity-95 disabled:opacity-60 cursor-pointer"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              Create Calendar
            </button>
          </form>

          <section className="lg:col-span-7 rounded-3xl border-2 border-pastel-butter bg-paper-card p-6 shadow-pastel-warm space-y-4">
            <h2 className="text-base font-extrabold text-crayon-charcoal">
              Configured School Calendars
            </h2>
            {calendars.length === 0 ? (
              <p className="py-8 text-center text-xs text-crayon-muted">
                No academic calendars found for this tenant.
              </p>
            ) : viewMode === "compact" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-paper-tint text-crayon-muted uppercase">
                    <tr>
                      <th className="px-4 py-2.5">Academic Year</th>
                      <th className="px-4 py-2.5">Terms</th>
                      <th className="px-4 py-2.5">Holidays</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {calendars.map((cal) => (
                      <tr key={cal.calendar_id}>
                        <td className="px-4 py-2.5 font-extrabold">{cal.academic_year}</td>
                        <td className="px-4 py-2.5">{cal.terms.length} Terms</td>
                        <td className="px-4 py-2.5">{cal.holidays.length} Holidays</td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            type="button"
                            aria-label={`Delete calendar ${cal.academic_year}`}
                            onClick={() => void onDeleteCalendar(cal.calendar_id)}
                            className="rounded-full p-1.5 text-terracotta hover:bg-error-container cursor-pointer"
                          >
                            <Trash2 className="size-3.5" aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {calendars.map((cal) => (
                  <div
                    key={cal.calendar_id}
                    className="rounded-2xl border border-border bg-paper-tint p-4 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-extrabold text-crayon-charcoal">
                        AY {cal.academic_year}
                      </span>
                      <button
                        type="button"
                        aria-label={`Delete calendar ${cal.academic_year}`}
                        onClick={() => void onDeleteCalendar(cal.calendar_id)}
                        className="rounded-full p-1 text-terracotta hover:bg-error-container cursor-pointer"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    <p className="text-crayon-espresso">
                      {cal.terms.length} Terms · {cal.holidays.length} Statutory Holidays · {cal.blackout_dates.length} Blackouts
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleAddCurriculum}
            className="lg:col-span-5 rounded-3xl border-2 border-pastel-lilac bg-paper-card p-6 shadow-pastel-warm space-y-4"
          >
            <h2 className="text-base font-extrabold text-crayon-charcoal">
              Add Curriculum Version
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1 text-xs font-bold text-crayon-charcoal">
                <span>Grade / Program</span>
                <input
                  type="text"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-paper-tint px-3 py-2 text-xs font-semibold text-crayon-charcoal"
                  required
                />
              </label>
              <label className="block space-y-1 text-xs font-bold text-crayon-charcoal">
                <span>Version</span>
                <input
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-paper-tint px-3 py-2 text-xs font-semibold text-crayon-charcoal"
                  required
                />
              </label>
            </div>
            <label className="block space-y-1 text-xs font-bold text-crayon-charcoal">
              <span>Subjects (comma separated)</span>
              <textarea
                rows={2}
                value={subjectsText}
                onChange={(e) => setSubjectsText(e.target.value)}
                className="w-full rounded-2xl border border-border bg-paper-tint px-3 py-2 text-xs font-semibold text-crayon-charcoal"
              />
            </label>
            <label className="block space-y-1 text-xs font-bold text-crayon-charcoal">
              <span>Learning Outcomes (comma separated)</span>
              <textarea
                rows={2}
                value={outcomesText}
                onChange={(e) => setOutcomesText(e.target.value)}
                className="w-full rounded-2xl border border-border bg-paper-tint px-3 py-2 text-xs font-semibold text-crayon-charcoal"
              />
            </label>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-full bg-terracotta px-4 py-2 text-xs font-bold text-on-primary shadow-sm hover:opacity-95 disabled:opacity-60 cursor-pointer"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              Save Curriculum
            </button>
          </form>

          <section className="lg:col-span-7 rounded-3xl border-2 border-pastel-butter bg-paper-card p-6 shadow-pastel-warm space-y-4">
            <h2 className="text-base font-extrabold text-crayon-charcoal">
              Published Curriculums
            </h2>
            {curriculums.length === 0 ? (
              <p className="py-8 text-center text-xs text-crayon-muted">
                No curriculums defined yet.
              </p>
            ) : (
              <div className="space-y-3">
                {curriculums.map((curr) => (
                  <div
                    key={curr.curriculum_id}
                    className="rounded-2xl border border-border bg-paper-tint p-4 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-extrabold text-crayon-charcoal">
                        {curr.grade} · v{curr.version}
                      </span>
                      <button
                        type="button"
                        aria-label={`Delete curriculum ${curr.grade}`}
                        onClick={() => void onDeleteCurriculum(curr.curriculum_id)}
                        className="rounded-full p-1 text-terracotta hover:bg-error-container cursor-pointer"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    <p className="text-crayon-espresso">
                      {curr.subjects.length} Subjects · {curr.learning_outcomes.length} Learning Outcomes
                    </p>
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
