import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fetchKlines } from "../api/binance";
import { COINS_BY_ID } from "../data/coins";
import type { OHLCCandle } from "../types";
import { formatCurrency } from "../utils/format";
import SignalPanel from "../components/SignalPanel";
import CoinIcon from "../components/CoinIcon";
import { useWatchlist } from "../hooks/useWatchlist";

export default function CoinDetail() {
  const { id } = useParams<{ id: string }>();
  const listing = id ? COINS_BY_ID.get(id) : undefined;
  const [candles, setCandles] = useState<OHLCCandle[]>([]);
  const [loading, setLoading] = useState(true);
  const { isWatched, toggle } = useWatchlist();

  useEffect(() => {
    if (!listing) return;
    let cancelled = false;
    setLoading(true);
    fetchKlines(listing.binanceSymbol, "15m", 96)
      .then(({ candles }) => {
        if (!cancelled) setCandles(candles);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [listing]);

  const chartData = useMemo(
    () =>
      candles.map((c) => ({
        time: new Date(c[0]).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
        price: c[4],
      })),
    [candles],
  );

  if (!listing) {
    return (
      <div className="text-center py-16 text-slate-500">
        Coin nicht gefunden. <Link to="/" className="text-emerald-400 underline">Zurück zum Dashboard</Link>
      </div>
    );
  }

  const lastPrice = candles.length > 0 ? candles[candles.length - 1][4] : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CoinIcon symbol={listing.symbol} className="w-10 h-10 text-sm" />
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">{listing.name}</h1>
            <div className="text-slate-500 text-sm">{listing.symbol} · {lastPrice ? formatCurrency(lastPrice) : "–"}</div>
          </div>
        </div>
        <button
          onClick={() => toggle(listing.id)}
          className={`text-2xl leading-none ${isWatched(listing.id) ? "text-amber-400" : "text-slate-700 hover:text-slate-500"}`}
          aria-label="Zur Watchlist"
        >
          ★
        </button>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 h-64">
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">Lade Kursverlauf…</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#64748b" }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
              <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} width={70} tickFormatter={(v) => formatCurrency(v)} />
              <Tooltip
                contentStyle={{ background: "#0b0e14", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#94a3b8" }}
                formatter={(value) => [formatCurrency(typeof value === "number" ? value : Number(value)), "Preis"]}
              />
              <Area type="monotone" dataKey="price" stroke="#34d399" strokeWidth={2} fill="url(#priceGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <SignalPanel listing={listing} />
    </div>
  );
}
