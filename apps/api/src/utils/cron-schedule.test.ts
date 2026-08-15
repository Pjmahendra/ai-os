import { describe, expect, it } from "vitest";
import { normalizeCronSchedule } from "./cron-schedule.js";

describe("normalizeCronSchedule", () => {
  it("returns nothing when neither field is provided", () => {
    expect(
      normalizeCronSchedule(undefined, undefined)
    ).toEqual({});
  });

  it("passes through an already-valid 5-field cron expression", () => {
    expect(
      normalizeCronSchedule("cron", "0 9 * * *")
    ).toEqual({
      scheduleType: "cron",
      schedule: "0 9 * * *"
    });
  });

  it("rejects a cron schedule that isn't 5 fields", () => {
    expect(() =>
      normalizeCronSchedule("cron", "not a cron")
    ).toThrow('Invalid cron schedule "not a cron"');
  });

  it("rejects a cron schedule with only 4 fields", () => {
    expect(() =>
      normalizeCronSchedule("cron", "0 9 * *")
    ).toThrow("Expected 5 fields");
  });

  it("converts a daily HH:MM schedule into 5-field cron", () => {
    expect(
      normalizeCronSchedule("daily", "08:30")
    ).toEqual({
      scheduleType: "cron",
      schedule: "30 8 * * *"
    });
  });

  it("rejects an invalid daily time", () => {
    expect(() =>
      normalizeCronSchedule("daily", "25:99")
    ).toThrow('Invalid daily schedule "25:99"');
  });

  it("rejects an unsupported scheduleType", () => {
    expect(() =>
      normalizeCronSchedule("weekly", "0 9 * * *")
    ).toThrow('Unsupported scheduleType "weekly"');
  });

  it("infers cron when scheduleType is omitted but schedule is a valid 5-field expression", () => {
    expect(
      normalizeCronSchedule(undefined, "0 18 * * *")
    ).toEqual({
      scheduleType: "cron",
      schedule: "0 18 * * *"
    });
  });

  it("rejects a schedule without scheduleType that isn't a valid cron expression", () => {
    expect(() =>
      normalizeCronSchedule(undefined, "6pm daily")
    ).toThrow(
      "A schedule without scheduleType must be a valid 5-field cron expression"
    );
  });
});
