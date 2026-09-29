import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  DateField,
  FileField,
  SelectField,
  TextAreaField,
  TextField,
  useZodForm,
} from "./form-fields";

const schema = z.object({
  fullName: z.string().min(2, "Enter at least two characters."),
  role: z.string().min(1, "Choose a role."),
  startDate: z.string().min(1, "Choose a date."),
  notes: z.string().optional(),
  documents: z.custom<FileList>().optional(),
});

function FormFieldsDemo() {
  const form = useZodForm(schema, {
    defaultValues: { fullName: "", role: "", startDate: "", notes: "" },
  });
  return (
    <form
      onSubmit={form.handleSubmit(() => {})}
      className="max-w-xl space-y-5 rounded-md border border-border bg-surface p-5"
    >
      <TextField
        control={form.control}
        name="fullName"
        label="Full name"
        placeholder="Enter staff name"
        helperText="Use the name shown on official records."
      />
      <SelectField
        control={form.control}
        name="role"
        label="Role"
        placeholder="Select role"
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
        name="documents"
        label="Documents"
        accept=".pdf,.doc,.docx"
        helperText="PDF or Word documents."
      />
      <Button type="submit">Validate form</Button>
    </form>
  );
}

const meta = {
  title: "PC/FormFields",
  render: () => <FormFieldsDemo />,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllFields: Story = {};
