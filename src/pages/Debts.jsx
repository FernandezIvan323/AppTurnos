import { useEffect, useState } from "react";
import api from "../lib/api";
import Header from "../components/Header";
import { money, formatDate, typeLabels } from "../lib/format";
import { AlertTriangle, CheckCircle2, Search } from "lucide-react";

function daysSince(iso) {
  if (!iso) return 0;
  const diff = Date.now() - new Date(iso).getTime();
  return Math.floor(diff / 86400000);
}

export default function Debts() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [paying, setPaying] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data } = await api.get("/orders", { params: { payment: "debt" } });
    setOrders(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const payDebt = async (id) => {
    setPaying(id);
    try {
      await api.post(`/orders/${id}/pay-debt`, { payment_method: "cash" });
      await load();
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    } finally {
      setPaying(null);
    }
  };

  const filtered = filter === "all" ? orders : orders.filter((o) => o.type === filter);
  const totalDebt = filtered.reduce((s, o) => s + Number(o.total), 0);

  return (
    <div>
      <Header
        title="Deudas pendientes"
        subtitle="Pedidos entregados pero no cobrados"
        right={
          <div className="flex items-center gap-2">
            <select className="input h-9 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">Todos</option>
              <option value="delivery">Domicilios</option>
              <option value="table">Mesas</option>
              <option value="pickup">Para llevar</option>
            </select>
          </div>
        }
      />

      <div className="card p-4 bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200">
          <AlertTriangle size={20} />
          <span className="font-semibold">{filtered.length} deuda{filtered.length === 1 ? "" : "s"} pendiente{filtered.length === 1 ? "" : "s"}</span>
        </div>
        <div className="text-xl font-bold text-rose-700 dark:text-rose-300">{money(totalDebt)}</div>
      </div>

      {loading ? (
        <div className="text-sm text-ink-500 dark:text-obsidian-400">Cargando…</div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center text-ink-500 dark:text-obsidian-400">
          <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-2" />
          No hay deudas pendientes.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((o) => (
            <div key={o.id} className="card p-4 flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge bg-slate-100 text-slate-700 dark:bg-obsidian-800 dark:text-obsidian-200 text-[10px]">
                    #{o.id}
                  </span>
                  <span className="badge bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-[10px]">
                    {typeLabels[o.type] || o.type}
                  </span>
                  {daysSince(o.closed_at) > 0 && (
                    <span className={`badge text-[10px] ${daysSince(o.closed_at) >= 7 ? "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300" : "bg-slate-100 text-slate-600 dark:bg-obsidian-800 dark:text-obsidian-300"}`}>
                      {daysSince(o.closed_at)} día{daysSince(o.closed_at) === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
                <div className="font-medium text-ink-800 dark:text-obsidian-50">{o.customer_name}</div>
                {o.type === "delivery" && o.customer_address && (
                  <div className="text-xs text-ink-500 dark:text-obsidian-400">{o.customer_address}</div>
                )}
                {o.type === "table" && o.table_number && (
                  <div className="text-xs text-ink-500 dark:text-obsidian-400">Mesa {o.table_number}{o.table_label ? ` · ${o.table_label}` : ""}</div>
                )}
                <div className="text-xs text-ink-400 dark:text-obsidian-500 mt-0.5">
                  {o.delivery_name && `${o.delivery_name} · `}{formatDate(o.closed_at || o.created_at)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-ink-800 dark:text-obsidian-50">{money(o.total)}</div>
                <button
                  onClick={() => payDebt(o.id)}
                  disabled={paying === o.id}
                  className="btn-primary text-xs h-7 mt-2"
                >
                  {paying === o.id ? "Cobrando…" : "Cobrar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
