// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

vi.mock("../../src/lib/prisma", () => ({
  prisma: {
    task: { findMany: vi.fn().mockResolvedValue([{ id: "t1", title: "Foo", externalId: "T-AAA" }]) },
    subtask: { findMany: vi.fn().mockResolvedValue([{ id: "s1", title: "Bar", externalId: "ST-BBB" }]) },
  },
}));

import * as route from "../../src/app/api/search/route";

describe("API /api/search", () => {
  it("searches by q", async () => {
    const res = await route.GET(new Request("http://localhost/api/search?q=foo"));
    const j = await res.json();
    expect(j.tasks?.length).toBeGreaterThan(0);
    expect(j.subtasks?.length).toBeGreaterThan(0);
  });
});
