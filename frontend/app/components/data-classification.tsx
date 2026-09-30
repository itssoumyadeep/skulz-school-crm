"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";

import {
  fetchDataClassification,
  type DataCatalogElement,
  type DataClassificationCategory,
  type DataClassificationCatalog,
} from "@/app/lib/api";
import {
  createDataTableColumnHelper,
  DataTable,
  SectionPanel,
  StatusPill,
} from "@/components/pc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type CategoryFilter = "All" | DataClassificationCategory;

const columnHelper = createDataTableColumnHelper<DataCatalogElement>();

function categoryVariant(category: DataClassificationCategory) {
  if (category === "Actors") return "info" as const;
  if (category === "Processes") return "success" as const;
  return "neutral" as const;
}

function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return "The data catalog could not be loaded.";
}

export function DataClassification() {
  const [catalog, setCatalog] = useState<DataClassificationCatalog | null>(
    null,
  );
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>("All");
  const [selectedElement, setSelectedElement] =
    useState<DataCatalogElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchDataClassification()
      .then((response) => {
        if (active) setCatalog(response.data);
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

  function retryLoad() {
    setLoading(true);
    setError("");
    fetchDataClassification()
      .then((response) => setCatalog(response.data))
      .catch((loadError: unknown) => setError(errorMessage(loadError)))
      .finally(() => setLoading(false));
  }

  const columns = [
    columnHelper.accessor(
      (element) => `${element.label} ${element.name} ${element.table}`,
      {
        id: "element",
        header: "Data element",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="font-medium text-foreground">{row.original.label}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.name} · {row.original.table}
            </p>
          </div>
        ),
      },
    ),
    columnHelper.accessor("category", {
      id: "classification",
      header: "Classification",
      cell: ({ row }) => (
        <StatusPill variant={categoryVariant(row.original.category)}>
          {row.original.category}
        </StatusPill>
      ),
    }),
    columnHelper.accessor((element) => element.fields.length, {
      id: "field_count",
      header: "Fields",
    }),
    columnHelper.display({
      id: "details",
      header: "Schema",
      cell: ({ row }) => (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setSelectedElement(row.original)}
        >
          <Eye aria-hidden="true" />
          View fields
        </Button>
      ),
    }),
  ];

  if (error && !catalog) {
    return (
      <SectionPanel title="Data catalog unavailable">
        <div className="space-y-3">
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
          <Button type="button" variant="outline" onClick={retryLoad}>
            Try again
          </Button>
        </div>
      </SectionPanel>
    );
  }

  const activeDescription =
    selectedCategory === "All"
      ? "All concrete data models registered by the project."
      : catalog?.categories.find(
          (category) => category.name === selectedCategory,
        )?.description;
  const visibleElements = (catalog?.elements ?? []).filter(
    (element) =>
      selectedCategory === "All" || element.category === selectedCategory,
  );

  return (
    <>
      <SectionPanel title="Project data elements">
        <Tabs
          value={selectedCategory}
          onValueChange={(value) =>
            setSelectedCategory(value as CategoryFilter)
          }
          className="space-y-4"
        >
          <TabsList className="h-auto w-full flex-wrap justify-start">
            <TabsTrigger value="All">
              All{" "}
              <span className="tabular-nums">
                {catalog?.elements.length ?? 0}
              </span>
            </TabsTrigger>
            {catalog?.categories.map((category) => (
              <TabsTrigger key={category.name} value={category.name}>
                {category.name}{" "}
                <span className="tabular-nums">{category.count}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          <p className="text-sm text-muted-foreground">{activeDescription}</p>
          <TabsContent value={selectedCategory}>
            <DataTable
              columns={columns}
              data={visibleElements}
              loading={loading}
              pageSize={15}
            />
          </TabsContent>
        </Tabs>
      </SectionPanel>

      <Dialog
        open={selectedElement !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedElement(null);
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          {selectedElement && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedElement.label}</DialogTitle>
                <DialogDescription>
                  {selectedElement.name} · {selectedElement.table} ·{" "}
                  {selectedElement.fields.length} fields
                </DialogDescription>
              </DialogHeader>
              <ul className="grid gap-x-6 sm:grid-cols-2">
                {selectedElement.fields.map((field) => (
                  <li
                    key={field.name}
                    className="border-b border-border py-2.5"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {field.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {field.name} · {field.type}
                      {field.related_model ? ` -> ${field.related_model}` : ""}
                      {field.required ? " · Required" : " · Optional"}
                    </p>
                  </li>
                ))}
              </ul>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedElement(null)}
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
