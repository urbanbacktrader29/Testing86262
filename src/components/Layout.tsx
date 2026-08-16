import { NavLink, Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";
import LocalAiStatusBanner from "./LocalAiStatusBanner";

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
            <span className="font-semibold text-lg tracking-tight">Krypto Analyse</span>
          </NavLink>
          <nav className="hidden sm:flex items-center gap-1">
            <NavLink to="/" end className={navItemClass}>
              Dashboard
            </NavLink>
            <NavLink to="/watchlist" className={navItemClass}>
              Watchlist
            </NavLink>
            <NavLink to="/signals" className={navItemClass}>
              Signale
            </NavLink>
            <NavLink to="/bot" className={navItemClass}>
              Bot
            </NavLink>
            <NavLink to="/feed" className={navItemClass}>
              Feed
            </NavLink>
          </nav>
        </div>
      </header>
      <LocalAiStatusBanner />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 pb-24 sm:pb-6">
        <Outlet />
      </main>
      <footer className="hidden sm:block border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        Marktdaten von{" "}
        <a href="https://www.binance.com" target="_blank" rel="noreferrer" className="underline hover:text-slate-300">
          Binance
        </a>{" "}
        · KI-Signale laufen lokal im Browser (Llama 3.2, WebGPU) · Keine Anlageberatung
      </footer>
      <BottomNav />
    </div>
  );
}
