import { useState } from "react";
import {
  DEFAULT_AMOUNT,
  IS_ONRAMPER_KEY_CONFIGURED,
  SUPPORTED_CRYPTOS,
  SUPPORTED_FIATS,
} from "../lib/config";
import { buildOnramperUrl, looksLikeWalletAddress } from "../lib/onramper";

export default function BuyWidget() {
  const [fiat, setFiat] = useState<string>(SUPPORTED_FIATS[0].code);
  const [crypto, setCrypto] = useState<string>(SUPPORTED_CRYPTOS[0].code);
  const [amount, setAmount] = useState<number>(DEFAULT_AMOUNT);
  const [walletAddress, setWalletAddress] = useState("");
  const [showWidget, setShowWidget] = useState(false);
  const [widgetUrl, setWidgetUrl] = useState("");

  const addressError =
    walletAddress.length > 0 && !looksLikeWalletAddress(walletAddress)
      ? "Das sieht nicht nach einer gültigen Wallet-Adresse aus."
      : null;

  const canSubmit = amount > 0 && !addressError;

  function handleCompare() {
    if (!canSubmit) return;
    setWidgetUrl(buildOnramperUrl({ fiat, crypto, amount, walletAddress }));
    setShowWidget(true);
  }

  return (
    <div id="kaufen" className="card mx-auto w-full max-w-md p-5 shadow-2xl shadow-black/40 sm:p-6">
      {!IS_ONRAMPER_KEY_CONFIGURED && (
        <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-300">
          Demo-Modus: Es ist noch kein Onramper API-Key hinterlegt (
          <code>VITE_ONRAMPER_API_KEY</code>). Anbieter-Angebote werden erst nach Eintragen des
          Keys geladen.
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="amount" className="mb-1.5 block text-sm font-medium text-[var(--text-muted)]">
            Du zahlst
          </label>
          <div className="flex overflow-hidden rounded-xl border border-[var(--border)] bg-[#0a0d1c] focus-within:border-[var(--accent-to)] focus-within:shadow-[0_0_0_3px_rgba(34,211,238,0.15)]">
            <input
              id="amount"
              type="number"
              min={1}
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
              className="w-full bg-transparent px-4 py-3 text-lg font-semibold outline-none"
            />
            <select
              aria-label="Fiat-Währung"
              value={fiat}
              onChange={(e) => setFiat(e.target.value)}
              className="border-l border-[var(--border)] bg-transparent px-3 text-sm font-medium outline-none"
            >
              {SUPPORTED_FIATS.map((f) => (
                <option key={f.code} value={f.code} className="bg-[#0e1120]">
                  {f.flag} {f.code}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-center text-[var(--text-muted)]">↓</div>

        <div>
          <label htmlFor="crypto" className="mb-1.5 block text-sm font-medium text-[var(--text-muted)]">
            Du erhältst
          </label>
          <select
            id="crypto"
            value={crypto}
            onChange={(e) => setCrypto(e.target.value)}
            className="input w-full px-4 py-3 text-lg font-semibold"
          >
            {SUPPORTED_CRYPTOS.map((c) => (
              <option key={c.code} value={c.code} className="bg-[#0e1120]">
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="wallet" className="mb-1.5 block text-sm font-medium text-[var(--text-muted)]">
            Wallet-Adresse <span className="font-normal text-[var(--text-muted)]">(optional)</span>
          </label>
          <input
            id="wallet"
            type="text"
            placeholder={`Deine ${crypto}-Adresse einfügen …`}
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            spellCheck={false}
            className="input w-full px-4 py-3 text-sm"
          />
          {addressError ? (
            <p className="mt-1.5 text-xs text-red-400">{addressError}</p>
          ) : (
            <p className="mt-1.5 text-xs text-[var(--text-muted)]">
              Lässt du das Feld leer, kannst du die Adresse im nächsten Schritt im Checkout
              eingeben oder eine Wallet verbinden.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleCompare}
          disabled={!canSubmit}
          className="brand-gradient-bg w-full rounded-xl px-4 py-3.5 text-center text-base font-semibold text-black transition-transform enabled:hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Anbieter vergleichen
        </button>
        <p className="text-center text-xs text-[var(--text-muted)]">
          Keine versteckten Gebühren — alle Anbieterpreise siehst du live im nächsten Schritt.
        </p>
      </div>

      {showWidget && (
        <div className="mt-6 overflow-hidden rounded-xl border border-[var(--border)]">
          <iframe
            title="Onramper — Krypto kaufen"
            src={widgetUrl}
            className="h-[540px] w-full"
            allow="accelerometer; autoplay; camera; gyroscope; payment"
            style={{ border: "none" }}
          />
        </div>
      )}
    </div>
  );
}
