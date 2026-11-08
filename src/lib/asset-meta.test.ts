import { describe, expect, it } from "vite-plus/test";
import { formatAssetMetaDirective } from "@/lib/asset-meta";

describe("formatAssetMetaDirective", () => {
  it("formats each asset kind as a #meta directive with id only", () => {
    expect(formatAssetMetaDirective("stage", { id: 114514, name: "Custom" })).toBe(
      "#meta stage 114514",
    );
    expect(formatAssetMetaDirective("fieldLine", { id: 0, name: "Orange" })).toBe("#meta fline 0");
    expect(formatAssetMetaDirective("genre", { id: 1000, name: "自制譜" })).toBe(
      "#meta genre 1000",
    );
    expect(formatAssetMetaDirective("weTag", { id: 2, name: "狂" })).toBe("#meta wetag 2");
  });
});
