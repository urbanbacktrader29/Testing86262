import BuyWidget from "./BuyWidget";

export default function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-2 lg:items-center lg:gap-8">
      <div className="text-center lg:text-left">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/5 px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Live-Preisvergleich mehrerer Anbieter
        </span>
        <h1 className="mt-5 text-4xl font-extrabold leading-tight text-white sm:text-5xl">
          Krypto kaufen. <span className="brand-gradient-text">Einfach. Sicher.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-[var(--text-muted)] lg:mx-0">
          Wähle Betrag und Kryptowährung, vergleiche die besten Angebote in Echtzeit und schließe
          den Kauf sicher über geprüfte, lizenzierte Zahlungsanbieter ab — direkt in deine Wallet.
        </p>
        <div className="mx-auto mt-6 flex max-w-md flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-[var(--text-muted)] lg:mx-0 lg:justify-start">
          <span>✓ Karte &amp; Überweisung</span>
          <span>✓ Regulierte Partner</span>
          <span>✓ Keine versteckten Gebühren</span>
        </div>
      </div>

      <BuyWidget />
    </section>
  );
}
