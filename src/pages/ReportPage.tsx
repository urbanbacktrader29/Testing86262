import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import type { CameraType } from "../types";

const TYPES: { value: CameraType; label: string }[] = [
  { value: "mobil", label: "Mobiler Blitzer" },
  { value: "fest", label: "Fester Blitzer" },
  { value: "abschnitt", label: "Abschnittskontrolle" },
];

export default function ReportPage() {
  const { position, addReport } = useApp();
  const navigate = useNavigate();
  const [type, setType] = useState<CameraType>("mobil");
  const [speedLimit, setSpeedLimit] = useState("");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!position) return;
    addReport(position.lat, position.lng, type, speedLimit ? Number(speedLimit) : undefined, note);
    setDone(true);
    setTimeout(() => navigate("/liste"), 900);
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Blitzer melden</h1>
        <p className="text-sm text-slate-400">
          Die Meldung wird an deiner aktuellen Position gespeichert und ist nur auf diesem Gerät sichtbar.
        </p>
      </div>

      {!position && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-300">
          Standort wird benötigt, um eine Meldung zu erstellen. Bitte Standortfreigabe erlauben.
        </div>
      )}

      {done ? (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          Danke! Blitzer wurde gemeldet.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-300 mb-1">Art</legend>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map((t) => (
                <button
                  type="button"
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`rounded-lg px-2 py-2.5 text-xs font-medium border transition-colors ${
                    type === t.value
                      ? "border-emerald-500 bg-emerald-500/15 text-emerald-400"
                      : "border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-300">Tempolimit (optional, km/h)</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={200}
              value={speedLimit}
              onChange={(e) => setSpeedLimit(e.target.value)}
              placeholder="z. B. 50"
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-300">Notiz (optional)</span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="z. B. Straßenname, Fahrtrichtung"
              maxLength={80}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </label>

          <button
            type="submit"
            disabled={!position}
            className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Blitzer melden
          </button>
        </form>
      )}
    </div>
  );
}
