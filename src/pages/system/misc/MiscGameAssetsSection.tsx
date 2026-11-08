import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { WorkspaceSection } from "@/components/layout/WorkspaceSection";
import { ReadonlyInputValue } from "./ReadonlyInputValue";

interface MiscGameAssetsSectionProps {
  gameDirectory: string;
  collectDisabled: boolean;
  onCollect: () => void;
}

export function MiscGameAssetsSection({
  gameDirectory,
  collectDisabled,
  onCollect,
}: Readonly<MiscGameAssetsSectionProps>) {
  const { t } = useTranslation();

  return (
    <WorkspaceSection title={t("ui.misc.sections.gameAssets")}>
      <div className="space-y-3">
        {gameDirectory ? (
          <Field>
            <FieldLabel>{t("ui.misc.fields.gameDirectory")}</FieldLabel>
            <ReadonlyInputValue value={gameDirectory} />
          </Field>
        ) : null}
        <Button variant="outline" disabled={collectDisabled} onClick={onCollect}>
          {t("ui.misc.actions.recollectAssets")}
        </Button>
      </div>
    </WorkspaceSection>
  );
}
