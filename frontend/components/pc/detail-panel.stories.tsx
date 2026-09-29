import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@/components/ui/button";
import { DetailPanel } from "./detail-panel";

const meta = {
  title: "PC/DetailPanel",
  component: DetailPanel,
} satisfies Meta<typeof DetailPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

function DetailPanelDemo() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open details</Button>
      <DetailPanel
        open={open}
        onOpenChange={setOpen}
        title="Sienna Miller"
        description="Student profile · Grade 2"
        headerActions={
          <Button variant="outline" size="sm">
            Edit
          </Button>
        }
        footerActions={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button>Save changes</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Scrollable detail content.
          </p>
          {Array.from({ length: 12 }, (_, index) => (
            <div key={index} className="rounded-md border border-border p-4">
              <h3 className="font-medium text-foreground">
                Profile section {index + 1}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Student details and activity.
              </p>
            </div>
          ))}
        </div>
      </DetailPanel>
    </>
  );
}

export const Open: Story = {
  args: {
    open: true,
    onOpenChange: () => {},
    title: "Student details",
    children: null,
    footerActions: null,
  },
  render: () => <DetailPanelDemo />,
};
