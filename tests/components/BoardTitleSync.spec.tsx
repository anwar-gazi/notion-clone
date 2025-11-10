/// <reference types="vitest" />

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, within, act } from "@testing-library/react";
import Board from "@/components/Board";

// --- Local pub/sub used by the mock ---
const subscribers: Array<(patch: any) => void> = [];
const emitPanePatch = (patch: any) => {
  // Only invoke actual functions (defensive against bad registrations)
  subscribers.forEach((fn) => {
    if (typeof fn === "function") fn(patch);
  });
};

// Robust registrar that supports multiple call signatures:
// - on("event", fn)
// - subscribe("event", { next: fn })
// - on(fn) / subscribe(fn)
function register(eventOrFn: any, maybeFn?: any) {
  let fn = maybeFn ?? eventOrFn;

  // If passed an observer-like object: { next() {} }
  if (fn && typeof fn === "object" && typeof fn.next === "function") {
    fn = fn.next.bind(fn);
  }

  if (typeof fn === "function") {
    subscribers.push(fn);
    return () => {
      const i = subscribers.indexOf(fn);
      if (i >= 0) subscribers.splice(i, 1);
    };
  }

  // Gracefully no-op if something unexpected was passed
  return () => {};
}

// Mock TaskPaneProvider: pass-through Provider; hook exposes on/subscribe/open/close
vi.mock("@/components/TaskPaneProvider", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTaskPane: () => ({
    open: () => {},
    close: () => {},
    on: register,
    subscribe: register,
    // (Other fields can be added if components access them)
  }),
}));

describe("Board ↔ TaskPane title sync", () => {
  it("reflects the renamed task title on the board immediately after editing in the side pane", async () => {
    const board = {
      columns: [
        {
          id: "c1",
          name: "To Do",
          tasks: [{ id: "t1", title: "Old title", columnId: "c1" }],
        },
      ],
    };

    render(<Board board={board} />);

    // Focus assertions on the specific card to avoid matching the pane header
    const card = screen.getByTitle("Click to open details");
    expect(within(card).getByText("Old title")).toBeInTheDocument();

    // Simulate the side-pane saving a new title (broadcast patch)
    //emitPanePatch({ id: "t1", title: "New title" });
    await act(async () => {
      emitPanePatch({ id: "t1", title: "New title" });
    });

    // The board card should update without reload
    await waitFor(() => {
      expect(within(card).queryByText("Old title")).not.toBeInTheDocument();
      expect(within(card).getByText("New title")).toBeInTheDocument();
    });
  });
});
