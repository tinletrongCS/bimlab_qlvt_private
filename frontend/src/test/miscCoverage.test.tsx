import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { HelpPage } from "../pages/HelpPage";

describe("misc UI coverage", () => {
  it("renders every loading skeleton variant", () => {
    const app = render(<LoadingSkeleton />);
    expect(document.querySelector(".skeleton-shell")).not.toBeNull();
    app.rerender(<LoadingSkeleton variant="content" />);
    expect(document.querySelector(".skeleton-content")).not.toBeNull();
    app.rerender(<LoadingSkeleton variant="login" />);
    expect(document.querySelector(".skeleton-login-card")).not.toBeNull();
  });

  it("searches and navigates help tree", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><HelpPage /></MemoryRouter>);
    await user.click(screen.getByRole("button", { name: "Tài sản" }));
    await user.click(screen.getAllByRole("button", { name: "Import Excel danh sách tài sản" })[0]);
    expect(screen.getByRole("heading", { name: "Import Excel danh sách tài sản" })).toBeVisible();

    await user.type(screen.getByPlaceholderText("Tìm hướng dẫn..."), "không tồn tại");
    expect(screen.getByText("Không tìm thấy hướng dẫn phù hợp.")).toBeVisible();
    await user.click(screen.getByLabelText("Xóa tìm kiếm"));
    expect(screen.getByRole("button", { name: "Tổng quan hệ thống" })).toBeVisible();
  });
});
