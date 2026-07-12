import { useTranslation } from "react-i18next";
import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import { ErrorPageLayout } from "@/components/errors/ErrorPageLayout";
import { ErrorReloadButton } from "@/components/errors/ErrorReloadButton";
import { t } from "@/i18n";

function getErrorDetails(error: unknown): {
  title: string;
  description: string;
  details?: string;
} {
  if (isRouteErrorResponse(error)) {
    const message =
      typeof error.data === "string"
        ? error.data
        : error.data &&
            typeof error.data === "object" &&
            "message" in error.data &&
            typeof error.data.message === "string"
          ? error.data.message
          : error.statusText;

    return {
      title: `${error.status} ${error.statusText}`.trim(),
      description: message || t("ui.errors.generic.pageLoadDescription"),
    };
  }

  if (error instanceof Error) {
    return {
      title: t("ui.errors.generic.title"),
      description: error.message || t("ui.errors.generic.pageLoadDescription"),
      details: import.meta.env.DEV ? error.stack : undefined,
    };
  }

  if (typeof error === "string") {
    return {
      title: t("ui.errors.generic.title"),
      description: error,
    };
  }

  return {
    title: t("ui.errors.generic.title"),
    description: t("ui.errors.generic.pageLoadDescription"),
  };
}

export function RouteErrorPage() {
  // Subscribe so language changes re-resolve error copy.
  useTranslation();
  const error = useRouteError();
  const { title, description, details } = getErrorDetails(error);

  return (
    <ErrorPageLayout
      title={title}
      description={description}
      details={details}
      actions={<ErrorReloadButton />}
    />
  );
}
