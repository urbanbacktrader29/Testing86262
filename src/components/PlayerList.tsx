import clsx from "clsx";
import type { Player } from "../types";

interface PlayerListProps {
  players: Player[];
  drawerId: string | null;
  hostId: string | null;
  meId: string;
}

export default function PlayerList({ players, drawerId, hostId, meId }: PlayerListProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <ul className="flex flex-col gap-1.5">
      {sorted.map((p, i) => (
        <li
          key={p.id}
          className={clsx(
            "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold",
            p.id === meId ? "bg-white shadow" : "bg-white/50",
            !p.is_connected && "opacity-40",
          )}
          style={{ color: "var(--ink)" }}
        >
          <span className="opacity-50 w-4 text-xs">{i + 1}</span>
          <span className="truncate flex-1">
            {p.nickname}
            {p.id === hostId && " 👑"}
          </span>
          {p.id === drawerId && <span title="zeichnet gerade">✏️</span>}
          <span className="tabular-nums font-black" style={{ color: "var(--pink)" }}>
            {p.score}
          </span>
        </li>
      ))}
    </ul>
  );
}
