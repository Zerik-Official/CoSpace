import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { cn } from "@/lib/utils/cn";

const CONTROL_CLASSES =
  "w-full rounded-[var(--radius-card)] border border-line bg-surface px-3.5 py-2.5 text-[0.95rem] text-ink placeholder:text-line-strong focus:border-pine focus:outline-none";

/** Props shared by every labelled control. */
export interface FieldShellProps {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Wraps a control with its label, hint and error message. The field name doubles
 * as the control id, so the components need no hooks and stay server friendly.
 *
 * @param props - Field name, label, hint, error and the control itself.
 * @returns The rendered field wrapper.
 */
function FieldShell({ name, label, hint, error, className, children }: FieldShellProps): ReactNode {
  const describedBy = error ? `${name}-error` : hint ? `${name}-hint` : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={name} className="text-[0.8rem] font-medium text-ink-soft">
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${name}-hint`} className="text-[0.78rem] text-ink-soft">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${name}-error`} className="text-[0.78rem] font-medium text-ochre">
          {error}
        </p>
      ) : null}
      {describedBy ? <span className="sr-only">{describedBy}</span> : null}
    </div>
  );
}

/** Props accepted by a single line text field. */
export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "name" | "id">,
    Omit<FieldShellProps, "children"> {}

/**
 * Renders a labelled single line text input.
 *
 * @param props - Field shell props plus native input attributes.
 * @returns The rendered text field.
 */
export function TextField({ name, label, hint, error, className, ...rest }: TextFieldProps): ReactNode {
  return (
    <FieldShell name={name} label={label} hint={hint} error={error} className={className}>
      <input
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
        className={cn(CONTROL_CLASSES, error && "border-ochre")}
        {...rest}
      />
    </FieldShell>
  );
}

/** Props accepted by a numeric field. */
export interface NumberFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "name" | "id" | "type">,
    Omit<FieldShellProps, "children"> {}

/**
 * Renders a labelled numeric input.
 *
 * @param props - Field shell props plus native input attributes.
 * @returns The rendered numeric field.
 */
export function NumberField({ name, label, hint, error, className, ...rest }: NumberFieldProps): ReactNode {
  return (
    <FieldShell name={name} label={label} hint={hint} error={error} className={className}>
      <input
        id={name}
        name={name}
        type="number"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
        className={cn(CONTROL_CLASSES, error && "border-ochre")}
        {...rest}
      />
    </FieldShell>
  );
}

/** Props accepted by a multi line text field. */
export interface TextAreaFieldProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "name" | "id">,
    Omit<FieldShellProps, "children"> {}

/**
 * Renders a labelled multi line text input.
 *
 * @param props - Field shell props plus native textarea attributes.
 * @returns The rendered textarea field.
 */
export function TextAreaField({
  name,
  label,
  hint,
  error,
  className,
  ...rest
}: TextAreaFieldProps): ReactNode {
  return (
    <FieldShell name={name} label={label} hint={hint} error={error} className={className}>
      <textarea
        id={name}
        name={name}
        rows={4}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
        className={cn(CONTROL_CLASSES, "resize-y", error && "border-ochre")}
        {...rest}
      />
    </FieldShell>
  );
}

/** Props accepted by a checkbox field. */
export interface CheckboxFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "name" | "id" | "type"> {
  name: string;
  label: string;
}

/**
 * Renders a labelled checkbox.
 *
 * @param props - Field name, label and native checkbox attributes.
 * @returns The rendered checkbox field.
 */
export function CheckboxField({
  name,
  label,
  className,
  ...rest
}: CheckboxFieldProps): ReactNode {
  return (
    <label
      htmlFor={name}
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-card)] border border-line bg-surface px-3 py-2 text-[0.85rem] hover:border-line-strong",
        className,
      )}
    >
      <input
        id={name}
        name={name}
        type="checkbox"
        className="size-4 accent-[var(--color-pine)]"
        {...rest}
      />
      {label}
    </label>
  );
}

/** Props accepted by a select field. */
export interface SelectFieldProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "name" | "id" | "children">,
    Omit<FieldShellProps, "children"> {
  options: Array<{ value: string; label: string }>;
}

/**
 * Renders a labelled select with a fixed option list.
 *
 * @param props - Field shell props, option list and native select attributes.
 * @returns The rendered select field.
 */
export function SelectField({
  name,
  label,
  hint,
  error,
  className,
  options,
  ...rest
}: SelectFieldProps): ReactNode {
  return (
    <FieldShell name={name} label={label} hint={hint} error={error} className={className}>
      <select
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
        className={cn(CONTROL_CLASSES, "appearance-none pr-3", error && "border-ochre")}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
