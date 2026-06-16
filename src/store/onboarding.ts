import { create } from "zustand";

const STORAGE_KEY = "forge:onboarding:completed";

function readCompleted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export interface OnboardingState {
  visible: boolean;
  currentStep: number;
  completed: boolean;
  start: () => void;
  next: () => void;
  prev: () => void;
  goTo: (step: number) => void;
  dismiss: () => void;
  complete: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  visible: false,
  currentStep: 0,
  completed: readCompleted(),

  start: () => {
    if (get().completed) return;
    set({ visible: true, currentStep: 0 });
  },

  next: () =>
    set((s) => ({
      currentStep: s.currentStep + 1,
    })),

  prev: () =>
    set((s) => ({
      currentStep: Math.max(0, s.currentStep - 1),
    })),

  goTo: (step) => set({ currentStep: step }),

  dismiss: () => set({ visible: false }),

  complete: () => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      /* localStorage may be unavailable */
    }
    set({ visible: false, completed: true });
  },
}));
