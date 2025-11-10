// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { middleware } from "../../middleware";

vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(),
}));

import { getToken } from "next-auth/jwt";

function req(url: string): any {
  const u = new URL(url);
  return { nextUrl: u, url, headers: new Map() };
}

describe("auth middleware", () => {
  beforeEach(() => vi.resetAllMocks());

  it("redirects unauthenticated to signin with callbackUrl", async () => {
    (getToken as any).mockResolvedValue(null);
    const res: any = await middleware(req("http://localhost:3000/reports?x=1"));
    expect(res?.status).toBe(307);
    const loc = res?.headers?.get?.("location") || res?.headers?.get?.("Location");
    expect(String(loc)).toContain("/api/auth/signin");
    expect(String(loc)).toContain("callbackUrl=%2Freports%3Fx%3D1");
  });

  it("passes through when token present", async () => {
    (getToken as any).mockResolvedValue({ sub: "user" });
    const res: any = await middleware(req("http://localhost:3000/"));
    expect(res?.status || 200).toBe(200);
  });
});
