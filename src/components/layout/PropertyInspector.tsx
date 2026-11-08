import type { ReactNode } from "react";
import { ScanSearchIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { HelpHint, type MetadataHelpKind } from "@/components/convert/HelpHint";
import { WorkspaceSection } from "@/components/layout/WorkspaceSection";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function InspectorPanel({
  title,
  subtitle,
  standardHeading = false,
  scrollableBody = false,
  className,
  children,
}: Readonly<{
  title: string;
  subtitle?: string;
  standardHeading?: boolean;
  scrollableBody?: boolean;
  className?: string;
  children: ReactNode;
}>) {
  if (standardHeading) {
    return (
      <WorkspaceSection
        title={title}
        description={subtitle}
        className={cn("min-h-full min-w-0 bg-background", className)}
        contentClassName="p-0"
      >
        {children}
      </WorkspaceSection>
    );
  }

  const header = (
    <header className="flex min-h-14 shrink-0 flex-col justify-center border-b px-4 py-2.5 select-none">
      <h3 className="font-heading text-sm font-medium">{title}</h3>
      {subtitle ? (
        <p className="truncate text-xs/relaxed text-muted-foreground">{subtitle}</p>
      ) : null}
    </header>
  );

  if (scrollableBody) {
    return (
      <section className={cn("flex h-full min-h-0 min-w-0 flex-col bg-background", className)}>
        {header}
        <ScrollArea className="min-h-0 flex-1">{children}</ScrollArea>
      </section>
    );
  }

  return (
    <section className="min-h-full min-w-0 bg-background">
      {header}
      {children}
    </section>
  );
}

export function InspectorSection({
  title,
  children,
}: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <section className="border-b px-4 py-3.5">
      <h4 className="mb-2 font-heading text-xs/relaxed font-medium text-muted-foreground select-none">
        {title}
      </h4>
      <dl>{children}</dl>
    </section>
  );
}

export function InspectorRow({
  label,
  value,
  description,
  metadataHelp,
  mono = false,
}: Readonly<{
  label: string;
  value: ReactNode;
  description?: string;
  metadataHelp?: MetadataHelpKind;
  mono?: boolean;
}>) {
  const { t } = useTranslation();
  const resolvedValue = value == null || value === "" ? t("ui.common.emptyValue") : value;

  return (
    <div className="grid min-w-0 gap-2 border-t py-1.5 first:border-t-0 sm:grid-cols-[11rem_minmax(0,1fr)]">
      <dt className="min-w-0 text-xs/relaxed text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span>{label}</span>
          {description ? <HelpHint title={label} description={description} /> : null}
        </div>
        {metadataHelp ? (
          <div className="mt-0.5 flex items-center">
            <HelpHint kind={metadataHelp} />
          </div>
        ) : null}
      </dt>
      <dd
        className={cn(
          "min-w-0 break-words text-xs/relaxed font-normal select-text [font-variant-numeric:tabular-nums]",
          mono && "font-mono text-xs",
        )}
      >
        {resolvedValue}
      </dd>
    </div>
  );
}

export function EmptyInspector({
  title,
  subtitle,
  standardHeading = false,
  scrollableBody = false,
  heading,
  description,
  icon,
}: Readonly<{
  title: string;
  subtitle?: string;
  standardHeading?: boolean;
  scrollableBody?: boolean;
  heading: string;
  description?: string;
  icon?: ReactNode;
}>) {
  const body = (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      {icon ?? <ScanSearchIcon className="size-6 text-muted-foreground" />}
      <h3 className="text-sm font-medium select-none">{heading}</h3>
      {description ? (
        <p className="max-w-lg text-xs leading-5 text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );

  const header = (
    <header className="flex min-h-14 shrink-0 flex-col justify-center border-b px-4 py-2.5 select-none">
      <h3 className="font-heading text-sm font-medium">{title}</h3>
      {subtitle ? (
        <p className="truncate text-xs/relaxed text-muted-foreground">{subtitle}</p>
      ) : null}
    </header>
  );

  if (standardHeading) {
    return (
      <WorkspaceSection
        title={title}
        description={subtitle}
        className="flex min-h-0 flex-1 flex-col border-b-0 bg-background"
        contentClassName="flex min-h-0 flex-1 flex-col p-0"
      >
        {body}
      </WorkspaceSection>
    );
  }

  return (
    <section
      className={cn(
        "flex min-h-0 min-w-0 flex-col bg-background",
        scrollableBody ? "h-full" : "min-h-full flex-1",
      )}
    >
      {header}
      {body}
    </section>
  );
}
