import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { AiProviderInfo } from "@/lib/ipc";

vi.mock("@/lib/ipc", () => ({
  aiListProviders: vi.fn(),
  onEvent: vi.fn(),
  aiApplyPatch: vi.fn(),
  aiRevertPatch: vi.fn(),
}));

import * as ipc from "@/lib/ipc";
import { AiDock } from "./AiDock";
import { useAiStore } from "@/store/ai";

const provider: AiProviderInfo = {
  id: "openai",
  name: "OpenAI",
  capabilities: { supportsStreaming: true, supportsSystemPrompt: true },
  isConfigured: true,
  keyPreview: "sk-…abc",
  models: ["gpt-4", "gpt-3.5-turbo"],
};

beforeEach(() => {
  useAiStore.setState({
    providers: [],
    loaded: false,
    messages: [],
    streaming: false,
    streamContent: "",
    pendingActions: [],
    selectedProvider: null,
    selectedModel: null,
  });
  vi.clearAllMocks();
});

describe("AiDock", () => {
  it("renders the chat dock", () => {
    vi.mocked(ipc.aiListProviders).mockResolvedValue([provider]);
    vi.mocked(ipc.onEvent).mockResolvedValue(() => {});
    render(<AiDock />);
    expect(screen.getByTestId("ai-dock")).toBeInTheDocument();
  });

  it("loads providers on mount", async () => {
    vi.mocked(ipc.aiListProviders).mockResolvedValue([provider]);
    vi.mocked(ipc.onEvent).mockResolvedValue(() => {});
    render(<AiDock />);
    await waitFor(() => expect(ipc.aiListProviders).toHaveBeenCalled());
  });

  it("shows empty state when there are no messages", async () => {
    vi.mocked(ipc.aiListProviders).mockResolvedValue([provider]);
    vi.mocked(ipc.onEvent).mockResolvedValue(() => {});
    render(<AiDock />);
    await waitFor(() => {
      expect(screen.getByText(/Configure a provider/)).toBeInTheDocument();
    });
  });

  it("renders provider and model selectors", async () => {
    vi.mocked(ipc.aiListProviders).mockResolvedValue([provider]);
    vi.mocked(ipc.onEvent).mockResolvedValue(() => {});
    render(<AiDock />);
    await waitFor(() => {
      expect(screen.getByLabelText("AI provider")).toBeInTheDocument();
      expect(screen.getByLabelText("Model")).toBeInTheDocument();
    });
  });

  it("disables chat input when no provider is selected", async () => {
    vi.mocked(ipc.aiListProviders).mockResolvedValue([provider]);
    vi.mocked(ipc.onEvent).mockResolvedValue(() => {});
    render(<AiDock />);
    await waitFor(() => {
      const input = screen.getByLabelText("Chat input");
      expect(input).toBeDisabled();
    });
  });

  it("enables chat input when a provider and model are selected", async () => {
    useAiStore.setState({
      selectedProvider: "openai",
      selectedModel: "gpt-4",
    });
    vi.mocked(ipc.aiListProviders).mockResolvedValue([provider]);
    vi.mocked(ipc.onEvent).mockResolvedValue(() => {});
    render(<AiDock />);
    await waitFor(() => {
      const input = screen.getByLabelText("Chat input");
      expect(input).not.toBeDisabled();
    });
  });

  it("clear button is disabled when there are no messages", async () => {
    vi.mocked(ipc.aiListProviders).mockResolvedValue([provider]);
    vi.mocked(ipc.onEvent).mockResolvedValue(() => {});
    render(<AiDock />);
    await waitFor(() => {
      expect(screen.getByTitle("Clear chat")).toBeDisabled();
    });
  });

  it("shows action card when streamContent has a JSON action", async () => {
    useAiStore.setState({
      selectedProvider: "openai",
      selectedModel: "gpt-4",
      providers: [provider],
      loaded: true,
      streamContent:
        '```json\n{"kind":"createFile","path":"test.ino","content":"void setup() {}"}\n```',
      streaming: false,
    });
    vi.mocked(ipc.aiListProviders).mockResolvedValue([provider]);
    vi.mocked(ipc.onEvent).mockResolvedValue(() => {});
    render(<AiDock />);
    await waitFor(() => {
      expect(screen.getByText("Create file: test.ino")).toBeInTheDocument();
      expect(screen.getByText("Apply")).toBeInTheDocument();
    });
  });

  it("clicking Apply calls aiApplyPatch and shows pending action", async () => {
    vi.mocked(ipc.aiApplyPatch).mockResolvedValue({
      id: "act1",
      action: { kind: "createFile", path: "test.ino" },
      status: "applied",
      description: "Create file: test.ino",
    } as any);
    useAiStore.setState({
      selectedProvider: "openai",
      selectedModel: "gpt-4",
      providers: [provider],
      loaded: true,
      streamContent:
        '```json\n{"kind":"createFile","path":"test.ino","content":"void setup() {}"}\n```',
      streaming: false,
    });
    vi.mocked(ipc.aiListProviders).mockResolvedValue([provider]);
    vi.mocked(ipc.onEvent).mockResolvedValue(() => {});
    render(<AiDock />);
    await waitFor(() => {
      expect(screen.getByText("Apply")).toBeInTheDocument();
    });
    screen.getByText("Apply").click();
    await waitFor(() => {
      expect(ipc.aiApplyPatch).toHaveBeenCalledWith({
        kind: "createFile",
        path: "test.ino",
        content: "void setup() {}",
      });
    });
    await waitFor(() => {
      expect(screen.getByText("applied")).toBeInTheDocument();
      expect(screen.getByTitle("Revert")).toBeInTheDocument();
    });
  });

  it("clicking Revert calls aiRevertPatch and removes pending action", async () => {
    vi.mocked(ipc.aiRevertPatch).mockResolvedValue(undefined);
    useAiStore.setState({
      selectedProvider: "openai",
      selectedModel: "gpt-4",
      providers: [provider],
      loaded: true,
      streaming: false,
      streamContent: "",
      pendingActions: [
        {
          id: "act1",
          action: { kind: "createFile", path: "test.ino" },
          status: "applied",
          description: "Create file: test.ino",
        },
      ],
    });
    vi.mocked(ipc.aiListProviders).mockResolvedValue([provider]);
    vi.mocked(ipc.onEvent).mockResolvedValue(() => {});
    render(<AiDock />);
    await waitFor(() => {
      expect(screen.getByTitle("Revert")).toBeInTheDocument();
    });
    screen.getByTitle("Revert").click();
    await waitFor(() => {
      expect(ipc.aiRevertPatch).toHaveBeenCalledWith("act1");
    });
    await waitFor(() => {
      expect(screen.queryByTitle("Revert")).not.toBeInTheDocument();
    });
  });

  it("action card shows content preview", async () => {
    useAiStore.setState({
      selectedProvider: "openai",
      selectedModel: "gpt-4",
      providers: [provider],
      loaded: true,
      streamContent:
        '```json\n{"kind":"createFile","path":"test.ino","content":"void setup() {}"}\n```',
      streaming: false,
    });
    vi.mocked(ipc.aiListProviders).mockResolvedValue([provider]);
    vi.mocked(ipc.onEvent).mockResolvedValue(() => {});
    render(<AiDock />);
    await waitFor(() => {
      expect(screen.getByText("void setup() {}")).toBeInTheDocument();
    });
  });
});
