import '@testing-library/jest-dom';
import { vi } from "vitest";

const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    const msg = String(args[0] || '');
    if (msg.includes('Only plain objects can be passed to Client Components')) return;
    originalError(...args);
  };
});
afterAll(() => { console.error = originalError; });


// Mock `next/server` → provide NextResponse.json
vi.mock("next/server", () => ({
  NextResponse: {
    json: (data: any, init?: ResponseInit & { status?: number }) =>
      new Response(JSON.stringify(data ?? {}), {     // <- ensures body is never empty
        status: (init as any)?.status ?? 200,
        headers: { "content-type": "application/json" },
      }),
    redirect: (url: URL | string, statusOrInit?: number | ResponseInit) =>
      Response.redirect(typeof url === "string" ? url : url.toString(),
        typeof statusOrInit === "number" ? statusOrInit : (statusOrInit as any)?.status ?? 307),
    next: () => new Response(null, { status: 200 }),
  },
}));

// Mock your auth helper so route imports don't pull real next-auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { email: "test@example.com" } }),
}));