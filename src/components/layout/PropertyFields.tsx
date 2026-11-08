import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { HelpHint } from "@/components/convert/HelpHint";
import { cn } from "@/lib/utils";

const propertyFieldWidths = {
  narrow: "max-w-md",
  wide: "max-w-xl",
  toggle: "max-w-xl",
} as const;

export function ToggleField({
  id,
  label,
  checked,
  onChange,
  hintLabel,
  hintDescription,
  className,
  compact = false,
  disabled = false,
}: Readonly<{
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hintLabel?: string;
  hintDescription?: string;
  className?: string;
  compact?: boolean;
  disabled?: boolean;
}>) {
  return (
    <Field
      orientation="horizontal"
      data-disabled={disabled ? "" : undefined}
      className={cn(
        "w-full gap-2.5 rounded-sm px-2 transition-colors hover:bg-muted/50 has-data-checked:bg-primary/10",
        compact ? "h-5 w-fit" : cn("min-h-8", propertyFieldWidths.toggle),
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      <Checkbox id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
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
