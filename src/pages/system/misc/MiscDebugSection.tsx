import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { WorkspaceSection } from "@/components/layout/WorkspaceSection";
import { DiagnosticsPanel } from "@/components/diagnostics/DiagnosticsPanel";
import { ALL_MESSAGE_DIAGNOSTICS } from "@/lib/debug-diagnostics";

interface MiscDebugSectionProps {
  onForceError: () => void;
}

export function MiscDebugSection({ onForceError }: Readonly<MiscDebugSectionProps>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <WorkspaceSection title={t("ui.misc.sections.debug")}>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          {t("ui.misc.actions.showDiagnostics")}
        </Button>
        <Button variant="destructive" onClick={onForceError}>
          {t("ui.misc.actions.forceError")}
        </Button>
      </div>
      <DiagnosticsPanel
        open={open}
        diagnostics={ALL_MESSAGE_DIAGNOSTICS}
        onClose={() => setOpen(false)}
      />
    </WorkspaceSection>
  );
}
