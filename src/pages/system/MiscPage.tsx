import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { openPath } from "@tauri-apps/plugin-opener";
import {
  ChevronRightIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  FolderOpenIcon,
  RefreshCwIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { WorkspaceSection } from "@/components/layout/WorkspaceSection";
import { ThemeSettingField } from "@/components/theme/ThemeSettingField";
import { LanguageSettingField } from "@/components/i18n/LanguageSettingField";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";
import { useAppUpdate } from "@/contexts/AppUpdateContext";
import { useAssetCatalog } from "@/contexts/AssetCatalogContext";
import { assetCollectArgs } from "@/lib/cli-commands";
import { formatBuildTimestamp, parseCliInfoResult, type CliInfoData } from "@/lib/cli-results";
import type { UpdateStatus } from "@/lib/app-updater";
import { pickPath } from "@/lib/file-picker";
import { userAssetsPath } from "@/lib/asset-catalog";
import { getRuntimeInfo, isTauriRuntime, type RuntimeInfo } from "@/lib/tauri-cli";
import { loadUiSettings, saveUiSettings } from "@/lib/ui-settings";

export function MiscPage() {
  const { t } = useTranslation();
  const { notifyError, notifyInfo, runtimeInfo, runCliCommand, isBusy } = useApp();
  const {
    status: updateStatus,
    availableUpdate,
    progress: updateProgress,
    updateBusy,
    checkForUpdates,
    installUpdate,
  } = useAppUpdate();
  const { catalog, refresh } = useAssetCatalog();
  const [localRuntimeInfo, setLocalRuntimeInfo] = useState<RuntimeInfo | null>(null);
  const [runtimeLoadFailed, setRuntimeLoadFailed] = useState(false);
  const [cliInfo, setCliInfo] = useState<CliInfoData | null>(null);
  const [gameDirectory, setGameDirectory] = useState("");
  const [forceError, setForceError] = useState(false);
  const [previewUpdateNotes, setPreviewUpdateNotes] = useState(false);
  const hasFetchedCliInfo = useRef(false);
  const info = runtimeInfo ?? localRuntimeInfo;
  const isBrowserPreview = !isTauriRuntime();

  const refreshCliInfo = useCallback(async () => {
    const response = await runCliCommand(["info"]);
    if (!response) return;

    const parsed = parseCliInfoResult(response);
    if (parsed) {
      setCliInfo(parsed);
    }
  }, [runCliCommand]);

  useEffect(() => {
    if (isBrowserPreview) return;

    if (runtimeInfo) {
      setLocalRuntimeInfo(null);
      setRuntimeLoadFailed(false);
      void loadUiSettings(runtimeInfo.userDataDir).then((settings) => {
        setGameDirectory(settings.gameDirectory);
      });
      return;
    }

    setRuntimeLoadFailed(false);
    void getRuntimeInfo()
      .then((nextInfo) => {
        setLocalRuntimeInfo(nextInfo);
      })
      .catch(() => setRuntimeLoadFailed(true));
  }, [isBrowserPreview, runtimeInfo]);

  useEffect(() => {
    if (isBrowserPreview || !info || hasFetchedCliInfo.current) return;

    hasFetchedCliInfo.current = true;
    void refreshCliInfo();
  }, [isBrowserPreview, info, refreshCliInfo]);

  const openDirectory = async (path: string | undefined, label: string) => {
    if (!isTauriRuntime()) {
      notifyInfo(t("ui.misc.notify.directoryTauriOnly"));
      return;
    }
    if (!path) {
      notifyError(t("ui.misc.errors.pathUnavailable", { label }));
      return;
    }

    try {
      await openPath(path);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleAssetCollect = async () => {
    if (!isTauriRuntime() || !runtimeInfo) {
      notifyInfo(t("ui.misc.notify.assetCollectTauriOnly"));
      return;
    }

    const gameRoot = await pickPath({
      mode: "folder",
      defaultPath: gameDirectory || undefined,
    });
    if (!gameRoot) return;

    const output = userAssetsPath(runtimeInfo.userDataDir);
    const response = await runCliCommand(assetCollectArgs(gameRoot, output));
    if (!response?.success) return;
    await saveUiSettings(runtimeInfo.userDataDir, { gameDirectory: gameRoot });
    setGameDirectory(gameRoot);
    await refresh();
  };

  if (forceError) {
    throw new Error("Debug: forced render error from Misc page.");
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const updateStatusMessage = (() => {
    if (isBrowserPreview) return t("ui.misc.updates.tauriOnly");
    switch (updateStatus) {
      case "checking":
        return t("ui.misc.updates.status.checking");
      case "available":
        return t("ui.misc.updates.status.available", {
          version: availableUpdate?.version ?? "",
        });
      case "upToDate":
        return t("ui.misc.updates.status.upToDate");
      case "downloading":
        return t("ui.misc.updates.status.downloading", {
          downloaded: formatBytes(updateProgress?.downloaded ?? 0),
          total:
            updateProgress?.contentLength != null
              ? formatBytes(updateProgress.contentLength)
              : t("ui.common.unknown"),
        });
      case "waitingForJob":
        return t("ui.misc.updates.status.waitingForJob");
      case "installing":
        return t("ui.misc.updates.status.installing");
      case "error":
        return t("ui.misc.updates.status.error");
      default:
        return null;
    }
  })();

  const updateNotes = availableUpdate?.body ?? (previewUpdateNotes ? SAMPLE_UPDATE_NOTES : null);

  return (
    <ScrollArea className="h-full">
      <main className="w-full">
        <div>
          <WorkspaceSection title={t("ui.settings.appearance.title")}>
            <FieldGroup>
              <ThemeSettingField />
              <LanguageSettingField />
            </FieldGroup>
          </WorkspaceSection>

          <WorkspaceSection
            title={t("ui.misc.sections.runtime")}
            actions={
              <Button
                type="button"
                variant="outline"
                disabled={isBusy || isBrowserPreview || !info}
                onClick={() => void refreshCliInfo()}
              >
                <RefreshCwIcon className="size-4" />
                {t("ui.misc.actions.refresh")}
              </Button>
            }
          >
            {isBrowserPreview ? (
              <p className="text-sm text-muted-foreground">{t("ui.misc.runtime.browserPreview")}</p>
            ) : runtimeLoadFailed ? (
              <p className="text-sm text-destructive">{t("ui.misc.runtime.unavailable")}</p>
            ) : !info ? (
              <p className="text-sm text-muted-foreground">{t("ui.misc.runtime.loading")}</p>
            ) : (
              <div className="space-y-4">
                <div className="flex min-w-0 gap-3">
                  <RuntimeInfoCard
                    label={t("ui.misc.runtime.labels.appVersion")}
                    value={info.version}
                  />
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
                    value={cliInfo?.version ?? t("ui.common.loading")}
                  />
                  <RuntimeInfoCard
                    label={t("ui.misc.runtime.labels.cliBuildDate")}
                    value={
                      cliInfo ? formatBuildTimestamp(cliInfo.buildDateUtc) : t("ui.common.loading")
                    }
                  />
                </div>
                <RuntimePathsSection
                  onOpenDirectory={(path, label) => void openDirectory(path, label)}
                  paths={[
                    { label: t("ui.misc.runtime.labels.cli"), path: info.cliExe },
                    { label: t("ui.misc.directoryLabels.userData"), path: info.userDataDir },
                    { label: t("ui.misc.directoryLabels.assets"), path: info.assetsDir },
                    { label: t("ui.misc.directoryLabels.temp"), path: info.tempDir },
                  ]}
                />
              </div>
            )}
          </WorkspaceSection>

          <WorkspaceSection title={t("ui.misc.updates.title")}>
            <div className="space-y-4">
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isBrowserPreview || updateBusy}
                    onClick={() => void checkForUpdates()}
                  >
                    {t("ui.misc.actions.checkForUpdates")}
                  </Button>
                  {updateStatus === "available" ? (
                    <Button
                      type="button"
                      disabled={updateBusy}
                      onClick={() => void installUpdate()}
                    >
                      {t("ui.misc.actions.installUpdate")}
                    </Button>
                  ) : null}
                </div>
                {updateStatusMessage ? (
                  <UpdateStatusBadge status={updateStatus} message={updateStatusMessage} />
                ) : null}
              </div>
              {updateNotes ? (
                <div className="rounded-lg border border-border/70 bg-muted/30 px-3.5 py-3">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {t("ui.misc.updates.notes")}
                  </p>
                  <div className="mt-2 max-h-40 overflow-y-auto">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                      {updateNotes}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </WorkspaceSection>

          <WorkspaceSection title={t("ui.misc.sections.gameAssets")}>
            <div className="space-y-3">
              {catalog.hasUserAssets ? (
                <p className="text-sm">
                  {t("ui.misc.catalog.summary", {
                    genres: catalog.genreNames.length,
                    stages: catalog.stageNames.length,
                    fieldLines: catalog.fieldLines.length,
                  })}
                </p>
              ) : null}
              {gameDirectory ? (
                <Field>
                  <FieldLabel>{t("ui.misc.fields.gameDirectory")}</FieldLabel>
                  <ReadonlyInputValue value={gameDirectory} />
                </Field>
              ) : null}
              <Button variant="outline" disabled={isBusy} onClick={() => void handleAssetCollect()}>
                {t("ui.misc.actions.recollectAssets")}
              </Button>
            </div>
          </WorkspaceSection>

          {import.meta.env.DEV ? (
            <WorkspaceSection title={t("ui.misc.sections.debug")}>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPreviewUpdateNotes((open) => !open)}
                >
                  {previewUpdateNotes
                    ? t("ui.misc.actions.hideUpdateNotesPreview")
                    : t("ui.misc.actions.previewUpdateNotes")}
                </Button>
                <Button variant="destructive" onClick={() => setForceError(true)}>
                  {t("ui.misc.actions.forceError")}
                </Button>
              </div>
            </WorkspaceSection>
          ) : null}
        </div>
      </main>
    </ScrollArea>
  );
}

const SAMPLE_UPDATE_NOTES = `• NSIS installer and R2 auto-update
• Run CLI tools in place from the install runtime folder
• Wait for in-progress jobs before applying updates
• Misc page update controls and release notes panel

Longer notes scroll inside the panel so the layout stays compact while still showing multi-line release text.`;

function UpdateStatusBadge({ status, message }: { status: UpdateStatus; message: string }) {
  const busy =
    status === "checking" ||
    status === "downloading" ||
    status === "waitingForJob" ||
    status === "installing";

  return (
    <p
      className={cn(
        "inline-flex min-w-0 max-w-full items-center gap-1.5 text-sm",
        status === "error"
          ? "text-destructive"
          : status === "available"
            ? "text-foreground"
            : "text-muted-foreground",
      )}
    >
      {busy ? (
        <Spinner className="size-3.5 shrink-0" />
      ) : status === "error" ? (
        <CircleAlertIcon className="size-3.5 shrink-0" />
      ) : status === "upToDate" || status === "available" ? (
        <CircleCheckIcon className="size-3.5 shrink-0" />
      ) : null}
      <span className="min-w-0">{message}</span>
    </p>
  );
}

function RuntimePathsSection({
  paths,
  onOpenDirectory,
}: {
  paths: Array<{ label: string; path: string }>;
  onOpenDirectory: (path: string, label: string) => void;
}) {
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

function RuntimeInfoCard({ label, value }: { label: string; value: string }) {
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
}: {
  label: string;
  path: string;
  onOpen: () => void;
}) {
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

function ReadonlyInputValue({ value, className }: { value: string; className?: string }) {
  return (
    <div
      title={value}
      className={cn(
        "flex h-8 min-h-8 w-full min-w-0 cursor-text items-center truncate rounded-lg border border-input bg-input/50 px-2.5 font-mono text-xs opacity-50 select-text dark:bg-input/80",
        className,
      )}
    >
      {value}
    </div>
  );
}
