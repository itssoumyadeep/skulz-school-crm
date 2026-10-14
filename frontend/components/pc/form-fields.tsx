"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useController,
  useForm,
  type Control,
  type FieldPath,
  type FieldValues,
  type UseFormProps,
  type UseFormReturn,
} from "react-hook-form";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { DatePicker } from "./date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function useZodForm<
  TInput extends FieldValues,
  TOutput extends FieldValues,
>(
  schema: z.ZodType<TOutput, TInput>,
  options?: Omit<UseFormProps<TInput, unknown, TOutput>, "resolver">,
): UseFormReturn<TInput, unknown, TOutput> {
  return useForm<TInput, unknown, TOutput>({
    ...options,
    resolver: zodResolver(schema),
  });
}

export type FormFieldBaseProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = {
  control: Control<TFieldValues>;
  name: TName;
  label: string;
  helperText?: string;
  disabled?: boolean;
};

type FieldFrameProps = {
  id: string;
  label: string;
  helperText?: string;
  errorMessage?: string;
  children: ReactNode;
};

function FieldFrame({
  id,
  label,
  helperText,
  errorMessage,
  children,
}: FieldFrameProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {errorMessage && (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {errorMessage}
        </p>
      )}
      {helperText && (
        <p id={`${id}-help`} className="text-sm text-muted-foreground">
          {helperText}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, helperText?: string, errorMessage?: string) {
  return [helperText && `${id}-help`, errorMessage && `${id}-error`]
    .filter(Boolean)
    .join(" ");
}

export type TextFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = FormFieldBaseProps<TFieldValues, TName> &
  Omit<
    ComponentProps<typeof Input>,
    | "id"
    | "name"
    | "value"
    | "defaultValue"
    | "onChange"
    | "onBlur"
    | "ref"
    | "disabled"
    | "aria-describedby"
    | "aria-invalid"
  >;

export function TextField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  helperText,
  disabled,
  ...inputProps
}: TextFieldProps<TFieldValues, TName>) {
  const id = useId();
  const { field, fieldState } = useController({ control, name, disabled });
  const errorMessage = fieldState.error?.message;

  return (
    <FieldFrame
      id={id}
      label={label}
      helperText={helperText}
      errorMessage={errorMessage}
    >
      <Input
        {...inputProps}
        {...field}
        id={id}
        value={field.value ?? ""}
        disabled={disabled}
        aria-invalid={fieldState.invalid}
        aria-describedby={describedBy(id, helperText, errorMessage)}
      />
    </FieldFrame>
  );
}

export type SelectFieldOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type SelectFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = FormFieldBaseProps<TFieldValues, TName> & {
  options: readonly SelectFieldOption[];
  placeholder?: string;
};

export function SelectField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  helperText,
  disabled,
  options,
  placeholder = "Select an option",
}: SelectFieldProps<TFieldValues, TName>) {
  const id = useId();
  const { field, fieldState } = useController({ control, name, disabled });
  const {
    value: selectValue,
    onChange: handleSelectChange,
    onBlur: handleSelectBlur,
  } = field;
  const errorMessage = fieldState.error?.message;

  return (
    <FieldFrame
      id={id}
      label={label}
      helperText={helperText}
      errorMessage={errorMessage}
    >
      <Select
        value={selectValue == null ? "" : String(selectValue)}
        onValueChange={handleSelectChange}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          onBlur={handleSelectBlur}
          aria-invalid={fieldState.invalid}
          aria-describedby={describedBy(id, helperText, errorMessage)}
          className="w-full"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldFrame>
  );
}

export type DateFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = FormFieldBaseProps<TFieldValues, TName> & {
  min?: string;
  max?: string;
};

export function DateField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  helperText,
  disabled,
  min,
  max,
}: DateFieldProps<TFieldValues, TName>) {
  const id = useId();
  const { field, fieldState } = useController({ control, name, disabled });
  const errorMessage = fieldState.error?.message;

  return (
    <FieldFrame
      id={id}
      label={label}
      helperText={helperText}
      errorMessage={errorMessage}
    >
      <DatePicker
        id={id}
        value={field.value ?? ""}
        onChange={field.onChange}
        min={min}
        max={max}
        disabled={disabled}
        aria-invalid={fieldState.invalid}
        aria-describedby={describedBy(id, helperText, errorMessage)}
        label={label}
      />
    </FieldFrame>
  );
}

export type TextAreaFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = FormFieldBaseProps<TFieldValues, TName> &
  Omit<
    ComponentProps<typeof Textarea>,
    | "id"
    | "name"
    | "value"
    | "defaultValue"
    | "onChange"
    | "onBlur"
    | "ref"
    | "disabled"
    | "aria-describedby"
    | "aria-invalid"
  >;

export function TextAreaField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  helperText,
  disabled,
  ...textareaProps
}: TextAreaFieldProps<TFieldValues, TName>) {
  const id = useId();
  const { field, fieldState } = useController({ control, name, disabled });
  const errorMessage = fieldState.error?.message;

  return (
    <FieldFrame
      id={id}
      label={label}
      helperText={helperText}
      errorMessage={errorMessage}
    >
      <Textarea
        {...textareaProps}
        {...field}
        id={id}
        value={field.value ?? ""}
        disabled={disabled}
        aria-invalid={fieldState.invalid}
        aria-describedby={describedBy(id, helperText, errorMessage)}
      />
    </FieldFrame>
  );
}

export type FileFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = FormFieldBaseProps<TFieldValues, TName> & {
  accept?: string;
  multiple?: boolean;
};

export function FileField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  helperText,
  disabled,
  accept,
  multiple = false,
}: FileFieldProps<TFieldValues, TName>) {
  const id = useId();
  const { field, fieldState } = useController({ control, name, disabled });
  const { onChange: handleFileChange, onBlur: handleFileBlur } = field;
  const errorMessage = fieldState.error?.message;

  return (
    <FieldFrame
      id={id}
      label={label}
      helperText={helperText}
      errorMessage={errorMessage}
    >
      <Input
        id={id}
        onBlur={handleFileBlur}
        onChange={(event) => handleFileChange(event.currentTarget.files)}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        aria-invalid={fieldState.invalid}
        aria-describedby={describedBy(id, helperText, errorMessage)}
      />
    </FieldFrame>
  );
}
