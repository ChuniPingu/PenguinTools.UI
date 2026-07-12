import { type ReactNode } from "react";
import { FieldGroup } from "@/components/ui/field";
import { WorkspaceSection } from "@/components/layout/WorkspaceSection";

export function PropertiesSection({
  title,
  description,
  actions,
  children,
  contentClassName,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
}) {
  return (
    <WorkspaceSection
      title={title}
      description={description}
      actions={actions}
      contentClassName={contentClassName ?? "p-0"}
    >
      <FieldGroup className="gap-0 sm:grid sm:grid-cols-[max-content_minmax(0,1fr)]">
        {children}
      </FieldGroup>
    </WorkspaceSection>
  );
}
