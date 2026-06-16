/**
 * Starter PCB footprint library (M6). Pad offsets are in millimetres relative to
 * the footprint origin; the canvas scales mm→px for rendering.
 */

export interface PadDef {
  name: string;
  /** Offset from footprint origin, mm. */
  dx: number;
  dy: number;
  /** Pad size, mm. */
  w: number;
  h: number;
}

export interface FootprintDef {
  id: string;
  name: string;
  /** Default reference-designator prefix. */
  refPrefix: string;
  pads: PadDef[];
}

function dual(count: number, pitch: number, rowGap: number, w = 1.6, h = 0.9): PadDef[] {
  // Two rows of `count/2` pads (DIP/SOIC style).
  const per = count / 2;
  const pads: PadDef[] = [];
  const x0 = -((per - 1) * pitch) / 2;
  for (let i = 0; i < per; i++) {
    pads.push({ name: String(i + 1), dx: x0 + i * pitch, dy: rowGap / 2, w, h });
  }
  for (let i = 0; i < per; i++) {
    pads.push({ name: String(count - i), dx: x0 + i * pitch, dy: -rowGap / 2, w, h });
  }
  return pads;
}

export const FOOTPRINTS: readonly FootprintDef[] = [
  {
    id: "r0805",
    name: "0805 chip",
    refPrefix: "R",
    pads: [
      { name: "1", dx: -1.0, dy: 0, w: 1.0, h: 1.3 },
      { name: "2", dx: 1.0, dy: 0, w: 1.0, h: 1.3 },
    ],
  },
  {
    id: "led0805",
    name: "LED 0805",
    refPrefix: "D",
    pads: [
      { name: "A", dx: -1.0, dy: 0, w: 1.0, h: 1.3 },
      { name: "K", dx: 1.0, dy: 0, w: 1.0, h: 1.3 },
    ],
  },
  {
    id: "hdr1x4",
    name: "Header 1x4",
    refPrefix: "J",
    pads: [0, 1, 2, 3].map((i) => ({
      name: String(i + 1),
      dx: -3.81 + i * 2.54,
      dy: 0,
      w: 1.5,
      h: 1.5,
    })),
  },
  { id: "soic8", name: "SOIC-8", refPrefix: "U", pads: dual(8, 1.27, 5.2) },
  { id: "dip8", name: "DIP-8", refPrefix: "U", pads: dual(8, 2.54, 7.62, 1.6, 1.6) },
];

export const FOOTPRINT_BY_ID: Record<string, FootprintDef> = Object.fromEntries(
  FOOTPRINTS.map((f) => [f.id, f]),
);

export function getFootprint(id: string): FootprintDef | undefined {
  return FOOTPRINT_BY_ID[id];
}
