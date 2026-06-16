import * as THREE from "three";

export interface PrimitiveDef {
  kind: string;
  label: string;
  defaultColor: string;
  defaultArgs: number[];
}

export const PRIMITIVE_DEFS: PrimitiveDef[] = [
  { kind: "box", label: "Box", defaultColor: "#2dd4bf", defaultArgs: [1, 1, 1] },
  { kind: "cylinder", label: "Cylinder", defaultColor: "#f59e0b", defaultArgs: [0.5, 1, 32] },
  { kind: "sphere", label: "Sphere", defaultColor: "#3b82f6", defaultArgs: [0.5, 32, 32] },
  { kind: "cone", label: "Cone", defaultColor: "#ef4444", defaultArgs: [0.5, 1, 32] },
  { kind: "torus", label: "Torus", defaultColor: "#a855f7", defaultArgs: [0.5, 0.2, 16, 32] },
  { kind: "plane", label: "Plane", defaultColor: "#10b981", defaultArgs: [1, 1] },
];

const GEOMETRY_CACHE = new Map<string, THREE.BufferGeometry>();

function cacheKey(kind: string, args: number[]): string {
  return `${kind}_${args.join("_")}`;
}

export function createGeometry(kind: string, args?: number[]): THREE.BufferGeometry {
  const a = args ?? PRIMITIVE_DEFS.find((d) => d.kind === kind)?.defaultArgs ?? [1, 1, 1];
  const key = cacheKey(kind, a);
  const cached = GEOMETRY_CACHE.get(key);
  if (cached) return cached;

  let geo: THREE.BufferGeometry;
  switch (kind) {
    case "box":
      geo = new THREE.BoxGeometry(...(a as [number, number, number]));
      break;
    case "cylinder":
      geo = new THREE.CylinderGeometry(...(a as [number, number, number]));
      break;
    case "sphere":
      geo = new THREE.SphereGeometry(...(a as [number, number, number]));
      break;
    case "cone":
      geo = new THREE.ConeGeometry(...(a as [number, number, number]));
      break;
    case "torus":
      geo = new THREE.TorusGeometry(...(a as [number, number, number, number]));
      break;
    case "plane":
      geo = new THREE.PlaneGeometry(...(a as [number, number]));
      break;
    default:
      geo = new THREE.BoxGeometry(1, 1, 1);
  }
  GEOMETRY_CACHE.set(key, geo);
  return geo;
}
