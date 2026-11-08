import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  filterDecimalInput,
  filterIntegerInput,
  filterUppercaseAlphanumericInput,
} from "@/lib/numeric-input";

function withFilteredChange(
  event: React.ChangeEvent<HTMLInputElement>,
  filter: (value: string) => string,
  onChange?: React.ChangeEventHandler<HTMLInputElement>,
) {
  if (!onChange) return;

  const filtered = filter(event.target.value);
  if (filtered !== event.target.value) {
    event.target.value = filtered;
  }

  onChange(event);
}

function IntegerInput({
  onChange,
  inputMode = "numeric",
  ...props
}: React.ComponentProps<typeof Input>) {
  return (
    <Input
      inputMode={inputMode}
      {...props}
      onChange={(event) => withFilteredChange(event, filterIntegerInput, onChange)}
    />
  );
}

function DecimalInput({
  onChange,
  inputMode = "decimal",
  ...props
}: React.ComponentProps<typeof Input>) {
  return (
    <Input
      inputMode={inputMode}
      {...props}
      onChange={(event) => withFilteredChange(event, filterDecimalInput, onChange)}
    />
  );
}

function UppercaseAlphanumericInput({
  maxLength,
  onChange,
  className,
  ...props
}: React.ComponentProps<typeof Input> & { maxLength?: number }) {
  const filter = (value: string) => filterUppercaseAlphanumericInput(value, maxLength);

  return (
    <Input
      {...props}
      maxLength={maxLength}
      className={cn("uppercase", className)}
      onChange={(event) => withFilteredChange(event, filter, onChange)}
    />
  );
}

export { DecimalInput, IntegerInput, UppercaseAlphanumericInput };
