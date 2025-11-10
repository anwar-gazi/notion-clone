import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { email: "a@b.com", name: "User A" }, loginAt: Date.now() - 3600_000 } }),
  signOut: vi.fn(),
}));

import ProfileMenu from "../../src/components/ProfileMenu";

describe("ProfileMenu", () => {
  it("shows avatar and opens menu", () => {
    render(<ProfileMenu />);
    const btn = screen.getByRole("button", { name: /User menu/i });
    fireEvent.click(btn);
    expect(screen.getByText("a@b.com")).toBeInTheDocument();
  });
});
