import { describe, expect, it } from "vite-plus/test";
import { nativeDropZoneFrom } from "@/lib/convert-ui";

describe("convert UI state", () => {
  it("resolves the closest target-aware native drop zone", () => {
    const zone = { dataset: { nativeDropZone: "stage-effect-2" } };
    const child = { closest: () => zone } as unknown as Element;
    expect(nativeDropZoneFrom(child)).toBe("stage-effect-2");
    expect(nativeDropZoneFrom(null)).toBeNull();
  });
});
