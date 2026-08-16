import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchTickers24hr } from "../api/binance";
import { COINS_BY_ID } from "../data/coins";
import type { CoinMarket } from "../types";
import { formatCurrency, formatPercent } from "../utils/format";
import CoinIcon from "../components/CoinIcon";
import { useWatchlist } from "../hooks/useWatchlist";

export default function Watchlist() {
  const { watchlist, toggle } = useWatchlist();
  const [markets, setMarkets] = useState<CoinMarket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (watchlist.length === 0) {
      setMarkets([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const symbols = watchlist.map((id) => COINS_BY_ID.get(id)?.binanceSymbol).filter((s): s is string => !!s);
    fetchTickers24hr(symbols)
      .then((tickers) => {
        if (cancelled) return;
        const bySymbol = new Map(tickers.map((t) => [t.symbol, t]));
        const next = watchlist
          .map((id) => {
            const listing = COINS_BY_ID.get(id);
            if (!listing) return null;
            const t = bySymbol.get(listing.binanceSymbol);
            return {
              id,
              symbol: listing.symbol,
              name: listing.name,
              current_price: t ? parseFloat(t.lastPrice) : 0,
              price_change_percentage_24h: t ? parseFloat(t.priceChangePercent) : null,
              high_24h: t ? parseFloat(t.highPrice) : 0,
              low_24h: t ? parseFloat(t.lowPrice) : 0,
              volume_24h: t ? parseFloat(t.volume) : 0,
              quote_volume_24h: t ? parseFloat(t.quoteVolume) : 0,
              trades_24h: t?.count ?? 0,
            } satisfies CoinMarket;
          })
          .filter((m): m is CoinMarket => m !== null);
        setMarkets(next);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [watchlist]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Watchlist</h1>
        <p className="text-slate-500 text-sm mt-1">Deine beobachteten Coins.</p>
      </div>

      {watchlist.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-800 rounded-xl">
          <p className="text-slate-500">Noch keine Coins auf der Watchlist.</p>
          <p className="text-slate-600 text-xs mt-1">
            Tippe im <Link to="/" className="underline">Dashboard</Link> auf den Stern bei einem Coin.
          </p>
        </div>
      ) : loading ? (
        <div className="text-center py-16 text-slate-500">Lade…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {markets.map((m) => (
            <div key={m.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-3">
              <Link to={`/coin/${m.id}`} className="flex items-center gap-3 min-w-0">
                <CoinIcon symbol={m.symbol} className="w-8 h-8 text-xs" />
                <div className="min-w-0">
                  <div className="font-medium text-slate-100 truncate">{m.name}</div>
                  <div className="text-xs text-slate-500">{formatCurrency(m.current_price)}</div>
                </div>
              </Link>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-sm font-medium ${(m.price_change_percentage_24h ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {formatPercent(m.price_change_percentage_24h)}
                </span>
                <button onClick={() => toggle(m.id)} className="text-amber-400 text-lg leading-none" aria-label="Von Watchlist entfernen">
                  ★
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
