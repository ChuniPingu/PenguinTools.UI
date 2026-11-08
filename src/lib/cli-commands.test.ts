import { describe, expect, it } from "vite-plus/test";
import {
  audioExtractArgs,
  audioFileConvertArgs,
  chartConvertArgs,
  musicExtractArgs,
  optionBuildArgs,
  optionScanArgs,
  stageFilesBuildArgs,
} from "@/lib/cli-commands";

describe("direct convert CLI arguments", () => {
  it("includes chart overrides", () => {
    expect(
      chartConvertArgs("input.mgxc", "output.c2s", {
        songId: 12,
        designer: "Designer Name",
        difficultyId: 3,
        mainBpm: 180.5,
        insertBlankMeasure: true,
      }),
    ).toEqual([
      "chart",
      "convert",
      "input.mgxc",
      "output.c2s",
      "--song-id",
      "12",
      "--designer",
      "Designer Name",
      "--difficulty-id",
      "3",
      "--display-bpm",
      "180.5",
      "--insert-blank-measure",
    ]);
    expect(chartConvertArgs("input.mgxc", "output.c2s", { insertBlankMeasure: false })).toContain(
      "--no-insert-blank-measure",
    );
  });

  it("keeps the unsigned HCA key as an exact string", () => {
    const args = audioFileConvertArgs("song.mp3", "out", {
      songId: 1,
      previewStart: 0,
      previewStop: 10,
      manualOffset: 0,
      insertBlankMeasure: false,
      initialBpm: 120,
      initialNumerator: 4,
      initialDenominator: 4,
      hcaKey: "18446744073709551615",
    });
    expect(args).toEqual([
      "audio",
      "convert-file",
      "song.mp3",
      "out",
      "--song-id",
      "1",
      "--preview-start",
      "0",
      "--preview-stop",
      "10",
      "--manual-offset",
      "0",
      "--initial-bpm",
      "120",
      "--initial-numerator",
      "4",
      "--initial-denominator",
      "4",
      "--hca-key",
      "18446744073709551615",
    ]);
  });

  it("only emits populated stage effect slots", () => {
    const args = stageFilesBuildArgs("background.png", "out", {
      stageId: 5,
      effects: ["one.png", "", "three.png", ""],
      notesFieldLineId: 0,
      notesFieldLineName: "Orange",
    });
    expect(args).toEqual([
      "stage",
      "build-files",
      "background.png",
      "out",
      "--stage-id",
      "5",
      "--notes-field-line-id",
      "0",
      "--notes-field-line-name",
      "Orange",
      "--effect-1",
      "one.png",
      "--effect-3",
      "three.png",
    ]);
  });

  it("emits option build overrides with their exact values", () => {
    const args = optionBuildArgs("input", "out", {
      chartFileDiscovery: "[ugc, sus]",
      batchSize: 4,
      hcaKey: "32931609366120192",
      generateEventXml: true,
      customReleaseTagXml: false,
      selectedReleaseTagId: 12,
      customReleaseTagId: 99,
      customReleaseTagTitleName: "自制譜",
      customGenre: false,
      selectedGenreId: 1000,
      customGenreId: 1000,
      customGenreName: "自制譜",
      overrideChartGenre: true,
      ultimaEventId: 1001,
      weEventId: 1002,
    });

    expect(args).toEqual([
      "option",
      "build",
      "input",
      "out",
      "--chart-file-discovery",
      "[ugc, sus]",
      "--batch-size",
      "4",
      "--hca-key",
      "32931609366120192",
      "--generate-event-xml",
      "true",
      "--custom-release-tag-xml",
      "false",
      "--selected-release-tag-id",
      "12",
      "--custom-release-tag-id",
      "99",
      "--custom-release-tag-title-name",
      "自制譜",
      "--custom-genre",
      "false",
      "--selected-genre-id",
      "1000",
      "--custom-genre-id",
      "1000",
      "--custom-genre-name",
      "自制譜",
      "--override-chart-genre",
      "true",
      "--ultima-event-id",
      "1001",
      "--we-event-id",
      "1002",
    ]);
  });

  it("emits --save-config only when requested", () => {
    expect(optionBuildArgs("input", "out", {})).not.toContain("--save-config");
    expect(optionBuildArgs("input", "out", { saveConfig: true })).toContain("--save-config");
  });

  it("emits --ignore-cache only when requested", () => {
    expect(optionBuildArgs("input", "out", {})).not.toContain("--ignore-cache");
    expect(optionBuildArgs("input", "out", { ignoreCache: true })).toContain("--ignore-cache");
  });

  it("saves option scan settings only when requested", () => {
    expect(
      optionScanArgs("input", { chartFileDiscovery: "[ugc, mgxc]", saveConfig: true }),
    ).toEqual([
      "option",
      "scan",
      "input",
      "--chart-file-discovery",
      "[ugc, mgxc]",
      "--save-config",
    ]);
    expect(optionScanArgs("input", { chartFileDiscovery: "[ugc, mgxc]" })).not.toContain(
      "--save-config",
    );
  });

  it("omits discovery and batch size when preferring folder config", () => {
    expect(optionScanArgs("input", {})).toEqual(["option", "scan", "input"]);
    expect(optionScanArgs("input", { saveConfig: true })).toEqual([
      "option",
      "scan",
      "input",
      "--save-config",
    ]);
  });
});

describe("extract CLI arguments", () => {
  it("selects UGC for music extraction", () => {
    expect(musicExtractArgs("Music.xml", "out", { chartFormat: "ugc" })).toEqual([
      "music",
      "extract",
      "Music.xml",
      "out",
      "--chart-format",
      "ugc",
    ]);
  });
  it("builds music extract args with optional settings", () => {
    expect(
      musicExtractArgs("Music.xml", "out", {
        hcaKey: "32931609366120192",
        noAudio: true,
        noJacket: true,
      }),
    ).toEqual([
      "music",
      "extract",
      "Music.xml",
      "out",
      "--hca-key",
      "32931609366120192",
      "--no-audio",
      "--no-jacket",
    ]);
    expect(musicExtractArgs("Music.xml", "out")).toEqual(["music", "extract", "Music.xml", "out"]);
  });

  it("builds audio extract args with paired input and HCA key", () => {
    expect(
      audioExtractArgs("music.acb", "out", {
        pairedInput: "music.awb",
        hcaKey: "18446744073709551615",
      }),
    ).toEqual([
      "audio",
      "extract",
      "music.acb",
      "out",
      "--paired-input",
      "music.awb",
      "--hca-key",
      "18446744073709551615",
    ]);
  });
});
