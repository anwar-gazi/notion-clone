import { describe, it, expect } from "vitest";
import { genExternalId } from "../../src/lib/ids";

describe("genExternalId", () => {
  it("generates with default or provided prefix", () => {
    const a = genExternalId();
    const b = genExternalId("T");
    expect(a.includes("-")).toBe(true);
    expect(b.startsWith("T-")).toBe(true);
  });

  it("is uppercase and URL-safe", () => {
    const id = genExternalId("ST");
    expect(/^[A-Z0-9-]+$/.test(id)).toBe(true);
  });
});
