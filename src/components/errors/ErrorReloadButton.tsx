import { RefreshCwIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export function ErrorReloadButton() {
  const { t } = useTranslation();

  return (
    <Button variant="outline" onClick={() => window.location.reload()}>
      <RefreshCwIcon className="size-4" />
      {t("ui.common.actions.reload")}
    </Button>
  );
}
