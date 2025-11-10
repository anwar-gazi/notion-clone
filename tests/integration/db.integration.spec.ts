import { describe, it } from "vitest";

describe.skip("DB Integration (requires Postgres + migrations)", () => {
  it("creates a task and toggles Done to set closedAt", async () => {
    // TODO: implement with real prisma client + test DB
  });
});
