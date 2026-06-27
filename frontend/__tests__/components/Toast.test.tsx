import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ToastProvider, useToast } from "@/components/ui/toast";

jest.mock("lucide-react", () => ({
  X: () => <svg data-testid="x-icon" />,
  CheckCircle: () => <svg data-testid="check-icon" />,
  AlertCircle: () => <svg data-testid="alert-icon" />,
  Info: () => <svg data-testid="info-icon" />,
}));

function TestButton({ type }: { type?: "success" | "error" | "info" }) {
  const { toast, success, error } = useToast();
  const trigger = type === "success" ? () => success("Success msg") : type === "error" ? () => error("Error msg") : () => toast("Info msg");
  return <button onClick={trigger}>Show Toast</button>;
}

describe("Toast", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders toast with message on trigger", () => {
    render(
      <ToastProvider>
        <TestButton />
      </ToastProvider>
    );
    screen.getByText("Show Toast").click();
    expect(screen.getByText("Info msg")).toBeInTheDocument();
  });

  it("renders success toast", () => {
    render(
      <ToastProvider>
        <TestButton type="success" />
      </ToastProvider>
    );
    screen.getByText("Show Toast").click();
    expect(screen.getByText("Success msg")).toBeInTheDocument();
  });

  it("renders error toast", () => {
    render(
      <ToastProvider>
        <TestButton type="error" />
      </ToastProvider>
    );
    screen.getByText("Show Toast").click();
    expect(screen.getByText("Error msg")).toBeInTheDocument();
  });

  it("auto-dismisses toast after 4500ms", () => {
    render(
      <ToastProvider>
        <TestButton />
      </ToastProvider>
    );
    screen.getByText("Show Toast").click();
    expect(screen.getByText("Info msg")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(4500);
    });

    expect(screen.queryByText("Info msg")).not.toBeInTheDocument();
  });

  it("dismisses toast on close button click", () => {
    render(
      <ToastProvider>
        <TestButton />
      </ToastProvider>
    );
    screen.getByText("Show Toast").click();
    expect(screen.getByText("Info msg")).toBeInTheDocument();

    screen.getByTestId("x-icon").closest("button")?.click();
    expect(screen.queryByText("Info msg")).not.toBeInTheDocument();
  });
});
