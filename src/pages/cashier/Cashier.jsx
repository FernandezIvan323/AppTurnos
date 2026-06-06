import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import Header from "../../components/Header";
import { money, formatTime, typeLabels, statusLabels, statusColors } from "../../lib/format";
import { CheckCircle2, Receipt, X, Calculator, CreditCard, Wallet, Banknote, Building2, Truck, Utensils, ScrollText } from "lucide-react";

function CloseModal({ order, mode = "close", onClose, onClosed }) {
  // mode: 'close' = cobrar y cerrar (efectivo al entregar / mesa)
  // mode: 'prepay' = pre-cobrar (transferencia ya confirmada, pedido sigue en camino)
  const isPrepay = mode === "prepay";
  const [method, setMethod] = useState(isPrepay ? "transfer" : "cash");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      if (isPrepay) {
        await api.post(`/orders/${order.id}/prepay`, { payment_method: method });
      } else {
        await api.post(`/orders/${order.id}/close`, { payment_method: method });
      }
      onClosed(); onClose();
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally { setBusy(false); }
  };

  const methods = isPrepay
    ? [
        { v: "transfer", l: "Transferencia", icon: Building2 },
        { v: "card",     l: "Tarjeta",       icon: CreditCard },
      ]
    : [
        { v: "cash",     l: "Efectivo",      icon: Banknote },
        { v: "card",     l: "Tarjeta",       icon: CreditCard },
        { v: "transfer", l: "Transferencia", icon: Building2 },
        { v: "mixed",    l: "Mixto",         icon: Wallet },
      ];

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
      <div className="card w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-ink-800 dark:text-ink-100 mb-4 flex items-center gap-2">
          <Receipt size={20}/> {isPrepay ? "Pre-cobrar" : "Cobrar"} pedido #{order.id}
        </h2>
        <div className="bg-paper-100 dark:bg-ink-950 rounded-xl p-4 mb-4 text-center">
          <div className="text-sm text-ink-500 dark:text-ink-400">{isPrepay ? "Monto pre-cobrado" : "Total a cobrar"}</div>
          <div className="text-3xl font-bold text-ink-800 dark:text-ink-100">{money(order.total)}</div>
          <div className="text-xs text-ink-500 dark:text-ink-400 mt-1">
            {order.type === "table" ? `Mesa ${order.table_number}` : `${order.customer_name} · ${order.customer_neighborhood || ""}`}
          </div>
        </div>
        {isPrepay && (
          <div className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800">
            El pedido se marcará como pagado y seguirá en camino. El cierre final se hará al entregar.
          </div>
        )}
        <label className="label">Método de pago</label>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {methods.map((m) => (
            <button
              key={m.v}
              onClick={() => setMethod(m.v)}
              className={`px-3 py-2.5 rounded-xl border text-sm font-medium flex items-center justify-center gap-1.5 ${
                method === m.v
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-paper-50 text-ink-700 border-paper-300 hover:bg-paper-200 dark:bg-ink-900 dark:text-ink-200 dark:border-ink-700 dark:hover:bg-ink-800"
              }`}
            >
              <m.icon size={14}/> {m.l}
            </button>
          ))}
        </div>
        {err && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 mb-3 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800">{err}</div>}
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={submit} disabled={busy} className="btn-primary flex-1">
            {busy ? "Procesando…" : (isPrepay ? "Confirmar pre-cobro" : "Confirmar cobro")}
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderRow({ order, onClose, onPrepay }) {
  const isDelivery = order.type === "delivery";
  return (
    <div className="card p-4 flex items-center justify-between gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2 text-xs text-ink-500 dark:text-ink-400">
          <span>#{order.id}</span>
          <span>·</span>
          <span>{formatTime(order.created_at)}</span>
          <span className={`badge inline-flex items-center gap-1 ${
            isDelivery ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300" : "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300"
          }`}>
            {isDelivery ? <Truck size={10}/> : <Utensils size={10}/>}
            {typeLabels[order.type]}
          </span>
          <span className={`badge ${statusColors[order.status]}`}>{statusLabels[order.status]}</span>
        </div>
        <div className="font-semibold text-ink-800 dark:text-ink-100 mt-0.5">
          {order.type === "table"
            ? `Mesa ${order.table_number}` + (order.table_label ? ` · ${order.table_label}` : "")
            : `${order.customer_name}${order.customer_neighborhood ? " · " + order.customer_neighborhood : ""}`}
        </div>
        {order.notes && <div className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">Nota: {order.notes}</div>}
        {order.payment_status === "paid" && (
          <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">✓ Ya pagado ({order.payment_method})</div>
        )}
      </div>
      <div className="text-right">
        <div className="text-xl font-bold text-ink-800 dark:text-ink-100">{money(order.total)}</div>
        {isDelivery && order.status === "on_the_way" && order.payment_status !== "paid" && (
          <div className="flex flex-col gap-1 mt-1">
            <button onClick={() => onPrepay(order)} className="btn-secondary text-xs">
              <CreditCard size={12}/> Pre-cobrar (transfer)
            </button>
            <button onClick={() => onClose(order)} className="btn-primary text-xs">
              <CheckCircle2 size={12}/> Cobrar al entregar
            </button>
          </div>
        )}
        {(!isDelivery || (isDelivery && order.status !== "on_the_way") || order.payment_status === "paid") && (
          order.payment_status !== "paid" ? (
            <button onClick={() => onClose(order)} className="btn-primary text-sm mt-1">
              <CheckCircle2 size={14}/> Cobrar
            </button>
          ) : (
            <span className="badge bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 mt-1">Pagado</span>
          )
        )}
      </div>
    </div>
  );
}

export default function Cashier() {
  const [tab, setTab] = useState("pending");
  const [typeFilter, setTypeFilter] = useState("all");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toClose, setToClose] = useState(null);
  const [toPrepay, setToPrepay] = useState(null);

  const load = async () => {
    setLoading(true);
    const params = { payment: tab === "paid" ? "paid" : "pending" };
    if (typeFilter !== "all") params.type = typeFilter;
    const { data } = await api.get("/orders", { params });
    // Ordenar por antigüedad
    data.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    setOrders(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, [tab, typeFilter]);

  const summary = useMemo(() => {
    const tables = orders.filter((o) => o.type === "table");
    const deliveries = orders.filter((o) => o.type === "delivery");
    const total = orders.reduce((s, o) => s + Number(o.total), 0);
    return { tables: tables.length, deliveries: deliveries.length, total };
  }, [orders]);

  return (
    <div>
      <Header
        title="Caja"
        subtitle="Cierre y cobro de pedidos"
        right={
          <div className="flex gap-2 items-center">
            <div className="flex gap-1 bg-paper-50 dark:bg-ink-900 border border-paper-300 dark:border-ink-700 rounded-xl p-1">
              {[
                { v: "pending",  l: "Por cobrar" },
                { v: "paid",     l: "Cobrados" },
              ].map((t) => (
                <button
                  key={t.v}
                  onClick={() => setTab(t.v)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                    tab === t.v ? "bg-brand-600 text-white" : "text-ink-600 dark:text-ink-300 hover:bg-paper-200 dark:hover:bg-ink-800"
                  }`}
                >
                  {t.l}
                </button>
              ))}
            </div>
            <Link to="/cashier/closing" className="btn-primary text-sm">
              <ScrollText size={14}/> Corte de caja
            </Link>
          </div>
        }
      />

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 flex items-center justify-center">
            <Calculator size={18}/>
          </div>
          <div>
            <div className="text-xs text-ink-500 dark:text-ink-400">Mesas pendientes</div>
            <div className="text-xl font-bold text-ink-800 dark:text-ink-100">{summary.tables}</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 flex items-center justify-center">
            <Calculator size={18}/>
          </div>
          <div>
            <div className="text-xs text-ink-500 dark:text-ink-400">Domicilios pendientes</div>
            <div className="text-xl font-bold text-ink-800 dark:text-ink-100">{summary.deliveries}</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 flex items-center justify-center">
            <Receipt size={18}/>
          </div>
          <div>
            <div className="text-xs text-ink-500 dark:text-ink-400">Total {tab === "pending" ? "a cobrar" : "cobrado"}</div>
            <div className="text-xl font-bold text-ink-800 dark:text-ink-100">{money(summary.total)}</div>
          </div>
        </div>
      </div>

      {/* Filtro por tipo */}
      <div className="flex gap-1 mb-3">
        {[
          { v: "all",      l: "Todos" },
          { v: "table",    l: "Solo mesas" },
          { v: "delivery", l: "Solo domicilios" },
        ].map((t) => (
          <button
            key={t.v}
            onClick={() => setTypeFilter(t.v)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              typeFilter === t.v
                ? "bg-ink-800 text-white dark:bg-ink-100 dark:text-ink-900"
                : "bg-paper-50 text-ink-600 border border-paper-300 hover:bg-paper-200 dark:bg-ink-900 dark:text-ink-300 dark:border-ink-700 dark:hover:bg-ink-800"
            }`}
          >
            {t.l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-ink-500 dark:text-ink-400">Cargando…</div>
      ) : orders.length === 0 ? (
        <div className="card p-8 text-center text-ink-500 dark:text-ink-400">
          <Calculator size={32} className="mx-auto text-ink-300 dark:text-ink-700 mb-2"/>
          No hay pedidos {tab === "pending" ? "pendientes de cobro" : "cobrados"}.
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => <OrderRow key={o.id} order={o} onClose={setToClose} onPrepay={setToPrepay} />)}
        </div>
      )}

      {toClose && <CloseModal order={toClose} mode="close" onClose={() => setToClose(null)} onClosed={load} />}
      {toPrepay && <CloseModal order={toPrepay} mode="prepay" onClose={() => setToPrepay(null)} onClosed={load} />}
    </div>
  );
}
