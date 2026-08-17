import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { DrawEvent } from "../types";

const W = 800;
const H = 600;
const COLORS = ["#172c66", "#f582ae", "#8bd3dd", "#f3d34a", "#2ecc71", "#e74c3c", "#a855f7", "#ffffff"];

interface CanvasProps {
  roomId: string;
  turnNumber: number;
  isDrawer: boolean;
}

export default function Canvas({ roomId, turnNumber, isDrawer }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const colorRef = useRef(COLORS[0]);
  const sizeRef = useRef(6);

  function clearCanvas() {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctxRef.current = ctx;
    clearCanvas();
  }, []);

  useEffect(() => {
    clearCanvas();
  }, [turnNumber]);

  useEffect(() => {
    const channel = supabase.channel(`draw-${roomId}`, { config: { broadcast: { self: false } } });
    channelRef.current = channel;

    channel.on("broadcast", { event: "draw" }, ({ payload }) => {
      const evt = payload as DrawEvent;
      const ctx = ctxRef.current;
      if (!ctx) return;
      if (evt.type === "clear") {
        clearCanvas();
      } else if (evt.type === "start") {
        ctx.strokeStyle = evt.color;
        ctx.lineWidth = evt.size;
        ctx.beginPath();
        ctx.moveTo(evt.point.x, evt.point.y);
        ctx.lineTo(evt.point.x + 0.01, evt.point.y + 0.01);
        ctx.stroke();
        lastPointRef.current = evt.point;
      } else if (evt.type === "move") {
        if (!lastPointRef.current) return;
        ctx.beginPath();
        ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
        ctx.lineTo(evt.point.x, evt.point.y);
        ctx.stroke();
        lastPointRef.current = evt.point;
      } else if (evt.type === "end") {
        lastPointRef.current = null;
      } else if (evt.type === "snapshot-request" && isDrawer) {
        const canvas = canvasRef.current;
        if (canvas) {
          channel.send({ type: "broadcast", event: "draw", payload: { type: "snapshot", dataUrl: canvas.toDataURL() } });
        }
      } else if (evt.type === "snapshot" && !isDrawer) {
        const img = new Image();
        img.onload = () => ctxRef.current?.drawImage(img, 0, 0, W, H);
        img.src = evt.dataUrl;
      }
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED" && !isDrawer) {
        channel.send({ type: "broadcast", event: "draw", payload: { type: "snapshot-request" } });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, isDrawer]);

  function send(evt: DrawEvent) {
    channelRef.current?.send({ type: "broadcast", event: "draw", payload: evt });
  }

  function toCanvasPoint(clientX: number, clientY: number) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: ((clientX - rect.left) / rect.width) * W, y: ((clientY - rect.top) / rect.height) * H };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawer) return;
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    const point = toCanvasPoint(e.clientX, e.clientY);
    const ctx = ctxRef.current!;
    ctx.strokeStyle = colorRef.current;
    ctx.lineWidth = sizeRef.current;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.lineTo(point.x + 0.01, point.y + 0.01);
    ctx.stroke();
    lastPointRef.current = point;
    drawingRef.current = true;
    send({ type: "start", point, color: colorRef.current, size: sizeRef.current });
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawer || !drawingRef.current) return;
    const point = toCanvasPoint(e.clientX, e.clientY);
    const ctx = ctxRef.current!;
    if (lastPointRef.current) {
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
    lastPointRef.current = point;
    send({ type: "move", point });
  }

  function handlePointerUp() {
    if (!isDrawer) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    send({ type: "end" });
  }

  function handleClear() {
    clearCanvas();
    send({ type: "clear" });
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="w-full rounded-2xl shadow-lg bg-white no-select"
        style={{ aspectRatio: `${W} / ${H}`, touchAction: "none" }}
      />
      {isDrawer && (
        <div className="flex items-center gap-2 overflow-x-auto px-1 py-1">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => (colorRef.current = c)}
              className="shrink-0 w-9 h-9 rounded-full border-2 border-black/10 active:scale-90 transition"
              style={{ background: c }}
              aria-label={`Farbe ${c}`}
            />
          ))}
          <div className="w-px h-8 bg-black/10 mx-1 shrink-0" />
          {[4, 10, 20].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => (sizeRef.current = s)}
              className="shrink-0 w-9 h-9 rounded-full bg-white shadow flex items-center justify-center active:scale-90 transition"
            >
              <span className="rounded-full bg-black" style={{ width: s, height: s }} />
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 ml-auto px-4 h-9 rounded-full bg-rose-500 text-white font-bold text-sm active:scale-95 transition"
          >
            Löschen
          </button>
        </div>
      )}
    </div>
  );
}
