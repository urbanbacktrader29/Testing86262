import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { loadLastNickname, saveIdentity, saveLastNickname } from "../lib/identity";

export default function Home() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState(loadLastNickname());
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<"create" | "join">("create");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedNick = nickname.trim();
    if (!trimmedNick) {
      setError("Bitte einen Namen eingeben.");
      return;
    }
    setBusy(true);
    setError(null);
    saveLastNickname(trimmedNick);

    try {
      if (mode === "create") {
        const { data, error } = await supabase.rpc("create_room", { p_nickname: trimmedNick });
        if (error) throw error;
        const row = data[0];
        saveIdentity(row.code, { playerId: row.player_id, nickname: trimmedNick });
        navigate(`/r/${row.code}`);
      } else {
        const trimmedCode = code.trim().toUpperCase();
        if (trimmedCode.length < 4) {
          setError("Bitte einen gültigen Raum-Code eingeben.");
          setBusy(false);
          return;
        }
        const { data, error } = await supabase.rpc("join_room", {
          p_code: trimmedCode,
          p_nickname: trimmedNick,
        });
        if (error) throw error;
        const row = data[0];
        saveIdentity(trimmedCode, { playerId: row.player_id, nickname: trimmedNick });
        navigate(`/r/${trimmedCode}`);
      }
    } catch (err) {
      const message = (err as { message?: string }).message ?? "";
      if (message.includes("ROOM_NOT_FOUND")) setError("Diesen Raum gibt es nicht.");
      else if (message.includes("ROOM_ALREADY_STARTED")) setError("Das Spiel läuft schon.");
      else setError("Etwas ist schiefgelaufen. Versuch's nochmal.");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-10 safe-top safe-bottom">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-6xl mb-2">🎨</div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: "var(--ink)" }}>
            Doodle Party
          </h1>
          <p className="text-sm opacity-70 mt-1">Malen &amp; Raten mit Freunden</p>
        </div>

        <div className="flex rounded-2xl bg-white/60 p-1 mb-5 shadow-inner">
          <button
            type="button"
            onClick={() => setMode("create")}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition ${
              mode === "create" ? "bg-white shadow" : "opacity-60"
            }`}
            style={{ color: "var(--ink)" }}
          >
            Raum erstellen
          </button>
          <button
            type="button"
            onClick={() => setMode("join")}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition ${
              mode === "join" ? "bg-white shadow" : "opacity-60"
            }`}
            style={{ color: "var(--ink)" }}
          >
            Beitreten
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Dein Name"
            maxLength={20}
            autoComplete="off"
            className="w-full rounded-2xl bg-white px-4 py-4 shadow font-semibold placeholder:opacity-40 outline-none focus:ring-2"
            style={{ color: "var(--ink)" }}
          />
          {mode === "join" && (
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Raum-Code"
              maxLength={6}
              autoComplete="off"
              className="w-full rounded-2xl bg-white px-4 py-4 shadow font-semibold tracking-[0.3em] uppercase placeholder:opacity-40 placeholder:tracking-normal outline-none focus:ring-2"
              style={{ color: "var(--ink)" }}
            />
          )}

          {error && <p className="text-sm text-center font-semibold text-rose-500">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl py-4 font-black text-lg shadow-lg active:scale-[0.98] transition disabled:opacity-50"
            style={{ background: "var(--pink)", color: "white" }}
          >
            {busy ? "Einen Moment…" : mode === "create" ? "Raum erstellen" : "Los geht's"}
          </button>
        </form>
      </div>
    </div>
  );
}
