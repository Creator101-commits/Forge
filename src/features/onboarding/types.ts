import { useEffect } from "react";
import { useOnboardingStore } from "@/store/onboarding";

export interface TourStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
  placement?: "right" | "left" | "bottom" | "top" | "center";
}

export const ONBOARDING_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Forge",
    description:
      "An AI-native hardware engineering IDE. Let's take a quick tour of the key areas you'll use every day.",
    placement: "center",
  },
  {
    id: "activity-rail",
    title: "Activity Rail",
    description:
      "The left rail (Cmd+1–9) switches between all workspaces: CAD, Circuit, PCB, Code, BOM, AI, Export, Compile, and Settings.",
    targetSelector: "[data-testid='activity-rail']",
    placement: "right",
  },
  {
    id: "workspace",
    title: "Workspace Area",
    description:
      "The main area shows each workspace. Drag to reorder tabs and right-click for contextual actions like zoom, fit, and properties.",
    targetSelector: "[role='main']",
    placement: "left",
  },
  {
    id: "command-palette",
    title: "Command Palette",
    description:
      "Press Cmd+K (Ctrl+K on Windows/Linux) to open the command palette. Search for any action: switch workspaces, create projects, export files, and more.",
    targetSelector: "[data-testid='title-bar']",
    placement: "bottom",
  },
  {
    id: "ai-assistant",
    title: "AI Assistant",
    description:
      "The bottom dock's AI tab connects to providers like OpenAI and Anthropic. Ask Forge to generate code, explain circuits, or suggest fixes.",
    targetSelector: "[data-testid='bottom-dock']",
    placement: "top",
  },
  {
    id: "export-compile",
    title: "Export & Compile",
    description:
      "Export schematics as SVG, generate Gerber files for manufacturing, and compile Arduino sketches — all from within Forge.",
    targetSelector: "[data-testid='workspace-export']",
    placement: "bottom",
  },
  {
    id: "ready",
    title: "You're Ready!",
    description:
      "Open the Temperature Monitor demo from the Dashboard or start a new project. Happy building!",
    placement: "center",
  },
];

export function useStartOnboarding() {
  const completed = useOnboardingStore((s) => s.completed);
  const start = useOnboardingStore((s) => s.start);

  useEffect(() => {
    if (!completed) {
      const timer = setTimeout(() => start(), 600);
      return () => clearTimeout(timer);
    }
  }, [completed, start]);
}
