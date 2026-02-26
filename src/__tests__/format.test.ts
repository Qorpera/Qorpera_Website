import { describe, it, expect } from "vitest";
import { kindLabel } from "@/lib/format";

describe("kindLabel", () => {
  it("replaces underscores with spaces", () => {
    expect(kindLabel("PROJECT_MANAGER")).toBe("PROJECT MANAGER");
  });

  it("handles single word", () => {
    expect(kindLabel("ASSISTANT")).toBe("ASSISTANT");
  });

  it("handles empty string", () => {
    expect(kindLabel("")).toBe("");
  });

  it("handles multiple underscores", () => {
    expect(kindLabel("CHIEF_ADVISOR_ROLE")).toBe("CHIEF ADVISOR ROLE");
  });
});
