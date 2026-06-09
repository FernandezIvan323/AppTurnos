import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../../lib/api";
import Header from "../../components/Header";
import { money, formatTime, dateOnlyUTC } from "../../lib/format";
import { todayLocalISO } from "../../lib/date";
import {
  TrendingDown, Plus, Pencil, Trash2, X, Wallet, ShoppingCart, Zap, Wrench, Package, Sparkles, Receipt,
  Banknote, CreditCard, Building2, Filter, ArrowRight,
} from "lucide-react";

const ICON_MAP = {
  ShoppingCart, Zap, Wallet, Wrench, Package, Sparkles, Receipt,
};

const METHOD_LABELS = {
  cash:     { l: "Efectivo",      icon: Banknote,  color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
  card:     { l: "Tarjeta",       icon: CreditCard, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  transfer: { l: "Transferencia", icon: Building2, color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300" },
};

function todayISO() {
  return todayLocalISO();
}

function dateOnly(iso) {
  return dateOnlyUTC(iso);
}

function ExpenseModal({ open, onClose, onSaved, expense, categories }) {
  const isEdit = !!expense;
  const [expenseDate, setExpenseDate] = useState(expense?.expense_date || todayISO());
  const [categoryId, setCategoryId]   = useState(expense?.category_id || (categories[0]?.id ?? ""));
  const [amount, setAmount]           = useState(expense?.amount ?? "");
  const [description, setDescription] = useState(expense?.description ?? "");
  const [paymentMethod, setMethod]    = useState(expense?.payment_method ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (open) {
      setExpenseDate(expense?.expense_date || todayISO());
      setCategoryId(expense?.category_id || (categories[0]?.id ?? ""));
      setAmount(expense?.amount ?? "");
      setDescription(expense?.description ?? "");
      setMethod(expense?.payment_method ?? "");
      setErr(null);
    }
  }, [open, expense, categories]);

  if (!open) return null;

  const submit = async () => {
    setErr(null);
    if (!amount || Number(amount) <= 0) {
      setErr("El monto debe ser mayor a 0");
      return;
    }
    if (!categoryId) {
      setErr("Seleccioná una categoría");
      return;
    }
    setBusy(true);
    try {
      const body = {
        expense_date: expenseDate,
        category_id: Number(categoryId),
        amount: Number(amount),
        description: description.trim() || null,
        payment_method: paymentMethod || null,
      };
      if (isEdit) {
        await api.put(`/expenses/${expense.id}`, body);
      } else {
        await api.post("/expenses", body);
      }
      onSaved();
      onClose();
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-ink-800 dark:text-obsidian-50 flex items-center gap-2">
            <TrendingDown size={20}/> {isEdit ? "Editar gasto" : "Nuevo gasto"}
          </h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16}/></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="label">Fecha</label>
            <input type="date" className="input" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} max={todayISO()} />
          </div>
          <div>
            <label className="label">Categoría</label>
            <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Monto</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-sm">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input pl-7"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus={!isEdit}
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className="label">Descripción (opcional)</label>
            <textarea
              className="input min-h-[60px] resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: 2kg de tomates del mercado"
            />
          </div>
          <div>
            <label className="label">Método de pago (opcional)</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(METHOD_LABELS).map(([k, m]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setMethod(paymentMethod === k ? "" : k)}
                  className={`px-3 py-2 rounded-xl border text-sm font-medium flex items-center justify-center gap-1.5 ${
                    paymentMethod === k
                      ? "bg-brand-600 text-white border-brand-600"
                      : "bg-paper-50 text-ink-700 border-paper-300 hover:bg-paper-200 dark:bg-obsidian-900 dark:text-obsidian-100 dark:border-obsidian-700 dark:hover:bg-obsidian-800"
                  }`}
                >
                  <m.icon size={14}/> {m.l}
                </button>
              ))}
            </div>
          </div>
          {err && (
            <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800">
              {err}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={submit} disabled={busy} className="btn-primary flex-1">
              {busy ? "Guardando…" : (isEdit ? "Guardar cambios" : "Registrar gasto")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfirmDelete({ expense, onCancel, onConfirm }) {
  if (!expense) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50" onClick={onCancel}>
      <div className="card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-ink-800 dark:text-obsidian-50 mb-2 flex items-center gap-2">
          <Trash2 size={20} className="text-rose-600"/> Eliminar gasto
        </h2>
        <p className="text-sm text-ink-600 dark:text-obsidian-200 mb-1">
          ¿Eliminar el gasto de <span className="font-semibold text-ink-800 dark:text-obsidian-50">{money(expense.amount)}</span>?
        </p>
        <p className="text-xs text-ink-500 dark:text-obsidian-400 mb-4">
          {expense.category_name} · {dateOnly(expense.expense_date)}
          {expense.description && ` · ${expense.description}`}
        </p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={onConfirm} className="btn-danger flex-1">
            <Trash2 size={14}/> Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Expenses() {
  const [params] = useSearchParams();
  const initialDate = params.get("date") || todayISO();
  const [from, setFrom]   = useState("");
  const [to, setTo]       = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterMethod, setFilterMethod] = useState("");

  const [expenses, setExpenses]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [summary, setSummary]     = useState(null);
  const [loading, setLoading]     = useState(true);

  const [modalOpen, setModalOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const q = { limit: 500 };
      if (from) q.from = from;
      if (to)   q.to = to;
      if (filterCat)    q.category_id = filterCat;
      if (filterMethod) q.payment_method = filterMethod;
      try {
        const r = await api.get("/expenses", { params: q });
        setExpenses(r.data);
      } catch (e) {
        console.error("[expenses] Error al cargar gastos:", e);
      }
      try {
        const c = await api.get("/expenses/categories");
        setCategories(c.data);
      } catch (e) {
        console.error("[expenses] Error al cargar categorías:", e);
      }
      try {
        const s = await api.get("/expenses/summary", { params: { date: initialDate } });
        setSummary(s.data);
      } catch (e) {
        console.error("[expenses] Error al cargar resumen:", e);
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [from, to, filterCat, filterMethod, initialDate]);

  const filteredTotal = useMemo(
    () => expenses.reduce((s, e) => s + Number(e.amount), 0),
    [expenses]
  );

  const onSaved = () => {
    load();
    setToast({ type: "ok", msg: editTarget ? "Gasto actualizado" : "Gasto registrado" });
    setTimeout(() => setToast(null), 2500);
  };

  const onConfirmDelete = async () => {
    try {
      await api.delete(`/expenses/${deleteTarget.id}`);
      setDeleteTarget(null);
      load();
      setToast({ type: "ok", msg: "Gasto eliminado" });
      setTimeout(() => setToast(null), 2500);
    } catch (e) {
      setToast({ type: "err", msg: e.response?.data?.error || e.message });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const renderCat = (c) => {
    const Icon = ICON_MAP[c.icon] || Receipt;
    return (
      <span className="badge bg-paper-200 text-ink-700 dark:bg-obsidian-800 dark:text-obsidian-100 inline-flex items-center gap-1">
        <Icon size={10}/> {c.name}
      </span>
    );
  };

  const renderMethod = (m) => {
    if (!m) return <span className="text-xs text-ink-400">—</span>;
    const def = METHOD_LABELS[m];
    const Icon = def.icon;
    return (
      <span className={`badge inline-flex items-center gap-1 ${def.color}`}>
        <Icon size={10}/> {def.l}
      </span>
    );
  };

  return (
    <div>
      <Header
        title="Gastos del día"
        subtitle="Compras, servicios, sueldos y más"
        right={
          <button onClick={() => { setEditTarget(null); setModalOpen(true); }} className="btn-primary text-sm">
            <Plus size={14}/> Nuevo gasto
          </button>
        }
      />

      {/* Filtros */}
      <div className="card p-3 mb-4 flex flex-wrap items-end gap-2">
        <div className="flex items-center gap-1.5 text-ink-500 dark:text-obsidian-400 text-sm">
          <Filter size={14}/> Filtros:
        </div>
        <div>
          <label className="label text-xs">Desde</label>
          <input type="date" className="input py-1.5 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label text-xs">Hasta</label>
          <input type="date" className="input py-1.5 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <label className="label text-xs">Categoría</label>
          <select className="input py-1.5 text-sm" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
            <option value="">Todas</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label text-xs">Método</label>
          <select className="input py-1.5 text-sm" value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)}>
            <option value="">Todos</option>
            <option value="cash">Efectivo</option>
            <option value="card">Tarjeta</option>
            <option value="transfer">Transferencia</option>
          </select>
        </div>
        {(from || to || filterCat || filterMethod) && (
          <button
            onClick={() => { setFrom(""); setTo(""); setFilterCat(""); setFilterMethod(""); }}
            className="btn-ghost text-sm"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Resumen del día + lista */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="card p-4">
          <div className="text-xs text-ink-500 dark:text-obsidian-400 mb-1">Total del día {dateOnly(initialDate)}</div>
          <div className="text-2xl font-bold text-rose-700 dark:text-rose-400">{money(summary?.total_expenses || 0)}</div>
          <div className="text-[11px] text-ink-400 dark:text-obsidian-500 mt-1">
            {summary?.expense_count || 0} gasto(s) registrado(s)
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-ink-500 dark:text-obsidian-400 mb-2">Por método de pago</div>
          {summary ? (
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-ink-500 dark:text-obsidian-400">Efectivo</span><span className="font-medium">{money(summary.by_method.cash)}</span></div>
              <div className="flex justify-between"><span className="text-ink-500 dark:text-obsidian-400">Tarjeta</span><span className="font-medium">{money(summary.by_method.card)}</span></div>
              <div className="flex justify-between"><span className="text-ink-500 dark:text-obsidian-400">Transferencia</span><span className="font-medium">{money(summary.by_method.transfer)}</span></div>
            </div>
          ) : <div className="text-sm text-ink-400">—</div>}
        </div>
        <div className="card p-4">
          <div className="text-xs text-ink-500 dark:text-obsidian-400 mb-2">Neto del día</div>
          <div className={`text-2xl font-bold ${(summary?.net || 0) >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
            {money(summary?.net || 0)}
          </div>
          <div className="text-[11px] text-ink-400 dark:text-obsidian-500 mt-1">
            Ventas {money(summary?.total_sales || 0)} âˆ’ Gastos {money(summary?.total_expenses || 0)}
          </div>
        </div>
      </div>

      {summary && summary.by_category && summary.by_category.length > 0 && (
        <div className="card p-4 mb-4">
          <h3 className="text-sm font-semibold text-ink-700 dark:text-obsidian-100 mb-3">Por categoría (hoy)</h3>
          <div className="space-y-2">
            {summary.by_category.map((c) => {
              const Icon = ICON_MAP[c.icon] || Receipt;
              const pct = summary.total_expenses > 0 ? (Number(c.total) / Number(summary.total_expenses)) * 100 : 0;
              return (
                <div key={c.id} className="flex items-center gap-3 text-sm">
                  <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 flex items-center justify-center shrink-0">
                    <Icon size={14}/>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-ink-700 dark:text-obsidian-100">{c.name}</span>
                      <span className="font-medium text-ink-800 dark:text-obsidian-50">{money(c.total)}</span>
                    </div>
                    <div className="h-1.5 bg-paper-200 dark:bg-obsidian-800 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 dark:bg-rose-400" style={{ width: `${pct}%` }}/>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div className="card p-8 text-center text-ink-500 dark:text-obsidian-400">Cargando…</div>
      ) : expenses.length === 0 ? (
        <div className="card p-8 text-center text-ink-500 dark:text-obsidian-400">
          <TrendingDown size={32} className="mx-auto text-ink-300 dark:text-obsidian-300 mb-2"/>
          No hay gastos registrados en este rango.
          <div className="mt-2">
            <button onClick={() => { setEditTarget(null); setModalOpen(true); }} className="btn-primary text-sm">
              <Plus size={14}/> Registrar primer gasto
            </button>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-paper-100 dark:bg-obsidian-950 text-ink-600 dark:text-obsidian-200 text-xs uppercase">
                <tr>
                  <th className="text-left  px-4 py-2.5">Fecha</th>
                  <th className="text-left  px-4 py-2.5">Categoría</th>
                  <th className="text-left  px-4 py-2.5">Descripción</th>
                  <th className="text-right px-4 py-2.5">Monto</th>
                  <th className="text-left  px-4 py-2.5">Método</th>
                  <th className="text-left  px-4 py-2.5">Registrado por</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-t border-paper-200 dark:border-obsidian-800">
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink-800 dark:text-obsidian-50">{dateOnly(e.expense_date)}</div>
                      <div className="text-xs text-ink-500 dark:text-obsidian-400">{formatTime(e.created_at)}</div>
                    </td>
                    <td className="px-4 py-3">{renderCat({ name: e.category_name, icon: e.category_icon })}</td>
                    <td className="px-4 py-3 text-ink-600 dark:text-obsidian-200 max-w-xs truncate">{e.description || "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-rose-700 dark:text-rose-400">{money(e.amount)}</td>
                    <td className="px-4 py-3">{renderMethod(e.payment_method)}</td>
                    <td className="px-4 py-3 text-ink-600 dark:text-obsidian-200 text-xs">{e.user_name || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => { setEditTarget(e); setModalOpen(true); }}
                          className="btn-ghost p-1.5"
                          title="Editar"
                        >
                          <Pencil size={14}/>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(e)}
                          className="btn-ghost p-1.5 text-rose-600 dark:text-rose-400"
                          title="Eliminar"
                        >
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-paper-300 dark:border-obsidian-700 bg-paper-100 dark:bg-obsidian-950">
                  <td colSpan={3} className="px-4 py-3 text-right text-sm font-semibold text-ink-700 dark:text-obsidian-100">
                    Total ({expenses.length} gasto{expenses.length === 1 ? "" : "s"}):
                  </td>
                  <td className="px-4 py-3 text-right text-base font-bold text-rose-700 dark:text-rose-400">{money(filteredTotal)}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-ink-500 dark:text-obsidian-400 flex items-center gap-1">
        <ArrowRight size={12}/>
        También podés ver estos datos en el <Link to="/cashier/closing" className="text-brand-600 hover:underline">Corte de caja</Link>.
      </div>

      <ExpenseModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null); }}
        onSaved={onSaved}
        expense={editTarget}
        categories={categories}
      />
      <ConfirmDelete
        expense={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={onConfirmDelete}
      />

      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-xl text-sm shadow-pop ${
          toast.type === "ok" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
