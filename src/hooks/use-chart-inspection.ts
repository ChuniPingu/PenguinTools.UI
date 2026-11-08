import { useCallback, useEffect } from "react";
import { usePageTask } from "@/hooks/use-page-task";
import { useFileChangedReload } from "@/hooks/use-file-changed-reload";
import { useTrackedPathWatch } from "@/hooks/use-tracked-path-watch";
import { parseChartInspectData } from "@/lib/cli-results";
import {
  applyChartInspection,
  useToolPageStore,
  type InspectedPage,
} from "@/stores/tool-page-store";

export function useChartInspection(page: InspectedPage) {
  const query = usePageTask(page);
  const { run, setSource, hasAttempted, busy, blocked } = query;
  const { chartPath, inspectedPath } = useToolPageStore((state) => state[page]);
  useEffect(() => setSource(chartPath), [chartPath, setSource]);
  const { fileChangedAt, handleFileChanged, clearFileChanged } = useFileChangedReload({
    enabled: chartPath.trim().length > 0,
    isBusy: busy || blocked,
    onReload: () => inspectChart(),
  });
  const inspectChart = useCallback(() => {
    const path = chartPath.trim();
    if (!path || blocked) return;
    void run({ kind: "chartInspect", path }, (response) => {
      if (applyChartInspection(page, path, parseChartInspectData(response))) clearFileChanged();
    });
  }, [blocked, chartPath, clearFileChanged, page, run]);
  useEffect(() => {
    const path = chartPath.trim();
    if (!path) {
      clearFileChanged();
      return;
    }
    if (blocked || busy || path === inspectedPath || hasAttempted(path)) return;
    inspectChart();
  }, [blocked, busy, chartPath, clearFileChanged, hasAttempted, inspectChart, inspectedPath]);
  useTrackedPathWatch(chartPath, chartPath.trim() ? [chartPath] : [], handleFileChanged);
  return { fileChangedAt, inspectChart, query };
}
