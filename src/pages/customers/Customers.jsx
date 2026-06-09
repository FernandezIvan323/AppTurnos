import { useEffect, useState } from "react";
import api from "../../lib/api";
import Header from "../../components/Header";
import { money, formatDate } from "../../lib/format";
import { Search, Phone, MapPin, StickyNote, X, Plus, Edit2 } from "lucide-react";

function CustomerModal({ customer, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: customer?.name || "",
    phone: customer?.phone || "",
    address: customer?.address || "",
    neighborhood: customer?.neighborhood || "",
    reference: customer?.reference || "",
    notes: customer?.notes || "",
  });
  const [err, setErr] = useState(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true); setErr(null);
    try {
      if (customer) await api.put(`/customers/${customer.id}`, form);
      else await api.post("/customers", form);
      onSaved(); onClose();
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
      <div className="card w-full max-w-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-ink-800 dark:text-obsidian-50">
            {customer ? "Editar cliente" : "Nuevo cliente"}
          </h2>
          <button onClick={onClose} className="btn-ghost"><X size={18}/></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Nombre</label>
            <input className="input" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
          </div>
          <div className="col-span-2">
            <label className="label">Teléfono *</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} />
          </div>
          <div className="col-span-2">
            <label className="label">Dirección</label>
            <input className="input" value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} />
          </div>
          <div>
            <label className="label">Colonia</label>
            <input className="input" value={form.neighborhood} onChange={(e) => setForm({...form, neighborhood: e.target.value})} />
          </div>
          <div>
            <label className="label">Referencia</label>
            <input className="input" value={form.reference} onChange={(e) => setForm({...form, reference: e.target.value})} />
          </div>
          <div className="col-span-2">
            <label className="label">Notas</label>
            <textarea rows={2} className="input" value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} />
          </div>
        </div>
        {err && <div className="mt-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800">{err}</div>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={save} disabled={saving} className="btn-primary">{saving ? "Guardando…" : "Guardar"}</button>
        </div>
      </div>
    </div>
  );
}

function HistoryModal({ customer, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get(`/customers/${customer.id}`).then((r) => { setData(r.data); setLoading(false); });
  }, [customer.id]);

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
      <div className="card w-full max-w-2xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-ink-800 dark:text-obsidian-50">{customer.name}</h2>
          <button onClick={onClose} className="btn-ghost"><X size={18}/></button>
        </div>
        <div className="text-sm text-ink-500 dark:text-obsidian-400 space-y-1 mb-4">
          <div><Phone size={12} className="inline mr-1"/>{customer.phone}</div>
          {customer.address && <div><MapPin size={12} className="inline mr-1"/>{customer.address} {customer.neighborhood && `· ${customer.neighborhood}`}</div>}
          {customer.reference && <div><StickyNote size={12} className="inline mr-1"/>{customer.reference}</div>}
        </div>
        <h3 className="font-semibold text-ink-700 dark:text-obsidian-100 mb-2">Historial</h3>
        {loading ? <div className="text-sm text-ink-500 dark:text-obsidian-400">Cargando…</div> : (
          <div className="space-y-2">
            {data.orders.length === 0 && <div className="text-sm text-ink-400 dark:text-obsidian-500">Sin pedidos aún.</div>}
            {data.orders.map((o) => (
              <div key={o.id} className="card p-3 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium text-ink-800 dark:text-obsidian-50">Pedido #{o.id} · {o.type === "table" ? "Mesa" : o.type === "delivery" ? "Domicilio" : "Para llevar"}</div>
                  <div className="text-xs text-ink-500 dark:text-obsidian-400">{formatDate(o.created_at)}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-ink-800 dark:text-obsidian-50">{money(o.total)}</div>
                  <div className="text-xs text-ink-500 dark:text-obsidian-400 capitalize">{o.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Customers() {
  const [q, setQ] = useState("");
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState(null);

  const search = async (term) => {
    setLoading(true);
    const { data } = await api.get("/customers", { params: term ? { q: term } : {} });
    setList(data);
    setLoading(false);
  };
  useEffect(() => { search(""); }, []);

  return (
    <div>
      <Header
        title="Clientes"
        subtitle="Historial de clientes de domicilio"
        right={
          <button onClick={() => setCreating(true)} className="btn-primary">
            <Plus size={16}/> Nuevo cliente
          </button>
        }
      />

      <div className="card p-3 mb-4 flex items-center gap-2">
        <Search size={16} className="text-ink-400 dark:text-obsidian-500"/>
        <input
          className="flex-1 bg-transparent outline-none text-sm text-ink-800 dark:text-obsidian-50 placeholder:text-ink-400 dark:placeholder:text-ink-500"
          placeholder="Buscar por teléfono o nombre…"
          value={q}
          onChange={(e) => { setQ(e.target.value); search(e.target.value); }}
        />
      </div>

      {loading ? (
        <div className="text-sm text-ink-500 dark:text-obsidian-400">Cargando…</div>
      ) : list.length === 0 ? (
        <div className="card p-8 text-center text-ink-500 dark:text-obsidian-400">No hay clientes.</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-paper-200 dark:bg-obsidian-800 text-ink-600 dark:text-obsidian-200 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Nombre</th>
                <th className="px-4 py-2 font-medium">Teléfono</th>
                <th className="px-4 py-2 font-medium">Dirección</th>
                <th className="px-4 py-2 font-medium w-32 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className="border-t border-paper-200 dark:border-obsidian-800 hover:bg-paper-100 dark:hover:bg-obsidian-800/50">
                  <td className="px-4 py-2 font-medium text-ink-800 dark:text-obsidian-50">{c.name}</td>
                  <td className="px-4 py-2 text-ink-600 dark:text-obsidian-200">{c.phone}</td>
                  <td className="px-4 py-2 text-ink-600 dark:text-obsidian-200">{c.address || "—"}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => setViewing(c)} className="btn-ghost text-xs">Historial</button>
                    <button onClick={() => setEditing(c)} className="btn-ghost text-xs"><Edit2 size={14}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && <CustomerModal onClose={() => setCreating(false)} onSaved={() => search(q)} />}
      {editing && <CustomerModal customer={editing} onClose={() => setEditing(null)} onSaved={() => search(q)} />}
      {viewing && <HistoryModal customer={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
