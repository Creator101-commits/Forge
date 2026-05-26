import {
  LayoutDashboard,
  Box,
  CircuitBoard,
  Cpu,
  Code2,
  ListChecks,
  Sparkles,
  Share2,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type WorkspaceId =
  | "dashboard"
  | "cad"
  | "circuit"
  | "pcb"
  | "code"
  | "bom"
  | "ai"
  | "export"
  | "settings";

export interface WorkspaceDef {
  id: WorkspaceId;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
}

export const WORKSPACES: readonly WorkspaceDef[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, shortcut: "1" },
  { id: "cad", label: "CAD", icon: Box, shortcut: "2" },
  { id: "circuit", label: "Circuit", icon: CircuitBoard, shortcut: "3" },
  { id: "pcb", label: "PCB", icon: Cpu, shortcut: "4" },
  { id: "code", label: "Code", icon: Code2, shortcut: "5" },
  { id: "bom", label: "BOM", icon: ListChecks, shortcut: "6" },
  { id: "ai", label: "AI", icon: Sparkles, shortcut: "7" },
  { id: "export", label: "Export", icon: Share2, shortcut: "8" },
  { id: "settings", label: "Settings", icon: Settings, shortcut: "9" },
] as const;
