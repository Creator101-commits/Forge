export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
}

/** Starter templates shown on the dashboard. Wired to real scaffolding later;
 * for M1 selecting one pre-fills the new-project name. */
export const TEMPLATES: readonly ProjectTemplate[] = [
  {
    id: "blank",
    name: "Blank Project",
    description: "Empty project with the standard workspace folders.",
  },
  {
    id: "temperature-monitor",
    name: "Temperature Monitor",
    description: "The reference build: sensor + MCU schematic, PCB, firmware, BOM.",
  },
  { id: "blink", name: "Blink", description: "Minimal firmware starter for a single LED." },
] as const;
