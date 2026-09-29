import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CalendarDays, CircleDollarSign, Users } from "lucide-react";
import { KpiCard } from "./kpi-card";

const meta = {
  title: "PC/KpiCard",
  component: KpiCard,
} satisfies Meta<typeof KpiCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithDeltaIconAndLink: Story = {
  args: {
    label: "Students enrolled",
    value: "384",
    delta: "+2.4% vs last month",
    icon: <Users />,
    link: { href: "#students", label: "View students" },
  },
};

export const Fees: Story = {
  args: {
    label: "Outstanding fees",
    value: "$12,450",
    delta: "4 invoices overdue",
    icon: <CircleDollarSign />,
  },
};

export const Minimal: Story = {
  args: { label: "Events this week", value: 3, icon: <CalendarDays /> },
};
