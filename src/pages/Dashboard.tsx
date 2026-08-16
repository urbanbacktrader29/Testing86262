import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchTickers24hr } from "../api/binance";
import { COINS } from "../data/coins";
import type { CoinMarket } from "../types";
import { formatCompact, formatCurrency, formatPercent } from "../utils/format";
import CoinIcon from "../components/CoinIcon";
import { useWatchlist } from "../hooks/useWatchlist";

export default function Dashboard() {
  const [markets, setMarkets] = useState<CoinMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isWatched, toggle } = useWatchlist();

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetchTickers24hr(COINS.map((c) => c.binanceSymbol))
        .then((tickers) => {
          if (cancelled) return;
          const bySymbol = new Map(tickers.map((t) => [t.symbol, t]));
          const next = COINS.map((c) => {
            const t = bySymbol.get(c.binanceSymbol);
            return {
              id: c.id,
              symbol: c.symbol,
              name: c.name,
              current_price: t ? parseFloat(t.lastPrice) : 0,
              price_change_percentage_24h: t ? parseFloat(t.priceChangePercent) : null,
              high_24h: t ? parseFloat(t.highPrice) : 0,
              low_24h: t ? parseFloat(t.lowPrice) : 0,
              volume_24h: t ? parseFloat(t.volume) : 0,
              quote_volume_24h: t ? parseFloat(t.quoteVolume) : 0,
              trades_24h: t?.count ?? 0,
            } satisfies CoinMarket;
          });
          setMarkets(next);
          setError(null);
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : "Marktdaten konnten nicht geladen werden.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };
    load();
    const interval = setInterval(load, 20_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Live-Marktdaten für {COINS.length} Coins, direkt von Binance.</p>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg px-4 py-3 text-sm">{error}</div>}

      {loading ? (
        <div className="text-center py-16 text-slate-500">Lade Marktdaten…</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 text-xs uppercase tracking-wide border-b border-slate-800 bg-slate-900/60">
                <th className="px-3 py-2.5 text-left"></th>
                <th className="px-3 py-2.5 text-left">Coin</th>
                <th className="px-3 py-2.5 text-right">Preis</th>
                <th className="px-3 py-2.5 text-right">24h</th>
                <th className="px-3 py-2.5 text-right hidden sm:table-cell">Volumen 24h</th>
              </tr>
            </thead>
            <tbody>
              {markets.map((m) => (
                <tr key={m.id} className="border-b border-slate-800/60 last:border-0 hover:bg-slate-900/40">
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => toggle(m.id)}
                      className={`text-lg leading-none ${isWatched(m.id) ? "text-amber-400" : "text-slate-700 hover:text-slate-500"}`}
                      aria-label="Zur Watchlist"
                    >
                      ★
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <Link to={`/coin/${m.id}`} className="flex items-center gap-2">
                      <CoinIcon symbol={m.symbol} className="w-6 h-6" />
                      <div>
                        <div className="font-medium text-slate-100">{m.name}</div>
                        <div className="text-xs text-slate-500">{m.symbol}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-200">{formatCurrency(m.current_price)}</td>
                  <td className={`px-3 py-2.5 text-right font-medium ${(m.price_change_percentage_24h ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {formatPercent(m.price_change_percentage_24h)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-400 hidden sm:table-cell">{formatCompact(m.quote_volume_24h)} $</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
