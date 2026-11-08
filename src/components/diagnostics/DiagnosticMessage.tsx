import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { MessageDescriptor } from "@/lib/cli-types";
import { diagnosticAssetPath, resolveMessage } from "@/lib/messages";

export function DiagnosticMessage({
  message,
  onNavigate,
  label,
}: Readonly<{ message: MessageDescriptor; onNavigate: () => void; label?: string }>) {
  const { t } = useTranslation();
  const assetPath = diagnosticAssetPath(message);

  return (
    <span className="whitespace-normal break-words">
      {label ?? resolveMessage(message)}
      {assetPath ? (
        <>
          {" "}
          <Link
            to={assetPath}
            className="text-primary underline underline-offset-2 hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2"
            onClick={(event) => {
              event.stopPropagation();
              if (
                event.button === 0 &&
                !event.ctrlKey &&
                !event.metaKey &&
                !event.shiftKey &&
                !event.altKey
              ) {
                onNavigate();
              }
            }}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {t("ui.nav.pages.assets")}
          </Link>
        </>
      ) : null}
    </span>
  );
}
