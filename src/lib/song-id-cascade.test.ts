import { describe, expect, it } from "vite-plus/test";
import { applySongIdCascade } from "@/lib/song-id-cascade";

describe("applySongIdCascade", () => {
  it("updates stage and unlock event IDs offset by one million", () => {
    expect(applySongIdCascade(42, 100, "1000042", "1000042")).toEqual({
      stageId: "1000100",
      unlockEventId: "1000100",
    });
  });

  it("leaves unrelated IDs unchanged", () => {
    expect(applySongIdCascade(42, 100, "999", "1000042")).toEqual({
      stageId: "999",
      unlockEventId: "1000100",
    });
  });

  it("returns the original values when song IDs are missing", () => {
    expect(applySongIdCascade(null, 100, "1000042", "1000042")).toEqual({
      stageId: "1000042",
      unlockEventId: "1000042",
    });
  });
});
