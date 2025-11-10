import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SubtaskList from "../../src/components/SubtaskList";

describe("SubtaskList", () => {
  it("renders items and allows typing a new one", async () => {
    const items = [{ id: "a", title: "X", completed: false }];
    const onChange = vi.fn();
    render(<SubtaskList taskId="t1" initial={items} onChange={onChange} />);
    const input = screen.getByPlaceholderText("Add subtask") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "New one" } });
    expect(input.value).toBe("New one");
  });
});
