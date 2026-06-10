import { create } from "zustand";
import * as ipc from "@/lib/ipc";
import type { AiProviderInfo, ChatMessage, ChatDelta, ActionRecord, AiAction } from "@/lib/ipc";

export interface AiState {
  providers: AiProviderInfo[];
  loaded: boolean;
  // Chat state
  messages: ChatMessage[];
  streaming: boolean;
  streamContent: string;
  // Action state
  pendingActions: ActionRecord[];
  // Selected provider/model
  selectedProvider: string | null;
  selectedModel: string | null;
  // Actions
  loadProviders: () => Promise<void>;
  setProvider: (id: string, key: string, baseUrl?: string) => Promise<AiProviderInfo>;
  testConnection: (id: string) => Promise<boolean>;
  sendMessage: (providerId: string, model: string, content: string) => Promise<void>;
  clearChat: () => void;
  applyAction: (action: AiAction) => Promise<ActionRecord>;
  revertAction: (actionId: string) => Promise<void>;
  selectProvider: (id: string | null) => void;
  selectModel: (model: string | null) => void;
}

export const useAiStore = create<AiState>((set, get) => ({
  providers: [],
  loaded: false,
  messages: [],
  streaming: false,
  streamContent: "",
  pendingActions: [],
  selectedProvider: null,
  selectedModel: null,

  loadProviders: async () => {
    try {
      const providers = await ipc.aiListProviders();
      set({ providers, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  setProvider: async (id, key, baseUrl) => {
    const info = await ipc.aiSetProvider(id, key, baseUrl);
    await get().loadProviders();
    return info;
  },

  testConnection: async (id) => {
    try {
      await ipc.aiTestConnection(id);
      return true;
    } catch {
      return false;
    }
  },

  sendMessage: async (providerId, model, content) => {
    const state = get();
    if (state.streaming) return;

    const userMsg: ChatMessage = { role: "user", content };
    const messages = [...state.messages, userMsg];
    set({ messages, streaming: true, streamContent: "" });

    // Subscribe to streaming events
    const unlistenDelta = await ipc.onEvent<ChatDelta>("ai://delta", (delta) => {
      set((s) => ({ streamContent: s.streamContent + delta.content }));
    });

    const unlistenDone = await ipc.onEvent("ai://done", () => {
      const final = get();
      const assistantMsg: ChatMessage = { role: "assistant", content: final.streamContent };
      set({
        messages: [...final.messages, assistantMsg],
        streaming: false,
        streamContent: "",
      });
      unlistenDelta();
      unlistenDone();
      unlistenError();
    });

    const unlistenError = await ipc.onEvent<{ message: string }>("ai://error", (err) => {
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: `Error: ${err.message}`,
      };
      set((s) => ({
        messages: [...s.messages, assistantMsg],
        streaming: false,
        streamContent: "",
      }));
      unlistenDelta();
      unlistenDone();
      unlistenError();
    });

    try {
      await ipc.aiChat(providerId, {
        messages,
        model,
        temperature: 0.7,
        systemPrompt: null,
      });
    } catch (e) {
      set((s) => ({
        messages: [...s.messages, { role: "assistant", content: `Error: ${String(e)}` }],
        streaming: false,
        streamContent: "",
      }));
    }
  },

  clearChat: () => set({ messages: [], streamContent: "", pendingActions: [] }),

  applyAction: async (action) => {
    const record = await ipc.aiApplyPatch(action);
    set((s) => ({ pendingActions: [...s.pendingActions, record] }));
    return record;
  },

  revertAction: async (actionId) => {
    await ipc.aiRevertPatch(actionId);
    set((s) => ({
      pendingActions: s.pendingActions.filter((a) => a.id !== actionId),
    }));
  },

  selectProvider: (id: string | null) => set({ selectedProvider: id, selectedModel: null }),
  selectModel: (model: string | null) => set({ selectedModel: model }),
}));
