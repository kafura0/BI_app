import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ErrorBoundary } from "@/components/error-boundary";

const ThrowComponent = () => {
  throw new Error("Test error");
};

describe("ErrorBoundary", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <div>Hello World</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("renders default fallback on error", () => {
    render(
      <ErrorBoundary>
        <ThrowComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Test error")).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("renders custom fallback when provided", () => {
    render(
      <ErrorBoundary fallback={<div>Custom Error UI</div>}>
        <ThrowComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText("Custom Error UI")).toBeInTheDocument();
  });

  it("resets error state on Try again click", () => {
    render(
      <ErrorBoundary>
        <ThrowComponent />
      </ErrorBoundary>
    );
    const btn = screen.getByText("Try again");
    btn.click();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });
});
