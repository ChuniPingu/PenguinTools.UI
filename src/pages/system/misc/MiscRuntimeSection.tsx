import { useTranslation } from "react-i18next";
import { ChevronRightIcon, FolderOpenIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { WorkspaceSection } from "@/components/layout/WorkspaceSection";
import { formatBuildTimestamp, type CliInfoData } from "@/lib/cli-results";
import type { RuntimeInfo } from "@/lib/tauri-cli";
import { ReadonlyInputValue } from "./ReadonlyInputValue";

function RuntimeInfoCard({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Card size="sm" className="min-w-0 flex-1 gap-1.5 py-3">
      <div className="min-w-0 px-(--card-spacing)">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 truncate text-sm font-medium" title={value}>
          {value}
        </p>
      </div>
    </Card>
  );
}

function RuntimePathRow({
  label,
  path,
  onOpen,
}: Readonly<{
  label: string;
  path: string;
  onOpen: () => void;
}>) {
  const { t } = useTranslation();

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex min-w-0 gap-2">
        <ReadonlyInputValue value={path} className="min-w-0 flex-1" />
        <Button type="button" variant="outline" className="shrink-0" onClick={onOpen}>
          <FolderOpenIcon className="size-3.5" />
          {t("ui.misc.actions.open")}
        </Button>
      </div>
    </Field>
  );
}

function RuntimePathsSection({
  paths,
  onOpenDirectory,
}: Readonly<{
  paths: Array<{ label: string; path: string }>;
  onOpenDirectory: (path: string, label: string) => void;
}>) {
  const { t } = useTranslation();

  return (
    <Collapsible defaultOpen={false}>
      <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-lg px-1 py-2 text-left text-sm font-medium hover:bg-muted/50">
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[panel-open]:rotate-90" />
        <span>{t("ui.misc.runtime.paths")}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="data-closed:hidden">
        <FieldGroup className="gap-4 pt-3">
          {paths.map((entry) => (
            <RuntimePathRow
              key={entry.label}
              label={entry.label}
              path={entry.path}
              onOpen={() => onOpenDirectory(entry.path, entry.label)}
            />
          ))}
        </FieldGroup>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface MiscRuntimeSectionProps {
  info: RuntimeInfo | null;
  cliInfo: CliInfoData | null;
  cliInfoLoadFailed: boolean;
  isBrowserPreview: boolean;
  runtimeLoadFailed: boolean;
  refreshDisabled: boolean;
  onRefresh: () => void;
  onOpenDirectory: (path: string, label: string) => void;
}

function RuntimeDetails({
  info,
  cliInfo,
  cliInfoLoadFailed,
  isBrowserPreview,
  runtimeLoadFailed,
  onOpenDirectory,
}: Readonly<
  Pick<
    MiscRuntimeSectionProps,
    | "info"
    | "cliInfo"
    | "cliInfoLoadFailed"
    | "isBrowserPreview"
    | "runtimeLoadFailed"
    | "onOpenDirectory"
  >
>) {
  const { t } = useTranslation();
  if (isBrowserPreview) {
    return <p className="text-sm text-muted-foreground">{t("ui.misc.runtime.browserPreview")}</p>;
  }
  if (runtimeLoadFailed) {
    return <p className="text-sm text-destructive">{t("ui.misc.runtime.unavailable")}</p>;
  }
  if (!info) {
    return <p className="text-sm text-muted-foreground">{t("ui.misc.runtime.loading")}</p>;
  }
  const cliInfoPlaceholder = t(
    cliInfoLoadFailed ? "ui.misc.runtime.cliUnavailable" : "ui.common.loading",
  );
  return (
    <>
      <div className="flex min-w-0 gap-3">
        <RuntimeInfoCard label={t("ui.misc.runtime.labels.appVersion")} value={info.version} />
        <RuntimeInfoCard
          label={t("ui.misc.runtime.labels.appBuildDate")}
          value={
            info.buildDateUtc === "unknown"
              ? t("ui.common.unknown")
              : formatBuildTimestamp(info.buildDateUtc)
          }
        />
        <RuntimeInfoCard
          label={t("ui.misc.runtime.labels.cliVersion")}
          value={cliInfo?.version ?? cliInfoPlaceholder}
        />
        <RuntimeInfoCard
          label={t("ui.misc.runtime.labels.cliBuildDate")}
          value={cliInfo ? formatBuildTimestamp(cliInfo.buildDateUtc) : cliInfoPlaceholder}
        />
      </div>
      <RuntimePathsSection
        onOpenDirectory={onOpenDirectory}
        paths={[
          { label: t("ui.misc.runtime.labels.cli"), path: info.cliExe },
          { label: t("ui.misc.directoryLabels.userData"), path: info.userDataDir },
          { label: t("ui.misc.directoryLabels.assets"), path: info.assetsDir },
          { label: t("ui.misc.directoryLabels.temp"), path: info.tempDir },
        ]}
      />
    </>
  );
}

export function MiscRuntimeSection({
  info,
  cliInfo,
  cliInfoLoadFailed,
  isBrowserPreview,
  runtimeLoadFailed,
  refreshDisabled,
  onRefresh,
  onOpenDirectory,
}: Readonly<MiscRuntimeSectionProps>) {
  const { t } = useTranslation();

  return (
    <WorkspaceSection
      title={t("ui.misc.sections.runtime")}
      actions={
        <Button type="button" variant="outline" disabled={refreshDisabled} onClick={onRefresh}>
          <RefreshCwIcon className="size-4" />
          {t("ui.misc.actions.refresh")}
        </Button>
      }
    >
      <div className="space-y-4">
        <RuntimeDetails
          info={info}
          cliInfo={cliInfo}
          cliInfoLoadFailed={cliInfoLoadFailed}
          isBrowserPreview={isBrowserPreview}
          runtimeLoadFailed={runtimeLoadFailed}
          onOpenDirectory={onOpenDirectory}
        />
      </div>
    </WorkspaceSection>
  );
}
