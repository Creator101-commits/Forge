import { describe, it, expect, beforeEach } from "vitest";
import { useOnboardingStore } from "./onboarding";

beforeEach(() => {
  useOnboardingStore.setState({
    visible: false,
    currentStep: 0,
    completed: false,
  });
  localStorage.clear();
});

describe("onboarding store", () => {
  it("starts the tour when not completed", () => {
    useOnboardingStore.getState().start();
    const s = useOnboardingStore.getState();
    expect(s.visible).toBe(true);
    expect(s.currentStep).toBe(0);
  });

  it("does not start if already completed", () => {
    useOnboardingStore.setState({ completed: true });
    useOnboardingStore.getState().start();
    expect(useOnboardingStore.getState().visible).toBe(false);
  });

  it("advances to next step", () => {
    useOnboardingStore.setState({ visible: true, currentStep: 0 });
    useOnboardingStore.getState().next();
    expect(useOnboardingStore.getState().currentStep).toBe(1);
  });

  it("does not go below step 0", () => {
    useOnboardingStore.setState({ visible: true, currentStep: 0 });
    useOnboardingStore.getState().prev();
    expect(useOnboardingStore.getState().currentStep).toBe(0);
  });

  it("dismisses without completing", () => {
    useOnboardingStore.setState({ visible: true, currentStep: 2 });
    useOnboardingStore.getState().dismiss();
    const s = useOnboardingStore.getState();
    expect(s.visible).toBe(false);
    expect(s.completed).toBe(false);
  });

  it("completes the tour", () => {
    useOnboardingStore.setState({ visible: true, currentStep: 6 });
    useOnboardingStore.getState().complete();
    const s = useOnboardingStore.getState();
    expect(s.completed).toBe(true);
    expect(s.visible).toBe(false);
    expect(localStorage.getItem("forge:onboarding:completed")).toBe("true");
  });

  it("jumps to a specific step", () => {
    useOnboardingStore.setState({ visible: true, currentStep: 0 });
    useOnboardingStore.getState().goTo(3);
    expect(useOnboardingStore.getState().currentStep).toBe(3);
  });
});
