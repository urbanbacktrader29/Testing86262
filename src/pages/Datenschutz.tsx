import { BRAND } from "../lib/config";

export default function Datenschutz() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-white">Datenschutzerklärung</h1>
      <p className="mt-3 text-sm text-[var(--text-muted)]">
        Platzhalter — dies ist keine vollständige, rechtsverbindliche Datenschutzerklärung. Bitte
        vor dem Livegang durch eine auf Datenschutzrecht (DSGVO) spezialisierte Stelle prüfen bzw.
        erstellen lassen und an die tatsächliche Datenverarbeitung anpassen.
      </p>

      <section className="mt-8 space-y-2 text-[var(--text-muted)]">
        <h2 className="text-lg font-semibold text-white">1. Verantwortlicher</h2>
        <p>
          Verantwortlich für die Datenverarbeitung auf dieser Website ist [Firmenname, Anschrift,
          E-Mail — siehe Impressum].
        </p>
      </section>

      <section className="mt-6 space-y-2 text-[var(--text-muted)]">
        <h2 className="text-lg font-semibold text-white">2. Welche Daten wir verarbeiten</h2>
        <p>
          Beim Aufruf dieser Website verarbeiten wir technisch notwendige Daten (z. B. IP-Adresse,
          Zeitpunkt des Zugriffs) im Rahmen von Server-Logfiles. Trägst du im Kaufformular eine
          Wallet-Adresse, einen Betrag oder eine gewählte Kryptowährung ein, werden diese Angaben
          an unseren Vermittlungspartner Onramper und den von dir gewählten Zahlungsanbieter
          übermittelt, um den Kaufvorgang durchzuführen.
        </p>
      </section>

      <section className="mt-6 space-y-2 text-[var(--text-muted)]">
        <h2 className="text-lg font-semibold text-white">3. Eingebettetes Onramper-Widget</h2>
        <p>
          Für den Kauf- und Vergleichsprozess binden wir das Widget unseres Partners Onramper
          (Onramper OÜ bzw. dessen jeweilige Konzerngesellschaft) per iFrame ein. Sobald das Widget
          geladen wird, kann Onramper technische Daten (z. B. IP-Adresse, Geräteinformationen)
          verarbeiten. Im weiteren Verlauf des Kaufs — insbesondere bei der Identitätsprüfung
          (KYC) und Zahlungsabwicklung — verarbeiten die jeweils gewählten, lizenzierten
          Zahlungsanbieter zusätzliche personenbezogene Daten in eigener Verantwortung. Es gelten
          deren jeweilige Datenschutzerklärungen.
        </p>
      </section>

      <section className="mt-6 space-y-2 text-[var(--text-muted)]">
        <h2 className="text-lg font-semibold text-white">4. Rechtsgrundlage</h2>
        <p>
          Die Verarbeitung erfolgt zur Anbahnung und Erfüllung eines Vertrags (Art. 6 Abs. 1 lit. b
          DSGVO) sowie, soweit erforderlich, auf Grundlage unseres berechtigten Interesses an einem
          sicheren und funktionsfähigen Betrieb der Website (Art. 6 Abs. 1 lit. f DSGVO).
        </p>
      </section>

      <section className="mt-6 space-y-2 text-[var(--text-muted)]">
        <h2 className="text-lg font-semibold text-white">5. Deine Rechte</h2>
        <p>
          Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
          Datenübertragbarkeit sowie Widerspruch gegen die Verarbeitung deiner personenbezogenen
          Daten. Wende dich dazu an: {BRAND.supportEmail}.
        </p>
      </section>

      <section className="mt-6 space-y-2 text-[var(--text-muted)]">
        <h2 className="text-lg font-semibold text-white">6. Beschwerderecht</h2>
        <p>
          Du hast das Recht, dich bei einer Datenschutzaufsichtsbehörde über die Verarbeitung
          deiner personenbezogenen Daten zu beschweren.
        </p>
      </section>
    </div>
  );
}
