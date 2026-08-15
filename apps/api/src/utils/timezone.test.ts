import { describe, expect, it } from "vitest";
import { isValidTimezone } from "./timezone.js";

describe("isValidTimezone", () => {
  it("accepts a valid IANA timezone", () => {
    expect(isValidTimezone("America/New_York")).toBe(true);
    expect(isValidTimezone("UTC")).toBe(true);
    expect(isValidTimezone("Asia/Kolkata")).toBe(true);
  });

  it("rejects garbage input", () => {
    expect(isValidTimezone("not-a-timezone")).toBe(false);
    expect(isValidTimezone("GMT+5:30")).toBe(false);
    expect(isValidTimezone("")).toBe(false);
  });
});
