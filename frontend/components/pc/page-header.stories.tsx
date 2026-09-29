import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@/components/ui/button";
import { PageHeader } from "./page-header";

const meta = {
  title: "PC/PageHeader",
  component: PageHeader,
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Complete: Story = {
  args: {
    title: "Staff directory",
    subtitle: "Manage staff profiles, assignments, and compliance.",
    breadcrumb: <span>School / People / Staff</span>,
    actions: <Button>Add staff</Button>,
  },
};

export const TitleOnly: Story = { args: { title: "Attendance" } };
