import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { useSettingsStore } from "@/store/settings";
import { useAiStore } from "@/store/ai";
import { Check, Loader2 } from "lucide-react";

export function SettingsWorkspace() {
  const settings = useSettingsStore((s) => s.settings);
  const loaded = useSettingsStore((s) => s.loaded);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const update = useSettingsStore((s) => s.updateSettings);

  useEffect(() => {
    if (!loaded) void loadSettings();
  }, [loaded, loadSettings]);

  return (
    <section
      data-testid="workspace-settings"
      className="mx-auto flex h-full w-full max-w-3xl flex-col gap-6 overflow-auto p-8"
    >
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-xl text-text-1">Settings</h1>
        <p className="text-sm text-text-3">Preferences are stored on this machine.</p>
      </header>

      <Group title="Appearance">
        <SegmentedRow
          label="Theme"
          value={settings.theme}
          options={[
            { id: "dark", label: "Dark" },
            { id: "light", label: "Light" },
          ]}
          onChange={(theme) => void update({ theme })}
        />
        <SegmentedRow
          label="Density"
          value={settings.density}
          options={[
            { id: "comfortable", label: "Comfortable" },
            { id: "compact", label: "Compact" },
          ]}
          onChange={(density) => void update({ density })}
        />
        <ToggleRow
          label="Reduce motion"
          description="Disable non-essential animations and transitions."
          checked={settings.reduced_motion}
          onChange={(reduced_motion) => void update({ reduced_motion })}
        />
      </Group>

      <Group title="General">
        <ToggleRow
          label="Anonymous telemetry"
          description="Opt in to anonymous usage metrics. Off by default."
          checked={settings.telemetry_enabled}
          onChange={(telemetry_enabled) => void update({ telemetry_enabled })}
        />
      </Group>

      <Group title="AI Providers">
        <AiProviderSection />
      </Group>
    </section>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel flex flex-col divide-y divide-border-1">
      <div className="px-4 py-2 text-xs uppercase tracking-wider text-text-3">{title}</div>
      {children}
    </div>
  );
}

function Row({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="flex flex-col">
        <span className="text-sm text-text-1">{label}</span>
        {description && <span className="text-xs text-text-3">{description}</span>}
      </div>
      {children}
    </div>
  );
}

function SegmentedRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
}) {
  return (
    <Row label={label}>
      <div
        role="group"
        aria-label={label}
        className="flex rounded-2 border border-border-1 bg-bg-2 p-0.5"
      >
        {options.map((o) => {
          const active = o.id === value;
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.id)}
              className={clsx(
                "rounded-1 px-3 py-1 text-xs transition-colors",
                active ? "bg-accent text-[#04211d]" : "text-text-2 hover:text-text-1",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </Row>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Row label={label} description={description}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={clsx(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-accent" : "bg-border-2",
        )}
      >
        <span
          className={clsx(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
            checked ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </button>
    </Row>
  );
}

function AiProviderSection() {
  const providers = useAiStore((s) => s.providers);
  const loaded = useAiStore((s) => s.loaded);
  const loadProviders = useAiStore((s) => s.loadProviders);
  const setProvider = useAiStore((s) => s.setProvider);
  const testConnection = useAiStore((s) => s.testConnection);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [baseUrls, setBaseUrls] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, boolean | null>>({});

  useEffect(() => {
    if (!loaded) void loadProviders();
  }, [loaded, loadProviders]);

  return (
    <div className="flex flex-col">
      {providers.map((p) => (
        <div key={p.id} className="border-b border-border-1 last:border-b-0">
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="flex flex-col">
              <span className="text-sm text-text-1">{p.name}</span>
              <span className="text-xs text-text-3">
                {p.isConfigured
                  ? `Configured${p.keyPreview ? ` (${p.keyPreview})` : ""}`
                  : "Not configured"}
              </span>
            </div>
            <button
              onClick={() => setExpanded(expanded === p.id ? null : p.id)}
              className={clsx(
                "rounded-2 px-3 py-1 text-xs transition-colors",
                p.isConfigured
                  ? "border border-border-1 text-text-2 hover:text-text-1"
                  : "bg-accent text-[#04211d]",
              )}
            >
              {p.isConfigured ? "Edit" : "Configure"}
            </button>
          </div>

          {expanded === p.id && (
            <div className="flex flex-col gap-3 px-4 pb-3">
              <label className="flex flex-col gap-1 text-xs text-text-3">
                API Key
                <input
                  type="password"
                  placeholder={p.isConfigured ? "•••••••• (leave blank to keep)" : "sk-..."}
                  value={keys[p.id] ?? ""}
                  onChange={(e) => setKeys({ ...keys, [p.id]: e.target.value })}
                  className="input font-mono"
                />
              </label>
              {(p.id === "openai-compat" || p.id === "ollama") && (
                <label className="flex flex-col gap-1 text-xs text-text-3">
                  Base URL{p.id === "openai-compat" ? " (required)" : " (optional)"}
                  <input
                    placeholder={
                      p.id === "ollama"
                        ? "http://localhost:11434/api"
                        : "https://api.example.com/v1"
                    }
                    value={baseUrls[p.id] ?? ""}
                    onChange={(e) => setBaseUrls({ ...baseUrls, [p.id]: e.target.value })}
                    className="input font-mono"
                  />
                </label>
              )}
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const key = keys[p.id];
                    if (!key && !p.isConfigured) return;
                    await setProvider(p.id, key || "", baseUrls[p.id] || undefined);
                    setExpanded(null);
                  }}
                  className="btn-accent text-xs"
                >
                  Save
                </button>
                {p.isConfigured && (
                  <button
                    onClick={async () => {
                      setTesting({ ...testing, [p.id]: true });
                      const ok = await testConnection(p.id);
                      setTesting({ ...testing, [p.id]: false });
                      setResults({ ...results, [p.id]: ok });
                    }}
                    disabled={testing[p.id]}
                    className="btn-ghost flex items-center gap-1 text-xs"
                  >
                    {testing[p.id] ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : results[p.id] !== undefined ? (
                      <Check
                        className={clsx("h-3 w-3", results[p.id] ? "text-ok" : "text-error")}
                      />
                    ) : null}
                    Test Connection
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
