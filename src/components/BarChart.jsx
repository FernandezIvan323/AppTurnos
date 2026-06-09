export default function BarChart({ data, valueKey = "value", labelKey = "label", maxBars = 20, height = 180 }) {
  if (!data || data.length === 0) {
    return <div className="text-sm text-ink-400 dark:text-obsidian-500 text-center py-6">Sin datos en el período.</div>;
  }
  const sliced = data.slice(0, maxBars);
  const max = Math.max(1, ...sliced.map((d) => Number(d[valueKey]) || 0));
  return (
    <div className="space-y-1.5" style={{ minHeight: height }}>
      {sliced.map((d, i) => {
        const pct = (Number(d[valueKey]) / max) * 100;
        return (
          <div key={i} className="flex items-center gap-3 text-xs">
            <div className="w-32 shrink-0 truncate text-ink-600 dark:text-obsidian-200" title={d[labelKey]}>
              {d[labelKey]}
            </div>
            <div className="flex-1 bg-paper-200 dark:bg-obsidian-800 rounded-lg overflow-hidden h-5 relative">
              <div
                className="h-full bg-brand-500 dark:bg-brand-400 transition-all"
                style={{ width: `${pct}%` }}
              />
              <span className="absolute right-2 top-0 leading-5 text-ink-600 dark:text-obsidian-200 font-medium">
                {typeof d[valueKey] === "number" && d[valueKey] % 1 !== 0
                  ? d[valueKey].toFixed(2)
                  : d[valueKey]}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
