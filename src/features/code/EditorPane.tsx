import { useEffect, useRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { FileCode2 } from "lucide-react";
import { useCodeStore } from "@/store/code";

type MonacoEditor = Parameters<OnMount>[0];

export function EditorPane() {
  const tabs = useCodeStore((s) => s.tabs);
  const activePath = useCodeStore((s) => s.activePath);
  const updateContent = useCodeStore((s) => s.updateContent);
  const saveActive = useCodeStore((s) => s.saveActive);
  const pendingReveal = useCodeStore((s) => s.pendingReveal);
  const consumeReveal = useCodeStore((s) => s.consumeReveal);
  const editorRef = useRef<MonacoEditor | null>(null);

  const active = tabs.find((t) => t.path === activePath) ?? null;

  useEffect(() => {
    if (!pendingReveal || !editorRef.current) return;
    if (pendingReveal.path !== activePath) return;
    const editor = editorRef.current;
    editor.revealLineInCenter(pendingReveal.line);
    editor.setPosition({ lineNumber: pendingReveal.line, column: pendingReveal.column });
    editor.focus();
    consumeReveal();
  }, [pendingReveal, activePath, consumeReveal]);

  const onMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      void saveActive();
    });
  };

  if (!active) {
    return (
      <div data-testid="editor-empty" className="grid h-full w-full place-items-center bg-bg-0">
        <div className="flex flex-col items-center gap-2 text-text-3">
          <FileCode2 className="h-6 w-6" aria-hidden="true" />
          <p className="text-sm">Open a file from the explorer to start editing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-bg-0">
      <Editor
        path={active.path}
        language={active.language}
        value={active.content}
        theme="vs-dark"
        onMount={onMount}
        onChange={(value) => updateContent(active.path, value ?? "")}
        options={{
          fontSize: 13,
          fontFamily: "var(--font-mono, JetBrains Mono), ui-monospace, monospace",
          minimap: { enabled: false },
          smoothScrolling: true,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
        }}
      />
    </div>
  );
}
