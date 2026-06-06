import { useEffect } from "react";
import { AppShell } from "./app/AppShell";
import { useSettingsStore } from "./store/settings";

export default function App() {
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  return <AppShell />;
}
