import { describe, expect, it } from "vite-plus/test";
import {
  filterDecimalInput,
  filterIntegerInput,
  filterUppercaseAlphanumericInput,
} from "@/lib/numeric-input";

describe("filterIntegerInput", () => {
  it("removes non-digit characters", () => {
    expect(filterIntegerInput("123")).toBe("123");
    expect(filterIntegerInput("12a3")).toBe("123");
    expect(filterIntegerInput("abc")).toBe("");
    expect(filterIntegerInput("-12.3")).toBe("123");
  });
});

describe("filterUppercaseAlphanumericInput", () => {
  it("keeps uppercase letters and digits", () => {
    expect(filterUppercaseAlphanumericInput("ab12")).toBe("AB12");
    expect(filterUppercaseAlphanumericInput("a-b_c", 4)).toBe("ABC");
    expect(filterUppercaseAlphanumericInput("toolong", 4)).toBe("TOOL");
  });
});

describe("filterDecimalInput", () => {
  it("keeps valid decimal fragments", () => {
    expect(filterDecimalInput("12.34")).toBe("12.34");
    expect(filterDecimalInput("-0.5")).toBe("-0.5");
    expect(filterDecimalInput("1.2.3")).toBe("1.23");
    expect(filterDecimalInput("a-1b2.c3d")).toBe("-12.3");
    expect(filterDecimalInput(".")).toBe(".");
    expect(filterDecimalInput("-")).toBe("-");
  });
});
