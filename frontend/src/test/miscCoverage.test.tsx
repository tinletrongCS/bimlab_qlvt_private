import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AssetActions } from "../components/AssetActions";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { Operation } from "../components/Operation";
import { SeatUsage } from "../components/SeatUsage";
import { StatCard } from "../components/StatCard";
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

  it("renders small dashboard/action components", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onRevoke = vi.fn();
    const onDispose = vi.fn();

    const app = render(
      <>
        <StatCard label="Tài sản" value={12} tone="blue" icon={<span>i</span>} />
        <Operation label="Đang xử lý" value="3" icon={<span>op</span>} />
        <SeatUsage subscription={{ totalSeats: 10, usedSeats: 6 } as any} />
        <AssetActions
          item={{ status: "ASSIGNED", assignedEmployeeId: 1 } as any}
          onEdit={onEdit}
          onDelete={onDelete}
          onRevoke={onRevoke}
          onDispose={onDispose}
        />
      </>,
    );

    expect(screen.getByText("Tài sản")).toBeVisible();
    expect(screen.getByText("6/10")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Thu hồi" }));
    await user.click(screen.getByRole("button", { name: "Thanh lý" }));
    await user.click(screen.getByRole("button", { name: /Sửa/ }));
    await user.click(screen.getByRole("button", { name: /Xóa/ }));
    expect(onRevoke).toHaveBeenCalled();
    expect(onDispose).toHaveBeenCalled();
    expect(onEdit).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalled();

    app.rerender(
      <AssetActions
        item={{ status: "DISPOSED" } as any}
        onEdit={onEdit}
        onDelete={onDelete}
        onRevoke={onRevoke}
        onDispose={onDispose}
      />,
    );
    expect(screen.queryByRole("button", { name: "Thu hồi" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Thanh lý" })).not.toBeInTheDocument();
  });

  it("searches and navigates help tree", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <HelpPage />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("button", { name: "Tài sản" }));
    await user.click(screen.getAllByRole("button", { name: "Import Excel danh sách tài sản" })[0]);
    expect(screen.getByRole("heading", { name: "Import Excel danh sách tài sản" })).toBeVisible();

    await user.type(screen.getByPlaceholderText("Tìm hướng dẫn..."), "không tồn tại");
    expect(screen.getByText("Không tìm thấy hướng dẫn phù hợp.")).toBeVisible();
    await user.click(screen.getByLabelText("Xóa tìm kiếm"));
    expect(screen.getByRole("button", { name: "Tổng quan hệ thống" })).toBeVisible();
  });
});
