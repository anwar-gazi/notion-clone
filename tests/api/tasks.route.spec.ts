// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// 🔁 CHANGE THIS:
vi.mock("@/lib/prisma", () => {                            // was "../../src/lib/prisma"
  return {
    prisma: {
      task: {
        create: vi.fn().mockResolvedValue({ id: "t1", title: "X" }),
        update: vi.fn().mockResolvedValue({ id: "t1", title: "X2" }),
      },
      column: {
        findUnique: vi.fn().mockResolvedValue({ id: "c1", name: "Done" }),
      },
    },
  };
});

import * as tasksRoute from "../../src/app/api/tasks/route";

function jsonReq(method: string, body: any) {
  return new Request("http://localhost/api/tasks", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("API /api/tasks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("POST creates a task", async () => {
    const res = await tasksRoute.POST(jsonReq("POST", { title: "X" }));
    const j = await res.json();
    expect(j.id).toBe("t1");
  });

  it("PATCH updates a task", async () => {
    const res = await tasksRoute.PATCH(jsonReq("PATCH", { id: "t1", title: "X2", columnId: "c1" }));
    const j = await res.json();
    expect(j.title).toBe("X2");
  });
});
