import { NavLink } from "react-router-dom";

interface NavItem {
  to: string;
  end?: boolean;
  label: string;
  icon: string;
}

const ITEMS: NavItem[] = [
  { to: "/", end: true, label: "Dashboard", icon: "▤" },
  { to: "/watchlist", label: "Watchlist", icon: "★" },
  { to: "/signals", label: "Signale", icon: "◈" },
  { to: "/bot", label: "Bot", icon: "🤖" },
  { to: "/feed", label: "Feed", icon: "💬" },
];

export default function BottomNav() {
  return (
    <nav
      className="sm:hidden fixed bottom-0 inset-x-0 z-30 border-t border-slate-800 bg-[#0b0e14]/95 backdrop-blur safe-bottom"
      aria-label="Hauptnavigation"
    >
      <div className="flex items-stretch">
        {ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs font-medium min-h-[52px] transition-colors ${
                isActive ? "text-emerald-400" : "text-slate-500"
              }`
            }
          >
            <span className="text-lg leading-none">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
