import { useTranslation } from "react-i18next";
import { TerminalOutput } from "@/components/output/TerminalOutput";
import { useCliOutputStore } from "@/stores/cli-output-store";

export function CliOutput({ showPrompt }: Readonly<{ showPrompt: boolean }>) {
  const { t } = useTranslation();
  const lines = useCliOutputStore((state) => state.lines);
  const truncated = useCliOutputStore((state) => state.truncated);
  return (
    <>
      {truncated && (
        <p className="px-4 py-1 text-xs text-muted-foreground">
          {t("ui.statusBar.outputTruncated")}
        </p>
      )}
      <TerminalOutput
        lines={lines}
        autoScroll
        showPrompt={showPrompt}
        className="min-h-0 flex-1 rounded-none border-0"
      />
    </>
  );
}
