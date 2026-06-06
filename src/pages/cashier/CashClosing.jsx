import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import Header from "../../components/Header";
import { money, typeLabels, statusLabels } from "../../lib/format";
import {
  Calculator,
  Banknote,
  CreditCard,
  Building2,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  History,
  Printer,
  Receipt,
  ArrowRight,
  XCircle,
} from "lucide-react";

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function MethodRow({ icon: Icon, label, value, color = "text-ink-700" }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-paper-200 dark:border-ink-800 last:border-b-0">
      <div className="flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300">
        <Icon size={14} />
        {label}
      </div>
      <div className={`text-sm font-semibold ${color} dark:text-ink-100`}>{money(value)}</div>
    </div>
  );
}

function PendingBanner({ orders }) {
  if (!orders || orders.length === 0) return null;
  return (
    <div className="card p-4 border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-900/20">
      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold mb-2">
        <AlertTriangle size={18} />
        Hay {orders.length} pedido{orders.length === 1 ? "" : "s"} pendiente{orders.length === 1 ? "" : "s"} de cobro
      </div>
      <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
        Para hacer el corte de caja primero tenés que cobrar o cancelar todos los pedidos abiertos.
      </p>
      <div className="max-h-40 overflow-y-auto space-y-1">
        {orders.map((o) => (
          <div key={o.id} className="flex items-center justify-between text-xs bg-paper-50 dark:bg-ink-900 rounded-lg px-3 py-1.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-ink-500">#{o.id}</span>
              <span className="badge bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300">{typeLabels[o.type] || o.type}</span>
              <span className="text-ink-700 dark:text-ink-200">
                {o.type === "table" ? `Mesa ${o.table_number || "?"}` : (o.customer_name || "—")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">{statusLabels[o.status] || o.status}</span>
              <span className="font-semibold">{money(o.total)}</span>
            </div>
          </div>
        ))}
      </div>
      <Link to="/cashier" className="btn-secondary mt-3 w-full text-sm">
        Ir a Caja <ArrowRight size={14} />
      </Link>
    </div>
  );
}

function ClosingDetail({ closing, date, onReset }) {
  const diff = Number(closing.difference);
  const diffColor =
    Math.abs(diff) < 0.01
      ? "text-emerald-700 dark:text-emerald-300"
      : diff > 0
        ? "text-blue-700 dark:text-blue-300"
        : "text-rose-700 dark:text-rose-300";
  const diffLabel =
    Math.abs(diff) < 0.01
      ? "Cuadre exacto"
      : diff > 0
        ? `Sobrante de ${money(diff)}`
        : `Faltante de ${money(Math.abs(diff))}`;

  return (
    <div className="space-y-4" id="closing-printable">
      <div className="card p-5">
        <div className="flex items-start justify-between gap-3 mb-4 print:hidden">
          <div>
            <div className="text-xs text-ink-500 dark:text-ink-400">Corte del día</div>
            <h2 className="text-2xl font-bold text-ink-800 dark:text-ink-100">{date}</h2>
            <div className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">
              Cerrado por <span className="font-medium text-ink-700 dark:text-ink-200">{closing.closed_by_name || "—"}</span> · {new Date(closing.closed_at).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="btn-secondary text-sm">
              <Printer size={14}/> Imprimir
            </button>
            {onReset && (
              <button onClick={onReset} className="btn-ghost text-sm" title="Cerrar otro día">
                <XCircle size={14}/> Otro día
              </button>
            )}
          </div>
        </div>

        {/* Encabezado solo para impresión */}
        <div className="hidden print:block mb-4">
          <h1 className="text-xl font-bold">Corte de caja</h1>
          <div className="text-sm">AppTurnos · {date}</div>
          <div className="text-sm">Cajero: {closing.closed_by_name || "—"}</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl bg-paper-100 dark:bg-ink-950 p-4">
            <div className="text-xs text-ink-500 dark:text-ink-400">Ventas totales</div>
            <div className="text-2xl font-bold text-ink-800 dark:text-ink-100">{money(closing.total_sales)}</div>
            <div className="text-xs text-ink-500 dark:text-ink-400">{closing.total_orders} pedido{closing.total_orders === 1 ? "" : "s"} cobrado{closing.total_orders === 1 ? "" : "s"}</div>
          </div>
          <div className={`rounded-xl p-4 ${Math.abs(diff) < 0.01 ? "bg-emerald-50 dark:bg-emerald-900/20" : diff > 0 ? "bg-blue-50 dark:bg-blue-900/20" : "bg-rose-50 dark:bg-rose-900/20"}`}>
            <div className="text-xs text-ink-500 dark:text-ink-400">Diferencia de caja</div>
            <div className={`text-2xl font-bold ${diffColor}`}>{diffLabel}</div>
            <div className="text-xs text-ink-500 dark:text-ink-400">Esperado {money(closing.expected_cash)} · Contado {money(closing.counted_cash)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-semibold text-ink-700 dark:text-ink-200 mb-2">Desglose por método de pago</h3>
            <div className="card p-3">
              <MethodRow icon={Banknote}  label="Efectivo"      value={closing.cash_sales} />
              <MethodRow icon={CreditCard} label="Tarjeta"       value={closing.card_sales} />
              <MethodRow icon={Building2}  label="Transferencia" value={closing.transfer_sales} />
              <MethodRow icon={Wallet}     label="Mixto"         value={closing.mixed_sales} />
              <div className="flex items-center justify-between pt-2 mt-1 border-t border-paper-300 dark:border-ink-700">
                <div className="text-sm font-semibold text-ink-700 dark:text-ink-200">Total</div>
                <div className="text-base font-bold text-ink-800 dark:text-ink-100">{money(closing.total_sales)}</div>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink-700 dark:text-ink-200 mb-2">Arqueo de efectivo</h3>
            <div className="card p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-600 dark:text-ink-300">Fondo inicial</span>
                <span className="font-semibold">{money(closing.initial_cash)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-600 dark:text-ink-300">+ Ventas en efectivo</span>
                <span className="font-semibold">{money(closing.cash_sales)}</span>
              </div>
              <div className="flex items-center justify-between text-sm border-t border-paper-300 dark:border-ink-700 pt-2">
                <span className="text-ink-700 dark:text-ink-200 font-medium">Esperado en caja</span>
                <span className="font-bold">{money(closing.expected_cash)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-600 dark:text-ink-300">Contado físicamente</span>
                <span className="font-semibold">{money(closing.counted_cash)}</span>
              </div>
              <div className={`flex items-center justify-between text-sm border-t border-paper-300 dark:border-ink-700 pt-2 ${diffColor}`}>
                <span className="font-medium">Diferencia</span>
                <span className="font-bold">{diff > 0 ? "+" : ""}{money(diff)}</span>
              </div>
            </div>
          </div>
        </div>

        {closing.notes && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-ink-700 dark:text-ink-200 mb-1">Observaciones</h3>
            <div className="card p-3 text-sm text-ink-700 dark:text-ink-200 whitespace-pre-wrap">{closing.notes}</div>
          </div>
        )}

        {/* Pie solo para impresión */}
        <div className="hidden print:block mt-6 pt-4 border-t border-ink-200 text-xs text-ink-500">
          Generado el {new Date().toLocaleString("es-MX")} · AppTurnos
        </div>
      </div>
    </div>
  );
}

function ClosingForm({ preview, date, onSuccess }) {
  const [initialCash, setInitialCash] = useState(0);
  const [countedCash, setCountedCash] = useState(0);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const expected = Number(initialCash) + Number(preview.cash_sales);
  const diff = Number(countedCash) - expected;

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      await api.post("/cash-closings", {
        closing_date: date,
        initial_cash: initialCash,
        counted_cash: countedCash,
        notes: notes.trim() || null,
      });
      onSuccess();
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally { setBusy(false); }
  };

  return (
    <div className="card p-5 space-y-4" id="closing-form">
      <div className="bg-paper-100 dark:bg-ink-950 rounded-xl p-4">
        <div className="text-xs text-ink-500 dark:text-ink-400 mb-2">Resumen del día {date}</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
          <div>
            <div className="text-ink-500 dark:text-ink-400 text-xs">Ventas</div>
            <div className="font-bold text-ink-800 dark:text-ink-100">{money(preview.total_sales)}</div>
          </div>
          <div>
            <div className="text-ink-500 dark:text-ink-400 text-xs">Pedidos</div>
            <div className="font-bold text-ink-800 dark:text-ink-100">{preview.total_orders}</div>
          </div>
          <div>
            <div className="text-ink-500 dark:text-ink-400 text-xs">Efectivo</div>
            <div className="font-bold text-ink-800 dark:text-ink-100">{money(preview.cash_sales)}</div>
          </div>
          <div>
            <div className="text-ink-500 dark:text-ink-400 text-xs">Tarjeta</div>
            <div className="font-bold text-ink-800 dark:text-ink-100">{money(preview.card_sales)}</div>
          </div>
          <div>
            <div className="text-ink-500 dark:text-ink-400 text-xs">Transferencia</div>
            <div className="font-bold text-ink-800 dark:text-ink-100">{money(preview.transfer_sales)}</div>
          </div>
          <div>
            <div className="text-ink-500 dark:text-ink-400 text-xs">Mixto</div>
            <div className="font-bold text-ink-800 dark:text-ink-100">{money(preview.mixed_sales)}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Fondo inicial (caja chica)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-sm">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input pl-7"
              value={initialCash}
              onChange={(e) => setInitialCash(Number(e.target.value) || 0)}
            />
          </div>
        </div>
        <div>
          <label className="label">Efectivo contado en caja</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-sm">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input pl-7"
              value={countedCash}
              onChange={(e) => setCountedCash(Number(e.target.value) || 0)}
              autoFocus
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl p-4 bg-paper-50 dark:bg-ink-900 border border-paper-300 dark:border-ink-800">
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <div className="text-ink-500 dark:text-ink-400 text-xs">Esperado</div>
            <div className="font-bold text-ink-800 dark:text-ink-100">{money(expected)}</div>
          </div>
          <div>
            <div className="text-ink-500 dark:text-ink-400 text-xs">Contado</div>
            <div className="font-bold text-ink-800 dark:text-ink-100">{money(countedCash)}</div>
          </div>
          <div>
            <div className="text-ink-500 dark:text-ink-400 text-xs">Diferencia</div>
            <div className={`font-bold ${
              Math.abs(diff) < 0.01
                ? "text-emerald-700 dark:text-emerald-300"
                : diff > 0
                  ? "text-blue-700 dark:text-blue-300"
                  : "text-rose-700 dark:text-rose-300"
            }`}>
              {diff > 0 ? "+" : ""}{money(diff)}
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="label">Observaciones (opcional)</label>
        <textarea
          className="input min-h-[70px] resize-y"
          placeholder="Ej: Faltante por error en cambio. Sobrante por propina no registrada…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {err && (
        <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800">
          {err}
        </div>
      )}

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
        <AlertTriangle size={16} className="shrink-0 mt-0.5"/>
        <div>
          Una vez confirmado, el corte <strong>no se puede modificar ni eliminar</strong>. Quedará como registro histórico.
        </div>
      </div>

      <button onClick={submit} disabled={busy} className="btn-primary w-full text-base py-3">
        <CheckCircle2 size={18}/>
        {busy ? "Cerrando caja…" : "Confirmar corte de caja"}
      </button>
    </div>
  );
}

export default function CashClosing() {
  const [date, setDate] = useState(todayISO());
  const [preview, setPreview] = useState(null);
  const [closing, setClosing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const load = async (d) => {
    setLoading(true); setErr(null);
    try {
      const { data } = await api.get("/cash-closings/preview", { params: { date: d } });
      setPreview(data);
      if (data.already_closed) {
        const { data: detail } = await api.get(`/cash-closings/${data.already_closed.id}`);
        setClosing(detail);
      } else {
        setClosing(null);
      }
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
      setPreview(null);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(date); }, [date]);

  const isToday = date === todayISO();
  const blocked = preview && preview.pending_count > 0;
  const alreadyClosed = !!closing;

  return (
    <div>
      <Header
        title="Corte de caja"
        subtitle="Cierre Z · Arqueo diario"
        right={
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => setDate(e.target.value)}
              className="input py-1.5 text-sm"
            />
            <Link to="/cashier/closing/history" className="btn-secondary text-sm">
              <History size={14}/> Histórico
            </Link>
          </div>
        }
      />

      <div className="space-y-4 max-w-3xl">
        {!isToday && !alreadyClosed && (
          <div className="card p-3 bg-blue-50/60 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2">
            <AlertTriangle size={16}/>
            Estás cerrando un día anterior ({date}). Asegurate de que sea correcto.
          </div>
        )}

        {loading ? (
          <div className="card p-8 text-center text-ink-500 dark:text-ink-400">Cargando…</div>
        ) : err ? (
          <div className="card p-4 text-sm text-rose-700 dark:text-rose-300">{err}</div>
        ) : !preview ? null : alreadyClosed ? (
          <>
            <ClosingDetail closing={closing} date={date} onReset={() => setDate(todayISO())} />
          </>
        ) : blocked ? (
          <>
            <PendingBanner orders={preview.pending_orders} />
            <div className="card p-4 text-sm text-ink-500 dark:text-ink-400">
              <Calculator size={18} className="inline mr-1.5"/>
              Una vez que cobres o canceles los pedidos pendientes, volvé a esta pantalla para hacer el corte.
            </div>
          </>
        ) : (
          <>
            <div className="card p-3 text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
              <CheckCircle2 size={16}/>
              No hay pedidos pendientes. Podés hacer el corte de caja del {date}.
            </div>
            <ClosingForm preview={preview} date={date} onSuccess={() => load(date)} />
          </>
        )}
      </div>
    </div>
  );
}
