export default function StatCard({
  label,
  value,
  change,
  positive,
}: {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
}) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-lg font-semibold text-slate-100 mt-0.5">{value}</div>
      {change && <div className={`text-xs mt-0.5 ${positive === false ? "text-red-400" : "text-emerald-400"}`}>{change}</div>}
    </div>
  );
}
