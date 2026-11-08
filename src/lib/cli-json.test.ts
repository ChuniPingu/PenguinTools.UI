import { describe, expect, it } from "vite-plus/test";
import { formatUnsignedIntegerString, parseCliJsonLine, quoteUnsafeIntegers } from "@/lib/cli-json";

describe("parseCliJsonLine", () => {
  it("preserves the default HCA encryption key digits", () => {
    const raw = '{"type":"result","data":{"config":{"hcaEncryptionKey":32931609366120192}}}';

    const parsed = parseCliJsonLine(raw) as {
      data: { config: { hcaEncryptionKey: string } };
    };
    expect(parsed.data.config.hcaEncryptionKey).toBe("32931609366120192");
  });

  it("leaves safe integers as numbers", () => {
    const parsed = parseCliJsonLine('{"batchSize":8,"selectedReleaseTagId":9007199254740991}') as {
      batchSize: number;
      selectedReleaseTagId: number;
    };
    expect(parsed.batchSize).toBe(8);
    expect(parsed.selectedReleaseTagId).toBe(9007199254740991);
    expect(typeof parsed.selectedReleaseTagId).toBe("number");
  });

  it("does not rewrite integers inside JSON strings", () => {
    const data = {
      path: 'values:32931609366120192, next "quoted" \\folder',
      "[18446744073709551615]": "[-9007199254740992]",
    };
    expect(parseCliJsonLine(JSON.stringify(data))).toEqual(data);
  });

  it("preserves unsigned 64-bit and negative unsafe integers in arrays and at the root", () => {
    expect(parseCliJsonLine("[18446744073709551615,-9007199254740992,9007199254740991]")).toEqual([
      "18446744073709551615",
      "-9007199254740992",
      9007199254740991,
    ]);
    expect(parseCliJsonLine("18446744073709551615")).toBe("18446744073709551615");
  });

  it("keeps decimals and exponent notation numeric", () => {
    const raw = "[1e20,-2E+17,1234567890123456.5,0.25,-0]";
    expect(parseCliJsonLine(raw)).toEqual(JSON.parse(raw));
  });

  it("rejects malformed JSON", () => {
    expect(() => parseCliJsonLine('{"key":18446744073709551615,}')).toThrow();
  });
});

describe("quoteUnsafeIntegers", () => {
  it("quotes only integers outside the safe range", () => {
    expect(quoteUnsafeIntegers('{"a":32931609366120192,"b":42}')).toBe(
      '{"a":"32931609366120192","b":42}',
    );
  });
});

describe("formatUnsignedIntegerString", () => {
  it("keeps string values unchanged", () => {
    expect(formatUnsignedIntegerString("32931609366120192")).toBe("32931609366120192");
  });

  it("stringifies numeric values", () => {
    expect(formatUnsignedIntegerString(42)).toBe("42");
  });
});
