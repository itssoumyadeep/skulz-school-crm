import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DatePicker } from "./date-picker";

function DatePickerDemo() {
  const [value, setValue] = useState("");

  return (
    <div className="w-64 rounded-md border border-border bg-surface p-5">
      <label
        htmlFor="date-picker-story"
        className="mb-2 block text-sm font-medium text-foreground"
      >
        Select date
      </label>
      <DatePicker
        id="date-picker-story"
        label="Select date"
        value={value}
        onChange={setValue}
      />
      <p className="mt-3 text-xs text-muted-foreground">
        Stored value: {value || "No date selected"}
      </p>
    </div>
  );
}

const meta = {
  title: "PC/DatePicker",
  render: () => <DatePickerDemo />,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
