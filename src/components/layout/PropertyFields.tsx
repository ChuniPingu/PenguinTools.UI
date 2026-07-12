import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { HelpHint } from "@/components/convert/HelpHint";
import { cn } from "@/lib/utils";

export const propertyFieldWidths = {
  narrow: "max-w-md",
  wide: "max-w-xl",
  toggle: "max-w-xl",
} as const;

export const propertyFieldGrids = {
  twoToFour: "grid gap-4 md:grid-cols-2 2xl:grid-cols-3",
  twoToThree: "grid gap-4 md:grid-cols-2 xl:grid-cols-3",
  three: "grid gap-4 sm:grid-cols-3",
  two: "grid gap-4 sm:grid-cols-2",
} as const;

export function HintLabel({
  label,
  description,
  htmlFor,
}: {
  label: string;
  description: string;
  htmlFor?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
      <HelpHint title={label} description={description} />
    </div>
  );
}

export function NumberField({
  id,
  label,
  value,
  onChange,
  hintLabel,
  hintDescription,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hintLabel: string;
  hintDescription: string;
}) {
  return (
    <Field>
      <div className="flex items-center gap-1.5">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <HelpHint title={hintLabel} description={hintDescription} />
      </div>
      <Input
        id={id}
        value={value}
        inputMode="numeric"
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

export function ToggleField({
  id,
  label,
  checked,
  onChange,
  hintLabel,
  hintDescription,
  className,
  compact = false,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hintLabel?: string;
  hintDescription?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <Field
      orientation="horizontal"
      className={cn(
        "w-full min-h-8 gap-2.5 rounded-sm px-2 transition-colors hover:bg-muted/50 has-data-checked:bg-primary/10",
        compact ? "w-fit" : propertyFieldWidths.toggle,
        className,
      )}
    >
      <Checkbox id={id} checked={checked} onCheckedChange={onChange} />
      {compact ? null : (
        <FieldLabel htmlFor={id} className="flex min-h-9 flex-1 cursor-pointer items-center">
          {label}
        </FieldLabel>
      )}
      {!compact && hintLabel && hintDescription ? (
        <HelpHint title={hintLabel} description={hintDescription} />
      ) : null}
    </Field>
  );
}
