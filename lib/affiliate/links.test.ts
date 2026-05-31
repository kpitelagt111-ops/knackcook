import { describe, expect, it } from "vitest";
import { buildAffiliateUrl, isValidAsin } from "./links";

describe("isValidAsin", () => {
  it("accepts a valid 10-char ASIN", () => {
    expect(isValidAsin("B08XYZ1234")).toBe(true);
  });
  it("rejects lowercase / wrong length", () => {
    expect(isValidAsin("b08xyz1234")).toBe(false);
    expect(isValidAsin("SHORT")).toBe(false);
  });
});

describe("buildAffiliateUrl", () => {
  it("builds a US affiliate url with the tag", () => {
    const url = buildAffiliateUrl("B08XYZ1234", "en");
    expect(url).toMatch(/^https:\/\/www\.amazon\.com\/dp\/B08XYZ1234\?tag=/);
  });

  it("falls back to the default marketplace for unknown locales", () => {
    const url = buildAffiliateUrl("B08XYZ1234", "zz");
    expect(url).toContain("www.amazon.com");
  });

  it("throws on an invalid ASIN", () => {
    expect(() => buildAffiliateUrl("nope", "en")).toThrow();
  });
});
