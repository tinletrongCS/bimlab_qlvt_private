import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataTable } from "./DataTable";

const columns = [{ key: "name", title: "Tên", render: (item: { name: string }) => item.name }];
const rows = Array.from({ length: 25 }, (_, i) => ({ name: `Dòng ${i + 1}` }));

describe("DataTable", () => {
  it("paginates with the size selector and navigation buttons", () => {
    render(
      <DataTable
        columns={columns}
        data={rows}
        emptyText="Trống"
        getRowKey={(item) => item.name}
        itemLabel="dòng"
      />,
    );
    expect(screen.getByText("Dòng 1")).toBeVisible();
    expect(screen.queryByText("Dòng 11")).not.toBeInTheDocument();

    const next = screen.getAllByRole("button")[2];
    fireEvent.click(next);
    expect(screen.getByText("Dòng 11")).toBeVisible();

    const last = screen.getAllByRole("button")[3];
    fireEvent.click(last);
    expect(screen.getByText("Dòng 25")).toBeVisible();

    const prev = screen.getAllByRole("button")[1];
    fireEvent.click(prev);
    expect(screen.getByText("Dòng 11")).toBeVisible();

    const first = screen.getAllByRole("button")[0];
    fireEvent.click(first);
    expect(screen.getByText("Dòng 1")).toBeVisible();

    fireEvent.change(screen.getByLabelText("Số dòng mỗi trang"), { target: { value: "50" } });
    expect(screen.getByText("Dòng 25")).toBeVisible();
    expect(screen.getByText("1 / 1")).toBeVisible();
  });

  it("shows the empty state and skips pagination when disabled", () => {
    render(<DataTable columns={columns} data={[]} emptyText="Trống" pagination={false} />);
    expect(screen.getByText("Trống")).toBeVisible();
    expect(screen.queryByLabelText("Số dòng mỗi trang")).not.toBeInTheDocument();
  });
});
