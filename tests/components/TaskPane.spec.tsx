// @vitest-environment jsdom

import React, {useEffect} from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TaskPaneProvider, { useTaskPane } from "../../src/components/TaskPaneProvider";
import TaskPane from "../../src/components/TaskPane";

function Opener({ task }: any) {
  const { openPane } = useTaskPane();
  useEffect(() => {
    openPane(task);
  }, [task, openPane]);        // ✅ call after mount, not during render
  return null;
}

function Harness({ task }: any) {
  return (
    <TaskPaneProvider>
      <Opener task={task} />
      <TaskPane />
    </TaskPaneProvider>
  );
}

describe("TaskPane", () => {
  it("shows details when opened", () => {
    const task = {
      id: "t1",
      title: "Task Pane",
      createdAt: new Date().toISOString(),
      description: "Hello",
      subtasks: [],
    };
    render(<Harness task={task} />);
    expect(screen.getByText("Task Pane")).toBeInTheDocument();
    expect(screen.getByText(/Description/)).toBeInTheDocument();
  });
});
