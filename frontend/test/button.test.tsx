import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders its label and handles a click", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save bill</Button>);

    const button = screen.getByRole("button", { name: "Save bill" });
    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("forwards the disabled state", () => {
    render(<Button disabled>Confirm split</Button>);
    expect((screen.getByRole("button", { name: "Confirm split" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
