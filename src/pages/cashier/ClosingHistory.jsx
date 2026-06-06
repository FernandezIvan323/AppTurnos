import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import Header from "../../components/Header";
import { money } from "../../lib/format";
import { History, ArrowLeft, Receipt, Printer } from "lucide-react";

function dateOnly(iso) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ClosingHistory() {
  const [closings, setClosings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    const params = {};
    if (from) params.from = from;
    if (to)   params.to = to;
    const { data } = await api.get("/cash-closings", { params });
    setClosings(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <Header
        title="Histórico de cortes"
        subtitle="Listado de cierres Z realizados"
        right={
          <Link to="/cashier/closing" className="btn-secondary text-sm">
            <ArrowLeft size={14}/> Volver al corte
          </Link>
        }
      />

      <div className="flex flex-wrap items-end gap-2 mb-4 max-w-3xl">
        <div>
          <label className="label">Desde</label>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">Hasta</label>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button onClick={load} className="btn-primary">Buscar</button>
        {(from || to) && (
          <button
            onClick={() => { setFrom(""); setTo(""); setTimeout(load, 0); }}
            className="btn-ghost text-sm"
          >
            Limpiar
          </button>
        )}
      </div>

      {loading ? (
        <div className="card p-8 text-center text-ink-500 dark:text-ink-400">Cargando…</div>
      ) : closings.length === 0 ? (
        <div className="card p-8 text-center text-ink-500 dark:text-ink-400">
          <History size={32} className="mx-auto text-ink-300 dark:text-ink-700 mb-2"/>
          No hay cortes registrados todavía.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-paper-100 dark:bg-ink-950 text-ink-600 dark:text-ink-300 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-2.5">Fecha</th>
                  <th className="text-right px-4 py-2.5">Pedidos</th>
                  <th className="text-right px-4 py-2.5">Ventas</th>
                  <th className="text-right px-4 py-2.5">Efectivo</th>
                  <th className="text-right px-4 py-2.5">Esperado</th>
                  <th className="text-right px-4 py-2.5">Contado</th>
                  <th className="text-right px-4 py-2.5">Diferencia</th>
                  <th className="text-left  px-4 py-2.5">Cerrado por</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {closings.map((c) => {
                  const d = Number(c.difference);
                  const diffClass =
                    Math.abs(d) < 0.01
                      ? "text-emerald-700 dark:text-emerald-300"
                      : d > 0
                        ? "text-blue-700 dark:text-blue-300"
                        : "text-rose-700 dark:text-rose-300";
                  return (
                    <tr
                      key={c.id}
                      className="border-t border-paper-200 dark:border-ink-800 hover:bg-paper-100 dark:hover:bg-ink-900 cursor-pointer"
                      onClick={() => setSelected(c)}
                    >
                      <td className="px-4 py-3 font-medium text-ink-800 dark:text-ink-100">{dateOnly(c.closing_date)}</td>
                      <td className="px-4 py-3 text-right">{c.total_orders}</td>
                      <td className="px-4 py-3 text-right font-semibold">{money(c.total_sales)}</td>
                      <td className="px-4 py-3 text-right">{money(c.cash_sales)}</td>
                      <td className="px-4 py-3 text-right">{money(c.expected_cash)}</td>
                      <td className="px-4 py-3 text-right">{money(c.counted_cash)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${diffClass}`}>
                        {d > 0 ? "+" : ""}{money(d)}
                      </td>
                      <td className="px-4 py-3 text-ink-600 dark:text-ink-300">{c.closed_by_name || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <Receipt size={14} className="text-ink-400"/>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50" onClick={() => setSelected(null)}>
          <div
            className="card w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            id="closing-printable"
          >
            <div className="flex items-start justify-between mb-3 print:hidden">
              <h2 className="text-lg font-semibold text-ink-800 dark:text-ink-100">Corte del {dateOnly(selected.closing_date)}</h2>
              <button onClick={() => setSelected(null)} className="btn-ghost text-sm">Cerrar</button>
            </div>

            <div className="hidden print:block mb-3">
              <h1 className="text-xl font-bold">Corte de caja</h1>
              <div className="text-sm">AppTurnos · {dateOnly(selected.closing_date)}</div>
              <div className="text-sm">Cajero: {selected.closed_by_name || "—"}</div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <div className="bg-paper-100 dark:bg-ink-950 rounded-xl p-3">
                <div className="text-xs text-ink-500 dark:text-ink-400">Ventas</div>
                <div className="font-bold text-ink-800 dark:text-ink-100">{money(selected.total_sales)}</div>
                <div className="text-xs text-ink-500 dark:text-ink-400">{selected.total_orders} pedidos</div>
              </div>
              <div className={`rounded-xl p-3 ${
                Math.abs(Number(selected.difference)) < 0.01
                  ? "bg-emerald-50 dark:bg-emerald-900/20"
                  : Number(selected.difference) > 0
                    ? "bg-blue-50 dark:bg-blue-900/20"
                    : "bg-rose-50 dark:bg-rose-900/20"
              }`}>
                <div className="text-xs text-ink-500 dark:text-ink-400">Diferencia</div>
                <div className="font-bold">{Number(selected.difference) > 0 ? "+" : ""}{money(selected.difference)}</div>
                <div className="text-xs text-ink-500 dark:text-ink-400">
                  Esp. {money(selected.expected_cash)} · Con. {money(selected.counted_cash)}
                </div>
              </div>
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-ink-500 dark:text-ink-400">Efectivo</span><span className="font-medium">{money(selected.cash_sales)}</span></div>
              <div className="flex justify-between"><span className="text-ink-500 dark:text-ink-400">Tarjeta</span><span className="font-medium">{money(selected.card_sales)}</span></div>
              <div className="flex justify-between"><span className="text-ink-500 dark:text-ink-400">Transferencia</span><span className="font-medium">{money(selected.transfer_sales)}</span></div>
              <div className="flex justify-between"><span className="text-ink-500 dark:text-ink-400">Mixto</span><span className="font-medium">{money(selected.mixed_sales)}</span></div>
            </div>

            {selected.notes && (
              <div className="mt-3 p-3 rounded-xl bg-paper-100 dark:bg-ink-950 text-sm text-ink-700 dark:text-ink-200 whitespace-pre-wrap">
                {selected.notes}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4 print:hidden">
              <button onClick={() => window.print()} className="btn-secondary text-sm">
                <Printer size={14}/> Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
