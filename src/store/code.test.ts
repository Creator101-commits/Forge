import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/ipc", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

import * as ipc from "@/lib/ipc";
import { useCodeStore, isDirty } from "./code";

beforeEach(() => {
  useCodeStore.setState({ tabs: [], activePath: null });
  vi.clearAllMocks();
});

describe("code store", () => {
  it("opens files into tabs with detected language", async () => {
    vi.mocked(ipc.readFile).mockResolvedValueOnce("void setup(){}");
    await useCodeStore.getState().openFile("code/main.ino");
    const tab = useCodeStore.getState().tabs[0]!;
    expect(tab.name).toBe("main.ino");
    expect(tab.language).toBe("cpp");
    expect(useCodeStore.getState().activePath).toBe("code/main.ino");
  });

  it("does not reopen an already-open file, just activates it", async () => {
    vi.mocked(ipc.readFile).mockResolvedValue("x");
    await useCodeStore.getState().openFile("a.c");
    await useCodeStore.getState().openFile("b.c");
    await useCodeStore.getState().openFile("a.c");
    expect(useCodeStore.getState().tabs).toHaveLength(2);
    expect(useCodeStore.getState().activePath).toBe("a.c");
    expect(ipc.readFile).toHaveBeenCalledTimes(2);
  });

  it("keeps dirty state per-tab when switching tabs", async () => {
    vi.mocked(ipc.readFile).mockResolvedValue("orig");
    await useCodeStore.getState().openFile("a.c");
    await useCodeStore.getState().openFile("b.c");

    useCodeStore.getState().updateContent("a.c", "edited");
    useCodeStore.getState().setActive("b.c");
    useCodeStore.getState().setActive("a.c");

    const a = useCodeStore.getState().tabs.find((t) => t.path === "a.c")!;
    const b = useCodeStore.getState().tabs.find((t) => t.path === "b.c")!;
    expect(isDirty(a)).toBe(true);
    expect(isDirty(b)).toBe(false);
  });

  it("saving clears the dirty flag and persists via IPC", async () => {
    vi.mocked(ipc.readFile).mockResolvedValue("orig");
    vi.mocked(ipc.writeFile).mockResolvedValue(undefined);
    await useCodeStore.getState().openFile("a.c");
    useCodeStore.getState().updateContent("a.c", "new content");

    await useCodeStore.getState().saveActive();
    expect(ipc.writeFile).toHaveBeenCalledWith("a.c", "new content");
    const a = useCodeStore.getState().tabs.find((t) => t.path === "a.c")!;
    expect(isDirty(a)).toBe(false);
  });

  it("closing the active tab activates a neighbor", async () => {
    vi.mocked(ipc.readFile).mockResolvedValue("x");
    await useCodeStore.getState().openFile("a.c");
    await useCodeStore.getState().openFile("b.c");
    await useCodeStore.getState().openFile("c.c");

    useCodeStore.getState().setActive("b.c");
    useCodeStore.getState().closeTab("b.c");
    expect(useCodeStore.getState().tabs.map((t) => t.path)).toEqual(["a.c", "c.c"]);
    expect(useCodeStore.getState().activePath).toBe("c.c");
  });

  it("closing the last tab clears the active path", async () => {
    vi.mocked(ipc.readFile).mockResolvedValue("x");
    await useCodeStore.getState().openFile("a.c");
    useCodeStore.getState().closeTab("a.c");
    expect(useCodeStore.getState().activePath).toBeNull();
    expect(useCodeStore.getState().tabs).toHaveLength(0);
  });
});
