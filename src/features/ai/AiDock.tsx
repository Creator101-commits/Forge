import { useState, useRef, useEffect } from "react";
import { clsx } from "clsx";
import { Send, Bot, User, Check, RotateCcw, Trash2 } from "lucide-react";
import { useAiStore } from "@/store/ai";
import type { AiAction } from "@/lib/ipc";

export function AiDock() {
  const messages = useAiStore((s) => s.messages);
  const streaming = useAiStore((s) => s.streaming);
  const streamContent = useAiStore((s) => s.streamContent);
  const providers = useAiStore((s) => s.providers);
  const loaded = useAiStore((s) => s.loaded);
  const selectedProvider = useAiStore((s) => s.selectedProvider);
  const selectedModel = useAiStore((s) => s.selectedModel);
  const pendingActions = useAiStore((s) => s.pendingActions);
  const sendMessage = useAiStore((s) => s.sendMessage);
  const clearChat = useAiStore((s) => s.clearChat);
  const loadProviders = useAiStore((s) => s.loadProviders);
  const selectProvider = useAiStore((s) => s.selectProvider);
  const selectModel = useAiStore((s) => s.selectModel);
  const applyAction = useAiStore((s) => s.applyAction);
  const revertAction = useAiStore((s) => s.revertAction);

  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loaded) void loadProviders();
  }, [loaded, loadProviders]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamContent]);

  const currentProvider = providers.find((p) => p.id === (selectedProvider ?? ""));
  const models: string[] = currentProvider?.models ?? [];

  const handleSend = () => {
    const trimmed = input.trim();
    const prov = selectedProvider;
    const mdl = selectedModel;
    if (!trimmed || !prov || !mdl || streaming) return;
    setInput("");
    void sendMessage(prov, mdl, trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Try to parse actions from stream content for action cards
  const tryParseAction = (text: string): { action: AiAction; json: string } | null => {
    const match = text.match(/```json\s*\n?(\{[\s\S]*?"kind"[\s\S]*?\})\s*\n?```/);
    if (!match) return null;
    try {
      const json = match[1]!;
      const parsed = JSON.parse(json);
      if (parsed.kind && parsed.path) return { action: parsed as AiAction, json };
    } catch {
      // ignore parse errors
    }
    return null;
  };

  return (
    <div className="flex h-full flex-col" data-testid="ai-dock">
      {/* Provider/model selector bar */}
      <div className="flex items-center gap-2 border-b border-border-1 px-3 py-1.5">
        <select
          aria-label="AI provider"
          value={selectedProvider ?? ""}
          onChange={(e) => selectProvider(e.target.value || null)}
          className="input w-32 py-0.5 text-xs"
        >
          <option value="">Select provider</option>
          {providers.map((p) => (
            <option key={p.id} value={p.id} disabled={!p.isConfigured}>
              {p.name} {!p.isConfigured ? "(not configured)" : ""}
            </option>
          ))}
        </select>
        <select
          aria-label="Model"
          value={selectedModel ?? ""}
          onChange={(e) => selectModel(e.target.value || null)}
          disabled={!selectedProvider}
          className="input w-40 py-0.5 text-xs"
        >
          <option value="">Select model</option>
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <div className="flex-1" />
        <button
          onClick={clearChat}
          disabled={messages.length === 0}
          className="rounded-1 p-1 text-text-3 hover:text-text-1 disabled:opacity-30"
          title="Clear chat"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto px-3 py-2">
        {messages.length === 0 && !streaming && (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs text-text-3">
              Configure a provider in Settings → AI, then start chatting.
            </p>
          </div>
        )}
        <div className="flex flex-col gap-2">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={clsx("flex gap-2 text-xs", msg.role === "user" ? "justify-end" : "")}
            >
              {msg.role !== "user" && <Bot className="mt-0.5 h-4 w-4 shrink-0 text-accent" />}
              <div
                className={clsx(
                  "max-w-[85%] rounded-2 px-2.5 py-1.5",
                  msg.role === "user" ? "bg-accent/15 text-text-1" : "bg-surface-2 text-text-2",
                )}
              >
                <div className="whitespace-pre-wrap break-words">{msg.content}</div>
              </div>
              {msg.role === "user" && <User className="mt-0.5 h-4 w-4 shrink-0 text-text-3" />}
            </div>
          ))}

          {/* Streaming content */}
          {streaming && (
            <div className="flex gap-2 text-xs">
              <Bot className="mt-0.5 h-4 w-4 shrink-0 text-accent animate-pulse" />
              <div className="max-w-[85%] rounded-2 bg-surface-2 px-2.5 py-1.5 text-text-2">
                <div className="whitespace-pre-wrap break-words">{streamContent || "..."}</div>
              </div>
            </div>
          )}

          {/* Action cards from stream */}
          {streamContent && !streaming && tryParseAction(streamContent) && (
            <ActionCard
              action={tryParseAction(streamContent)!.action}
              onApply={async () => {
                const parsed = tryParseAction(streamContent);
                if (parsed) {
                  try {
                    await applyAction(parsed.action);
                  } catch {
                    // ignore apply errors
                  }
                }
              }}
            />
          )}

          {/* Pending actions */}
          {pendingActions.map((record) => (
            <div
              key={record.id}
              className="flex items-center gap-2 rounded-2 border border-border-1 bg-surface-1 px-2.5 py-1.5 text-xs"
            >
              <span className="flex-1 text-text-1">{record.description}</span>
              <span
                className={clsx(
                  "rounded-1 px-1.5 py-0.5 text-[10px]",
                  record.status === "applied" && "bg-ok/20 text-ok",
                )}
              >
                {record.status}
              </span>
              {record.status === "applied" && (
                <button
                  onClick={() => void revertAction(record.id)}
                  className="rounded-1 p-0.5 text-text-3 hover:text-warn"
                  title="Revert"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 border-t border-border-1 px-3 py-2">
        <textarea
          aria-label="Chat input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            selectedProvider && selectedModel
              ? "Ask AI to help with your project..."
              : "Select a provider and model first"
          }
          disabled={(streaming as boolean) || !selectedProvider || !selectedModel}
          rows={2}
          className="input flex-1 resize-none text-xs"
        />
        <button
          onClick={handleSend}
          disabled={
            (!input.trim() as boolean) ||
            (streaming as boolean) ||
            !selectedProvider ||
            !selectedModel
          }
          className="btn-accent flex items-center gap-1 px-3 py-2 text-xs"
        >
          <Send className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function ActionCard({ action, onApply }: { action: AiAction; onApply: () => void }) {
  const [applied, setApplied] = useState(false);

  const description = (() => {
    switch (action.kind) {
      case "createFile":
        return `Create file: ${action.path}`;
      case "updateFile":
        return `Update file: ${action.path}`;
      case "deleteFile":
        return `Delete file: ${action.path}`;
      case "patchRange":
        return `Patch ${action.path} lines ${action.startLine}-${action.endLine}`;
      case "insertBefore":
        return `Insert before line ${action.line} in ${action.path}`;
    }
  })();

  return (
    <div className="rounded-2 border border-border-1 bg-surface-1 p-2 text-xs">
      <div className="flex items-center gap-2">
        <span className="flex-1 text-text-1 font-medium">{description}</span>
        {!applied ? (
          <div className="flex gap-1">
            <button
              onClick={() => {
                void onApply();
                setApplied(true);
              }}
              className="flex items-center gap-1 rounded-1 bg-ok/20 px-2 py-0.5 text-[10px] text-ok hover:bg-ok/30"
            >
              <Check className="h-3 w-3" /> Apply
            </button>
          </div>
        ) : (
          <span className="rounded-1 bg-ok/20 px-1.5 py-0.5 text-[10px] text-ok">Applied</span>
        )}
      </div>
      {action.content && (
        <pre className="mt-1.5 max-h-20 overflow-auto rounded-1 bg-bg-2 p-1.5 text-[11px] text-text-2">
          {action.content.slice(0, 200)}
          {action.content.length > 200 ? "..." : ""}
        </pre>
      )}
    </div>
  );
}
