import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ForecastChart } from "@/components/charts/forecast-chart";

jest.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  ComposedChart: ({ children }: any) => <div>{children}</div>,
  Line: () => <div />,
  Area: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  ReferenceLine: () => <div />,
}));

describe("ForecastChart", () => {
  const sampleData = {
    data: [
      { x: "Jan", value: 100, type: "actual" as const },
      { x: "Feb", value: 150, type: "actual" as const },
      { x: "Mar", value: 200, type: "forecast" as const },
    ],
    r2: 0.8921,
    periods: 3,
  };

  it("renders title", () => {
    render(<ForecastChart title="Revenue Forecast" data={sampleData} />);
    expect(screen.getByText("Revenue Forecast")).toBeInTheDocument();
  });

  it("renders R² value", () => {
    render(<ForecastChart title="Forecast" data={sampleData} />);
    expect(screen.getByText("R²: 0.8921")).toBeInTheDocument();
  });

  it("shows insufficient data when points are empty", () => {
    render(<ForecastChart title="Forecast" data={{ data: [], r2: 0, periods: 0 }} />);
    expect(screen.getByText("Insufficient data for forecasting")).toBeInTheDocument();
  });

  it("does not show insufficient data when points exist", () => {
    render(<ForecastChart title="Forecast" data={sampleData} />);
    expect(screen.queryByText("Insufficient data for forecasting")).not.toBeInTheDocument();
  });

  it("renders AI Forecast badge", () => {
    render(<ForecastChart title="Forecast" data={sampleData} />);
    expect(screen.getByText("AI Forecast")).toBeInTheDocument();
  });
});
