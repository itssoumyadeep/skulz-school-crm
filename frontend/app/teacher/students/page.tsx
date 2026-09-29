// file: frontend/app/teacher/students/page.tsx
"use client";
import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import StudentTable from "./components/StudentTable";
import ClassFilterDropdown from "./components/ClassFilterDropdown";
import SearchBar from "./components/SearchBar";
import PaginationControls from "./components/PaginationControls";
import { fetchStudents } from "@/app/lib/students";
import type { Student } from "@/app/lib/students";

type Envelope = {
  data: Student[];
  meta?: {
    tenant_id?: string;
    role?: string;
    version?: string;
    permissions?: Record<string, unknown>;
    pagination?: {
      total?: number;
      page?: number;
      page_size?: number;
    };
  };
};

export default function StudentsPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading students…</p>}>
      <StudentsPageInner />
    </Suspense>
  );
}

function StudentsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const classId = searchParams.get("class_id") ?? "";
  const search = searchParams.get("search") ?? "";
  const page = Number(searchParams.get("page")) || 1;
  const pageSize = Number(searchParams.get("page_size")) || 20;

  const [data, setData] = useState<Envelope | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper to build query and navigate (preserve other params)
  const updateQuery = (updates: Record<string, string | undefined>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => {
      if (v) newParams.set(k, v);
      else newParams.delete(k);
    });
    router.push(`?${newParams.toString()}`);
  };

  // Fetch data whenever relevant query params change
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const envelope = await fetchStudents({
          class_id: classId || undefined,
          search: search?.length >= 2 ? search : undefined,
          page,
          page_size: pageSize,
        });
        setData(envelope);
      } catch (e: any) {
        setError(e.message || "Failed to load students");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [classId, search, page, pageSize]);

  if (loading) return <p className="p-6">Loading…</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!data) return null;

  const students = data.data ?? [];
  const total = data.meta?.pagination?.total ?? students.length;

  return (
    <div className="p-6">
      {/* Header with live count badge */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Students</h1>
        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded">
          {total} total
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4">
        <ClassFilterDropdown
          selectedClassId={classId}
          onChange={(id) => updateQuery({ class_id: id, page: "1" })}
        />
        <SearchBar
          initialValue={search}
          onSearch={(term) =>
            updateQuery({ search: term, page: "1", class_id: classId })
          }
        />
      </div>

      {/* Table or empty state */}
      {students.length > 0 ? (
        <>
          <StudentTable students={students} />
          <PaginationControls
            currentPage={page}
            pageSize={pageSize}
            total={total}
            onPageChange={(newPage) => updateQuery({ page: String(newPage) })}
          />
        </>
      ) : (
        <p className="text-gray-600">No students match the selected filters.</p>
      )}
    </div>
  );
}
