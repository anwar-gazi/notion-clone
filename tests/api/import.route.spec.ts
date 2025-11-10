// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

vi.mock("../../src/lib/prisma", () => ({
  prisma: {
    subtask: { create: vi.fn().mockResolvedValue({ id: "s1" }) },
    task: { findUnique: vi.fn().mockResolvedValue({ id: "t1" }) },
  },
}));

import * as importRoute from "../../src/app/api/tasks/[id]/import/route";

describe("API /api/tasks/:id/import", () => {
  it("returns 400 when no file provided", async () => {
    const req = new Request("http://localhost/api/tasks/t1/import", { method: "POST" });
    const res = await importRoute.POST(req as any, { params: { id: "t1" } as any });
    expect(res.status).toBe(400);
  });
});
