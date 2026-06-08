import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import Header from "../../components/Header";
import { useAuth } from "../../store/auth";
import { money, formatTime, statusLabels, statusColors } from "../../lib/format";
import {
  Plus, X, Minus, CheckCircle2, Receipt, Clock, ChefHat, ArrowLeft, Utensils, History,
} from "lucide-react";

function timeAgo(iso) {
  if (!iso) return "—";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function OrderModal({ table, onClose, onChanged, onGoCashier }) {
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [tab, setTab] = useState("menu");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const ps = await api.get("/products");
    setProducts(ps.data.filter((p) => p.available));
    if (table.current_order_id) {
      const o = await api.get(`/orders/${table.current_order_id}`);
      setOrder(o.data); setItems(o.data.items);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [table.id]);

  const createOrder = async (productId) => {
    setError(null);
    try {
      const { data } = await api.post("/orders", {
        type: "table",
        table_id: table.id,
        items: [{ product_id: productId, quantity: 1 }],
      });
      await load(); onChanged();
    } catch (e) { setError(e.response?.data?.error || e.message); }
  };

  const addItem = async (productId) => {
    await api.post(`/orders/${order.id}/items`, { product_id: productId, quantity: 1 });
    await load(); onChanged();
  };

  const removeItem = async (itemId) => {
    await api.delete(`/orders/${order.id}/items/${itemId}`);
    await load(); onChanged();
  };

  const setStatus = async (status) => {
    try {
      await api.post(`/orders/${order.id}/status`, { status });
      await load(); onChanged();
    } catch (e) { setError(e.response?.data?.error || e.message); }
  };

  const total = items.reduce((s, x) => s + Number(x.unit_price) * x.quantity, 0);

  if (loading) return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
      <div className="card p-8 text-ink-500 dark:text-ink-400">Cargando…</div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
      <div className="card w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-paper-300 dark:border-ink-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink-800 dark:text-ink-100">
              {table.label || `Mesa ${table.number}`}
              <span className="ml-2 text-sm font-normal text-ink-500 dark:text-ink-400">(capacidad {table.capacity})</span>
            </h2>
            {order && <div className="text-xs text-ink-500 dark:text-ink-400">Pedido #{order.id} · abierto {formatTime(order.created_at)} · hace {timeAgo(order.created_at)}</div>}
          </div>
          <button onClick={onClose} className="btn-ghost"><X size={18}/></button>
        </div>

        {order && order.status === "ready_to_pay" && (
          <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 flex items-center justify-between">
            <div className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <Receipt size={14}/> Esta cuenta está lista para cobrar
            </div>
            <button onClick={() => onGoCashier(order)} className="btn-primary text-xs h-8">
              <CheckCircle2 size={14}/> Ir a cobrar
            </button>
          </div>
        )}

        {!order ? (
          <div className="p-5 overflow-y-auto">
            <p className="text-sm text-ink-500 dark:text-ink-400 mb-3">Esta mesa está libre. Selecciona el primer producto para abrir la cuenta.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {products.map((p) => (
                <button key={p.id} onClick={() => createOrder(p.id)} className="card p-3 text-left hover:border-brand-400 dark:hover:border-brand-600 transition">
                  <div className="text-xs text-ink-400 dark:text-ink-500">{p.category_name || "—"}</div>
                  <div className="font-medium text-ink-800 dark:text-ink-100 text-sm">{p.name}</div>
                  <div className="text-brand-700 dark:text-brand-300 font-semibold mt-1">{money(p.price)}</div>
                </button>
              ))}
            </div>
            {error && <div className="mt-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800">{error}</div>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 flex-1 overflow-hidden">
            <div className="p-5 border-r border-paper-300 dark:border-ink-800 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-ink-700 dark:text-ink-200">Cuenta</h3>
                <span className={`badge ${statusColors[order.status]}`}>{statusLabels[order.status]}</span>
              </div>
              {items.length === 0 && <div className="text-sm text-ink-400 dark:text-ink-500">Sin productos, agrega del menú →</div>}
              <div className="space-y-1.5">
                {items.map((it) => (
                  <div key={it.id} className="flex items-center gap-2 text-sm py-1.5 border-b border-paper-200 dark:border-ink-800">
                    <div className="flex-1">
                      <div className="font-medium text-ink-800 dark:text-ink-100">{it.name_snapshot}</div>
                      <div className="text-xs text-ink-500 dark:text-ink-400">{money(it.unit_price)} c/u</div>
                    </div>
                    <div className="font-semibold">x{it.quantity}</div>
                    <button onClick={() => removeItem(it.id)} className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300"><Minus size={14} className="mx-auto"/></button>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-paper-200 dark:border-ink-800 flex items-center justify-between">
                <span className="text-ink-500 dark:text-ink-400">Total</span>
                <span className="text-2xl font-bold text-ink-800 dark:text-ink-100">{money(total)}</span>
              </div>
            </div>
            <div className="p-5 overflow-y-auto bg-paper-100 dark:bg-ink-950">
              <h3 className="font-semibold text-ink-700 dark:text-ink-200 mb-3">Agregar del menú</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {products.map((p) => (
                  <button key={p.id} onClick={() => addItem(p.id)} className="card p-3 text-left hover:border-brand-400 dark:hover:border-brand-600 transition">
                    <div className="text-xs text-ink-400 dark:text-ink-500">{p.category_name || "—"}</div>
                    <div className="font-medium text-ink-800 dark:text-ink-100 text-sm">{p.name}</div>
                    <div className="text-brand-700 dark:text-brand-300 font-semibold mt-1">{money(p.price)}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {order && (
          <div className="px-5 py-3 border-t border-paper-300 dark:border-ink-800 flex flex-wrap items-center justify-end gap-2">
            {order.status === "pending" && (
              <>
                <span className="text-xs text-ink-500 dark:text-ink-400 mr-auto">Pedido recién abierto. La cocina aún no lo empezó.</span>
                <button onClick={() => setStatus("preparing")} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition">
                  <ChefHat size={14}/> En preparación
                </button>
              </>
            )}
            {order.status === "preparing" && (
              <>
                <span className="text-xs text-ink-500 dark:text-ink-400 mr-auto">La cocina está preparando el pedido.</span>
                <button onClick={() => setStatus("pending")} className="btn-secondary text-xs" title="Volver a pendiente">
                  <ArrowLeft size={12}/> Pendiente
                </button>
                <button onClick={() => setStatus("ready_to_pay")} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition">
                  <Receipt size={14}/> Lista para cobrar
                </button>
              </>
            )}
            {order.status === "ready_to_pay" && (
              <span className="text-xs text-ink-500 dark:text-ink-400 mr-auto">La cuenta la cobra el cajero desde "Caja".</span>
            )}
            <button onClick={onClose} className="btn-secondary">Cerrar</button>
          </div>
        )}
        {error && <div className="px-5 py-2 text-sm text-rose-700 bg-rose-50 border-t border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800">{error}</div>}
      </div>
    </div>
  );
}

function TableHistoryModal({ onClose }) {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get("/tables").then((r) => setTables(r.data)); }, []);

  const loadHistory = async (t) => {
    setSelectedTable(t);
    setLoading(true);
    try {
      const { data } = await api.get(`/orders/table-history/${t.id}`);
      setHistory(data);
    } catch {} finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
      <div className="card w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-paper-300 dark:border-ink-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-800 dark:text-ink-100 flex items-center gap-2">
            <History size={18}/> Historial de mesas
          </h2>
          <button onClick={onClose} className="btn-ghost"><X size={18}/></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">
          <div className="flex gap-2 mb-4 flex-wrap">
            {tables.map((t) => (
              <button
                key={t.id}
                onClick={() => loadHistory(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border ${
                  selectedTable?.id === t.id
                    ? "bg-brand-500 text-white border-brand-500 dark:bg-brandDark-500 dark:text-[#1E222B]"
                    : "bg-paper-50 text-ink-600 border-paper-300 hover:bg-paper-200 dark:bg-[#262B36] dark:text-ink-300 dark:border-white/5 dark:hover:bg-[#2E3440]"
                }`}
              >
                Mesa {t.number}
              </button>
            ))}
          </div>
          {!selectedTable && <div className="text-sm text-ink-400 dark:text-ink-500 text-center py-8">Selecciona una mesa para ver su historial</div>}
          {loading && <div className="text-sm text-ink-500 dark:text-ink-400">Cargando…</div>}
          {selectedTable && !loading && history.length === 0 && (
            <div className="text-sm text-ink-400 dark:text-ink-500 text-center py-8">Mesa {selectedTable.number} no tiene pedidos previos.</div>
          )}
          {selectedTable && !loading && history.length > 0 && (
            <div className="space-y-2">
              {history.map((o) => (
                <div key={o.id} className="flex items-center justify-between card p-3 text-sm">
                  <div>
                    <div className="font-medium text-ink-800 dark:text-ink-100">#{o.id}</div>
                    <div className="text-xs text-ink-500 dark:text-ink-400">{o.user_name && `por ${o.user_name}`} · {o.closed_at ? new Date(o.closed_at).toLocaleDateString() : new Date(o.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-ink-700 dark:text-ink-200">{money(o.total)}</div>
                    <span className={`badge text-[10px] ${statusColors[o.status]} dark:opacity-80`}>{statusLabels[o.status]}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TablesPage() {
  const { user } = useAuth();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const nav = useNavigate();

  const load = async () => {
    setLoading(true);
    const { data } = await api.get("/tables");
    setTables(data);
    setLoading(false);
  };
  useEffect(() => { load(); const t = setInterval(load, 20_000); return () => clearInterval(t); }, []);

  return (
    <div>
      <Header
        title={user?.role === "waiter" ? "Mis mesas" : "Mesas"}
        subtitle={
          user?.role === "waiter"
            ? "Toca una mesa para abrir o agregar a la cuenta"
            : "Estado de las mesas en tiempo real"
        }
        right={
          <button onClick={() => setShowHistory(true)} className="btn-secondary h-9">
            <History size={16}/> Historial
          </button>
        }
      />

      {user?.role === "waiter" && tables.length === 0 && !loading && (
        <div className="card p-8 text-center bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
          <Utensils size={32} className="mx-auto text-amber-500 mb-2"/>
          <div className="font-semibold text-ink-800 dark:text-ink-100">No tienes mesas asignadas</div>
          <p className="text-sm text-ink-600 dark:text-ink-400 mt-1">
            Pídele al cajero que te asigne mesas desde <b>Personal → Asignaciones</b>.
          </p>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-ink-500 dark:text-ink-400">Cargando…</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {tables.map((t) => {
            const occ = !!t.current_order_id;
            const status = t.current_order_status;
            const readyToPay = status === "ready_to_pay";
            const preparing = status === "preparing";
            const pending = status === "pending";
            let cardClass = "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20";
            let dotClass = "bg-emerald-500";
            if (readyToPay) {
              cardClass = "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20";
              dotClass = "bg-amber-500";
            } else if (preparing) {
              cardClass = "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20";
              dotClass = "bg-blue-500";
            } else if (pending) {
              cardClass = "border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-900/20";
              dotClass = "bg-rose-500";
            }
            return (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className={`card p-4 text-left transition hover:shadow-pop border-2 ${cardClass}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-ink-500 dark:text-ink-400">Mesa</div>
                    <div className="text-2xl font-bold text-ink-800 dark:text-ink-100">{t.number}</div>
                    {t.label && <div className="text-xs text-ink-500 dark:text-ink-400">{t.label}</div>}
                  </div>
                  <div className={`w-3 h-3 rounded-full ${dotClass}`} />
                </div>
                <div className="mt-2 text-xs text-ink-500 dark:text-ink-400">Capacidad: {t.capacity}</div>

                {occ ? (
                  <div className="mt-2 pt-2 border-t border-paper-300/50 dark:border-ink-700/50 space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ink-500 dark:text-ink-400">{t.current_order_items} productos</span>
                      <span className="font-bold text-ink-800 dark:text-ink-100">{money(t.current_order_total)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-ink-500 dark:text-ink-400">
                      <Clock size={10}/> {timeAgo(t.current_order_created)}
                    </div>
                    {readyToPay ? (
                      <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                        <Receipt size={10}/> Lista para cobrar
                      </div>
                    ) : preparing ? (
                      <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                        <ChefHat size={10}/> En preparación
                      </div>
                    ) : (
                      <div className="text-[11px] text-rose-700 dark:text-rose-300">
                        Abierta · pendiente
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    Libre
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <OrderModal
          table={selected}
          onClose={() => { setSelected(null); load(); }}
          onChanged={load}
          onGoCashier={() => { setSelected(null); nav("/cashier"); }}
        />
      )}
      {showHistory && <TableHistoryModal onClose={() => setShowHistory(false)} />}
    </div>
  );
}
