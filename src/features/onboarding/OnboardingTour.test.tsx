import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OnboardingTour } from "./OnboardingTour";
import { useOnboardingStore } from "@/store/onboarding";

beforeEach(() => {
  useOnboardingStore.setState({
    visible: false,
    currentStep: 0,
    completed: false,
  });
  localStorage.clear();
});

describe("OnboardingTour", () => {
  it("does not render when completed", () => {
    useOnboardingStore.setState({ completed: true, visible: false });
    const { container } = render(<OnboardingTour />);
    expect(container.innerHTML).toBe("");
  });

  it("does not render when not visible", () => {
    const { container } = render(<OnboardingTour />);
    expect(container.innerHTML).toBe("");
  });

  it("renders the welcome step when visible", async () => {
    useOnboardingStore.setState({ visible: true, currentStep: 0 });
    render(<OnboardingTour />);
    expect(screen.getByText("Welcome to Forge")).toBeInTheDocument();
    expect(screen.getByText(/AI-native hardware/)).toBeInTheDocument();
  });

  it("advances to next step on Next click", async () => {
    const user = userEvent.setup();
    useOnboardingStore.setState({ visible: true, currentStep: 0 });
    render(<OnboardingTour />);

    await user.click(screen.getByText("Next"));
    await waitFor(() => {
      expect(screen.getByText("Activity Rail")).toBeInTheDocument();
    });
  });

  it("goes back to previous step on Back click", async () => {
    const user = userEvent.setup();
    useOnboardingStore.setState({ visible: true, currentStep: 1 });
    render(<OnboardingTour />);

    await user.click(screen.getByText("Back"));
    await waitFor(() => {
      expect(screen.getByText("Welcome to Forge")).toBeInTheDocument();
    });
  });

  it("dismisses on Skip tour click", async () => {
    const user = userEvent.setup();
    useOnboardingStore.setState({ visible: true, currentStep: 0 });
    render(<OnboardingTour />);

    await user.click(screen.getByText("Skip tour"));
    await waitFor(() => {
      expect(useOnboardingStore.getState().visible).toBe(false);
    });
  });

  it("completes tour on Done click (last step)", async () => {
    const user = userEvent.setup();
    useOnboardingStore.setState({ visible: true, currentStep: 6 });
    render(<OnboardingTour />);

    await user.click(screen.getByText("Done"));
    await waitFor(() => {
      expect(useOnboardingStore.getState().completed).toBe(true);
      expect(useOnboardingStore.getState().visible).toBe(false);
    });
  });

  it("hides on Escape key", async () => {
    const user = userEvent.setup();
    useOnboardingStore.setState({ visible: true, currentStep: 0 });
    render(<OnboardingTour />);

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(useOnboardingStore.getState().visible).toBe(false);
    });
  });

  it("navigates with right arrow key", async () => {
    useOnboardingStore.setState({ visible: true, currentStep: 0 });
    render(<OnboardingTour />);

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowRight" });
    await waitFor(() => {
      expect(useOnboardingStore.getState().currentStep).toBe(1);
    });
  });

  it("navigates with left arrow key", async () => {
    useOnboardingStore.setState({ visible: true, currentStep: 1 });
    render(<OnboardingTour />);

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowLeft" });
    await waitFor(() => {
      expect(useOnboardingStore.getState().currentStep).toBe(0);
    });
  });

  it("completes and dismisses on 'Don't show again'", async () => {
    const user = userEvent.setup();
    useOnboardingStore.setState({ visible: true, currentStep: 0 });
    render(<OnboardingTour />);

    await user.click(screen.getByText("Don't show again"));
    await waitFor(() => {
      expect(useOnboardingStore.getState().completed).toBe(true);
      expect(useOnboardingStore.getState().visible).toBe(false);
    });
  });

  it("shows step indicator dots", () => {
    useOnboardingStore.setState({ visible: true, currentStep: 0 });
    render(<OnboardingTour />);

    const dots = screen.getAllByRole("button", { name: /Go to step/ });
    expect(dots).toHaveLength(7);
  });

  it("jumps to a specific step via indicator dots", async () => {
    const user = userEvent.setup();
    useOnboardingStore.setState({ visible: true, currentStep: 0 });
    render(<OnboardingTour />);

    await user.click(screen.getByRole("button", { name: "Go to step 3: Workspace Area" }));
    await waitFor(() => {
      expect(useOnboardingStore.getState().currentStep).toBe(2);
    });
  });
});
