import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AssetOnboardingDialogProps {
  open: boolean;
  busy: boolean;
  onBrowse: () => Promise<void>;
  onSkip: () => void;
}

export function AssetOnboardingDialog({
  open,
  busy,
  onBrowse,
  onSkip,
}: AssetOnboardingDialogProps) {
  const { t } = useTranslation();
  const [error, setError] = useState("");

  const handleBrowse = async () => {
    setError("");
    try {
      await onBrowse();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("ui.onboarding.title")}</DialogTitle>
          <DialogDescription>{t("ui.onboarding.description")}</DialogDescription>
        </DialogHeader>
        {error ? <p className="px-4 pb-4 text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onSkip}>
            {t("ui.common.actions.skip")}
          </Button>
          <Button disabled={busy} onClick={() => void handleBrowse()}>
            {busy ? t("ui.onboarding.collecting") : t("ui.onboarding.browseGameFolder")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
