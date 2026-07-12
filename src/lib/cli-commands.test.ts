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
  it("includes WPF chart overrides", () => {
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
    expect(args[args.length - 1]).toBe("18446744073709551615");
  });

  it("only emits populated stage effect slots", () => {
    const args = stageFilesBuildArgs("background.png", "out", {
      stageId: 5,
      effects: ["one.png", "", "three.png", ""],
      notesFieldLineId: 0,
      notesFieldLineName: "Orange",
    });
    expect(args).toContain("--effect-1");
    expect(args).not.toContain("--effect-2");
    expect(args).toContain("--effect-3");
    expect(args).not.toContain("--effect-4");
  });

  it("restores all WPF option build overrides", () => {
    const args = optionBuildArgs("input", "out", {
      chartFileDiscovery: "[ugc, sus]",
      batchSize: 4,
      hcaKey: "32931609366120192",
      generateEventXml: true,
      generateReleaseTagXml: false,
      releaseTagId: 12,
      releaseTagTitleName: "Custom",
      ultimaEventId: 1001,
      weEventId: 1002,
    });

    expect(args).toContain("--chart-file-discovery");
    expect(args).toContain("[ugc, sus]");
    expect(args).toContain("--batch-size");
    expect(args).toContain("--hca-key");
    expect(args).toContain("--generate-event-xml");
    expect(args).toContain("--generate-release-tag-xml");
    expect(args).toContain("--release-tag-id");
    expect(args).toContain("--release-tag-title-name");
    expect(args).toContain("--ultima-event-id");
    expect(args).toContain("--we-event-id");
  });

  it("emits --save-config only when requested", () => {
    expect(optionBuildArgs("input", "out", {})).not.toContain("--save-config");
    expect(optionBuildArgs("input", "out", { saveConfig: true })).toContain("--save-config");
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
  it("builds music extract args with optional overrides", () => {
    expect(
      musicExtractArgs("Music.xml", "out", {
        jacketPath: "jacket.dds",
        acbPath: "music.acb",
        awbPath: "music.awb",
        hcaKey: "32931609366120192",
        noAudio: true,
        noJacket: true,
      }),
    ).toEqual([
      "music",
      "extract",
      "Music.xml",
      "out",
      "--jacket",
      "jacket.dds",
      "--acb",
      "music.acb",
      "--awb",
      "music.awb",
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
