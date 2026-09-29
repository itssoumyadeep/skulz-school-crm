"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import Image from "next/image";
import {
  columnFilteringFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  createColumnHelper,
  filterFn_includesString,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "./empty-state";

export const dataTableFeatures = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  filterFns: { includesString: filterFn_includesString },
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
});

type DataTableColumn<TData extends RowData> = ColumnDef<
  typeof dataTableFeatures,
  TData,
  any // eslint-disable-line @typescript-eslint/no-explicit-any
>;

export function createDataTableColumnHelper<TData extends RowData>() {
  return createColumnHelper<typeof dataTableFeatures, TData>();
}

export type DataTableProps<TData extends RowData> = {
  columns: DataTableColumn<TData>[];
  data: TData[];
  loading?: boolean;
  onRowClick?: (row: TData) => void;
  pageSize?: number;
};

type AvatarNameRow = RowData & {
  name: string;
  avatarUrl?: string | null;
};

export type AvatarNameColumnOptions<TData extends RowData> = {
  id?: string;
  header?: string;
  getName: (row: TData) => string;
  getAvatarUrl?: (row: TData) => string | null | undefined;
};

export function createAvatarNameColumn<TData extends RowData>(
  options: AvatarNameColumnOptions<TData>,
): ColumnDef<typeof dataTableFeatures, TData, string> {
  return {
    id: options.id ?? "name",
    header: options.header ?? "Name",
    accessorFn: options.getName,
    cell: ({ row }) => {
      const name = options.getName(row.original);
      const avatarUrl = options.getAvatarUrl?.(row.original);
      const initials = name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();

      return (
        <span className="inline-flex min-w-0 items-center gap-2.5">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              width={32}
              height={32}
              unoptimized
              className="size-8 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {initials || "?"}
            </span>
          )}
          <span className="truncate font-medium text-foreground">{name}</span>
        </span>
      );
    },
  };
}

export type AttendancePercentColumnOptions<TData extends RowData> = {
  id?: string;
  header?: string;
  accessor: (row: TData) => number;
};

export function AttendancePercentCell({ value }: { value: number }) {
  const colorClass =
    value >= 90
      ? "bg-success/10 text-success"
      : value >= 75
        ? "bg-warning/10 text-warning"
        : "bg-danger/10 text-danger";
  const displayValue = Number.isInteger(value)
    ? value
    : Number(value.toFixed(1));

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold tabular-nums ${colorClass}`}
    >
      {displayValue}%
    </span>
  );
}

export function createAttendancePercentColumn<TData extends RowData>(
  options: AttendancePercentColumnOptions<TData>,
): ColumnDef<typeof dataTableFeatures, TData, number> {
  return {
    id: options.id ?? "attendance",
    header: options.header ?? "Attendance",
    accessorFn: options.accessor,
    cell: ({ getValue }) => <AttendancePercentCell value={getValue()} />,
  };
}

function SortIndicator({ direction }: { direction: false | "asc" | "desc" }) {
  if (direction === "asc")
    return <ArrowUp aria-hidden="true" className="size-3.5" />;
  if (direction === "desc")
    return <ArrowDown aria-hidden="true" className="size-3.5" />;
  return <ArrowUpDown aria-hidden="true" className="size-3.5 opacity-50" />;
}

function LoadingRows({ columnCount }: { columnCount: number }) {
  return (
    <>
      {Array.from({ length: 5 }, (_, rowIndex) => (
        <tr key={rowIndex} className="border-b border-border last:border-0">
          {Array.from({ length: columnCount }, (_, columnIndex) => (
            <td key={columnIndex} className="px-4 py-3">
              <span className="block h-4 w-3/4 animate-pulse rounded-md bg-background" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  loading = false,
  onRowClick,
  pageSize = 20,
}: DataTableProps<TData>) {
  const resolvedPageSize =
    Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 20;
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: resolvedPageSize,
  });
  const currentPagination =
    pagination.pageSize === resolvedPageSize
      ? pagination
      : { pageIndex: 0, pageSize: resolvedPageSize };

  const table = useTable({
    features: dataTableFeatures,
    columns,
    data,
    globalFilterFn: "includesString",
    state: { globalFilter, sorting, pagination: currentPagination },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onPaginationChange: (updater) => {
      setPagination((current) => {
        const previous =
          current.pageSize === resolvedPageSize
            ? current
            : { pageIndex: 0, pageSize: resolvedPageSize };
        return typeof updater === "function" ? updater(previous) : updater;
      });
    },
  });

  const rows = table.getRowModel().rows;
  const totalRows = table.getFilteredRowModel().rows.length;
  const firstRow =
    totalRows === 0
      ? 0
      : currentPagination.pageIndex * currentPagination.pageSize + 1;
  const lastRow = Math.min(
    firstRow + currentPagination.pageSize - 1,
    totalRows,
  );
  const columnCount = table.getAllLeafColumns().length;

  const handleRowKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement>,
    row: TData,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onRowClick?.(row);
    }
  };

  let emptyState: ReactNode;
  if (!loading && rows.length === 0) {
    emptyState = (
      <EmptyState
        icon={<Search aria-hidden="true" />}
        title={globalFilter ? "No matching rows" : "No rows to display"}
        description={
          globalFilter
            ? "Try changing your search term."
            : "There are no records available yet."
        }
      />
    );
  }

  return (
    <section className="space-y-3" aria-busy={loading}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full sm:max-w-xs">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.currentTarget.value)}
            placeholder="Search rows"
            aria-label="Search table rows"
            className="pl-9"
          />
        </label>
        {!loading && totalRows > 0 && (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {firstRow}-{lastRow} of {totalRows}
          </p>
        )}
      </div>

      {emptyState ?? (
        <div className="overflow-x-auto rounded-md border border-border bg-surface">
          <table className="w-full min-w-max border-collapse text-left text-sm">
            <thead className="bg-background text-xs font-medium text-muted-foreground">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-border">
                  {headerGroup.headers.map((header) => {
                    const direction = header.column.getIsSorted();
                    const content = header.isPlaceholder ? null : (
                      <table.FlexRender header={header} />
                    );

                    return (
                      <th
                        key={header.id}
                        colSpan={header.colSpan}
                        scope={header.subHeaders.length ? undefined : "col"}
                        aria-sort={
                          direction === "asc"
                            ? "ascending"
                            : direction === "desc"
                              ? "descending"
                              : "none"
                        }
                        className="px-4 py-3 font-medium"
                      >
                        {header.column.getCanSort() && !header.isPlaceholder ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className="inline-flex items-center gap-1.5 text-left transition-colors hover:text-primary focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {content}
                            <SortIndicator direction={direction} />
                          </button>
                        ) : (
                          content
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading ? (
                <LoadingRows columnCount={columnCount} />
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={
                      onRowClick ? () => onRowClick(row.original) : undefined
                    }
                    onKeyDown={
                      onRowClick
                        ? (event) => handleRowKeyDown(event, row.original)
                        : undefined
                    }
                    tabIndex={onRowClick ? 0 : undefined}
                    className={`border-b border-border last:border-0 ${
                      onRowClick
                        ? "cursor-pointer transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                        : ""
                    }`}
                  >
                    {row.getAllCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 text-foreground">
                        <table.FlexRender cell={cell} />
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && totalRows > 0 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Previous page"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span className="min-w-16 text-center text-sm tabular-nums text-muted-foreground">
            {currentPagination.pageIndex + 1} /{" "}
            {Math.max(table.getPageCount(), 1)}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Next page"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      )}
    </section>
  );
}

export type AvatarNameRecord = AvatarNameRow;
