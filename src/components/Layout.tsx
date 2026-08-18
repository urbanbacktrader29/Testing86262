import { NavLink, Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-2">
          <NavLink to="/" className="flex items-center gap-2 font-semibold text-lg tracking-tight">
            <span aria-hidden>📄✨</span> DokuCheck
          </NavLink>
        </div>
      </header>
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-10">
        <Outlet />
      </main>
      <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        Analyse per KI · Zahlung sicher über Stripe · Keine Speicherung deines Dokuments über die Analyse hinaus
      </footer>
    </div>
  );
}
