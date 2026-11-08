import { describe, expect, it } from "vite-plus/test";
import i18n from "@/i18n";
import {
  formatProgressStatusLine,
  operationFromCliArgs,
  progressOperationMessageKey,
  progressSecondaryDetail,
  resolveProgressOperationLabel,
} from "@/lib/cli-progress";

describe("operationFromCliArgs", () => {
  it("maps group and subcommand to dotted operation ids", () => {
    expect(operationFromCliArgs(["music", "build", "chart.mgxc", "out"])).toBe("music.build");
    expect(operationFromCliArgs(["option", "scan", "folder"])).toBe("option.scan");
    expect(operationFromCliArgs(["jacket", "convert-file", "a.png", "out"])).toBe(
      "jacket.convert-file",
    );
  });

  it("maps single-token commands", () => {
    expect(operationFromCliArgs(["info"])).toBe("info");
  });

  it("returns null for empty or flag-only args", () => {
    expect(operationFromCliArgs([])).toBeNull();
    expect(operationFromCliArgs(["--help"])).toBeNull();
  });

  it("uses the group alone when the next token is a flag", () => {
    expect(operationFromCliArgs(["music", "--help"])).toBe("music");
  });
});

describe("progressSecondaryDetail", () => {
  it("prefers label over item", () => {
    expect(progressSecondaryDetail("song.xml", "My Song")).toBe("My Song");
  });

  it("falls back to item when label is missing or blank", () => {
    expect(progressSecondaryDetail("song.xml")).toBe("song.xml");
    expect(progressSecondaryDetail("song.xml", "  ")).toBe("song.xml");
    expect(progressSecondaryDetail(null, null)).toBe("");
  });
});

describe("formatProgressStatusLine", () => {
  it("joins operation and detail with a middle dot", () => {
    expect(formatProgressStatusLine("Building song…", "My Song")).toBe("Building song… · My Song");
  });

  it("returns the operation alone when detail is empty", () => {
    expect(formatProgressStatusLine("Building song…")).toBe("Building song…");
    expect(formatProgressStatusLine("Building song…", "")).toBe("Building song…");
  });
});

describe("progressOperationMessageKey", () => {
  it("builds nested i18n keys from operation ids", () => {
    expect(progressOperationMessageKey("music.build")).toBe("ui.progress.operations.music.build");
    expect(progressOperationMessageKey("jacket.convert-file")).toBe(
      "ui.progress.operations.jacket.convert-file",
    );
  });
});

describe("resolveProgressOperationLabel", () => {
  it("resolves known operations and falls back for unknown ones", async () => {
    await i18n.changeLanguage("en");
    expect(resolveProgressOperationLabel("music.build")).toBe("Building song…");
    expect(resolveProgressOperationLabel("option.scan")).toBe("Scanning option…");
    expect(resolveProgressOperationLabel("stage.extract")).toBe("Extracting stage…");
    expect(resolveProgressOperationLabel("not.a.real.op")).toBe("Working…");
    expect(resolveProgressOperationLabel(null)).toBe("Working…");
  });
});
