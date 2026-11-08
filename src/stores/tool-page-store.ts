import { create } from "zustand";
import type { ApplicationEntry, ChartInspectData, OptionScanBook } from "@/lib/cli-results";
import { DEFAULT_CHART_FILE_DISCOVERY } from "@/lib/chart-file-discovery";

export type OptionScanSelection =
  | { kind: "book"; bookIndex: number }
  | { kind: "chart"; bookIndex: number; chartIndex: number };

export interface ExportSettings {
  convertChart: boolean;
  convertAudio: boolean;
  convertJacket: boolean;
  convertBackground: boolean;
  generateEventXml: boolean;
  customReleaseTagXml: boolean;
  customGenre: boolean;
  overrideChartGenre: boolean;
}

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  convertChart: true,
  convertAudio: true,
  convertJacket: true,
  convertBackground: true,
  generateEventXml: true,
  customReleaseTagXml: false,
  customGenre: false,
  overrideChartGenre: true,
};

export const DEFAULT_FIELD_LINE: ApplicationEntry = {
  id: 0,
  name: "Orange",
  data: "オレンジ",
};

export const DEFAULT_RELEASE_TAG: ApplicationEntry = {
  id: 99,
  name: "自制譜",
  data: null,
};

export const DEFAULT_GENRE: ApplicationEntry = {
  id: 1000,
  name: "自制譜",
  data: null,
};

export const DEFAULT_HCA_KEY = "32931609366120192";

interface OptionPageState {
  chartFormatsDirty: boolean;
  scanPreviewOpen: boolean;
  optionPath: string;
  scannedPath: string;
  configPath: string;
  optionName: string;
  chartFileDiscovery: string;
  batchSize: string;
  hcaKey: string;
  ignoreCache: boolean;
  selectedReleaseTagId: string;
  customReleaseTagId: string;
  customReleaseTagTitleName: string;
  selectedGenreId: string;
  customGenreId: string;
  customGenreName: string;
  ultimaEventId: string;
  weEventId: string;
  exportSettings: ExportSettings;
  books: OptionScanBook[];
  selection: OptionScanSelection | null;
  chartFilePaths: string[];
  skippedChartCount: number;
}

interface SongPageState {
  chartPath: string;
  inspectedPath: string;
  data: ChartInspectData | null;
}

interface ChartPageState {
  chartPath: string;
  inspectedPath: string;
  data: ChartInspectData | null;
  songId: string;
  designer: string;
  difficultyId: number;
  mainBpm: string;
  insertBlankMeasure: boolean;
}

interface JacketPageState {
  sourceError: string;
  chartPath: string;
  imagePath: string;
  jacketId: string;
}

interface AudioPageState {
  sourceError: string;
  chartPath: string;
  audioPath: string;
  songId: string;
  previewStart: string;
  previewStop: string;
  manualOffset: string;
  insertBlankMeasure: boolean;
  initialBpm: string;
  initialNumerator: string;
  initialDenominator: string;
  hcaKey: string;
}

interface StagePageState {
  sourceError: string;
  chartPath: string;
  backgroundPath: string;
  stageId: string;
  fieldLine: ApplicationEntry;
  effects: string[];
}

interface ExtractMusicPageState {
  musicXmlPath: string;
  hcaKey: string;
  noAudio: boolean;
  noJacket: boolean;
  chartFormat: "mgxc" | "ugc";
}

type ExtractChartPageState = ChartPageState & { chartFormat: "mgxc" | "ugc" };

export type InspectedPage = "song" | "chart" | "extractChart";

function patchInspectedPage<T extends SongPageState>(current: T, patch: Partial<T>): T {
  const changed =
    patch.chartPath !== undefined && patch.chartPath.trim() !== current.chartPath.trim();
  return { ...current, ...patch, ...(changed ? { inspectedPath: "", data: null } : {}) };
}

interface ExtractAudioPageState {
  audioPath: string;
  hcaKey: string;
}

interface ExtractStagePageState {
  afbPath: string;
}

interface ToolPageStore {
  option: OptionPageState;
  song: SongPageState;
  chart: ChartPageState;
  jacket: JacketPageState;
  audio: AudioPageState;
  stage: StagePageState;
  extractMusic: ExtractMusicPageState;
  extractChart: ExtractChartPageState;
  extractAudio: ExtractAudioPageState;
  extractStage: ExtractStagePageState;
  patchOption: (patch: Partial<OptionPageState>) => void;
  patchSong: (patch: Partial<SongPageState>) => void;
  patchChart: (patch: Partial<ChartPageState>) => void;
  patchJacket: (patch: Partial<JacketPageState>) => void;
  patchAudio: (patch: Partial<AudioPageState>) => void;
  patchStage: (patch: Partial<StagePageState>) => void;
  patchExtractMusic: (patch: Partial<ExtractMusicPageState>) => void;
  patchExtractChart: (patch: Partial<ExtractChartPageState>) => void;
  patchExtractAudio: (patch: Partial<ExtractAudioPageState>) => void;
  patchExtractStage: (patch: Partial<ExtractStagePageState>) => void;
}

export const useToolPageStore = create<ToolPageStore>((set) => ({
  option: {
    chartFormatsDirty: false,
    scanPreviewOpen: false,
    optionPath: "",
    scannedPath: "",
    configPath: "",
    optionName: "AXXX",
    chartFileDiscovery: DEFAULT_CHART_FILE_DISCOVERY,
    batchSize: "8",
    hcaKey: DEFAULT_HCA_KEY,
    ignoreCache: false,
    selectedReleaseTagId: "99",
    customReleaseTagId: "99",
    customReleaseTagTitleName: "自制譜",
    selectedGenreId: "1000",
    customGenreId: "1000",
    customGenreName: "自制譜",
    ultimaEventId: "1000001",
    weEventId: "1000002",
    exportSettings: DEFAULT_EXPORT_SETTINGS,
    books: [],
    selection: null,
    chartFilePaths: [],
    skippedChartCount: 0,
  },
  song: {
    chartPath: "",
    inspectedPath: "",
    data: null,
  },
  chart: {
    chartPath: "",
    inspectedPath: "",
    data: null,
    songId: "",
    designer: "",
    difficultyId: 3,
    mainBpm: "0",
    insertBlankMeasure: false,
  },
  jacket: {
    sourceError: "",
    chartPath: "",
    imagePath: "",
    jacketId: "",
  },
  audio: {
    sourceError: "",
    chartPath: "",
    audioPath: "",
    songId: "",
    previewStart: "0",
    previewStop: "0",
    manualOffset: "0.000000",
    insertBlankMeasure: false,
    initialBpm: "120",
    initialNumerator: "4",
    initialDenominator: "4",
    hcaKey: DEFAULT_HCA_KEY,
  },
  stage: {
    sourceError: "",
    chartPath: "",
    backgroundPath: "",
    stageId: "0",
    fieldLine: DEFAULT_FIELD_LINE,
    effects: ["", "", "", ""],
  },
  extractMusic: {
    chartFormat: "mgxc",
    musicXmlPath: "",
    hcaKey: DEFAULT_HCA_KEY,
    noAudio: false,
    noJacket: false,
  },
  extractChart: {
    chartFormat: "mgxc",
    chartPath: "",
    inspectedPath: "",
    data: null,
    songId: "",
    designer: "",
    difficultyId: 3,
    mainBpm: "0",
    insertBlankMeasure: false,
  },
  extractAudio: {
    audioPath: "",
    hcaKey: DEFAULT_HCA_KEY,
  },
  extractStage: {
    afbPath: "",
  },
  patchOption: (patch) =>
    set((state) => ({
      option: {
        ...state.option,
        ...patch,
        ...(patch.optionPath !== undefined &&
        patch.optionPath.trim() !== state.option.optionPath.trim()
          ? {
              scannedPath: "",
              books: [],
              selection: null,
              chartFilePaths: [],
              configPath: "",
              skippedChartCount: 0,
            }
          : {}),
      },
    })),
  patchSong: (patch) => set((state) => ({ song: patchInspectedPage(state.song, patch) })),
  patchChart: (patch) => set((state) => ({ chart: patchInspectedPage(state.chart, patch) })),
  patchJacket: (patch) => set((state) => ({ jacket: { ...state.jacket, ...patch } })),
  patchAudio: (patch) => set((state) => ({ audio: { ...state.audio, ...patch } })),
  patchStage: (patch) => set((state) => ({ stage: { ...state.stage, ...patch } })),
  patchExtractMusic: (patch) =>
    set((state) => ({ extractMusic: { ...state.extractMusic, ...patch } })),
  patchExtractChart: (patch) =>
    set((state) => ({ extractChart: patchInspectedPage(state.extractChart, patch) })),
  patchExtractAudio: (patch) =>
    set((state) => ({ extractAudio: { ...state.extractAudio, ...patch } })),
  patchExtractStage: (patch) =>
    set((state) => ({ extractStage: { ...state.extractStage, ...patch } })),
}));

export function applyChartInspection(
  page: InspectedPage,
  requestedPath: string,
  data: ChartInspectData | null,
): boolean {
  const current = useToolPageStore.getState()[page];
  if (current.chartPath.trim() !== requestedPath) return false;
  const metadata =
    data && page !== "song"
      ? {
          songId: data.chart.songId == null ? "" : String(data.chart.songId),
          designer: data.chart.designer,
          difficultyId: data.metadata?.difficultyId ?? 3,
          mainBpm: String(data.chart.mainBpm),
          insertBlankMeasure: data.metadata?.bgmEnableBarOffset ?? false,
        }
      : {};
  useToolPageStore.setState({
    [page]: { ...current, ...metadata, inspectedPath: data ? requestedPath : "", data },
  });
  return true;
}
