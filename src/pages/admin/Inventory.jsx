import { useEffect, useMemo, useState } from "react";
import api from "../../lib/api";
import Header from "../../components/Header";
import { useAuth } from "../../store/auth";
import { Search, X, Plus, Minus, History, Package } from "lucide-react";
import { money } from "../../lib/format";

function MovementModal({ product, onClose }) {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get("/inventory/movements", { params: { product_id: product.id } })
      .then((r) => setMovements(r.data))
      .finally(() => setLoading(false));
  }, [product.id]);
  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
      <div className="card w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-paper-300 dark:border-ink-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-800 dark:text-ink-100 flex items-center gap-2">
            <History size={18}/> Movimientos · {product.name}
          </h2>
          <button onClick={onClose} className="btn-ghost"><X size={18}/></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1 space-y-2">
          {loading && <div className="text-sm text-ink-500">Cargando…</div>}
          {!loading && movements.length === 0 && <div className="text-sm text-ink-400">Sin movimientos registrados.</div>}
          {movements.map((m) => (
            <div key={m.id} className="flex items-center justify-between card p-3 text-sm">
              <div>
                <div className="font-medium text-ink-800 dark:text-ink-100 flex items-center gap-1.5">
                  {m.type === "entry" ? <Plus size={14} className="text-emerald-600"/> :
                   m.type === "exit" ? <Minus size={14} className="text-rose-600"/> :
                   <Package size={14} className="text-amber-600"/>}
                  {m.type === "entry" ? "Entrada" : m.type === "exit" ? "Salida" : "Ajuste"}
                  <span className="font-bold">{m.quantity}</span>
                </div>
                <div className="text-xs text-ink-500">{m.reason || "Sin motivo"}</div>
              </div>
              <div className="text-xs text-ink-400">{new Date(m.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StockModal({ product, onClose, onSaved }) {
  const [type, setType] = useState("entry");
  const [quantity, setQuantity] = useState("");
  const [stock, setStock] = useState("");
  const [min_stock, setMinStock] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    setStock(String(product.stock ?? ""));
    setMinStock(String(product.min_stock ?? ""));
  }, [product]);

  const submit = async () => {
    setErr(null); setSaving(true);
    try {
      if (type === "adjust") {
        await api.put(`/inventory/${product.id}`, { stock: Number(stock), min_stock: Number(min_stock) });
      } else {
        await api.post("/inventory/movement", {
          product_id: product.id,
          type,
          quantity: Number(quantity),
          reason: reason || null,
        });
      }
      onSaved(); onClose();
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
      <div className="card w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-ink-800 dark:text-ink-100">{product.name}</h2>
          <button onClick={onClose} className="btn-ghost"><X size={18}/></button>
        </div>

        <div className="flex gap-2 mb-4">
          <button onClick={() => setType("entry")} className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${type === "entry" ? "bg-brand-500 text-white border-brand-500" : ""}`}>Entrada</button>
          <button onClick={() => setType("exit")} className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${type === "exit" ? "bg-brand-500 text-white border-brand-500" : ""}`}>Salida</button>
          <button onClick={() => setType("adjust")} className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${type === "adjust" ? "bg-brand-500 text-white border-brand-500" : ""}`}>Ajustar</button>
        </div>

        {type === "adjust" ? (
          <>
            <label className="label">Stock actual</label>
            <input className="input" type="number" step="0.01" value={stock} onChange={(e) => setStock(e.target.value)} />
            <label className="label mt-3">Stock mínimo</label>
            <input className="input" type="number" step="0.01" value={min_stock} onChange={(e) => setMinStock(e.target.value)} />
          </>
        ) : (
          <>
            <label className="label">Cantidad</label>
            <input className="input" type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} autoFocus />
            <label className="label mt-3">Motivo (opcional)</label>
            <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Compra, merma, ajuste…" />
          </>
        )}
        {err && <div className="mt-3 text-sm text-rose-700 bg-rose-50 rounded-xl px-3 py-2 dark:bg-rose-900/30 dark:text-rose-300">{err}</div>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={submit} disabled={saving} className="btn-primary">{saving ? "Guardando…" : "Guardar"}</button>
        </div>
      </div>
    </div>
  );
}

export default function Inventory() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [movements, setMovements] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data } = await api.get("/inventory");
    setProducts(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!search) return products;
    const t = search.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(t) || (p.category_name || "").toLowerCase().includes(t));
  }, [products, search]);

  const lowStock = useMemo(() => products.filter((p) => p.low_stock), [products]);

  if (user?.role !== "admin") {
    return <div className="card p-8 text-center text-ink-500 dark:text-ink-400">Esta sección es solo para el administrador.</div>;
  }

  return (
    <div>
      <Header
        title="Inventario / Stock"
        subtitle={lowStock.length > 0 ? `${lowStock.length} producto${lowStock.length === 1 ? "" : "s"} con stock bajo` : "Control de existencias"}
      />

      {lowStock.length > 0 && (
        <div className="mb-4 card p-4 bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800">
          <div className="text-sm font-semibold text-rose-800 dark:text-rose-200 flex items-center gap-2">
            <Package size={16}/> Productos con stock bajo
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {lowStock.map((p) => (
              <span key={p.id} className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 text-xs font-medium">
                {p.name} ({p.stock} / {p.min_stock})
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-2.5 text-ink-400"/>
          <input className="input pl-8 text-sm" placeholder="Buscar producto…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-ink-500">Cargando…</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-paper-200 dark:bg-ink-800 text-ink-600 dark:text-ink-300 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Producto</th>
                <th className="px-4 py-2 font-medium">Categoría</th>
                <th className="px-4 py-2 font-medium text-right">Stock</th>
                <th className="px-4 py-2 font-medium text-right">Min.</th>
                <th className="px-4 py-2 font-medium text-right w-32">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className={`border-t border-paper-200 dark:border-ink-800 ${p.low_stock ? "bg-rose-50/50 dark:bg-rose-900/10" : ""}`}>
                  <td className="px-4 py-2 font-medium text-ink-800 dark:text-ink-100">{p.name}</td>
                  <td className="px-4 py-2 text-ink-500 dark:text-ink-400">{p.category_name || "—"}</td>
                  <td className={`px-4 py-2 text-right font-semibold ${p.low_stock ? "text-rose-700 dark:text-rose-300" : "text-ink-700 dark:text-ink-200"}`}>
                    {p.stock}
                  </td>
                  <td className="px-4 py-2 text-right text-ink-500 dark:text-ink-400">{p.min_stock}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => setMovements(p)} className="btn-ghost text-xs" title="Historial"><History size={14}/></button>
                    <button onClick={() => setEditing(p)} className="btn-ghost text-xs" title="Ajustar stock"><Package size={14}/></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-ink-400">Sin resultados</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {editing && <StockModal product={editing} onClose={() => setEditing(null)} onSaved={load} />}
      {movements && <MovementModal product={movements} onClose={() => setMovements(null)} />}
    </div>
  );
}
