import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "krypto-watchlist";

function readStoredWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<string[]>(() => readStoredWatchlist());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
  }, [watchlist]);

  const toggle = useCallback((id: string) => {
    setWatchlist((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const isWatched = useCallback((id: string) => watchlist.includes(id), [watchlist]);

  return { watchlist, toggle, isWatched };
}
