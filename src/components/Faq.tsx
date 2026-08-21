import { useState } from "react";
import { BRAND } from "../lib/config";

const FAQ_ITEMS = [
  {
    question: "Welche Gebühren fallen an?",
    answer:
      "Die Gebühren setzen sich aus der Marge des jeweiligen Zahlungsanbieters (Netzwerk-, Zahlungs- und Umtauschkosten) sowie einer Vermittlungsgebühr zusammen, die bereits im angezeigten Preis enthalten ist. Beim Anbietervergleich siehst du für jeden Anbieter den finalen Betrag inklusive aller Kosten — es gibt keine versteckten Gebühren.",
  },
  {
    question: "Ist der Kauf sicher?",
    answer:
      `${BRAND.name} führt selbst keine Zahlungen aus und verwahrt keine Kundengelder. Zahlung, Identitätsprüfung (KYC) und Auszahlung der Kryptowährung übernehmen lizenzierte, regulierte Drittanbieter, die über Onramper angebunden sind. Deine Zahlungsdaten laufen ausschließlich über deren gesicherte Systeme.`,
  },
  {
    question: "In welchen Ländern ist der Kauf verfügbar?",
    answer:
      "Die Verfügbarkeit hängt vom jeweiligen Zahlungsanbieter und deinem Wohnsitzland ab. Beim Anbietervergleich werden dir automatisch nur die Anbieter angezeigt, die in deiner Region und für deine gewählte Zahlungsmethode verfügbar sind.",
  },
  {
    question: "Welche Zahlungsmethoden werden unterstützt?",
    answer:
      "Je nach Anbieter unter anderem Kreditkarte, Debitkarte, SEPA-Überweisung, Apple Pay, Google Pay und weitere lokale Zahlungsmethoden. Die verfügbaren Optionen werden dir beim Vergleich direkt angezeigt.",
  },
  {
    question: "Brauche ich bereits eine Wallet?",
    answer:
      "Nein. Du kannst deine Wallet-Adresse manuell eintragen, eine Wallet direkt verbinden oder — falls du noch keine hast — im Checkout-Prozess des Anbieters eine neue Wallet einrichten.",
  },
  {
    question: "Wie lange dauert die Auszahlung der Kryptowährung?",
    answer:
      "Bei Kartenzahlung häufig innerhalb weniger Minuten, bei Banküberweisung kann es je nach Anbieter und Bank auch länger dauern. Eine anbieterspezifische Schätzung siehst du im Vergleich vor dem Kauf.",
  },
];

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">Häufige Fragen</h2>
        <p className="mt-3 text-[var(--text-muted)]">
          Alles zu Gebühren, Sicherheit und unterstützten Ländern.
        </p>
      </div>
      <div className="space-y-3">
        {FAQ_ITEMS.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div key={item.question} className="card overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="font-medium text-white">{item.question}</span>
                <span
                  className={`shrink-0 text-xl text-[var(--text-muted)] transition-transform ${isOpen ? "rotate-45" : ""}`}
                  aria-hidden="true"
                >
                  +
                </span>
              </button>
              {isOpen && (
                <p className="px-5 pb-4 text-sm leading-relaxed text-[var(--text-muted)]">
                  {item.answer}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
