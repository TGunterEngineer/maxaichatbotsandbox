import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "maxai:developer_mode";
const EVENT_NAME = "maxai:developer_mode_changed";

function read(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function useDeveloperMode(): [boolean, (next: boolean) => void] {
  const [enabled, setEnabled] = useState<boolean>(() => read());

  useEffect(() => {
    const handler = () => setEnabled(read());
    window.addEventListener(EVENT_NAME, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const set = useCallback((next: boolean) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      /* ignore */
    }
    setEnabled(next);
    window.dispatchEvent(new Event(EVENT_NAME));
  }, []);

  return [enabled, set];
}
