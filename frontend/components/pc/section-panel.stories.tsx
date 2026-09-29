import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@/components/ui/button";
import { SectionPanel } from "./section-panel";

const meta = {
  title: "PC/SectionPanel",
  component: SectionPanel,
} satisfies Meta<typeof SectionPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Content: Story = {
  args: {
    title: "Attendance overview",
    children: (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>Daily attendance summary and recent updates.</p>
        <p>All content uses the shared surface and border tokens.</p>
      </div>
    ),
  },
};

export const WithAction: Story = {
  args: {
    title: "Pending reviews",
    action: (
      <Button variant="link" size="xs">
        View all
      </Button>
    ),
    children: (
      <p className="text-sm text-muted-foreground">Four items need review.</p>
    ),
  },
};
