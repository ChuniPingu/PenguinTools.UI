import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { HelpHint, type MetadataHelpKind } from "@/components/convert/HelpHint";
import { WorkspaceSection } from "@/components/layout/WorkspaceSection";
import { cn } from "@/lib/utils";

export function InspectorPanel({
  title,
  subtitle,
  standardHeading = false,
  children,
}: {
  title: string;
  subtitle?: string;
  standardHeading?: boolean;
  children: ReactNode;
}) {
  if (standardHeading) {
    return (
      <WorkspaceSection
        title={title}
        description={subtitle}
        className="min-h-full min-w-0 bg-background"
        contentClassName="p-0"
      >
        {children}
      </WorkspaceSection>
    );
  }

  return (
    <section className="min-h-full min-w-0 bg-background">
      <header className="flex min-h-14 flex-col justify-center border-b px-4 py-2.5">
        <h3 className="font-heading text-sm font-medium">{title}</h3>
        {subtitle ? (
          <p className="truncate text-xs/relaxed text-muted-foreground">{subtitle}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

export function InspectorSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b px-4 py-3.5 last:border-b-0">
      <h4 className="mb-2 font-heading text-xs/relaxed font-medium text-muted-foreground">
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
}: {
  label: string;
  value: ReactNode;
  description?: string;
  metadataHelp?: MetadataHelpKind;
  mono?: boolean;
}) {
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
          "min-w-0 break-words text-xs/relaxed font-normal [font-variant-numeric:tabular-nums]",
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
  children,
}: {
  title: string;
  subtitle?: string;
  standardHeading?: boolean;
  children: ReactNode;
}) {
  return (
    <InspectorPanel title={title} subtitle={subtitle} standardHeading={standardHeading}>
      <div className="flex min-h-[22rem] items-center justify-center px-8 text-center">
        <p className="max-w-md text-sm text-muted-foreground">{children}</p>
      </div>
    </InspectorPanel>
  );
}
