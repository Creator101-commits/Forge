import type { CadObject } from "@/store/cad";

export interface HardwareDef {
  id: string;
  name: string;
  kind: string;
  label: string;
  dimensions: [number, number, number];
  color: string;
}

export const HARDWARE_DEFS: HardwareDef[] = [
  { id: "uno", name: "Arduino Uno", kind: "box", label: "Uno", dimensions: [68.6, 53.4, 15], color: "#00979c" },
  { id: "nano", name: "Arduino Nano", kind: "box", label: "Nano", dimensions: [45, 18, 15], color: "#00979c" },
  { id: "breadboard", name: "Breadboard", kind: "box", label: "Breadboard", dimensions: [165, 55, 8.5], color: "#d4d4d4" },
  { id: "servo", name: "Servo Motor", kind: "box", label: "Servo", dimensions: [40, 20, 36], color: "#333333" },
  { id: "led", name: "LED", kind: "cylinder", label: "LED", dimensions: [5, 8, 5], color: "#ff0000" },
  { id: "resistor", name: "Resistor", kind: "cylinder", label: "Resistor", dimensions: [2, 6, 2], color: "#b8860b" },
  { id: "capacitor", name: "Capacitor", kind: "cylinder", label: "Capacitor", dimensions: [8, 12, 8], color: "#4169e1" },
  { id: "button", name: "Push Button", kind: "box", label: "Button", dimensions: [12, 12, 6], color: "#e74c3c" },
  { id: "sensor", name: "Sensor Module", kind: "box", label: "Sensor", dimensions: [25, 15, 10], color: "#2ecc71" },
  { id: "motor", name: "DC Motor", kind: "cylinder", label: "Motor", dimensions: [28, 40, 28], color: "#34495e" },
];

export function hardwareToCadObject(def: HardwareDef): Omit<CadObject, "id" | "seq"> {
  const [dx, dy, dz] = def.dimensions;
  const scale = 0.1;
  return {
    parentId: null,
    name: def.name,
    kind: def.kind,
    position: [0, (dy * scale) / 2, 0],
    rotation: [0, 0, 0],
    scale: [dx * scale, dy * scale, dz * scale],
    color: def.color,
    locked: false,
    hidden: false,
  };
}
