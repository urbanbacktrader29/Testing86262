const STEPS = [
  {
    number: "01",
    title: "Betrag & Krypto wählen",
    text: "Gib ein, wie viel du investieren möchtest und welche Kryptowährung du erhalten willst. Wir vergleichen live die Angebote verschiedener Zahlungsanbieter für dich.",
  },
  {
    number: "02",
    title: "Identität bestätigen (KYC)",
    text: "Beim gewählten Anbieter schließt du eine schnelle, sichere Identitätsprüfung ab — einmalig pro Anbieter, meist in wenigen Minuten erledigt.",
  },
  {
    number: "03",
    title: "Krypto erhalten",
    text: "Nach erfolgreicher Zahlung sendet der Anbieter die Kryptowährung direkt an deine Wallet-Adresse. Fertig.",
  },
];

export default function HowItWorks() {
  return (
    <section id="so-funktionierts" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">So funktioniert's</h2>
        <p className="mt-3 text-[var(--text-muted)]">
          In drei einfachen Schritten von Fiat-Geld zu deiner eigenen Kryptowährung.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-3">
        {STEPS.map((step) => (
          <div key={step.number} className="card p-6">
            <span className="brand-gradient-text text-3xl font-extrabold">{step.number}</span>
            <h3 className="mt-3 text-lg font-semibold text-white">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{step.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
