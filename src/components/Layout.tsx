import { Link, NavLink } from "react-router-dom";
import type { ReactNode } from "react";
import Logo from "./Logo";
import { BRAND } from "../lib/config";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `transition-colors hover:text-white ${isActive ? "text-white" : "text-[var(--text-muted)]"}`;

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col safe-top safe-bottom">
      <header className="sticky top-0 z-40 border-b border-[var(--border)]/60 bg-[var(--bg)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" aria-label={`${BRAND.name} — Startseite`}>
            <Logo />
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium sm:flex">
            <NavLink to="/#so-funktionierts" className={navLinkClass}>
              So funktioniert's
            </NavLink>
            <NavLink to="/#faq" className={navLinkClass}>
              FAQ
            </NavLink>
          </nav>
          <a
            href="#kaufen"
            className="brand-gradient-bg rounded-full px-4 py-2 text-sm font-semibold text-black shadow-lg shadow-[#7c5cff]/20 transition-transform hover:scale-[1.03]"
          >
            Jetzt kaufen
          </a>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[var(--border)]/60 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo />
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--text-muted)]">
            <Link to="/#faq" className="hover:text-white">
              FAQ
            </Link>
            <Link to="/impressum" className="hover:text-white">
              Impressum
            </Link>
            <Link to="/datenschutz" className="hover:text-white">
              Datenschutz
            </Link>
            <a href={`mailto:${BRAND.supportEmail}`} className="hover:text-white">
              Kontakt
            </a>
          </nav>
        </div>
        <p className="mx-auto mt-6 max-w-6xl px-4 text-xs leading-relaxed text-[var(--text-muted)] sm:px-6">
          {BRAND.name} ist eine Vermittlungsplattform und selbst kein reguliertes Zahlungs- oder
          Kryptodienstleistungsunternehmen. Kauf, Zahlungsabwicklung, Identitätsprüfung (KYC) und
          Auszahlung der Kryptowährung erfolgen durch die auf der Plattform angezeigten,
          lizenzierten Drittanbieter über Onramper. Kryptowährungen sind volatil — der Wert deiner
          Investition kann sinken. Dies ist keine Anlageberatung.
        </p>
      </footer>
    </div>
  );
}
