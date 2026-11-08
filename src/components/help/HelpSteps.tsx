export function HelpSteps({ steps }: Readonly<{ steps: readonly string[] }>) {
  return (
    <ol className="list-decimal space-y-1 pl-5 text-xs/relaxed text-popover-foreground">
      {steps.map((step) => (
        <li key={step} className="pl-1">
          {step}
        </li>
      ))}
    </ol>
  );
}
