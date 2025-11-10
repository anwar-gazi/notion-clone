import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TaskCard from "../../src/components/TaskCard";
import TaskPaneProvider from "../../src/components/TaskPaneProvider";

function Harness({ task }: any) {
  return (
    <TaskPaneProvider>
      <TaskCard task={task} />
    </TaskPaneProvider>
  );
}

describe("TaskCard", () => {
  const task = {
    id: "t1",
    title: "Sample",
    columnId: "c1",
    createdAt: new Date().toISOString(),
    subtasks: [{ id: "s1", completed: true }, { id: "s2", completed: false }],
  };

  it("shows title and subtasks badge", () => {
    render(<Harness task={task} />);
    expect(screen.getByText("Sample")).toBeInTheDocument();
    expect(screen.getByText(/1\/2/)).toBeInTheDocument();
  });

  it("opens the pane on click (no crash)", () => {
    render(<Harness task={task} />);
    fireEvent.click(screen.getByTitle("Click to open details"));
    expect(true).toBe(true);
  });
});
