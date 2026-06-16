import { useEffect } from "react";
import { AppShell } from "./app/AppShell";
import { CrashRecovery } from "./features/dashboard/CrashRecovery";
import { useSettingsStore } from "./store/settings";
import { useEventLogStore } from "./store/eventLog";
import { useStartOnboarding } from "./features/onboarding/OnboardingTour";

export default function App() {
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const checkOrphanedLog = useEventLogStore((s) => s.checkOrphanedLog);

  useEffect(() => {
    void loadSettings();
    checkOrphanedLog();
  }, [loadSettings, checkOrphanedLog]);

  useStartOnboarding();

  return (
    <>
      <AppShell />
      <CrashRecovery />
    </>
  );
}
