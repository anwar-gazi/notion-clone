// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

vi.mock("../../src/lib/prisma", () => {
  return {
    prisma: {
      subtask: {
        create: vi.fn().mockResolvedValue({ id: "s1", title: "S" }),
        update: vi.fn().mockResolvedValue({ id: "s1", title: "S2" }),
      },
    },
  };
});

import * as subtasksRoute from "../../src/app/api/subtasks/route";

function jsonReq(method: string, body: any) {
  return new Request("http://localhost/api/subtasks", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("API /api/subtasks", () => {
  it("POST creates a subtask", async () => {
    const res = await subtasksRoute.POST(jsonReq("POST", { taskId: "t1", title: "S" }));
    const j = await res.json();
    expect(j.id).toBe("s1");
  });

  it("PATCH updates a subtask", async () => {
    const res = await subtasksRoute.PATCH(jsonReq("PATCH", { id: "s1", title: "S2" }));
    const j = await res.json();
    expect(j.title).toBe("S2");
  });
});
