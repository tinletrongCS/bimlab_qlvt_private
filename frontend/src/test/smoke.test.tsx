import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("test infrastructure", () => {
  it("vitest + jsdom + RTL load and render a trivial component", () => {
    render(<div role="status">ready</div>);
    expect(screen.getByRole("status")).toHaveTextContent("ready");
  });
});
