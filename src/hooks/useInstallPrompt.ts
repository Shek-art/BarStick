import { useCallback, useEffect, useState } from "react";

/**
 * Установка приложения как PWA (ярлык в меню «Пуск» Windows).
 * beforeinstallprompt доступен в Chromium-браузерах (Edge/Chrome).
 */
export function useInstallPrompt(onInstalled?: () => void) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalledEvt = () => {
      setInstalled(true);
      setDeferred(null);
      onInstalled?.();
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalledEvt);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalledEvt);
    };
  }, [onInstalled]);

  const install = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!deferred) return "unavailable";
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      setDeferred(null);
      return "accepted";
    }
    return "dismissed";
  }, [deferred]);

  return {
    canInstall: deferred !== null,
    installed: installed || window.matchMedia?.("(display-mode: standalone)").matches === true,
    install,
  };
}
