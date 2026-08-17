import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { supabase } from "../lib/supabase";
import type { GameMessage } from "../types";

interface ChatPanelProps {
  roomId: string;
  playerId: string;
  messages: GameMessage[];
  canGuess: boolean;
}

export default function ChatPanel({ roomId, playerId, messages, canGuess }: ChatPanelProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText("");
    await supabase.rpc("submit_guess", { p_room_id: roomId, p_player_id: playerId, p_text: trimmed });
    setSending(false);
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1 px-3 py-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className={clsx(
              "text-sm px-2.5 py-1.5 rounded-lg",
              m.kind === "system" && "text-center italic opacity-50 text-xs",
              m.kind === "correct" && "bg-emerald-100 text-emerald-800 font-bold",
              m.kind === "chat" && "bg-white/70",
            )}
            style={m.kind === "chat" ? { color: "var(--ink)" } : undefined}
          >
            {m.kind === "chat" && <span className="font-bold mr-1.5">{m.nickname}:</span>}
            {m.body}
          </div>
        ))}
      </div>
      {canGuess && (
        <form onSubmit={handleSubmit} className="flex gap-2 p-2 shrink-0">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Deine Vermutung…"
            maxLength={40}
            autoComplete="off"
            className="flex-1 rounded-full bg-white px-4 py-2.5 shadow font-medium outline-none focus:ring-2"
            style={{ color: "var(--ink)" }}
          />
          <button
            type="submit"
            disabled={sending}
            className="px-5 rounded-full font-bold text-white shadow active:scale-95 transition disabled:opacity-50"
            style={{ background: "var(--pink)" }}
          >
            ➤
          </button>
        </form>
      )}
    </div>
  );
}
