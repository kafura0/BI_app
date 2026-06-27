import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { RevenueChart } from "@/components/charts/revenue-chart";

jest.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Line: () => <div />,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
}));

describe("RevenueChart", () => {
  const sampleData = [
    { x: "Jan", value: 400 },
    { x: "Feb", value: 600 },
  ];

  it("renders title", () => {
    render(<RevenueChart title="Monthly Revenue" data={sampleData} />);
    expect(screen.getByText("Monthly Revenue")).toBeInTheDocument();
  });

  it("renders line chart by default", () => {
    const { container } = render(<RevenueChart title="Revenue" data={sampleData} />);
    expect(container.querySelector("div")).toBeInTheDocument();
  });

  it("renders bar chart when type is bar", () => {
    const { container } = render(<RevenueChart title="Revenue" data={sampleData} type="bar" />);
    expect(container.querySelector("div")).toBeInTheDocument();
  });

  it("shows no data message when data is empty", () => {
    render(<RevenueChart title="Revenue" data={[]} />);
    expect(screen.getByText("No data available")).toBeInTheDocument();
  });

  it("does not show no data message when data exists", () => {
    render(<RevenueChart title="Revenue" data={sampleData} />);
    expect(screen.queryByText("No data available")).not.toBeInTheDocument();
  });
});
