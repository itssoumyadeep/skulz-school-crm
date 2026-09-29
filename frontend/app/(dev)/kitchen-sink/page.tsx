"use client";

import { useState } from "react";
import {
  CalendarDays,
  CircleDollarSign,
  ClipboardCheck,
  GraduationCap,
  Users,
} from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  AppShell,
  AttendancePercentCell,
  DataTable,
  DateField,
  DetailPanel,
  EmptyState,
  FileField,
  FormModal,
  KpiCard,
  PageHeader,
  SectionPanel,
  SelectField,
  StatusPill,
  TextAreaField,
  TextField,
  createAttendancePercentColumn,
  createAvatarNameColumn,
  createDataTableColumnHelper,
  useZodForm,
} from "@/components/pc";

type Student = {
  id: number;
  name: string;
  grade: string;
  attendance: number;
};

const students: Student[] = Array.from({ length: 24 }, (_, index) => ({
  id: index + 1,
  name: ["Amara Okafor", "Noah Chen", "Sofia Patel", "Mateo Silva"][index % 4],
  grade: `Grade ${(index % 8) + 1}`,
  attendance: [96, 88, 72, 91, 79, 100][index % 6],
}));

const studentColumnHelper = createDataTableColumnHelper<Student>();
const studentColumns = studentColumnHelper.columns([
  createAvatarNameColumn<Student>({ getName: (student) => student.name }),
  studentColumnHelper.accessor("grade", { header: "Grade" }),
  createAttendancePercentColumn<Student>({
    accessor: (student) => student.attendance,
  }),
]);

const staffSchema = z.object({
  name: z.string().min(2, "Enter at least two characters."),
  role: z.string().min(1, "Select a role."),
  startDate: z.string().min(1, "Choose a date."),
  notes: z.string().optional(),
  files: z.custom<FileList>().optional(),
});

function DemoForm() {
  const form = useZodForm(staffSchema, {
    defaultValues: { name: "", role: "", startDate: "", notes: "" },
  });

  return (
    <div className="space-y-4">
      <TextField
        control={form.control}
        name="name"
        label="Full name"
        placeholder="Staff member name"
        helperText="Use the name shown on official records."
      />
      <SelectField
        control={form.control}
        name="role"
        label="Role"
        options={[
          { value: "teacher", label: "Teacher" },
          { value: "principal", label: "Principal" },
          { value: "support", label: "Support staff" },
        ]}
      />
      <DateField control={form.control} name="startDate" label="Start date" />
      <TextAreaField
        control={form.control}
        name="notes"
        label="Notes"
        placeholder="Optional notes"
        rows={3}
      />
      <FileField
        control={form.control}
        name="files"
        label="Documents"
        accept=".pdf,.doc,.docx"
        helperText="PDF or Word documents."
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => void form.trigger()}
      >
        Validate fields
      </Button>
    </div>
  );
}

const navigation = [
  {
    label: "Overview",
    href: "/kitchen-sink#overview",
    icon: <GraduationCap />,
  },
  {
    label: "Components",
    href: "/kitchen-sink#components",
    icon: <ClipboardCheck />,
  },
  { label: "Students", href: "/kitchen-sink#students", icon: <Users /> },
];

export default function KitchenSinkPage() {
  const [detailOpen, setDetailOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <AppShell
      navigation={navigation}
      sidebarTheme="light"
      title="Component kitchen sink"
      user={{ name: "Design System" }}
      notifications={[
        {
          id: "demo-1",
          title: "Story preview",
          description: "All shared PC components",
        },
      ]}
    >
      <div className="mx-auto max-w-7xl space-y-8">
        <div id="overview" className="scroll-mt-20">
          <PageHeader
            title="Component kitchen sink"
            subtitle="Shared portal components, states, and token styling."
            breadcrumb={<span>Developer tools / Components</span>}
            actions={
              <>
                <Button variant="outline" onClick={() => setDetailOpen(true)}>
                  Open detail panel
                </Button>
                <Button onClick={() => setModalOpen(true)}>
                  Open form modal
                </Button>
              </>
            }
          />
        </div>

        <section id="components" className="scroll-mt-20 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Status and metrics
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill variant="success" dot>
              Success
            </StatusPill>
            <StatusPill variant="warning" dot>
              Warning
            </StatusPill>
            <StatusPill variant="danger" dot>
              Danger
            </StatusPill>
            <StatusPill variant="info" dot>
              Information
            </StatusPill>
            <StatusPill variant="neutral">Neutral</StatusPill>
            <AttendancePercentCell value={96} />
            <AttendancePercentCell value={82} />
            <AttendancePercentCell value={68} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Students enrolled"
              value="384"
              delta="+2.4% this month"
              icon={<Users />}
              link={{ href: "#students", label: "View roster" }}
            />
            <KpiCard
              label="Staff present"
              value="24 / 26"
              delta="2 on leave"
              icon={<ClipboardCheck />}
            />
            <KpiCard
              label="Outstanding fees"
              value="$12,450"
              delta="4 overdue"
              icon={<CircleDollarSign />}
            />
            <KpiCard
              label="Events this week"
              value="3"
              icon={<CalendarDays />}
            />
          </div>
        </section>

        <section id="students" className="scroll-mt-20 space-y-4">
          <PageHeader
            title="Student directory"
            subtitle="Sortable, searchable, paginated data table."
          />
          <DataTable columns={studentColumns} data={students} pageSize={5} />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <SectionPanel title="Empty state">
            <EmptyState
              icon={<Users />}
              title="No students selected"
              description="Choose a student to see their profile and recent activity."
              action={<Button variant="outline">Browse students</Button>}
            />
          </SectionPanel>
          <SectionPanel title="Form fields">
            <div className="space-y-4">
              <DemoForm />
            </div>
          </SectionPanel>
        </section>

        <FormModal
          title="Add staff member"
          description="Create a new staff record."
          submitLabel="Create staff"
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSubmit={(event) => event.preventDefault()}
        >
          <DemoForm />
        </FormModal>

        <DetailPanel
          open={detailOpen}
          onOpenChange={setDetailOpen}
          title="Student details"
          description="Profile summary and recent activity."
          footerActions={
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDetailOpen(false)}>
                Close
              </Button>
              <Button>Save</Button>
            </div>
          }
        >
          <div className="space-y-4">
            <KpiCard label="Attendance" value="96%" icon={<ClipboardCheck />} />
            <StatusPill variant="success" dot>
              Enrolled
            </StatusPill>
            <p className="text-sm text-muted-foreground">
              Detail panel body scrolls independently; footer actions stay
              visible.
            </p>
          </div>
        </DetailPanel>
      </div>
    </AppShell>
  );
}
