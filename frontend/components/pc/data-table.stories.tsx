import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  AttendancePercentCell,
  DataTable,
  createAttendancePercentColumn,
  createAvatarNameColumn,
  createDataTableColumnHelper,
} from "./data-table";

type Learner = {
  id: number;
  name: string;
  grade: string;
  attendance: number;
};

const learners: Learner[] = Array.from({ length: 24 }, (_, index) => ({
  id: index + 1,
  name: ["Amara Okafor", "Noah Chen", "Sofia Patel", "Mateo Silva"][index % 4],
  grade: `Grade ${(index % 8) + 1}`,
  attendance: [96, 88, 72, 91, 79, 100][index % 6],
}));

const helper = createDataTableColumnHelper<Learner>();
const columns = helper.columns([
  createAvatarNameColumn<Learner>({ getName: (row) => row.name }),
  helper.accessor("grade", { header: "Grade" }),
  createAttendancePercentColumn<Learner>({ accessor: (row) => row.attendance }),
]);

const meta = {
  title: "PC/DataTable",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Populated: Story = {
  render: () => <DataTable columns={columns} data={learners} />,
};

export const Loading: Story = {
  render: () => <DataTable columns={columns} data={learners} loading />,
};

export const Empty: Story = {
  render: () => <DataTable columns={columns} data={[]} />,
};

export const AttendanceThresholds: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <AttendancePercentCell value={94} />
      <AttendancePercentCell value={82} />
      <AttendancePercentCell value={68} />
    </div>
  ),
};
