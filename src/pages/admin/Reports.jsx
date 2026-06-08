import { useEffect, useMemo, useState } from "react";
import api from "../../lib/api";
import Header from "../../components/Header";
import BarChart from "../../components/BarChart";
import { money } from "../../lib/format";
import {
  DollarSign, TrendingUp, TrendingDown, ShoppingBag, Truck, Award,
  Clock, Users as UsersIcon, AlertCircle, Tag, Calendar,
} from "lucide-react";

function RangePicker({ value, onChange }) {
  return (
    <div className="flex gap-1 bg-paper-50 dark:bg-ink-900 border border-paper-300 dark:border-ink-700 rounded-xl p-1">
      {[
        { v: "today",     l: "Hoy" },
        { v: "week",      l: "Semana" },
        { v: "month",     l: "Mes" },
        { v: "year",      l: "Año" },
        { v: "custom",    l: "Personalizado" },
      ].map((t) => (
        <button
          key={t.v}
          onClick={() => onChange(t.v)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
            value === t.v ? "bg-brand-600 text-white" : "text-ink-600 dark:text-ink-300 hover:bg-paper-200 dark:hover:bg-ink-800"
          }`}
        >
          {t.l}
        </button>
      ))}
    </div>
  );
}

function getRange(preset) {
  const today = new Date();
  const ymd = (d) => d.toISOString().slice(0, 10);
  const start = new Date(today);
  if (preset === "today") {
    return { from: ymd(today), to: ymd(today), label: "Hoy" };
  }
  if (preset === "week") {
    start.setDate(today.getDate() - 6);
    return { from: ymd(start), to: ymd(today), label: "Últimos 7 días" };
  }
  if (preset === "month") {
    start.setDate(today.getDate() - 29);
    return { from: ymd(start), to: ymd(today), label: "Últimos 30 días" };
  }
  if (preset === "year") {
    start.setDate(today.getDate() - 364);
    return { from: ymd(start), to: ymd(today), label: "Últimos 365 días" };
  }
  return { from: ymd(today), to: ymd(today), label: "Personalizado" };
}

function StatCard({ icon: Icon, label, value, sub, color = "bg-brand-50 text-brand-700", darkColor = "dark:bg-brand-900/30 dark:text-brand-300" }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color} ${darkColor}`}>
          <Icon size={20} />
        </div>
        <div>
          <div className="text-sm text-ink-500 dark:text-ink-400">{label}</div>
          <div className="text-2xl font-semibold text-ink-800 dark:text-ink-100">{value}</div>
          {sub && <div className="text-xs text-ink-400 dark:text-ink-500 mt-0.5">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

function TrendPill({ current, previous, format = (n) => n }) {
  if (!previous || Number(previous) === 0) return null;
  const diff = (Number(current) - Number(previous)) / Number(previous) * 100;
  const up = diff >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
      <Icon size={12} /> {Math.abs(diff).toFixed(1)}% vs período anterior
    </span>
  );
}

export default function Reports() {
  const [preset, setPreset] = useState("week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const range = useMemo(() => {
    if (preset === "custom" && customFrom && customTo) {
      return { from: customFrom, to: customTo, label: `${customFrom} → ${customTo}` };
    }
    return getRange(preset);
  }, [preset, customFrom, customTo]);

  const [sales, setSales] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [byCategory, setByCategory] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [neverSold, setNeverSold] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [s, tp, bc, ph, tc, ns] = await Promise.all([
        api.get("/reports/sales", { params: range }),
        api.get("/reports/top-products", { params: { ...range, by: "qty", limit: 10 } }),
        api.get("/reports/by-category", { params: range }),
        api.get("/reports/peak-hours", { params: range }),
        api.get("/reports/top-customers", { params: { ...range, limit: 10 } }),
        api.get("/reports/never-sold"),
      ]);
      setSales(s.data);
      setTopProducts(tp.data);
      setByCategory(bc.data);
      setPeakHours(ph.data);
      setTopCustomers(tc.data);
      setNeverSold(ns.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [range.from, range.to]);

  const [topBy, setTopBy] = useState("qty");

  useEffect(() => {
    api.get("/reports/top-products", { params: { ...range, by: topBy, limit: 10 } })
      .then((r) => setTopProducts(r.data));
  }, [topBy, range.from, range.to]);

  return (
    <div>
      <Header
        title="Reportes"
        subtitle={range.label}
        right={
          <RangePicker value={preset} onChange={setPreset} />
        }
      />

      {preset === "custom" && (
        <div className="card p-4 mb-4 flex items-center gap-3">
          <Calendar size={16} className="text-ink-500"/>
          <input type="date" className="input h-9 text-sm max-w-[160px]" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
          <span className="text-ink-400">→</span>
          <input type="date" className="input h-9 text-sm max-w-[160px]" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
        </div>
      )}

      {loading ? (
        <div className="text-sm text-ink-500 dark:text-ink-400">Cargando…</div>
      ) : (
        <>
          {/* === SECCIÓN A: Resumen de ventas === */}
          <h2 className="text-sm font-semibold text-ink-500 dark:text-ink-400 uppercase tracking-wide mb-3">A · Resumen de ventas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
            <StatCard
              icon={DollarSign}
              label="Ventas del período"
              value={money(sales?.current?.sales || 0)}
              sub={<TrendPill current={sales?.current?.sales} previous={sales?.previous?.sales} />}
            />
            <StatCard
              icon={ShoppingBag}
              label="Pedidos"
              value={sales?.current?.orders || 0}
              sub={`${sales?.current?.delivery_orders || 0} domicilios · ${sales?.current?.table_orders || 0} mesas`}
              color="bg-amber-50 text-amber-700" darkColor="dark:bg-amber-900/30 dark:text-amber-300"
            />
            <StatCard
              icon={Tag}
              label="Ticket promedio"
              value={money(sales?.current?.avg_ticket || 0)}
              sub="Promedio por pedido"
              color="bg-indigo-50 text-indigo-700" darkColor="dark:bg-indigo-900/30 dark:text-indigo-300"
            />
            <StatCard
              icon={Truck}
              label="Ganancias domicilios"
              value={money(sales?.delivery_gains?.total || 0)}
              sub={`${sales?.delivery_gains?.count || 0} pedidos a domicilio cobrados`}
              color="bg-sky-50 text-sky-700" darkColor="dark:bg-sky-900/30 dark:text-sky-300"
            />
          </div>

          {/* Gráfico de ventas por día */}
          {sales?.days?.length > 0 && (
            <div className="card p-5 mb-6">
              <h3 className="font-semibold text-ink-700 dark:text-ink-200 mb-3">Ventas por día</h3>
              <BarChart
                data={sales.days.map((d) => ({
                  label: new Date(d.date).toLocaleDateString("es-MX", { day: "2-digit", month: "short" }),
                  value: Number(d.sales),
                }))}
                valueKey="value"
                labelKey="label"
                maxBars={31}
              />
            </div>
          )}

          {/* === SECCIÓN B: Top productos === */}
          <h2 className="text-sm font-semibold text-ink-500 dark:text-ink-400 uppercase tracking-wide mb-3">B · Productos más vendidos (Top 10)</h2>
          <div className="card p-5 mb-6">
            <div className="flex items-center gap-1 mb-3">
              {[
                { v: "qty",     l: "Por cantidad" },
                { v: "revenue", l: "Por ganancia" },
              ].map((t) => (
                <button
                  key={t.v}
                  onClick={() => setTopBy(t.v)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                    topBy === t.v ? "bg-brand-600 text-white" : "text-ink-600 dark:text-ink-300 hover:bg-paper-200 dark:hover:bg-ink-800"
                  }`}
                >
                  {t.l}
                </button>
              ))}
            </div>
            {topProducts.length === 0 ? (
              <div className="text-sm text-ink-400 dark:text-ink-500 text-center py-6">Sin ventas en el período.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-ink-500 dark:text-ink-400 border-b border-paper-300 dark:border-ink-800">
                    <tr>
                      <th className="py-2 pr-3 font-medium">#</th>
                      <th className="py-2 pr-3 font-medium">Producto</th>
                      <th className="py-2 pr-3 font-medium">Categoría</th>
                      <th className="py-2 pr-3 font-medium text-right">Cantidad</th>
                      <th className="py-2 pr-3 font-medium text-right">Pedidos</th>
                      <th className="py-2 pl-3 font-medium text-right">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((p, i) => (
                      <tr key={i} className="border-b border-paper-200 dark:border-ink-800">
                        <td className="py-2 pr-3 text-ink-400 dark:text-ink-500">{i + 1}</td>
                        <td className="py-2 pr-3 font-medium text-ink-800 dark:text-ink-100">{p.name}</td>
                        <td className="py-2 pr-3 text-ink-500 dark:text-ink-400">{p.category || "—"}</td>
                        <td className="py-2 pr-3 text-right font-semibold">{p.qty}</td>
                        <td className="py-2 pr-3 text-right text-ink-500 dark:text-ink-400">{p.orders_count}</td>
                        <td className="py-2 pl-3 text-right font-semibold text-brand-700 dark:text-brand-300">{money(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* === SECCIÓN C: Métricas adicionales === */}
          <h2 className="text-sm font-semibold text-ink-500 dark:text-ink-400 uppercase tracking-wide mb-3">C · Métricas adicionales</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Horarios pico */}
            <div className="card p-5">
              <h3 className="font-semibold text-ink-700 dark:text-ink-200 mb-1 flex items-center gap-2">
                <Clock size={16}/> Horarios pico
              </h3>
              <p className="text-xs text-ink-500 dark:text-ink-400 mb-3">Cantidad de pedidos cobrados por hora del día</p>
              <BarChart
                data={peakHours.map((h) => ({
                  label: `${String(h.hour).padStart(2, "0")}:00`,
                  value: h.orders,
                }))}
                maxBars={24}
              />
            </div>

            {/* Ventas por categoría */}
            <div className="card p-5">
              <h3 className="font-semibold text-ink-700 dark:text-ink-200 mb-1 flex items-center gap-2">
                <Tag size={16}/> Ventas por categoría
              </h3>
              <p className="text-xs text-ink-500 dark:text-ink-400 mb-3">Ingresos generados por categoría</p>
              <BarChart
                data={byCategory.map((c) => ({
                  label: c.category,
                  value: Number(c.revenue),
                }))}
              />
            </div>

            {/* Clientes más frecuentes */}
            <div className="card p-5">
              <h3 className="font-semibold text-ink-700 dark:text-ink-200 mb-1 flex items-center gap-2">
                <UsersIcon size={16}/> Clientes más frecuentes
              </h3>
              <p className="text-xs text-ink-500 dark:text-ink-400 mb-3">Top 10 por gasto total</p>
              {topCustomers.length === 0 ? (
                <div className="text-sm text-ink-400 dark:text-ink-500 text-center py-4">Sin clientes en el período.</div>
              ) : (
                <div className="space-y-1.5">
                  {topCustomers.map((c, i) => (
                    <div key={c.id} className="flex items-center justify-between text-sm py-1.5 border-b border-paper-200 dark:border-ink-800 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="w-6 text-ink-400 dark:text-ink-500 text-xs">{i + 1}.</span>
                        <div>
                          <div className="font-medium text-ink-800 dark:text-ink-100">{c.name}</div>
                          <div className="text-xs text-ink-500 dark:text-ink-400">
                            {c.orders_count} pedidos {c.neighborhood && `· ${c.neighborhood}`}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-brand-700 dark:text-brand-300">{money(c.total_spent)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Comparativa */}
            {sales && (
              <div className="card p-5">
                <h3 className="font-semibold text-ink-700 dark:text-ink-200 mb-1 flex items-center gap-2">
                  <TrendingUp size={16}/> Comparativa con período anterior
                </h3>
                <p className="text-xs text-ink-500 dark:text-ink-400 mb-3">Mismo número de días anteriores</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-ink-500 dark:text-ink-400">Ventas período actual</span>
                    <span className="text-lg font-bold text-ink-800 dark:text-ink-100">{money(sales.current.sales)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-ink-500 dark:text-ink-400">Ventas período anterior</span>
                    <span className="text-lg font-bold text-ink-500 dark:text-ink-400">{money(sales.previous?.sales || 0)}</span>
                  </div>
                  <div className="pt-3 border-t border-paper-200 dark:border-ink-800">
                    <TrendPill current={sales.current.sales} previous={sales.previous?.sales} format={(n) => money(n)} />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-500 dark:text-ink-400">Pedidos período actual</span>
                    <span className="font-semibold">{sales.current.orders}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-500 dark:text-ink-400">Pedidos período anterior</span>
                    <span className="font-semibold text-ink-500 dark:text-ink-400">{sales.previous?.orders || 0}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Productos nunca vendidos */}
            <div className="card p-5">
              <h3 className="font-semibold text-ink-700 dark:text-ink-200 mb-1 flex items-center gap-2">
                <AlertCircle size={16}/> Productos nunca vendidos
              </h3>
              <p className="text-xs text-ink-500 dark:text-ink-400 mb-3">Candidatos a retirar o replantear del menú</p>
              {neverSold.length === 0 ? (
                <div className="text-sm text-emerald-700 dark:text-emerald-300 text-center py-4">¡Todo el catálogo se ha vendido al menos una vez!</div>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {neverSold.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm py-1.5 border-b border-paper-200 dark:border-ink-800 last:border-0">
                      <div>
                        <div className="font-medium text-ink-800 dark:text-ink-100">{p.name}</div>
                        <div className="text-xs text-ink-500 dark:text-ink-400">{p.category || "Sin categoría"}</div>
                      </div>
                      <span className="text-xs text-ink-500 dark:text-ink-400">{money(p.price)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
