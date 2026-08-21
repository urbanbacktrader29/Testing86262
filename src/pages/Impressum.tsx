export default function Impressum() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-white">Impressum</h1>
      <p className="mt-3 text-sm text-[var(--text-muted)]">
        Platzhalter — bitte durch eure vollständigen, rechtlich korrekten Angaben gemäß § 5 TMG /
        § 18 MStV (bzw. dem für euren Sitz geltenden Recht) ersetzen. Ohne diese Angaben ist die
        Seite nicht rechtssicher online stellbar.
      </p>

      <section className="mt-8 space-y-1 text-[var(--text-muted)]">
        <h2 className="text-lg font-semibold text-white">Angaben gemäß § 5 TMG</h2>
        <p>[Firmenname / Vor- und Nachname]</p>
        <p>[Straße und Hausnummer]</p>
        <p>[PLZ und Ort]</p>
        <p>[Land]</p>
      </section>

      <section className="mt-6 space-y-1 text-[var(--text-muted)]">
        <h2 className="text-lg font-semibold text-white">Kontakt</h2>
        <p>Telefon: [Telefonnummer]</p>
        <p>E-Mail: [E-Mail-Adresse]</p>
      </section>

      <section className="mt-6 space-y-1 text-[var(--text-muted)]">
        <h2 className="text-lg font-semibold text-white">Vertreten durch</h2>
        <p>[Name der/des Geschäftsführenden]</p>
      </section>

      <section className="mt-6 space-y-1 text-[var(--text-muted)]">
        <h2 className="text-lg font-semibold text-white">Registereintrag</h2>
        <p>Eintragung im Handelsregister.</p>
        <p>Registergericht: [Registergericht]</p>
        <p>Registernummer: [Registernummer]</p>
      </section>

      <section className="mt-6 space-y-1 text-[var(--text-muted)]">
        <h2 className="text-lg font-semibold text-white">Umsatzsteuer-ID</h2>
        <p>Umsatzsteuer-Identifikationsnummer gemäß §27a UStG: [USt-IdNr.]</p>
      </section>

      <section className="mt-6 space-y-1 text-[var(--text-muted)]">
        <h2 className="text-lg font-semibold text-white">Hinweis zu Finanzdienstleistungen</h2>
        <p>
          [Name der Plattform] ist eine Vermittlungsplattform und selbst kein reguliertes
          Zahlungs-, Finanz- oder Kryptowertdienstleistungsunternehmen im Sinne des KWG/ZAG bzw.
          der MiCA-Verordnung. Kauf, Zahlungsabwicklung, Identitätsprüfung (KYC) und Auszahlung der
          Kryptowährung werden ausschließlich durch die auf der Plattform angezeigten, lizenzierten
          Drittanbieter erbracht.
        </p>
      </section>

      <section className="mt-6 space-y-1 text-[var(--text-muted)]">
        <h2 className="text-lg font-semibold text-white">Streitschlichtung</h2>
        <p>
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
          <a
            className="underline"
            href="https://ec.europa.eu/consumers/odr/"
            target="_blank"
            rel="noreferrer"
          >
            https://ec.europa.eu/consumers/odr/
          </a>
          . Unsere E-Mail-Adresse findet ihr oben. Wir sind nicht bereit oder verpflichtet, an
          Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen. [ggf.
          anpassen]
        </p>
      </section>
    </div>
  );
}
