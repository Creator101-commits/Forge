import { create } from "zustand";
import { PRIMITIVE_DEFS } from "@/features/cad/primitives";

export type TransformMode = "select" | "translate" | "rotate" | "scale";
export type CadView = "perspective" | "top" | "front" | "right";

let _nextId = 1;
function genId() {
  return `cad_${_nextId++}`;
}

export interface CadObject {
  id: string;
  parentId: string | null;
  name: string;
  kind: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  locked: boolean;
  hidden: boolean;
}

export interface CadState {
  objects: CadObject[];
  selectedId: string | null;
  transformMode: TransformMode;
  view: CadView;
  snapEnabled: boolean;
  snapStep: number;
  seq: number;

  addObject: (kind: string, name?: string) => string;
  removeObject: (id: string) => void;
  updateTransform: (
    id: string,
    position?: [number, number, number],
    rotation?: [number, number, number],
    scale?: [number, number, number],
  ) => void;
  updateProperty: (
    id: string,
    changes: Partial<Pick<CadObject, "name" | "color" | "hidden" | "locked">>,
  ) => void;
  select: (id: string | null) => void;
  setTransformMode: (mode: TransformMode) => void;
  setView: (view: CadView) => void;
  toggleSnap: () => void;
  setSnapStep: (step: number) => void;
  duplicate: (id: string) => string;
  group: (ids: string[]) => string;
  ungroup: (id: string) => void;
  reset: () => void;
}

export const useCadStore = create<CadState>((set, get) => ({
  objects: [],
  selectedId: null,
  transformMode: "select",
  view: "perspective",
  snapEnabled: true,
  snapStep: 0.5,
  seq: 1,

  addObject: (kind, name) => {
    const def = PRIMITIVE_DEFS.find((d) => d.kind === kind);
    const rootCount = get().objects.filter((o) => o.parentId === null).length;
    const id = genId();
    const obj: CadObject = {
      id,
      parentId: null,
      name: name ?? (def?.label ?? kind),
      kind,
      position: [rootCount * 2.5, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: def?.defaultColor ?? "#888",
      locked: false,
      hidden: false,
    };
    set((s) => ({
      objects: [...s.objects, obj],
      selectedId: id,
      seq: s.seq + 1,
    }));
    return id;
  },

  removeObject: (id) =>
    set((s) => {
      const ids = new Set<string>();
      const collect = (parentId: string) => {
        ids.add(parentId);
        for (const o of s.objects) {
          if (o.parentId === parentId) collect(o.id);
        }
      };
      collect(id);
      return {
        objects: s.objects.filter((o) => !ids.has(o.id)),
        selectedId: ids.has(s.selectedId ?? "") ? null : s.selectedId,
      };
    }),

  updateTransform: (id, position, rotation, scale) =>
    set((s) => ({
      objects: s.objects.map((o) =>
        o.id === id
          ? {
              ...o,
              position: position ?? o.position,
              rotation: rotation ?? o.rotation,
              scale: scale ?? o.scale,
            }
          : o,
      ),
    })),

  updateProperty: (id, changes) =>
    set((s) => ({
      objects: s.objects.map((o) => (o.id === id ? { ...o, ...changes } : o)),
    })),

  select: (id) => set({ selectedId: id }),

  setTransformMode: (mode) => set({ transformMode: mode }),

  setView: (view) => set({ view }),

  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),

  setSnapStep: (step) => set({ snapStep: step }),

  duplicate: (id) => {
    const src = get().objects.find((o) => o.id === id);
    if (!src) return "";
    const newId = genId();
    const dup: CadObject = {
      ...src,
      id: newId,
      name: `${src.name} (copy)`,
      position: [src.position[0] + 1, src.position[1] + 1, src.position[2]],
    };
    set((s) => ({
      objects: [...s.objects, dup],
      selectedId: newId,
      seq: s.seq + 1,
    }));
    return newId;
  },

  group: (ids) => {
    if (ids.length < 2) return "";
    const name = "Group";
    const groupId = genId();
    const group: CadObject = {
      id: groupId,
      parentId: null,
      name,
      kind: "group",
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: "#888",
      locked: false,
      hidden: false,
    };
    const idSet = new Set(ids);
    set((s) => ({
      objects: [
        ...s.objects.map((o) => (idSet.has(o.id) ? { ...o, parentId: groupId } : o)),
        group,
      ],
      selectedId: groupId,
      seq: s.seq + 1,
    }));
    return groupId;
  },

  ungroup: (id) =>
    set((s) => ({
      objects: s.objects.map((o) =>
        o.parentId === id ? { ...o, parentId: null } : o,
      ).filter((o) => o.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  reset: () =>
    set({
      objects: [],
      selectedId: null,
      transformMode: "select",
      view: "perspective",
      snapEnabled: true,
      snapStep: 0.5,
      seq: 1,
    }),
}));
