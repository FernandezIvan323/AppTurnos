import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../lib/api";
import Header from "../../components/Header";
import { useAuth } from "../../store/auth";
import { money, formatTime, statusLabels, statusColors, typeLabels } from "../../lib/format";
import {
  Phone, MapPin, Plus, ChevronRight, X, User as UserIcon,
  CheckCircle2, Truck, XCircle, StickyNote, Search,
  ChefHat, ArrowLeft, RotateCcw, AlertTriangle, Package,
  Clock,
} from "lucide-react";

const COLUMNS = [
  { key: "pending",   title: "Pendientes",     tone: "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50" },
  { key: "preparing", title: "En preparación", tone: "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/50" },
  { key: "on_the_way",title: "En camino",      tone: "bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800/50" },
  { key: "delivered", title: "Entregados",     tone: "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50" },
];

function OrderCard({ order, onClick, onAssign, onCancel, onPreparing, onBackPending, onReopen }) {
  const isPaid = order.payment_status === "paid";
  return (
    <div
      onClick={onClick}
      className="card p-3 cursor-pointer hover:shadow-pop transition"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs text-ink-400 dark:text-obsidian-500">#{order.id} · {formatTime(order.created_at)}</div>
          <div className="font-semibold text-ink-800 dark:text-obsidian-50 flex items-center gap-1.5">
            <UserIcon size={14} className="text-ink-400" />
            {order.customer_name || "—"}
          </div>
        </div>
        <div className="text-right">
          <div className="font-semibold text-ink-800 dark:text-obsidian-50">{money(order.total)}</div>
          {isPaid && (
            <div className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 mt-0.5">
              âœ“ Pagado {order.payment_method ? `(${order.payment_method})` : ""}
            </div>
          )}
          {order.delivery_name && (
            <div className="text-[10px] text-ink-500 dark:text-obsidian-400 mt-0.5">
              <Truck size={10} className="inline" /> {order.delivery_name}
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-500 dark:text-obsidian-400">
        {order.customer_phone && (
          <span className="inline-flex items-center gap-1"><Phone size={12}/>{order.customer_phone}</span>
        )}
        {order.customer_neighborhood && (
          <span className="inline-flex items-center gap-1"><MapPin size={12}/>{order.customer_neighborhood}</span>
        )}
        {order.notes && (
          <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400"><StickyNote size={12}/>nota</span>
        )}
      </div>
      <div className="mt-3 flex gap-1.5 flex-wrap">
        {order.status === "pending" && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onPreparing(order); }}
              className="flex-1 h-8 px-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center justify-center gap-1 transition"
              title="Marcar como en preparación"
            >
              <ChefHat size={14}/> En preparación
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onAssign(order); }}
              className="btn-primary text-xs flex-1 h-8"
              title="Asignar repartidor directamente"
            >
              <Truck size={14}/> Asignar
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onCancel(order); }}
              className="btn-secondary text-xs h-8 px-2"
              title="Cancelar"
            >
              <XCircle size={14}/>
            </button>
          </>
        )}
        {order.status === "preparing" && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onAssign(order); }}
              className="btn-primary text-xs flex-1 h-8"
            >
              <Truck size={14}/> Asignar repartidor
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onBackPending(order); }}
              className="btn-secondary text-xs h-8 px-2"
              title="Volver a pendiente"
            >
              <ArrowLeft size={14}/>
            </button>
          </>
        )}
        {order.status === "on_the_way" && (
          <span className="badge bg-emerald-100 text-emerald-800 w-full justify-center py-1 dark:bg-emerald-900/40 dark:text-emerald-300">
            <CheckCircle2 size={12} className="mr-1" /> {isPaid ? "Pagado · listo para cerrar al entregar" : "Listo para cerrar al entregar"}
          </span>
        )}
        {order.status === "delivered" && (
          <button
            onClick={(e) => { e.stopPropagation(); onReopen(order); }}
            className="w-full h-8 px-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:text-amber-300 text-xs font-medium flex items-center justify-center gap-1 transition"
            title="Reabrir este pedido (corrige errores de cierre)"
          >
            <RotateCcw size={14}/> Reabrir
          </button>
        )}
      </div>
    </div>
  );
}

function NewOrderModal({ onClose, onCreated }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSugg, setShowSugg] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    api.get("/products").then((r) => setProducts(r.data.filter((p) => p.available)));
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchTerm || searchTerm.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get("/customers", { params: { q: searchTerm.trim() } });
        setSuggestions(data);
        setShowSugg(true);
      } catch {}
    }, 280);
    return () => clearTimeout(debounceRef.current);
  }, [searchTerm]);

  const fillFromCustomer = (c) => {
    setCustomer(c);
    setName(c.name);
    setPhone(c.phone);
    setAddress(c.address || "");
    setNeighborhood(c.neighborhood || "");
    setReference(c.reference || "");
    setSearchTerm("");
    setShowSugg(false);
  };

  const clearCustomer = () => {
    setCustomer(null);
  };

  const addToCart = (p) => {
    setCart((c) => {
      const ex = c.find((x) => x.product_id === p.id);
      if (ex) return c.map((x) => x.product_id === p.id ? { ...x, quantity: x.quantity + 1 } : x);
      return [...c, { product_id: p.id, name: p.name, unit_price: Number(p.price), quantity: 1, notes: "" }];
    });
  };
  const changeQty = (id, q) =>
    setCart((c) => c.flatMap((x) => x.product_id === id ? (q <= 0 ? [] : [{ ...x, quantity: q }]) : [x]));
  const total = cart.reduce((s, x) => s + x.unit_price * x.quantity, 0);

  const submit = async () => {
    setError(null);
    if (cart.length === 0) return setError("Agrega al menos un producto");
    if (!name || !phone) return setError("Nombre y teléfono del cliente son requeridos");
    if (!address) return setError("Dirección de entrega requerida");
    setSaving(true);
    try {
      let cust = customer;
      if (!cust) {
        const { data } = await api.post("/customers", { name, phone, address, neighborhood, reference });
        cust = data;
      }
      await onCreated({
        type: "delivery",
        customer_id: cust.id,
        notes: notes || null,
        items: cart.map((x) => ({ product_id: x.product_id, quantity: x.quantity, notes: x.notes || null })),
      });
      onClose();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
      <div className="card w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-paper-300 dark:border-obsidian-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-800 dark:text-obsidian-50">Nuevo pedido a domicilio</h2>
          <button onClick={onClose} className="btn-ghost"><X size={18}/></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 flex-1 overflow-hidden">
          <div className="p-5 border-r border-paper-300 dark:border-obsidian-800 overflow-y-auto">
            <h3 className="text-sm font-semibold text-ink-700 dark:text-obsidian-100 mb-3">Datos del cliente</h3>

            {!customer && (
              <div className="relative mb-3" ref={searchRef}>
                <label className="label">Buscar cliente existente (nombre o teléfono)</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-3 text-ink-400"/>
                  <input
                    className="input pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => suggestions.length > 0 && setShowSugg(true)}
                    onBlur={() => setTimeout(() => setShowSugg(false), 180)}
                    placeholder="Ej. Juan Pérez o 555-1234…"
                    autoComplete="off"
                  />
                </div>
                {showSugg && suggestions.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full card border-brand-300 dark:border-brand-700 max-h-64 overflow-y-auto shadow-pop">
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onMouseDown={() => fillFromCustomer(s)}
                        className="w-full text-left px-3 py-2 hover:bg-paper-200 dark:hover:bg-obsidian-800 border-b border-paper-200 dark:border-obsidian-800 last:border-0"
                      >
                        <div className="font-medium text-ink-800 dark:text-obsidian-50 text-sm">{s.name}</div>
                        <div className="text-xs text-ink-500 dark:text-obsidian-400 flex items-center gap-2">
                          <Phone size={10}/> {s.phone}
                          {s.neighborhood && <><MapPin size={10}/> {s.neighborhood}</>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {showSugg && searchTerm.length >= 2 && suggestions.length === 0 && (
                  <div className="absolute z-10 mt-1 w-full card px-3 py-2 text-sm text-ink-500 dark:text-obsidian-400">
                    Sin coincidencias. Completa los datos abajo para crear el cliente.
                  </div>
                )}
              </div>
            )}

            {customer && (
              <div className="mb-3 card p-3 border-brand-300 bg-brand-50/40 dark:bg-wine-900/20 dark:border-brand-800">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs text-brand-700 dark:text-wine-300 font-medium">Cliente seleccionado</div>
                    <div className="font-semibold text-ink-800 dark:text-obsidian-50">{customer.name}</div>
                    <div className="text-xs text-ink-500 dark:text-obsidian-400 flex items-center gap-2">
                      <Phone size={10}/> {customer.phone}
                    </div>
                  </div>
                  <button onClick={clearCustomer} className="btn-ghost text-xs" title="Quitar selección">
                    <X size={14}/>
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="label">Nombre</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} disabled={!!customer} />
              </div>
              <div>
                <label className="label">Teléfono</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-3 text-ink-400"/>
                  <input className="input pl-8" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!!customer} />
                </div>
              </div>
              <div>
                <label className="label">Dirección de entrega</label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-3 text-ink-400"/>
                  <input className="input pl-8" value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Colonia</label>
                  <input className="input" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
                </div>
                <div>
                  <label className="label">Referencia</label>
                  <input className="input" value={reference} onChange={(e) => setReference(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Notas de la entrega</label>
                <textarea rows={2} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej. Tocar timbre 2 veces, trae cambio de 1000…" />
              </div>
            </div>

            <h3 className="text-sm font-semibold text-ink-700 dark:text-obsidian-100 mt-5 mb-2">Carrito</h3>
            {cart.length === 0 && <div className="text-sm text-ink-400 dark:text-obsidian-500">Agrega productos del menú →</div>}
            <div className="space-y-2">
              {cart.map((c) => (
                <div key={c.product_id} className="flex items-center gap-2 text-sm">
                  <div className="flex-1">
                    <div className="font-medium text-ink-700 dark:text-obsidian-100">{c.name}</div>
                    <div className="text-xs text-ink-500 dark:text-obsidian-400">{money(c.unit_price)} c/u</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => changeQty(c.product_id, c.quantity - 1)} className="w-7 h-7 rounded-lg bg-paper-200 dark:bg-obsidian-800 hover:bg-paper-300 dark:hover:bg-obsidian-700">-</button>
                    <span className="w-7 text-center font-semibold">{c.quantity}</span>
                    <button onClick={() => changeQty(c.product_id, c.quantity + 1)} className="w-7 h-7 rounded-lg bg-paper-200 dark:bg-obsidian-800 hover:bg-paper-300 dark:hover:bg-obsidian-700">+</button>
                  </div>
                  <div className="w-20 text-right font-semibold">{money(c.unit_price * c.quantity)}</div>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="mt-3 pt-3 border-t border-paper-200 dark:border-obsidian-800 flex items-center justify-between">
                <span className="text-sm text-ink-500 dark:text-obsidian-400">Total</span>
                <span className="text-xl font-bold text-ink-800 dark:text-obsidian-50">{money(total)}</span>
              </div>
            )}
            {error && <div className="mt-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800">{error}</div>}
          </div>

          <div className="p-5 overflow-y-auto bg-paper-100 dark:bg-obsidian-950">
            <h3 className="text-sm font-semibold text-ink-700 dark:text-obsidian-100 mb-3">Menú</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="card p-3 text-left hover:border-brand-400 dark:hover:border-brand-600 transition"
                >
                  <div className="text-xs text-ink-400 dark:text-obsidian-500">{p.category_name || "Sin categoría"}</div>
                  <div className="font-medium text-ink-800 dark:text-obsidian-50 text-sm">{p.name}</div>
                  <div className="text-brand-700 dark:text-wine-300 font-semibold mt-1">{money(p.price)}</div>
                </button>
              ))}
              {products.length === 0 && <div className="text-sm text-ink-400 dark:text-obsidian-500 col-span-full">No hay productos en el menú. Agrega desde "Menú (catálogo)".</div>}
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-paper-300 dark:border-obsidian-800 flex items-center justify-between">
          <div className="text-sm text-ink-500 dark:text-obsidian-400">{cart.length} productos · {money(total)}</div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary">Cancelar</button>
            <button onClick={submit} disabled={saving} className="btn-primary">
              {saving ? "Guardando…" : "Crear pedido"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AssignModal({ order, onClose, onAssigned }) {
  const [persons, setPersons] = useState([]);
  useEffect(() => { api.get("/delivery").then((r) => setPersons(r.data)); }, []);
  const [err, setErr] = useState(null);
  const assign = async (id) => {
    try {
      await api.post(`/orders/${order.id}/assign-delivery`, { delivery_person_id: id });
      onAssigned();
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    }
  };
  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
      <div className="card w-full max-w-md p-5">
        <h2 className="text-lg font-semibold text-ink-800 dark:text-obsidian-50 mb-3">Asignar repartidor · #{order.id}</h2>
        <div className="text-sm text-ink-500 dark:text-obsidian-400 mb-3">{order.customer_name} · {order.customer_address}</div>
        {persons.length === 0 && <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800">No hay repartidores registrados.</div>}
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {persons.map((p) => (
            <button
              key={p.id}
              onClick={() => assign(p.id)}
              className="w-full card p-3 text-left hover:border-brand-400 dark:hover:border-brand-600 flex items-center justify-between transition"
            >
              <div>
                <div className="font-medium text-ink-800 dark:text-obsidian-50">{p.name}</div>
                <div className="text-xs text-ink-500 dark:text-obsidian-400">{p.phone || "Sin teléfono"}</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold text-ink-600 dark:text-obsidian-200">{p.active_orders} activo{p.active_orders !== 1 ? "s" : ""}</div>
                <ChevronRight size={18} className="text-ink-400 ml-auto" />
              </div>
            </button>
          ))}
        </div>
        {err && <div className="mt-2 text-sm text-rose-700 dark:text-rose-300">{err}</div>}
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="btn-secondary">Cerrar</button>
        </div>
      </div>
    </div>
  );
}

function OrderDetailModal({ order, onClose, onChanged }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    const { data } = await api.get(`/orders/${order.id}`);
    setItems(data.items);
    setLoading(false);
  };
  useEffect(() => { load(); }, [order.id]);

  const closePaid = async () => {
    await api.post(`/orders/${order.id}/close`, { payment_method: "cash" });
    onChanged(); onClose();
  };

  const markDebt = async () => {
    await api.post(`/orders/${order.id}/mark-delivered`);
    onChanged(); onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
      <div className="card w-full max-w-2xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-ink-800 dark:text-obsidian-50">Pedido #{order.id}</h2>
          <button onClick={onClose} className="btn-ghost"><X size={18}/></button>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div><span className="text-ink-400 dark:text-obsidian-500">Cliente:</span> <b>{order.customer_name}</b></div>
          <div><span className="text-ink-400 dark:text-obsidian-500">Teléfono:</span> {order.customer_phone}</div>
          <div className="col-span-2"><span className="text-ink-400 dark:text-obsidian-500">Dirección:</span> {order.customer_address} {order.customer_neighborhood && `· ${order.customer_neighborhood}`}</div>
          {order.customer_reference && <div className="col-span-2"><span className="text-ink-400 dark:text-obsidian-500">Referencia:</span> {order.customer_reference}</div>}
          {order.delivery_name && <div><span className="text-ink-400 dark:text-obsidian-500">Repartidor:</span> <b>{order.delivery_name}</b></div>}
          <div><span className="text-ink-400 dark:text-obsidian-500">Estado:</span> <span className={`badge ${statusColors[order.status]}`}>{statusLabels[order.status]}</span></div>
        </div>
        {order.notes && (
          <div className="card p-3 bg-amber-50 border-amber-200 mb-3 text-sm text-amber-900 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200">
            <StickyNote size={14} className="inline mr-1" /> {order.notes}
          </div>
        )}
        {loading ? <div className="text-sm text-ink-500 dark:text-obsidian-400">Cargando…</div> : (
          <div className="space-y-1.5">
            {items.map((it) => (
              <div key={it.id} className="flex items-center justify-between text-sm py-1.5 border-b border-paper-200 dark:border-obsidian-800">
                <div>
                  <div className="font-medium text-ink-800 dark:text-obsidian-50">{it.name_snapshot} {it.notes && <span className="text-xs text-amber-700 dark:text-amber-400">· {it.notes}</span>}</div>
                  <div className="text-xs text-ink-500 dark:text-obsidian-400">{money(it.unit_price)} c/u</div>
                </div>
                <div className="font-semibold text-ink-700 dark:text-obsidian-100">x{it.quantity}</div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 pt-3 border-t border-paper-200 dark:border-obsidian-800 flex items-center justify-between">
          <span className="text-ink-500 dark:text-obsidian-400">Total</span>
          <span className="text-2xl font-bold text-ink-800 dark:text-obsidian-50">{money(order.total)}</span>
        </div>
        {order.status === "on_the_way" && (
          <div className="flex gap-2 mt-4">
            <button onClick={closePaid} className="btn-primary flex-1">
              <CheckCircle2 size={16}/> Entregado y cobrado
            </button>
            <button onClick={markDebt} className="btn-secondary flex-1 border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-900/20">
              <AlertTriangle size={16}/> Entregado (deuda)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryModal({ onClose }) {
  const [persons, setPersons] = useState([]);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => { api.get("/delivery").then((r) => setPersons(r.data)); }, []);

  const loadHistory = async (id) => {
    setSelected(id);
    setLoading(true);
    setErr(null);
    try {
      const { data } = await api.get("/delivery/history", { params: { delivery_person_id: id, limit: 100 } });
      setHistory(data);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  const pname = persons.find((p) => p.id === selected)?.name || "";
  const totalEarned = history.reduce((s, o) => s + Number(o.total), 0);

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
      <div className="card w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-paper-300 dark:border-obsidian-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-800 dark:text-obsidian-50 flex items-center gap-2">
            <Clock size={18}/> Historial de entregas
          </h2>
          <button onClick={onClose} className="btn-ghost"><X size={18}/></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">
          <div className="flex gap-2 mb-4 flex-wrap">
            {persons.map((p) => (
              <button
                key={p.id}
                onClick={() => loadHistory(p.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border ${
                  selected === p.id
                    ? "bg-brand-500 text-white border-brand-500 dark:bg-wine-600 dark:text-white"
                    : "bg-paper-50 text-ink-600 border-paper-300 hover:bg-paper-200 dark:bg-obsidian-900 dark:text-obsidian-200 dark:border-obsidian-700/50 dark:hover:bg-obsidian-800"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
          {!selected && <div className="text-sm text-ink-400 dark:text-obsidian-500 text-center py-8">Selecciona un repartidor para ver su historial</div>}
          {loading && <div className="text-sm text-ink-500 dark:text-obsidian-400">Cargando…</div>}
          {err && <div className="text-sm text-rose-700 bg-rose-50 rounded-xl px-3 py-2 dark:bg-rose-900/30 dark:text-rose-300">{err}</div>}
          {selected && !loading && !err && history.length === 0 && (
            <div className="text-sm text-ink-400 dark:text-obsidian-500 text-center py-8">{pname} no tiene entregas registradas.</div>
          )}
          {selected && !loading && history.length > 0 && (
            <div>
              <div className="card p-3 bg-brand-50/60 border-brand-200 dark:bg-wine-900/20 dark:border-wine-800 mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-ink-700 dark:text-obsidian-100">Total entregado</span>
                <span className="text-lg font-bold text-brand-700 dark:text-wine-300">{money(totalEarned)}</span>
              </div>
              <div className="space-y-2">
                {history.map((o) => (
                  <div key={o.id} className="flex items-center justify-between card p-3 text-sm">
                    <div>
                      <div className="font-medium text-ink-800 dark:text-obsidian-50">#{o.id} · {o.customer_name}</div>
                      <div className="text-xs text-ink-500 dark:text-obsidian-400">{o.customer_address}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-ink-700 dark:text-obsidian-100">{money(o.total)}</div>
                      <div className="text-xs text-ink-400 dark:text-obsidian-500">{new Date(o.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReopenModal({ order, onClose, onReopened }) {
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const required = "REABRIR";

  const submit = async () => {
    if (confirmText.trim().toUpperCase() !== required) {
      setErr("Escribe REABRIR para confirmar");
      return;
    }
    setBusy(true); setErr(null);
    try {
      await api.post(`/orders/${order.id}/reopen`);
      onReopened(); onClose();
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
      <div className="card w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-ink-800 dark:text-obsidian-50 mb-3 flex items-center gap-2">
          <AlertTriangle size={20} className="text-amber-600"/>
          Reabrir pedido #{order.id}
        </h2>
        <div className="card p-3 bg-amber-50 border-amber-200 mb-3 text-sm text-amber-900 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200">
          <b>Esta acción es delicada.</b> Va a:
          <ul className="list-disc pl-5 mt-1 space-y-0.5">
            <li>Deshacer el cobro ({money(order.total)} · {order.payment_method || "?"})</li>
            <li>Devolver el pedido a {order.delivery_person_id ? "En camino (repartidor vuelve a estar ocupado)" : "En preparación"}</li>
            <li>Si ya se contabilizó en reportes de hoy, no se actualizará</li>
          </ul>
        </div>
        <label className="label">Escribe <code className="px-1.5 py-0.5 rounded bg-ink-100 dark:bg-obsidian-800 text-amber-700 dark:text-amber-300 font-mono text-xs">{required}</code> para confirmar:</label>
        <input
          autoFocus
          className="input"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={required}
        />
        {err && <div className="mt-2 text-sm text-rose-700 dark:text-rose-300">{err}</div>}
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={submit} disabled={busy} className="btn-primary flex-1">
            {busy ? "Reabriendo…" : "Reabrir pedido"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Delivery() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active");
  const [openNew, setOpenNew] = useState(false);
  const [toAssign, setToAssign] = useState(null);
  const [toView, setToView] = useState(null);
  const [toCancel, setToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [toReopen, setToReopen] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await api.get("/orders", { params: { type: "delivery" } });
    setOrders(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (filter === "active") return orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
    if (filter === "delivered") return orders.filter((o) => o.status === "delivered");
    if (filter === "cancelled") return orders.filter((o) => o.status === "cancelled");
    return orders;
  }, [orders, filter]);

  const byStatus = (s) => filtered.filter((o) => o.status === s);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deliveredTodayCount = useMemo(
    () => orders.filter((o) => o.status === "delivered" && new Date(o.created_at) >= today).length,
    [orders]
  );
  const totalDeliveredCount = useMemo(
    () => orders.filter((o) => o.status === "delivered").length,
    [orders]
  );

  const onCreated = async (payload) => { await api.post("/orders", payload); await load(); };
  const setStatus = async (id, status) => {
    await api.post(`/orders/${id}/status`, { status });
    await load();
  };
  const cancel = async () => {
    await api.post(`/orders/${toCancel.id}/status`, { status: "cancelled", cancel_reason: cancelReason || "No especificado" });
    setToCancel(null); setCancelReason(""); await load();
  };

  if (user?.role !== "admin") {
    return <div className="card p-8 text-center text-ink-500 dark:text-obsidian-400">Esta sección es solo para el cajero/administrador.</div>;
  }

  return (
    <div>
      <Header
        title="Pedidos a domicilio"
        subtitle="Tablero Kanban de pedidos a domicilio"
        right={
          <div className="flex items-center gap-2">
            <select className="input h-9 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="active">Activos</option>
              <option value="delivered">Entregados</option>
              <option value="cancelled">Cancelados</option>
              <option value="all">Todos</option>
            </select>
            <button onClick={() => setHistoryOpen(true)} className="btn-secondary h-9">
              <Clock size={16}/> Historial
            </button>
            <button onClick={() => setOpenNew(true)} className="btn-primary">
              <Plus size={16}/> Nuevo pedido
            </button>
          </div>
        }
      />

      {deliveredTodayCount > 0 && filter === "active" && (
        <div className="mb-4 card p-3 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-emerald-800 dark:text-emerald-200">
            <Package size={16}/>
            <span><b>{deliveredTodayCount}</b> {deliveredTodayCount === 1 ? "pedido entregado" : "pedidos entregados"} hoy</span>
          </div>
          <button
            onClick={() => setFilter("delivered")}
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:underline"
          >
            Ver todos ({totalDeliveredCount}) →
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-ink-500 dark:text-obsidian-400">Cargando…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMNS.map((col) => (
            <div key={col.key} className={`rounded-2xl border ${col.tone} p-3 min-h-[200px]`}>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="font-semibold text-ink-700 dark:text-obsidian-100">{col.title}</h3>
                <span className="text-xs text-ink-500 dark:text-obsidian-400 bg-paper-50 dark:bg-obsidian-900 px-2 py-0.5 rounded-full border border-paper-300 dark:border-obsidian-700">
                  {byStatus(col.key).length}
                </span>
              </div>
              <div className="space-y-2">
                {byStatus(col.key).map((o) => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    onClick={() => setToView(o)}
                    onAssign={(o) => setToAssign(o)}
                    onCancel={(o) => setToCancel(o)}
                    onPreparing={(o) => setStatus(o.id, "preparing")}
                    onBackPending={(o) => setStatus(o.id, "pending")}
                    onReopen={(o) => setToReopen(o)}
                  />
                ))}
                {byStatus(col.key).length === 0 && (
                  <div className="text-center text-xs text-ink-400 dark:text-obsidian-500 py-6">Sin pedidos</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {historyOpen && <HistoryModal onClose={() => setHistoryOpen(false)} />}
      {openNew && <NewOrderModal onClose={() => setOpenNew(false)} onCreated={onCreated} />}
      {toAssign && <AssignModal order={toAssign} onClose={() => setToAssign(null)} onAssigned={load} />}
      {toView && <OrderDetailModal order={toView} onClose={() => setToView(null)} onChanged={load} />}
      {toReopen && <ReopenModal order={toReopen} onClose={() => setToReopen(null)} onReopened={load} />}
      {toCancel && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-md p-5">
            <h2 className="text-lg font-semibold text-ink-800 dark:text-obsidian-50 mb-3">Cancelar pedido #{toCancel.id}</h2>
            <label className="label">Motivo</label>
            <input className="input" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Cliente no contesta, dirección errónea…" />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => { setToCancel(null); setCancelReason(""); }} className="btn-secondary">Volver</button>
              <button onClick={cancel} className="btn-danger">Cancelar pedido</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
