// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

vi.mock("../../src/lib/prisma", () => ({
  prisma: {
    task: { findUnique: vi.fn().mockResolvedValue({ id: "t1", subtasks: [] }) },
  },
}));

import * as route from "../../src/app/api/tasks/[id]/route";

describe("API /api/tasks/:id GET", () => {
  it("returns task JSON", async () => {
    const res = await route.GET({} as any, { params: { id: "t1" } as any });
    const j = await res.json();
    expect(j.id).toBe("t1");
  });
});
