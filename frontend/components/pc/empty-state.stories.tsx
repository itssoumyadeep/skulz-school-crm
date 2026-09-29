import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Inbox, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./empty-state";

const meta = {
  title: "PC/EmptyState",
  component: EmptyState,
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: <Inbox />,
    title: "No invoices yet",
    description: "Invoices will appear here when they are created.",
  },
};

export const SearchNoResults: Story = {
  args: {
    icon: <Search />,
    title: "No matching records",
    description: "Try a different name or student number.",
    action: <Button variant="outline">Clear search</Button>,
  },
};
