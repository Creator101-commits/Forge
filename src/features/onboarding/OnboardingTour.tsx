import { useEffect, useCallback, useState } from "react";
import { clsx } from "clsx";
import { X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { useOnboardingStore } from "@/store/onboarding";

export interface TourStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
  placement?: "right" | "left" | "bottom" | "top" | "center";
}

const STEPS: TourStep[] = [
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

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia === "function") {
      const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReduced(mql.matches);
      const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    }
  }, []);

  return reduced;
}

export function OnboardingTour() {
  const visible = useOnboardingStore((s) => s.visible);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const next = useOnboardingStore((s) => s.next);
  const prev = useOnboardingStore((s) => s.prev);
  const dismiss = useOnboardingStore((s) => s.dismiss);
  const complete = useOnboardingStore((s) => s.complete);
  const completed = useOnboardingStore((s) => s.completed);
  const goTo = useOnboardingStore((s) => s.goTo);
  const reducedMotion = useReducedMotion();

  const step = STEPS[currentStep];
  if (!step) return null;

  const isFirst = currentStep === 0;
  const isLast = currentStep === STEPS.length - 1;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
          if (!isLast) next();
          break;
        case "ArrowLeft":
        case "ArrowUp":
          if (!isFirst) prev();
          break;
        case "Home":
          goTo(0);
          break;
        case "End":
          goTo(STEPS.length - 1);
          break;
      }
    },
    [isFirst, isLast, next, prev, goTo],
  );

  if (completed || !visible) return null;

  const highlight = step.targetSelector
    ? document.querySelector(step.targetSelector)
    : null;

  return (
    <Dialog.Root open={visible} onOpenChange={(open) => !open && dismiss()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content
          onKeyDown={handleKeyDown}
          className={clsx(
            "fixed z-[91]",
            step.placement === "center" &&
              "left-1/2 top-1/2 w-[min(420px,90vw)] -translate-x-1/2 -translate-y-1/2",
            step.placement === "right" &&
              "left-[52px] top-1/2 w-[min(360px,80vw)] -translate-y-1/2",
            step.placement === "left" &&
              "right-4 top-1/2 w-[min(360px,80vw)] -translate-y-1/2",
            step.placement === "bottom" &&
              "left-1/2 top-[44px] w-[min(360px,80vw)] -translate-x-1/2",
            step.placement === "top" &&
              "left-1/2 bottom-[232px] w-[min(360px,80vw)] -translate-x-1/2",
            "rounded-3 border border-border-1 bg-surface-1 p-5 shadow-2",
            reducedMotion ? "" : "transition-all duration-med",
          )}
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">Onboarding</Dialog.Title>

          {/* Step indicator */}
          <div className="mb-3 flex items-center gap-1.5">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to step ${i + 1}: ${s.title}`}
                className={clsx(
                  "h-1.5 rounded-full transition-all focus-visible:ring-2 focus-visible:ring-accent",
                  i === currentStep
                    ? "w-6 bg-accent"
                    : "w-1.5 bg-border-2 hover:bg-text-3",
                )}
              />
            ))}
            <div className="flex-1" />
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss tour"
              className="rounded-1 p-1 text-text-3 hover:text-text-1 focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Title & description */}
          <h2 className="mb-1 font-display text-base text-text-1">{step.title}</h2>
          <p className="mb-4 text-sm leading-relaxed text-text-2">{step.description}</p>

          {/* Highlight ring around target */}
          {highlight && (
            <div
              className="pointer-events-none absolute rounded-2 ring-2 ring-accent ring-offset-2 ring-offset-bg-0"
              style={{
                left: highlight.getBoundingClientRect().left - 4,
                top: highlight.getBoundingClientRect().top - 4,
                width: highlight.getBoundingClientRect().width + 8,
                height: highlight.getBoundingClientRect().height + 8,
              }}
            />
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-text-3">
              Step {currentStep + 1} of {STEPS.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={dismiss}
                className="btn-ghost text-xs"
              >
                Skip tour
              </button>

              {!isFirst && (
                <button
                  type="button"
                  onClick={prev}
                  className="btn-ghost text-xs"
                >
                  Back
                </button>
              )}

              {isLast ? (
                <button
                  type="button"
                  onClick={complete}
                  className="btn-accent text-xs"
                >
                  Done
                </button>
              ) : (
                <button
                  type="button"
                  onClick={next}
                  className="btn-accent text-xs"
                >
                  Next
                </button>
              )}
            </div>
          </div>

          {/* "Don't show again" */}
          <div className="mt-3 flex items-center gap-2 border-t border-border-1 pt-3">
            <button
              type="button"
              onClick={() => {
                complete();
                dismiss();
              }}
              className="text-[11px] text-text-3 underline-offset-2 hover:text-text-2 hover:underline focus-visible:ring-2 focus-visible:ring-accent"
            >
              Don&apos;t show again
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Starts the onboarding tour (call once on first launch). */
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
