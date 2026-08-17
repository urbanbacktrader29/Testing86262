import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import type { GameMessage, Player, Room } from "../types";

export function useRoom(roomId: string | null) {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [messages, setMessages] = useState<GameMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    setLoading(true);

    async function load() {
      const [roomRes, playersRes, messagesRes] = await Promise.all([
        supabase.from("rooms").select("*").eq("id", roomId).single(),
        supabase.from("players").select("*").eq("room_id", roomId).order("joined_at"),
        supabase
          .from("messages")
          .select("*")
          .eq("room_id", roomId)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);
      if (cancelled) return;
      if (roomRes.data) setRoom(roomRes.data as Room);
      if (playersRes.data) setPlayers(playersRes.data as Player[]);
      if (messagesRes.data) setMessages((messagesRes.data as GameMessage[]).reverse());
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel(`db-room-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        (payload) => setRoom(payload.new as Room),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `room_id=eq.${roomId}` },
        (payload) => {
          setPlayers((prev) => {
            if (payload.eventType === "DELETE") {
              return prev.filter((p) => p.id !== (payload.old as Player).id);
            }
            const next = payload.new as Player;
            const exists = prev.some((p) => p.id === next.id);
            return exists ? prev.map((p) => (p.id === next.id ? next : p)) : [...prev, next];
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages((prev) => [...prev.slice(-199), payload.new as GameMessage]);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return { room, players, messages, loading };
}

export function useAdvanceTicker(roomId: string | null, active: boolean) {
  const inFlight = useRef(false);
  useEffect(() => {
    if (!roomId || !active) return;
    const tick = async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        await supabase.rpc("advance_turn", { p_room_id: roomId });
      } finally {
        inFlight.current = false;
      }
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [roomId, active]);
}
