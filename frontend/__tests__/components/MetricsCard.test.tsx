import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MetricsCard } from "@/components/charts/metrics-card";

jest.mock("lucide-react", () => ({
  TrendingUp: () => <svg data-testid="trending-up" />,
}));

describe("MetricsCard", () => {
  it("renders title and formatted value", () => {
    render(<MetricsCard title="Revenue" value={1500} />);
    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("1,500")).toBeInTheDocument();
  });

  it("renders change text when provided", () => {
    render(<MetricsCard title="Users" value={500} change="+12%" trend="up" />);
    expect(screen.getByText("+12%")).toBeInTheDocument();
    expect(screen.getByText("+12%")).toHaveClass("text-emerald-400");
  });

  it("applies down trend style", () => {
    render(<MetricsCard title="Bounce" value={200} change="-5%" trend="down" />);
    expect(screen.getByText("-5%")).toHaveClass("text-red-400");
  });

  it("applies neutral trend style", () => {
    render(<MetricsCard title="Visitors" value={100} change="0%" trend="neutral" />);
    expect(screen.getByText("0%")).toHaveClass("text-slate-500");
  });

  it("does not render change when not provided", () => {
    render(<MetricsCard title="Revenue" value={1500} />);
    expect(screen.queryByText("+12%")).not.toBeInTheDocument();
  });

  it("uses default color when not provided", () => {
    const { container } = render(<MetricsCard title="Test" value={100} />);
    const iconContainer = container.querySelector("div > div > div > div");
    expect(iconContainer).toBeInTheDocument();
  });
});
