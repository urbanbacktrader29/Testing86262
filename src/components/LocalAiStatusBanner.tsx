import { useLocalAiStatus } from "../hooks/useLocalAiStatus";

export default function LocalAiStatusBanner() {
  const status = useLocalAiStatus();

  if (status.state === "unsupported") {
    return (
      <div className="bg-red-500/10 border-b border-red-500/30 text-red-300 text-xs px-4 py-2 text-center">
        Dein Browser unterstützt WebGPU nicht — die lokale KI-Analyse funktioniert nicht. Bitte aktuelles Chrome oder
        Edge auf Desktop/Laptop verwenden.
      </div>
    );
  }

  if (status.state === "error") {
    return (
      <div className="bg-red-500/10 border-b border-red-500/30 text-red-300 text-xs px-4 py-2 text-center">
        Lokales KI-Modell konnte nicht geladen werden{status.error ? `: ${status.error}` : ""}.
      </div>
    );
  }

  if (status.state === "loading") {
    return (
      <div className="bg-sky-500/10 border-b border-sky-500/30 text-sky-200 text-xs px-4 py-2 flex items-center gap-3">
        <span className="shrink-0">{status.text || "Lokales KI-Modell wird geladen…"}</span>
        <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden max-w-xs">
          <div className="h-full bg-sky-400 transition-all" style={{ width: `${Math.round(status.progress * 100)}%` }} />
        </div>
        <span className="shrink-0">{Math.round(status.progress * 100)}%</span>
      </div>
    );
  }

  return null;
}
