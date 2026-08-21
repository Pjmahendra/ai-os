import { describe, expect, it } from "vitest";
import { matchThreadsByCriteria, type ThreadSummary } from "./email.service.js";

function thread(overrides: Partial<ThreadSummary> = {}): ThreadSummary {
  return {
    id: "t1",
    snippet: "",
    subject: "Regards",
    from: "Mahendra <mahendra_pj@srmap.edu.in>",
    date: "Thu, 20 Aug 2026",
    unread: false,
    ...overrides
  };
}

describe("matchThreadsByCriteria", () => {
  it("matches by subject substring, case-insensitively", () => {
    const threads = [thread({ id: "t1", subject: "Regards" })];

    const matches = matchThreadsByCriteria(threads, {
      subject: "regards"
    });

    expect(matches.map((m) => m.id)).toEqual(["t1"]);
  });

  it("matches by sender substring, case-insensitively", () => {
    const threads = [
      thread({ id: "t1", from: "Mahendra <mahendra_pj@srmap.edu.in>" })
    ];

    const matches = matchThreadsByCriteria(threads, {
      from: "MAHENDRA_PJ"
    });

    expect(matches.map((m) => m.id)).toEqual(["t1"]);
  });

  it("requires both subject and from to match when both are given", () => {
    const threads = [
      thread({ id: "t1", subject: "Regards", from: "a@x.com" }),
      thread({ id: "t2", subject: "Regards", from: "b@x.com" })
    ];

    const matches = matchThreadsByCriteria(threads, {
      subject: "Regards",
      from: "a@x.com"
    });

    expect(matches.map((m) => m.id)).toEqual(["t1"]);
  });

  it("returns every match when multiple threads qualify", () => {
    const threads = [
      thread({ id: "t1", from: "Render <no-reply@render.com>" }),
      thread({ id: "t2", from: "Render <no-reply@render.com>" })
    ];

    const matches = matchThreadsByCriteria(threads, { from: "render" });

    expect(matches.map((m) => m.id)).toEqual(["t1", "t2"]);
  });

  it("returns nothing when neither criterion is given", () => {
    const threads = [thread()];

    expect(matchThreadsByCriteria(threads, {})).toEqual([]);
  });

  it("returns nothing when nothing matches", () => {
    const threads = [thread({ subject: "Regards" })];

    expect(
      matchThreadsByCriteria(threads, { subject: "invoice" })
    ).toEqual([]);
  });
});
