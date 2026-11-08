import { XIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { pickPath, type PickOptions } from "@/lib/file-picker";
import { isTauriRuntime } from "@/lib/tauri-cli";

interface FileFolderPickerProps extends PickOptions {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function FileFolderPicker({
  label,
  value,
  onChange,
  historyKey,
  mode = "file",
  filters,
  defaultPath,
  disabled = false,
}: Readonly<FileFolderPickerProps>) {
  const { t } = useTranslation();
  const canClear = value.trim().length > 0;
  const placeholder =
    mode === "folder" ? t("ui.filePicker.placeholder.folder") : t("ui.filePicker.placeholder.file");

  const handleBrowse = async () => {
    if (!isTauriRuntime()) return;

    const selected = await pickPath({
      historyKey,
      mode,
      filters,
      defaultPath: defaultPath || value || undefined,
    });
    if (selected) {
      onChange(selected);
    }
  };

  return (
    <Field>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <div className="flex min-w-0 gap-2">
        <Input
          className="min-w-0 flex-1"
          readOnly
          value={value}
          placeholder={placeholder}
          disabled={disabled}
        />
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          disabled={disabled || !isTauriRuntime()}
          onClick={() => void handleBrowse()}
        >
          {t("ui.common.actions.browse")}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="shrink-0"
          disabled={disabled || !canClear}
          onClick={() => onChange("")}
        >
          <XIcon />
          <span className="sr-only">{t("ui.filePicker.clearAriaLabel", { label })}</span>
        </Button>
      </div>
    </Field>
  );
}
