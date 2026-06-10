import { Sparkles } from "lucide-react";

export function AiWorkspace() {
  return (
    <section data-testid="workspace-ai" className="flex h-full items-center justify-center bg-bg-1">
      <div className="flex flex-col items-center gap-3 text-text-3">
        <Sparkles className="h-12 w-12 text-accent opacity-30" />
        <div className="text-center text-xs">
          <p className="text-text-2 font-medium">AI Assistant</p>
          <p>The AI chat and action panel is available in the bottom dock.</p>
          <p className="mt-1 text-text-3">Press the AI tab below or use the activity rail icon.</p>
        </div>
      </div>
    </section>
  );
}
