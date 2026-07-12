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
  generateReleaseTagXml: boolean;
}

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  convertChart: true,
  convertAudio: true,
  convertJacket: true,
  convertBackground: true,
  generateEventXml: true,
  generateReleaseTagXml: true,
};

export const DEFAULT_FIELD_LINE: ApplicationEntry = {
  id: 0,
  name: "Orange",
  data: "オレンジ",
};

export const DEFAULT_HCA_KEY = "32931609366120192";

interface OptionPageState {
  optionPath: string;
  scannedPath: string;
  configPath: string;
  optionName: string;
  chartFileDiscovery: string;
  batchSize: string;
  hcaKey: string;
  releaseTagId: string;
  releaseTagTitleName: string;
  ultimaEventId: string;
  weEventId: string;
  exportSettings: ExportSettings;
  books: OptionScanBook[];
  selection: OptionScanSelection | null;
  chartFilePaths: string[];
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
  chartPath: string;
  imagePath: string;
  jacketId: string;
}

interface AudioPageState {
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
  chartPath: string;
  backgroundPath: string;
  stageId: string;
  fieldLine: ApplicationEntry;
  effects: string[];
}

interface ExtractMusicPageState {
  musicXmlPath: string;
  jacketPath: string;
  acbPath: string;
  awbPath: string;
  hcaKey: string;
  noAudio: boolean;
  noJacket: boolean;
}

interface ExtractChartPageState {
  chartPath: string;
  inspectedPath: string;
  data: ChartInspectData | null;
  songId: string;
  designer: string;
  difficultyId: number;
  mainBpm: string;
  insertBlankMeasure: boolean;
}

interface ExtractAudioPageState {
  audioPath: string;
  pairedPath: string;
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
    optionPath: "",
    scannedPath: "",
    configPath: "",
    optionName: "AXXX",
    chartFileDiscovery: DEFAULT_CHART_FILE_DISCOVERY,
    batchSize: "8",
    hcaKey: DEFAULT_HCA_KEY,
    releaseTagId: "99",
    releaseTagTitleName: "自制譜",
    ultimaEventId: "1000001",
    weEventId: "1000002",
    exportSettings: DEFAULT_EXPORT_SETTINGS,
    books: [],
    selection: null,
    chartFilePaths: [],
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
    chartPath: "",
    imagePath: "",
    jacketId: "",
  },
  audio: {
    chartPath: "",
    audioPath: "",
    songId: "",
    previewStart: "0",
    previewStop: "0",
    manualOffset: "0",
    insertBlankMeasure: false,
    initialBpm: "120",
    initialNumerator: "4",
    initialDenominator: "4",
    hcaKey: DEFAULT_HCA_KEY,
  },
  stage: {
    chartPath: "",
    backgroundPath: "",
    stageId: "0",
    fieldLine: DEFAULT_FIELD_LINE,
    effects: ["", "", "", ""],
  },
  extractMusic: {
    musicXmlPath: "",
    jacketPath: "",
    acbPath: "",
    awbPath: "",
    hcaKey: DEFAULT_HCA_KEY,
    noAudio: false,
    noJacket: false,
  },
  extractChart: {
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
    pairedPath: "",
    hcaKey: DEFAULT_HCA_KEY,
  },
  extractStage: {
    afbPath: "",
  },
  patchOption: (patch) => set((state) => ({ option: { ...state.option, ...patch } })),
  patchSong: (patch) => set((state) => ({ song: { ...state.song, ...patch } })),
  patchChart: (patch) => set((state) => ({ chart: { ...state.chart, ...patch } })),
  patchJacket: (patch) => set((state) => ({ jacket: { ...state.jacket, ...patch } })),
  patchAudio: (patch) => set((state) => ({ audio: { ...state.audio, ...patch } })),
  patchStage: (patch) => set((state) => ({ stage: { ...state.stage, ...patch } })),
  patchExtractMusic: (patch) =>
    set((state) => ({ extractMusic: { ...state.extractMusic, ...patch } })),
  patchExtractChart: (patch) =>
    set((state) => ({ extractChart: { ...state.extractChart, ...patch } })),
  patchExtractAudio: (patch) =>
    set((state) => ({ extractAudio: { ...state.extractAudio, ...patch } })),
  patchExtractStage: (patch) =>
    set((state) => ({ extractStage: { ...state.extractStage, ...patch } })),
}));
