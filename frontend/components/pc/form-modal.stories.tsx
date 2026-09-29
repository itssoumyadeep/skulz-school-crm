import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormModal } from "./form-modal";

const meta = {
  title: "PC/FormModal",
  component: FormModal,
} satisfies Meta<typeof FormModal>;

export default meta;
type Story = StoryObj<typeof meta>;

function FormModalDemo({ loading = false }: { loading?: boolean }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open form</Button>
      <FormModal
        title="Add staff member"
        description="Create a staff record for Greenfield School."
        submitLabel="Create staff"
        loading={loading}
        open={open}
        onOpenChange={setOpen}
        onSubmit={(event) => event.preventDefault()}
        trigger={<Button variant="outline">Open from trigger</Button>}
      >
        <div className="space-y-4">
          <label className="block space-y-1.5 text-sm font-medium">
            Full name
            <Input placeholder="e.g. Alex Morgan" />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            Email
            <Input type="email" placeholder="alex@greenfield.edu" />
          </label>
        </div>
      </FormModal>
    </>
  );
}

const storyArgs = {
  title: "Add staff member",
  children: null,
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => event.preventDefault(),
  submitLabel: "Create staff",
};

export const Open: Story = {
  args: storyArgs,
  render: () => <FormModalDemo />,
};
export const Saving: Story = {
  args: { ...storyArgs, loading: true },
  render: () => <FormModalDemo loading />,
};
