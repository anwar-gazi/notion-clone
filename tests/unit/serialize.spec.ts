import { describe, it, expect } from "vitest";
import { toPlain } from "../../src/lib/serialize";
import { Decimal } from "@prisma/client/runtime/library";

describe("toPlain", () => {
  it("converts Decimal to number", () => {
    const data = { a: new Decimal("1.25") };
    const plain = toPlain(data);
    expect(plain.a).toBe(1.25);
  });

  it("converts Date to ISO string", () => {
    const d = new Date("2020-01-01T00:00:00Z");
    const data = { d };
    const plain = toPlain(data);
    expect(plain.d).toBe("2020-01-01T00:00:00.000Z");
  });
});
