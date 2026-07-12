import type { ExportSettings } from "@/stores/tool-page-store";

/** Matches WPF OptionModel.CanExecute. */
export function optionBuildCanExecute(settings: ExportSettings): boolean {
  return (
    settings.convertChart ||
    settings.convertAudio ||
    settings.convertJacket ||
    settings.convertBackground ||
    settings.generateEventXml
  );
}
