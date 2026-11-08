import { useTranslation } from "react-i18next";
import { ErrorPageLayout } from "@/components/errors/ErrorPageLayout";
import { ErrorReloadButton } from "@/components/errors/ErrorReloadButton";

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <ErrorPageLayout
      title={t("ui.errors.notFound.title")}
      description={t("ui.errors.notFound.description")}
      actions={<ErrorReloadButton />}
    />
  );
}
