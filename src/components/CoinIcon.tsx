// Deterministic hue from the symbol string, so a given coin always renders
// the same color badge — no external icon CDN dependency to fail or rate-limit.
function hueFor(symbol: string): number {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) hash = (hash * 31 + symbol.charCodeAt(i)) % 360;
  return hash;
}

export default function CoinIcon({ symbol, className = "w-6 h-6" }: { symbol: string; className?: string }) {
  const hue = hueFor(symbol);
  return (
    <span
      className={`${className} rounded-full flex items-center justify-center shrink-0 font-bold text-[10px] leading-none text-white`}
      style={{ backgroundColor: `hsl(${hue} 65% 40%)` }}
    >
      {symbol.slice(0, 3)}
    </span>
  );
}
