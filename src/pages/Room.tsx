import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import clsx from "clsx";
import { supabase } from "../lib/supabase";
import { useAdvanceTicker, useRoom } from "../hooks/useRoom";
import { loadIdentity, loadLastNickname, saveIdentity, saveLastNickname } from "../lib/identity";
import Canvas from "../components/Canvas";
import PlayerList from "../components/PlayerList";
import ChatPanel from "../components/ChatPanel";

export default function Room() {
  const { code = "" } = useParams();
  const upperCode = code.toUpperCase();
  const navigate = useNavigate();

  const [roomId, setRoomId] = useState<string | null | undefined>(undefined);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [joinNickname, setJoinNickname] = useState(loadLastNickname());
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [myWord, setMyWord] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const stored = loadIdentity(upperCode);
    if (stored) setPlayerId(stored.playerId);

    let cancelled = false;
    supabase
      .from("rooms")
      .select("id")
      .eq("code", upperCode)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setRoomId(data?.id ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [upperCode]);

  const { room, players, messages } = useRoom(roomId ?? null);
  useAdvanceTicker(roomId ?? null, room?.status === "playing" || room?.status === "round_end");

  const myPlayer = players.find((p) => p.id === playerId);
  const isHost = !!room && !!playerId && room.host_player_id === playerId;
  const isDrawer = !!room && !!playerId && room.current_drawer_player_id === playerId;
  const connectedCount = players.filter((p) => p.is_connected).length;

  useEffect(() => {
    if (!playerId || !room) return;
    if (room.status !== "playing" || !isDrawer) {
      setMyWord(null);
      return;
    }
    supabase.rpc("get_my_word", { p_room_id: room.id, p_player_id: playerId }).then(({ data }) => {
      setMyWord((data as string | null) ?? null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id, room?.status, room?.turn_number, isDrawer, playerId]);

  useEffect(() => {
    if (!room?.round_ends_at) {
      setRemaining(0);
      return;
    }
    const target = new Date(room.round_ends_at).getTime();
    const tick = () => setRemaining(Math.max(0, Math.round((target - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [room?.round_ends_at]);

  useEffect(() => {
    if (!playerId) return;
    const handler = () => {
      supabase.rpc("leave_room", { p_player_id: playerId });
    };
    window.addEventListener("pagehide", handler);
    return () => window.removeEventListener("pagehide", handler);
  }, [playerId]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = joinNickname.trim();
    if (!trimmed) return;
    setJoinBusy(true);
    setJoinError(null);
    saveLastNickname(trimmed);
    try {
      const { data, error } = await supabase.rpc("join_room", { p_code: upperCode, p_nickname: trimmed });
      if (error) throw error;
      const row = data[0];
      saveIdentity(upperCode, { playerId: row.player_id, nickname: trimmed });
      setPlayerId(row.player_id);
    } catch (err) {
      const message = (err as { message?: string }).message ?? "";
      if (message.includes("ROOM_NOT_FOUND")) setJoinError("Diesen Raum gibt es nicht.");
      else if (message.includes("ROOM_ALREADY_STARTED")) setJoinError("Das Spiel läuft schon.");
      else setJoinError("Etwas ist schiefgelaufen.");
    } finally {
      setJoinBusy(false);
    }
  }

  async function handleStart(rounds: number) {
    if (!room || !playerId) return;
    await supabase.rpc("start_game", { p_room_id: room.id, p_player_id: playerId, p_total_rounds: rounds });
  }

  async function handlePlayAgain() {
    if (!room || !playerId) return;
    await supabase.rpc("reset_room", { p_room_id: room.id, p_player_id: playerId });
  }

  async function handleShare() {
    const url = `${window.location.origin}/r/${upperCode}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Doodle Party", text: `Tritt meinem Spiel bei: ${upperCode}`, url });
        return;
      } catch {
        /* fall through to clipboard */
      }
    }
    await navigator.clipboard.writeText(url);
  }

  const hint = useMemo(() => {
    if (!room?.current_word_length) return "";
    return Array.from({ length: room.current_word_length }, () => "_").join(" ");
  }, [room?.current_word_length]);

  if (roomId === undefined) {
    return <CenteredMessage>Lade…</CenteredMessage>;
  }
  if (roomId === null) {
    return (
      <CenteredMessage>
        Diesen Raum gibt es nicht.
        <Link to="/" className="block mt-4 underline font-bold">
          Zurück zur Startseite
        </Link>
      </CenteredMessage>
    );
  }
  if (!playerId || !room) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 safe-top safe-bottom">
        <form onSubmit={handleJoin} className="w-full max-w-sm flex flex-col gap-3">
          <h1 className="text-2xl font-black text-center mb-2" style={{ color: "var(--ink)" }}>
            Raum {upperCode}
          </h1>
          <input
            value={joinNickname}
            onChange={(e) => setJoinNickname(e.target.value)}
            placeholder="Dein Name"
            maxLength={20}
            autoComplete="off"
            className="w-full rounded-2xl bg-white px-4 py-4 shadow font-semibold outline-none focus:ring-2"
            style={{ color: "var(--ink)" }}
          />
          {joinError && <p className="text-sm text-center font-semibold text-rose-500">{joinError}</p>}
          <button
            type="submit"
            disabled={joinBusy}
            className="w-full rounded-2xl py-4 font-black text-lg shadow-lg active:scale-[0.98] transition disabled:opacity-50"
            style={{ background: "var(--pink)", color: "white" }}
          >
            Beitreten
          </button>
        </form>
      </div>
    );
  }

  if (!myPlayer) {
    return <CenteredMessage>Warte auf Spielerdaten…</CenteredMessage>;
  }

  if (room.status === "lobby") {
    return (
      <div className="min-h-dvh flex flex-col px-5 py-6 safe-top safe-bottom max-w-md mx-auto w-full">
        <div className="text-center mb-6">
          <p className="text-sm font-semibold opacity-60 mb-1">Raum-Code</p>
          <button
            onClick={handleShare}
            className="text-4xl font-black tracking-[0.3em] rounded-2xl bg-white shadow px-6 py-3 active:scale-95 transition"
            style={{ color: "var(--ink)" }}
          >
            {upperCode}
          </button>
          <p className="text-xs opacity-50 mt-2">Tippen zum Teilen</p>
        </div>

        <h2 className="font-bold mb-2 opacity-70 text-sm">Spieler ({players.length})</h2>
        <div className="mb-6">
          <PlayerList players={players} drawerId={null} hostId={room.host_player_id} meId={playerId} />
        </div>

        {isHost ? (
          <div className="mt-auto flex flex-col gap-3">
            <p className="text-center text-sm opacity-60">
              {connectedCount < 2 ? "Mindestens 2 Spieler nötig" : "Wie viele Runden?"}
            </p>
            <div className="flex gap-2">
              {[2, 3, 4, 5].map((r) => (
                <button
                  key={r}
                  onClick={() => handleStart(r)}
                  disabled={connectedCount < 2}
                  className="flex-1 rounded-2xl py-4 font-black text-lg shadow-lg active:scale-95 transition disabled:opacity-40"
                  style={{ background: "var(--teal)", color: "var(--ink)" }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-auto text-center opacity-60 font-semibold">Warte auf den Host…</p>
        )}
      </div>
    );
  }

  if (room.status === "finished") {
    const sorted = [...players].sort((a, b) => b.score - a.score);
    const medals = ["🥇", "🥈", "🥉"];
    return (
      <div className="min-h-dvh flex flex-col px-5 py-6 safe-top safe-bottom max-w-md mx-auto w-full">
        <h1 className="text-3xl font-black text-center mb-6" style={{ color: "var(--ink)" }}>
          Spiel vorbei!
        </h1>
        <ul className="flex flex-col gap-2 mb-8">
          {sorted.map((p, i) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-2xl bg-white shadow px-4 py-3 font-bold"
              style={{ color: "var(--ink)" }}
            >
              <span className="text-xl w-8">{medals[i] ?? i + 1}</span>
              <span className="flex-1 truncate">{p.nickname}</span>
              <span style={{ color: "var(--pink)" }}>{p.score}</span>
            </li>
          ))}
        </ul>
        <div className="mt-auto flex flex-col gap-3">
          {isHost ? (
            <button
              onClick={handlePlayAgain}
              className="w-full rounded-2xl py-4 font-black text-lg shadow-lg active:scale-95 transition"
              style={{ background: "var(--pink)", color: "white" }}
            >
              Nochmal spielen
            </button>
          ) : (
            <p className="text-center opacity-60 font-semibold">Warte auf den Host…</p>
          )}
          <button onClick={() => navigate("/")} className="text-center font-semibold opacity-60 underline">
            Zur Startseite
          </button>
        </div>
      </div>
    );
  }

  const roundDisplay = Math.floor(room.turn_number / Math.max(1, players.length)) + 1;

  return (
    <div className="h-dvh flex flex-col safe-top safe-bottom max-w-lg mx-auto w-full">
      <div className="flex items-center gap-2 px-3 pt-2 pb-1 shrink-0">
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white shadow" style={{ color: "var(--ink)" }}>
          {upperCode}
        </span>
        <span className="text-xs font-bold opacity-60">Runde {Math.min(roundDisplay, room.total_rounds)}/{room.total_rounds}</span>
        <span
          className={clsx(
            "ml-auto text-lg font-black tabular-nums px-3 py-1 rounded-full",
            remaining <= 10 ? "bg-rose-500 text-white" : "bg-white",
          )}
          style={remaining > 10 ? { color: "var(--ink)" } : undefined}
        >
          {remaining}s
        </span>
      </div>

      <div className="text-center py-1.5 shrink-0">
        {room.status === "round_end" && room.last_word ? (
          <p className="font-black text-lg" style={{ color: "var(--pink)" }}>
            Das Wort war: {room.last_word}
          </p>
        ) : isDrawer ? (
          <p className="font-black text-lg tracking-wide" style={{ color: "var(--ink)" }}>
            Du zeichnest: {myWord}
          </p>
        ) : (
          <p className="font-black text-2xl tracking-[0.3em]" style={{ color: "var(--ink)" }}>
            {hint}
          </p>
        )}
      </div>

      <div className="px-3 shrink-0">
        <Canvas roomId={room.id} turnNumber={room.turn_number} isDrawer={isDrawer && room.status === "playing"} />
      </div>

      <div className="flex gap-1.5 overflow-x-auto px-3 py-2 shrink-0">
        {players.map((p) => (
          <div
            key={p.id}
            className={clsx(
              "shrink-0 flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold bg-white/70",
              p.id === room.current_drawer_player_id && "ring-2",
            )}
            style={{ color: "var(--ink)" }}
          >
            {p.nickname} · {p.score}
          </div>
        ))}
      </div>

      <div className="flex-1 min-h-0 rounded-t-3xl bg-white/40">
        <ChatPanel
          roomId={room.id}
          playerId={playerId}
          messages={messages}
          canGuess={room.status === "playing" && !isDrawer}
        />
      </div>
    </div>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex items-center justify-center text-center px-6 font-semibold opacity-70">
      {children}
    </div>
  );
}
