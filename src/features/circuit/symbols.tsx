/* eslint-disable react-refresh/only-export-components -- data module: exports the symbol library + helpers, not live components. */
import type { ReactNode } from "react";

/**
 * Starter schematic symbol library (M4).
 *
 * Coordinates are in pixels, relative to the symbol's center (0,0). Pins sit on
 * the 10px grid so placed components snap cleanly. `electricalType` mirrors the
 * Rust `circuit_pin.electrical_type` vocabulary
 * ("input" | "output" | "power" | "passive" | "unconnected") so the
 * client-side ERC matches `circuit_ops::run_erc`.
 */

export type ElectricalType = "input" | "output" | "power" | "passive" | "unconnected";

export interface SymbolPin {
  name: string;
  number: string;
  /** Local x relative to symbol center, in px. */
  x: number;
  /** Local y relative to symbol center, in px. */
  y: number;
  electricalType: ElectricalType;
}

export interface SymbolDef {
  id: string;
  name: string;
  category: "Passive" | "Active" | "Power" | "Connector" | "IO";
  /** Reference-designator prefix, e.g. "R" → R1, R2 … */
  refPrefix: string;
  /** Default value placed on the component. */
  defaultValue: string;
  pins: SymbolPin[];
  /** Symbol body, drawn in local (center-origin) coordinates. */
  body: ReactNode;
}

const stroke = { stroke: "currentColor", strokeWidth: 1.5, fill: "none" } as const;

export const SYMBOLS: readonly SymbolDef[] = [
  {
    id: "resistor",
    name: "Resistor",
    category: "Passive",
    refPrefix: "R",
    defaultValue: "10k",
    pins: [
      { name: "1", number: "1", x: -30, y: 0, electricalType: "passive" },
      { name: "2", number: "2", x: 30, y: 0, electricalType: "passive" },
    ],
    body: (
      <>
        <line x1={-30} y1={0} x2={-18} y2={0} {...stroke} />
        <rect x={-18} y={-7} width={36} height={14} {...stroke} />
        <line x1={18} y1={0} x2={30} y2={0} {...stroke} />
      </>
    ),
  },
  {
    id: "capacitor",
    name: "Capacitor",
    category: "Passive",
    refPrefix: "C",
    defaultValue: "100n",
    pins: [
      { name: "1", number: "1", x: -20, y: 0, electricalType: "passive" },
      { name: "2", number: "2", x: 20, y: 0, electricalType: "passive" },
    ],
    body: (
      <>
        <line x1={-20} y1={0} x2={-4} y2={0} {...stroke} />
        <line x1={-4} y1={-12} x2={-4} y2={12} {...stroke} />
        <line x1={4} y1={-12} x2={4} y2={12} {...stroke} />
        <line x1={4} y1={0} x2={20} y2={0} {...stroke} />
      </>
    ),
  },
  {
    id: "inductor",
    name: "Inductor",
    category: "Passive",
    refPrefix: "L",
    defaultValue: "10u",
    pins: [
      { name: "1", number: "1", x: -30, y: 0, electricalType: "passive" },
      { name: "2", number: "2", x: 30, y: 0, electricalType: "passive" },
    ],
    body: (
      <>
        <line x1={-30} y1={0} x2={-18} y2={0} {...stroke} />
        <path d="M -18 0 a 6 6 0 0 1 12 0 a 6 6 0 0 1 12 0 a 6 6 0 0 1 12 0" {...stroke} />
        <line x1={18} y1={0} x2={30} y2={0} {...stroke} />
      </>
    ),
  },
  {
    id: "led",
    name: "LED",
    category: "Active",
    refPrefix: "D",
    defaultValue: "LED",
    pins: [
      { name: "A", number: "1", x: -24, y: 0, electricalType: "passive" },
      { name: "K", number: "2", x: 24, y: 0, electricalType: "passive" },
    ],
    body: (
      <>
        <line x1={-24} y1={0} x2={-10} y2={0} {...stroke} />
        <path d="M -10 -10 L -10 10 L 8 0 Z" {...stroke} />
        <line x1={8} y1={-10} x2={8} y2={10} {...stroke} />
        <line x1={8} y1={0} x2={24} y2={0} {...stroke} />
        <path d="M 2 -12 l 6 -6 m -2 0 h 2 v 2" {...stroke} />
      </>
    ),
  },
  {
    id: "diode",
    name: "Diode",
    category: "Active",
    refPrefix: "D",
    defaultValue: "1N4148",
    pins: [
      { name: "A", number: "1", x: -24, y: 0, electricalType: "passive" },
      { name: "K", number: "2", x: 24, y: 0, electricalType: "passive" },
    ],
    body: (
      <>
        <line x1={-24} y1={0} x2={-10} y2={0} {...stroke} />
        <path d="M -10 -10 L -10 10 L 8 0 Z" {...stroke} />
        <line x1={8} y1={-10} x2={8} y2={10} {...stroke} />
        <line x1={8} y1={0} x2={24} y2={0} {...stroke} />
      </>
    ),
  },
  {
    id: "npn",
    name: "NPN Transistor",
    category: "Active",
    refPrefix: "Q",
    defaultValue: "2N3904",
    pins: [
      { name: "B", number: "1", x: -30, y: 0, electricalType: "input" },
      { name: "C", number: "2", x: 20, y: -30, electricalType: "passive" },
      { name: "E", number: "3", x: 20, y: 30, electricalType: "passive" },
    ],
    body: (
      <>
        <line x1={-30} y1={0} x2={-10} y2={0} {...stroke} />
        <line x1={-10} y1={-16} x2={-10} y2={16} {...stroke} />
        <line x1={-10} y1={-8} x2={20} y2={-30} {...stroke} />
        <line x1={-10} y1={8} x2={20} y2={30} {...stroke} />
        <path d="M 8 18 l 12 12 l -14 2 z" fill="currentColor" stroke="none" />
        <circle cx={0} cy={0} r={22} {...stroke} />
      </>
    ),
  },
  {
    id: "nmos",
    name: "N-MOSFET",
    category: "Active",
    refPrefix: "Q",
    defaultValue: "2N7000",
    pins: [
      { name: "G", number: "1", x: -30, y: 0, electricalType: "input" },
      { name: "D", number: "2", x: 20, y: -30, electricalType: "passive" },
      { name: "S", number: "3", x: 20, y: 30, electricalType: "passive" },
    ],
    body: (
      <>
        <line x1={-30} y1={0} x2={-14} y2={0} {...stroke} />
        <line x1={-14} y1={-16} x2={-14} y2={16} {...stroke} />
        <line x1={-8} y1={-16} x2={-8} y2={16} {...stroke} />
        <line x1={-8} y1={-12} x2={20} y2={-12} {...stroke} />
        <line x1={20} y1={-12} x2={20} y2={-30} {...stroke} />
        <line x1={-8} y1={12} x2={20} y2={12} {...stroke} />
        <line x1={20} y1={12} x2={20} y2={30} {...stroke} />
      </>
    ),
  },
  {
    id: "regulator",
    name: "Voltage Regulator",
    category: "Active",
    refPrefix: "U",
    defaultValue: "AMS1117-3.3",
    pins: [
      { name: "IN", number: "1", x: -40, y: 0, electricalType: "power" },
      { name: "GND", number: "2", x: 0, y: 30, electricalType: "power" },
      { name: "OUT", number: "3", x: 40, y: 0, electricalType: "power" },
    ],
    body: (
      <>
        <rect x={-30} y={-20} width={60} height={40} {...stroke} />
        <line x1={-40} y1={0} x2={-30} y2={0} {...stroke} />
        <line x1={30} y1={0} x2={40} y2={0} {...stroke} />
        <line x1={0} y1={20} x2={0} y2={30} {...stroke} />
      </>
    ),
  },
  {
    id: "button",
    name: "Push Button",
    category: "IO",
    refPrefix: "SW",
    defaultValue: "SW",
    pins: [
      { name: "1", number: "1", x: -30, y: 0, electricalType: "passive" },
      { name: "2", number: "2", x: 30, y: 0, electricalType: "passive" },
    ],
    body: (
      <>
        <line x1={-30} y1={0} x2={-12} y2={0} {...stroke} />
        <line x1={12} y1={0} x2={30} y2={0} {...stroke} />
        <line x1={-12} y1={0} x2={-12} y2={-8} {...stroke} />
        <line x1={12} y1={0} x2={12} y2={-8} {...stroke} />
        <line x1={-16} y1={-8} x2={16} y2={-8} {...stroke} />
      </>
    ),
  },
  {
    id: "header2",
    name: "2-Pin Header",
    category: "Connector",
    refPrefix: "J",
    defaultValue: "CONN_2",
    pins: [
      { name: "1", number: "1", x: -30, y: -10, electricalType: "passive" },
      { name: "2", number: "2", x: -30, y: 10, electricalType: "passive" },
    ],
    body: (
      <>
        <rect x={-20} y={-18} width={20} height={36} {...stroke} />
        <line x1={-30} y1={-10} x2={-20} y2={-10} {...stroke} />
        <line x1={-30} y1={10} x2={-20} y2={10} {...stroke} />
      </>
    ),
  },
  {
    id: "gnd",
    name: "GND",
    category: "Power",
    refPrefix: "GND",
    defaultValue: "GND",
    pins: [{ name: "GND", number: "1", x: 0, y: -10, electricalType: "power" }],
    body: (
      <>
        <line x1={0} y1={-10} x2={0} y2={0} {...stroke} />
        <line x1={-12} y1={0} x2={12} y2={0} {...stroke} />
        <line x1={-7} y1={5} x2={7} y2={5} {...stroke} />
        <line x1={-3} y1={10} x2={3} y2={10} {...stroke} />
      </>
    ),
  },
  {
    id: "vcc",
    name: "VCC",
    category: "Power",
    refPrefix: "VCC",
    defaultValue: "+5V",
    pins: [{ name: "VCC", number: "1", x: 0, y: 10, electricalType: "power" }],
    body: (
      <>
        <line x1={0} y1={10} x2={0} y2={0} {...stroke} />
        <line x1={-10} y1={0} x2={10} y2={0} {...stroke} />
        <line x1={-10} y1={0} x2={0} y2={-10} {...stroke} />
        <line x1={10} y1={0} x2={0} y2={-10} {...stroke} />
      </>
    ),
  },
];

export const SYMBOL_BY_ID: Record<string, SymbolDef> = Object.fromEntries(
  SYMBOLS.map((s) => [s.id, s]),
);

export function getSymbol(id: string): SymbolDef | undefined {
  return SYMBOL_BY_ID[id];
}
