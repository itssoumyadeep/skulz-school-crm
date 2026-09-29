import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StatusPill, type StatusPillVariant } from "./status-pill";

const variants: StatusPillVariant[] = [
  "success",
  "warning",
  "danger",
  "info",
  "neutral",
];

const meta = {
  title: "PC/StatusPill",
  component: StatusPill,
  args: { children: "Active", variant: "success" },
} satisfies Meta<typeof StatusPill>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {
  args: { children: "Approved", variant: "success", dot: true },
};
export const Warning: Story = {
  args: { children: "Pending review", variant: "warning", dot: true },
};
export const Danger: Story = {
  args: { children: "Overdue", variant: "danger", dot: true },
};
export const Info: Story = {
  args: { children: "Scheduled", variant: "info", dot: true },
};
export const Neutral: Story = {
  args: { children: "Draft", variant: "neutral" },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      {variants.map((variant) => (
        <StatusPill key={variant} variant={variant} dot>
          {variant}
        </StatusPill>
      ))}
    </div>
  ),
};
