// @vitest-environment jsdom
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Board from "../../src/components/Board";
import TaskPaneProvider from "../../src/components/TaskPaneProvider";

describe("Board", () => {
  it("renders columns and tasks", () => {
    const board = {
      columns: [
        { id: "c1", name: "To Do", tasks: [{ id: "t1", title: "A", columnId: "c1", createdAt: new Date().toISOString(), subtasks: [] }] },
        { id: "c2", name: "Done", tasks: [] },
      ],
    };
    render(
      <TaskPaneProvider>
        <Board board={board} />
      </TaskPaneProvider>
    ); // ✅ now TaskCard has context

    expect(screen.getByText("To Do")).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
  });
});
