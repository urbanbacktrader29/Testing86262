import { NavLink, Outlet } from "react-router-dom";
import AlertBanner from "./AlertBanner";
import BottomNav from "./BottomNav";

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive ? "bg-emerald-500/15 text-emerald-400" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
  }`;

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-[#0b0e14]/90 backdrop-blur safe-top">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
          <NavLink to="/" className="flex items-center gap-2 shrink-0">
            <img src="/icon-192.png" alt="" className="w-7 h-7 rounded-lg" />
            <span className="font-semibold text-lg tracking-tight">Blitzer-Warner</span>
          </NavLink>
          <nav className="hidden sm:flex items-center gap-1">
            <NavLink to="/" end className={navItemClass}>
              Karte
            </NavLink>
            <NavLink to="/liste" className={navItemClass}>
              Liste
            </NavLink>
            <NavLink to="/melden" className={navItemClass}>
              Melden
            </NavLink>
            <NavLink to="/einstellungen" className={navItemClass}>
              Einstellungen
            </NavLink>
          </nav>
        </div>
      </header>
      <AlertBanner />
      <main className="flex-1 min-w-0 max-w-7xl w-full mx-auto px-4 py-6 pb-24 sm:pb-6">
        <Outlet />
      </main>
      <footer className="hidden sm:block border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        Kartendaten von{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline hover:text-slate-300">
          OpenStreetMap
        </a>{" "}
        · Blitzerdaten: Demo-Datensatz + lokale Meldungen · Bitte während der Fahrt nicht bedienen
      </footer>
      <BottomNav />
    </div>
  );
}
