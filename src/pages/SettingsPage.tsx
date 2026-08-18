import { useApp } from "../context/AppContext";

export default function SettingsPage() {
  const { settings, updateSettings, tracking, setTracking } = useApp();

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Einstellungen</h1>
        <p className="text-sm text-slate-400">Warnradius, Ton und Datenverwaltung.</p>
      </div>

      <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Warnradius</span>
          <span className="text-sm text-emerald-400 font-semibold">{settings.alertRadius} m</span>
        </div>
        <input
          type="range"
          min={100}
          max={2000}
          step={50}
          value={settings.alertRadius}
          onChange={(e) => updateSettings({ alertRadius: Number(e.target.value) })}
          className="w-full accent-emerald-500"
        />
        <p className="text-xs text-slate-500">Ab welcher Entfernung zu einem Blitzer gewarnt wird.</p>
      </div>

      <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <div>
          <p className="text-sm font-medium">Ton bei Warnung</p>
          <p className="text-xs text-slate-500">Kurzer Warnton, wenn ein Blitzer in Reichweite kommt.</p>
        </div>
        <input
          type="checkbox"
          checked={settings.soundEnabled}
          onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
          className="h-5 w-5 accent-emerald-500"
        />
      </label>

      <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <div>
          <p className="text-sm font-medium">Live-Ortung</p>
          <p className="text-xs text-slate-500">Position laufend aktualisieren, auch außerhalb der Karte.</p>
        </div>
        <input
          type="checkbox"
          checked={tracking}
          onChange={(e) => setTracking(e.target.checked)}
          className="h-5 w-5 accent-emerald-500"
        />
      </label>

      <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Gültigkeit gemeldeter Blitzer</span>
          <span className="text-sm text-emerald-400 font-semibold">{settings.reportLifetimeHours} h</span>
        </div>
        <input
          type="range"
          min={1}
          max={24}
          step={1}
          value={settings.reportLifetimeHours}
          onChange={(e) => updateSettings({ reportLifetimeHours: Number(e.target.value) })}
          className="w-full accent-emerald-500"
        />
        <p className="text-xs text-slate-500">Danach werden mobile Meldungen automatisch entfernt.</p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-500 space-y-2">
        <p>
          <strong className="text-slate-300">Hinweis:</strong> In Deutschland (§ 23 Abs. 1b StVO) und einigen anderen
          Ländern ist die Nutzung von Blitzerwarnern während der aktiven Fahrt für Fahrer:innen untersagt. Bitte
          Gerät nicht während der Fahrt bedienen und die jeweils geltenden gesetzlichen Vorschriften beachten.
        </p>
        <p>
          Fest installierte Blitzer stammen aus einem kleinen Demo-Datensatz, mobile Blitzer aus Meldungen auf diesem
          Gerät — es handelt sich nicht um eine amtliche oder vollständige Datenquelle.
        </p>
      </div>
    </div>
  );
}
