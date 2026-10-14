"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload } from "lucide-react";

import {
  fetchSchoolSetupContext,
  importSchoolSetupDataset,
  type SchoolSetupContext,
  type SchoolSetupDatasetKey,
  type SchoolSetupImportResult,
  type SchoolSetupTemplate,
} from "@/app/lib/api";
import { fetchStudents, type Student } from "@/app/lib/students";
import {
  createDataTableColumnHelper,
  DataTable,
  SectionPanel,
  StatusPill,
} from "@/components/pc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SetupStudent = {
  student_id: string;
  student_number: string;
  name: string;
  dob: string | null;
  grade: string;
  section: string;
  status: string;
};

type ImportSummary = {
  key: SchoolSetupDatasetKey;
  label: string;
  imported_count: number;
  references: string;
};

type SavedImportSummary = Pick<
  ImportSummary,
  "key" | "label" | "imported_count"
>;

type SetupDraft = {
  step: number;
  importedStudentIds: string[];
  completed: SavedImportSummary[];
  saved_at: string;
};

const studentColumn = createDataTableColumnHelper<SetupStudent>();
const summaryColumn = createDataTableColumnHelper<ImportSummary>();
const previewColumn = createDataTableColumnHelper<Record<string, string>>();
const DRAFT_KEY_PREFIX = "school-setup-progress-v1:";
const operationsOrder: SchoolSetupDatasetKey[] = [
  "assessments",
  "attendance",
  "curriculums",
  "events",
  "fee-structures",
  "marks",
  "lesson-plans",
  "leave-plans",
  "purchase-orders",
  "staff-details",
  "staff-attendances",
  "messages",
];

function todayLabel() {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(),
  );
}

function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return "School setup could not be completed.";
}

function parseCsv(text: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"' && quoted && text[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  if (rows.length < 2) return [];

  const headerRow = rows.shift();
  if (!headerRow) return [];
  const headers = headerRow.map((header) => header.trim().toLowerCase());
  return rows.map((values) =>
    Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""]),
    ),
  );
}

function importedStudentFromRecord(
  record: Record<string, unknown>,
): SetupStudent {
  return {
    student_id: String(record.student_id ?? ""),
    student_number: String(record.student_number ?? ""),
    name: String(record.name ?? "Unnamed student"),
    dob: record.dob ? String(record.dob) : null,
    grade: String(record.grade ?? ""),
    section: String(record.section ?? "A"),
    status: String(record.status ?? "Inactive"),
  };
}

function studentFromApi(student: Student): SetupStudent {
  return {
    student_id: String(student.student_id ?? ""),
    student_number: String(student.student_number ?? ""),
    name: student.name,
    dob: student.dob ?? null,
    grade: student.grade ?? "",
    section: student.section ?? "A",
    status: student.status ?? "Inactive",
  };
}

function previewColumns(template: SchoolSetupTemplate) {
  return template.fields.map((field) =>
    previewColumn.accessor((row) => row[field.name] ?? "", {
      id: field.name,
      header: field.name,
    }),
  );
}

export function AdminSchoolSetup() {
  const router = useRouter();
  const [context, setContext] = useState<SchoolSetupContext | null>(null);
  const [step, setStep] = useState(1);
  const [setupFinished, setSetupFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [studentFile, setStudentFile] = useState<File | null>(null);
  const [studentPreviewRows, setStudentPreviewRows] = useState<
    Array<Record<string, string>>
  >([]);
  const [studentRows, setStudentRows] = useState<SetupStudent[]>([]);
  const [studentImportResult, setStudentImportResult] = useState<
    SchoolSetupImportResult["records"]
  >([]);
  const [importedStudentIds, setImportedStudentIds] = useState<string[]>([]);
  const [datasetFiles, setDatasetFiles] = useState<
    Partial<Record<SchoolSetupDatasetKey, File>>
  >({});
  const [datasetPreviews, setDatasetPreviews] = useState<
    Partial<Record<SchoolSetupDatasetKey, Array<Record<string, string>>>>
  >({});
  const [datasetImportResults, setDatasetImportResults] = useState<
    Partial<Record<SchoolSetupDatasetKey, SchoolSetupImportResult["records"]>>
  >({});
  const [datasetBusy, setDatasetBusy] = useState<
    SchoolSetupDatasetKey | "students" | null
  >(null);
  const [completedImports, setCompletedImports] = useState<ImportSummary[]>([]);
  const [datasetErrors, setDatasetErrors] = useState<
    Partial<Record<SchoolSetupDatasetKey | "students", string>>
  >({});

  const draftKey = context
    ? `${DRAFT_KEY_PREFIX}${context.school.tenant_id}`
    : null;
  const peopleDatasets =
    context?.datasets.filter((dataset) => dataset.group === "people") ?? [];
  const operationsDatasets = (
    context?.datasets.filter((dataset) => dataset.group === "operations") ?? []
  ).sort(
    (left, right) =>
      operationsOrder.indexOf(left.key) - operationsOrder.indexOf(right.key),
  );

  useEffect(() => {
    let active = true;
    fetchSchoolSetupContext()
      .then(async (response) => {
        if (!active) return;
        setContext(response.data);
        const key = `${DRAFT_KEY_PREFIX}${response.data.school.tenant_id}`;
        const saved = localStorage.getItem(key);
        if (!saved) return;
        let draft: SetupDraft;
        try {
          draft = JSON.parse(saved) as SetupDraft;
        } catch {
          localStorage.removeItem(key);
          return;
        }
        if (!active) return;
        setStep(Math.min(Math.max(draft.step, 1), 6));
        setImportedStudentIds(draft.importedStudentIds ?? []);
        setCompletedImports(
          (draft.completed ?? []).map((item) => ({ ...item, references: "" })),
        );
        if (draft.importedStudentIds?.length) {
          try {
            const importedIds = new Set(draft.importedStudentIds);
            const foundStudents = new Map<string, Student>();
            let page = 1;
            let total = Number.POSITIVE_INFINITY;
            const pageSize = 500;
            while (
              foundStudents.size < importedIds.size &&
              (page - 1) * pageSize < total
            ) {
              const studentResponse = await fetchStudents({
                page,
                page_size: pageSize,
              });
              total =
                studentResponse.meta?.pagination?.total ?? page * pageSize;
              for (const student of studentResponse.data) {
                const studentId = String(student.student_id ?? "");
                if (importedIds.has(studentId))
                  foundStudents.set(studentId, student);
              }
              page += 1;
            }
            if (active)
              setStudentRows([...foundStudents.values()].map(studentFromApi));
          } catch (restoreError: unknown) {
            if (active) setError(errorMessage(restoreError));
          }
        }
      })
      .catch((loadError: unknown) => {
        if (active) setError(errorMessage(loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function saveDraft(nextStep = step) {
    if (!context || !draftKey) return;
    const draft: SetupDraft = {
      step: nextStep,
      importedStudentIds,
      completed: completedImports.map(({ key, label, imported_count }) => ({
        key,
        label,
        imported_count,
      })),
      saved_at: new Date().toISOString(),
    };
    localStorage.setItem(draftKey, JSON.stringify(draft));
    setStep(nextStep);
    setNotice("Setup progress saved as a draft on this device.");
  }

  function templateFor(key: SchoolSetupDatasetKey) {
    return context?.datasets.find((dataset) => dataset.key === key);
  }

  function validateRows(
    template: SchoolSetupTemplate,
    rows: Array<Record<string, unknown>>,
  ) {
    if (rows.length === 0) return "The CSV contains no data rows.";
    if (rows.length > 500) return "Upload up to 500 records per dataset.";
    const headers = new Set(Object.keys(rows[0]));
    const missingHeaders = template.fields
      .filter((field) => field.required && !headers.has(field.name))
      .map((field) => field.name);
    if (missingHeaders.length) {
      return `Missing required columns: ${missingHeaders.join(", ")}. Download the template and try again.`;
    }
    const invalidRow = rows.findIndex((row) =>
      template.fields.some(
        (field) => field.required && !String(row[field.name] ?? "").trim(),
      ),
    );
    if (invalidRow >= 0)
      return `Row ${invalidRow + 2} is missing a required value.`;
    return "";
  }

  function datasetSummary(
    template: SchoolSetupTemplate,
    response: SchoolSetupImportResult,
  ): ImportSummary {
    const ids = response.records
      .map((record) =>
        String(
          record.student_number ??
            record.vendor_id ??
            record.staff_id ??
            record.curriculum_id ??
            record.exam_id ??
            record.po_id ??
            record.event_id ??
            record.message_id ??
            "",
        ),
      )
      .filter(Boolean);
    return {
      key: template.key,
      label: template.label,
      imported_count: response.imported_count,
      references: ids.slice(0, 3).join(", ") + (ids.length > 3 ? ", …" : ""),
    };
  }

  function downloadImportResults(
    dataset: SchoolSetupDatasetKey,
    records: SchoolSetupImportResult["records"],
  ) {
    if (!records.length) return;
    const headers = [
      ...new Set(records.flatMap((record) => Object.keys(record))),
    ];
    const cell = (value: unknown) => {
      const text =
        value == null
          ? ""
          : typeof value === "object"
            ? JSON.stringify(value)
            : String(value);
      return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const contents = [
      headers.map(cell).join(","),
      ...records.map((record) =>
        headers.map((header) => cell(record[header])).join(","),
      ),
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([contents], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${dataset.replace(/[^a-z0-9-]/gi, "_")}_import_results.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function reviewStudentFile() {
    if (!studentFile || studentUploading) return;
    setDatasetErrors((current) => ({ ...current, students: "" }));
    try {
      const rows = parseCsv(await studentFile.text());
      const template = templateFor("students");
      if (!template) throw new Error("Student import template is unavailable.");
      const validationError = validateRows(template, rows);
      if (validationError) throw new Error(validationError);
      setStudentPreviewRows(rows);
      setError("");
      setNotice(
        `${rows.length} Student rows validated. Review the sample before creating records.`,
      );
    } catch (reviewError: unknown) {
      const message = errorMessage(reviewError);
      setDatasetErrors((current) => ({ ...current, students: message }));
    }
  }

  async function reviewDatasetFile(template: SchoolSetupTemplate) {
    const file = datasetFiles[template.key];
    if (!file || datasetBusy) return;
    setDatasetErrors((current) => ({ ...current, [template.key]: "" }));
    try {
      const rows = parseCsv(await file.text());
      const validationError = validateRows(template, rows);
      if (validationError) throw new Error(validationError);
      setDatasetPreviews((current) => ({ ...current, [template.key]: rows }));
      setError("");
      setNotice(
        `${rows.length} ${template.label} rows validated. Review the sample before importing.`,
      );
    } catch (reviewError: unknown) {
      const message = errorMessage(reviewError);
      setDatasetErrors((current) => ({ ...current, [template.key]: message }));
    }
  }

  async function uploadStudents() {
    if (
      !context ||
      !studentFile ||
      studentPreviewRows.length === 0 ||
      datasetBusy
    )
      return;
    setDatasetBusy("students");
    setError("");
    setNotice("");
    setDatasetErrors((current) => ({ ...current, students: "" }));
    try {
      const template = templateFor("students");
      if (!template) throw new Error("Student import template is unavailable.");
      const response = await importSchoolSetupDataset(
        "students",
        studentPreviewRows,
      );
      const students = response.data.records.map(importedStudentFromRecord);
      setStudentImportResult(response.data.records);
      setStudentRows(students);
      setImportedStudentIds(students.map((student) => student.student_id));
      setCompletedImports((current) => [
        ...current.filter((item) => item.key !== "students"),
        datasetSummary(template, response.data),
      ]);
      setStep(3);
      setNotice(`${response.data.imported_count} Student records created.`);
      setStudentFile(null);
      setStudentPreviewRows([]);
      if (draftKey) {
        localStorage.setItem(
          draftKey,
          JSON.stringify({
            step: 3,
            importedStudentIds: students.map((student) => student.student_id),
            completed: [
              ...completedImports.filter((item) => item.key !== "students"),
              datasetSummary(template, response.data),
            ].map(({ key, label, imported_count }) => ({
              key,
              label,
              imported_count,
            })),
            saved_at: new Date().toISOString(),
          } satisfies SetupDraft),
        );
      }
    } catch (uploadError: unknown) {
      const message = errorMessage(uploadError);
      setError(message);
      setDatasetErrors((current) => ({ ...current, students: message }));
    } finally {
      setDatasetBusy(null);
    }
  }

  async function uploadDataset(template: SchoolSetupTemplate) {
    const rows = datasetPreviews[template.key];
    if (!rows?.length || datasetBusy) return;
    setDatasetBusy(template.key);
    setError("");
    setNotice("");
    setDatasetErrors((current) => ({ ...current, [template.key]: "" }));
    try {
      const response = await importSchoolSetupDataset(template.key, rows);
      setDatasetImportResults((current) => ({
        ...current,
        [template.key]: response.data.records,
      }));
      setCompletedImports((current) => {
        const next = [
          ...current.filter((item) => item.key !== template.key),
          datasetSummary(template, response.data),
        ];
        if (draftKey) {
          localStorage.setItem(
            draftKey,
            JSON.stringify({
              step,
              importedStudentIds,
              completed: next.map(({ key, label, imported_count }) => ({
                key,
                label,
                imported_count,
              })),
              saved_at: new Date().toISOString(),
            } satisfies SetupDraft),
          );
        }
        return next;
      });
      setDatasetFiles((current) => ({ ...current, [template.key]: undefined }));
      setDatasetPreviews((current) => ({
        ...current,
        [template.key]: undefined,
      }));
      setNotice(
        `${response.data.imported_count} ${template.label} records imported.`,
      );
    } catch (uploadError: unknown) {
      const message = errorMessage(uploadError);
      setError(message);
      setDatasetErrors((current) => ({ ...current, [template.key]: message }));
    } finally {
      setDatasetBusy(null);
    }
  }

  function downloadTemplate(template: SchoolSetupTemplate) {
    const csvCell = (value: string) =>
      /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
    const content = `${template.fields.map((field) => csvCell(field.name)).join(",")}\r\n${template.fields.map((field) => csvCell(field.example)).join(",")}\r\n`;
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${template.key.replace(/[^a-z0-9-]/gi, "_")}_template.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const studentColumns = [
    studentColumn.accessor("student_number", {
      id: "student_number",
      header: "Student number",
    }),
    studentColumn.accessor("name", { id: "name", header: "Student" }),
    studentColumn.accessor("grade", { id: "grade", header: "Grade" }),
    studentColumn.accessor("section", { id: "section", header: "Section" }),
    studentColumn.accessor("status", { id: "status", header: "Status" }),
  ];

  const completedColumns = [
    summaryColumn.accessor("label", { id: "dataset", header: "Dataset" }),
    summaryColumn.accessor("imported_count", {
      id: "imported_count",
      header: "Imported",
    }),
    summaryColumn.accessor("references", {
      id: "references",
      header: "Generated references",
    }),
  ];

  function renderDatasetList(datasets: SchoolSetupTemplate[]) {
    return (
      <div className="divide-y divide-border">
        {datasets.map((template) => {
          const result = completedImports.find(
            (item) => item.key === template.key,
          );
          const importResult = datasetImportResults[template.key];
          const datasetError = datasetErrors[template.key];
          const previewRows = datasetPreviews[template.key];
          return (
            <div
              key={template.key}
              className="grid gap-3 py-4 sm:grid-cols-[minmax(170px,1fr)_minmax(180px,1fr)_auto] sm:items-center"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {template.label}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {template.description}
                </p>
              </div>
              <div className="flex min-w-0 items-center gap-2">
                <Input
                  type="file"
                  accept=".csv,text/csv"
                  aria-label={`${template.label} CSV`}
                  disabled={datasetBusy !== null}
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    setDatasetFiles((current) => ({
                      ...current,
                      [template.key]: file,
                    }));
                    setDatasetPreviews((current) => ({
                      ...current,
                      [template.key]: undefined,
                    }));
                  }}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => downloadTemplate(template)}
                >
                  <Download aria-hidden="true" /> Template
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!datasetFiles[template.key] || datasetBusy !== null}
                  onClick={() => void reviewDatasetFile(template)}
                >
                  Review
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!previewRows?.length || datasetBusy !== null}
                  onClick={() => void uploadDataset(template)}
                >
                  <Upload aria-hidden="true" />
                  {datasetBusy === template.key ? "Importing…" : "Import"}
                </Button>
                {result && (
                  <StatusPill variant="success">
                    {result.imported_count} imported
                  </StatusPill>
                )}
                {importResult && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      downloadImportResults(template.key, importResult)
                    }
                  >
                    <Download aria-hidden="true" /> Results
                  </Button>
                )}
              </div>
              {previewRows && (
                <div className="min-w-0 sm:col-span-3">
                  <p className="mb-2 text-xs text-muted-foreground">
                    {previewRows.length} valid rows. Showing up to five for
                    review.
                  </p>
                  <DataTable
                    columns={previewColumns(template)}
                    data={previewRows.slice(0, 5)}
                    pageSize={5}
                  />
                </div>
              )}
              {datasetError && (
                <p
                  className="text-sm text-destructive sm:col-span-3"
                  role="alert"
                >
                  {datasetError}
                </p>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (loading) {
    return (
      <p className="py-8 text-sm text-muted-foreground">
        Loading school setup…
      </p>
    );
  }
  if (error && !context) {
    return (
      <SectionPanel title="Setup unavailable">
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      </SectionPanel>
    );
  }
  if (!context) return null;
  if (setupFinished) {
    return (
      <SectionPanel title="School setup complete">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground" role="status">
            Setup for {context.school.name} is complete.{" "}
            {completedImports.length} datasets were imported.
          </p>
          {completedImports.length > 0 && (
            <DataTable
              columns={completedColumns}
              data={completedImports}
              pageSize={20}
            />
          )}
          <div className="flex justify-end">
            <Button type="button" onClick={() => router.push("/admin")}>
              Return to Admin dashboard
            </Button>
          </div>
        </div>
      </SectionPanel>
    );
  }

  const studentTemplate = templateFor("students");
  const studentError = datasetErrors.students;
  const studentUploading = datasetBusy === "students";

  return (
    <div className="space-y-5">
      <ol
        className="grid grid-cols-3 gap-2 md:grid-cols-6"
        aria-label="School setup progress"
      >
        {[
          "School",
          "Students",
          "Review",
          "Student list",
          "People",
          "School data",
        ].map((label, index) => (
          <li
            key={label}
            aria-current={step === index + 1 ? "step" : undefined}
            className={`flex items-center gap-2 border-b-2 px-1 py-2 text-xs ${step === index + 1 ? "border-primary font-semibold text-primary" : step > index + 1 ? "border-success text-success" : "border-border text-muted-foreground"}`}
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-full border border-current">
              {step > index + 1 ? "✓" : index + 1}
            </span>
            <span className="truncate">{label}</span>
          </li>
        ))}
      </ol>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="text-sm text-success" role="status">
          {notice}
        </p>
      )}

      {step === 1 && (
        <SectionPanel title="Current school">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">School</dt>
              <dd className="mt-1 font-medium text-foreground">
                {context.school.name}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">School code</dt>
              <dd className="mt-1 font-medium text-foreground">
                {context.school.school_code}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Region</dt>
              <dd className="mt-1 text-foreground">{context.school.region}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Setup started</dt>
              <dd className="mt-1 text-foreground">{todayLabel()}</dd>
            </div>
          </dl>
          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => saveDraft(1)}
            >
              Save draft
            </Button>
            <Button type="button" onClick={() => saveDraft(2)}>
              Continue
            </Button>
          </div>
        </SectionPanel>
      )}

      {step === 2 && studentTemplate && (
        <SectionPanel title="Upload student database">
          <p className="mb-4 text-sm text-muted-foreground">
            The uploaded batch creates Inactive Student records and their linked
            Parent records. Admission requests are not created here.
          </p>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <label className="grid gap-2 text-sm font-medium text-foreground">
              Student CSV
              <Input
                type="file"
                accept=".csv,text/csv"
                aria-label="Student CSV"
                disabled={studentUploading}
                onChange={(event) => {
                  setStudentFile(event.currentTarget.files?.[0] ?? null);
                  setStudentPreviewRows([]);
                }}
              />
              <span className="text-xs font-normal text-muted-foreground">
                {studentFile?.name ?? "No file selected"} · Up to 500 records
                per upload
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => downloadTemplate(studentTemplate)}
              >
                <Download aria-hidden="true" /> Template
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!studentFile || studentUploading}
                onClick={() => void reviewStudentFile()}
              >
                Review
              </Button>
              <Button
                type="button"
                disabled={!studentPreviewRows.length || studentUploading}
                onClick={() => void uploadStudents()}
              >
                <Upload aria-hidden="true" />{" "}
                {studentUploading ? "Creating students…" : "Create records"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => saveDraft(2)}
              >
                Save draft
              </Button>
            </div>
          </div>
          {studentPreviewRows.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs text-muted-foreground">
                {studentPreviewRows.length} valid rows. Showing up to five for
                review.
              </p>
              <DataTable
                columns={previewColumns(studentTemplate)}
                data={studentPreviewRows.slice(0, 5)}
                pageSize={5}
              />
            </div>
          )}
          {studentError && (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {studentError}
            </p>
          )}
        </SectionPanel>
      )}

      {step === 3 && (
        <SectionPanel title="Student import review">
          <p className="mb-4 text-sm text-muted-foreground">
            {studentRows.length} Student records were created and are ready for
            the school roster.
          </p>
          <DataTable
            columns={studentColumns}
            data={studentRows}
            pageSize={15}
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                downloadImportResults("students", studentImportResult)
              }
            >
              <Download aria-hidden="true" /> Results
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => saveDraft(3)}
            >
              Save draft
            </Button>
            <Button type="button" onClick={() => saveDraft(4)}>
              Continue to student list
            </Button>
          </div>
        </SectionPanel>
      )}

      {step === 4 && (
        <SectionPanel
          title="Student records"
          action={
            <StatusPill variant="success">
              {studentRows.length} imported
            </StatusPill>
          }
        >
          <DataTable
            columns={studentColumns}
            data={studentRows}
            pageSize={15}
          />
          <div className="mt-4 flex justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                downloadImportResults("students", studentImportResult)
              }
            >
              <Download aria-hidden="true" /> Results
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => saveDraft(4)}
            >
              Save draft
            </Button>
            <Button type="button" onClick={() => saveDraft(5)}>
              Continue to people
            </Button>
          </div>
        </SectionPanel>
      )}

      {step === 5 && (
        <SectionPanel title="People and school access">
          <p className="mb-1 text-sm text-muted-foreground">
            Import order supports linking accounts to the current school. Role
            CSVs match existing accounts by email.
          </p>
          {renderDatasetList(peopleDatasets)}
          <div className="flex justify-between gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => saveDraft(5)}
            >
              Save draft
            </Button>
            <Button type="button" onClick={() => saveDraft(6)}>
              Continue to school data
            </Button>
          </div>
        </SectionPanel>
      )}

      {step === 6 && (
        <div className="space-y-5">
          <SectionPanel title="School data">
            <p className="mb-1 text-sm text-muted-foreground">
              Upload each data type after its referenced records have been
              imported.
            </p>
            {renderDatasetList(operationsDatasets)}
            {completedImports.length > 0 && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="mb-3 text-sm font-semibold text-foreground">
                  Imported datasets
                </p>
                <DataTable
                  columns={completedColumns}
                  data={completedImports}
                  pageSize={20}
                />
              </div>
            )}
            <div className="mt-4 flex justify-between gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => saveDraft(6)}
              >
                Save draft
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (draftKey) localStorage.removeItem(draftKey);
                  setNotice("");
                  setSetupFinished(true);
                }}
              >
                Finish setup
              </Button>
            </div>
          </SectionPanel>
        </div>
      )}
    </div>
  );
}
