import { render, screen, within, waitFor, fireEvent, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import TaskPaneProvider from "@/components/TaskPaneProvider";
import Board from "@/components/Board";

/** Find the droppable list container for a column title ("To Do", "Done", …). */
function droppableOfColumn(name: string) {
  const headerTitle = screen.getByText(name);
  const header = headerTitle.closest("header");
  if (!header) throw new Error("Header not found for column: " + name);
  const drop = header.nextElementSibling as HTMLElement | null;
  if (!drop) throw new Error("Droppable container not found for: " + name);
  return drop;
}

/** From a card title, return the root element (role="button"). */
function cardRootOf(text: string) {
  const title = screen.getByText(text);
  const card = title.closest('[role="button"]');
  if (!card) throw new Error("Card root not found for: " + text);
  return card as HTMLElement;
}

describe("Drag & Drop on Board", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    (HTMLElement.prototype as any).scrollIntoView = vi.fn();
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    ) as any;
  });

  afterEach(() => {
    global.fetch = originalFetch as any;
    vi.restoreAllMocks();
  });

  it("moves a task from 'To Do' to 'Done' via keyboard DnD and sends PATCH", async () => {
    const board = {
      columns: [
        {
          id: "todo",
          name: "To Do",
          tasks: [
            {
              id: "t1",
              columnId: "todo",
              title: "Drag me",
              subtasks: [],
              createdAt: new Date().toISOString(),
            },
          ],
        },
        { id: "done", name: "Done", tasks: [] },
      ],
    };

    render(
      <TaskPaneProvider>
        <Board board={board} />
      </TaskPaneProvider>
    );

    const todoDrop = droppableOfColumn("To Do");
    const doneDrop = droppableOfColumn("Done");
    const card = cardRootOf("Drag me");

    // Precondition: card starts in "To Do"
    expect(within(todoDrop).getByText("Drag me")).toBeInTheDocument();
    expect(within(doneDrop).queryByText("Drag me")).not.toBeInTheDocument();

    // dnd-kit keyboard: Space (pick) → ArrowRight (move) → Space (drop)
    await act(async () => {
      card.focus();
      fireEvent.keyDown(card, { key: " ", code: "Space" });          // pick up
      fireEvent.keyDown(card, { key: "ArrowRight", code: "ArrowRight" }); // move to next column
      fireEvent.keyDown(card, { key: " ", code: "Space" });           // drop
    });

    // UI reflects the move
    await waitFor(() => {
      expect(within(doneDrop).getByText("Drag me")).toBeInTheDocument();
      expect(within(todoDrop).queryByText("Drag me")).not.toBeInTheDocument();
    });

    // PATCH payload captured
    const call = (global.fetch as any).mock.calls.find(
      (c: any[]) => typeof c[0] === "string" && c[0].includes("/api/tasks")
    );
    expect(call, "expected a PATCH /api/tasks call").toBeTruthy();

    const [url, init] = call!;
    expect(url).toContain("/api/tasks");
    expect(init.method).toBe("PATCH");
    const payload = JSON.parse(init.body);
    expect(payload).toMatchObject({ id: "t1", columnId: "done" });
  });
});
