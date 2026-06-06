import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import Header from "../components/Header";
import { useAuth } from "../store/auth";
import { money, formatTime, statusLabels, statusColors } from "../lib/format";
import {
  DollarSign, ShoppingBag, Truck, Utensils, Receipt, Clock,
  PackageCheck, Bike, AlertCircle, RefreshCw, TrendingUp, TrendingDown,
  ChefHat, CheckCircle2, BookOpen, ArrowRight,
} from "lucide-react";

function Stat({ icon: Icon, label, value, hint, color = "bg-brand-50 text-brand-700", darkColor = "dark:bg-brand-900/30 dark:text-brand-300" }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color} ${darkColor}`}>
          <Icon size={20} />
        </div>
        <div>
          <div className="text-sm text-ink-500 dark:text-ink-400">{label}</div>
          <div className="text-2xl font-semibold text-ink-800 dark:text-ink-100">{value}</div>
        </div>
      </div>
      {hint && <div className="text-xs text-ink-400 dark:text-ink-500 mt-3">{hint}</div>}
    </div>
  );
}

function Trend({ current, previous }) {
  if (!previous || Number(previous) === 0) return null;
  const diff = (Number(current) - Number(previous)) / Number(previous) * 100;
  const up = diff >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
      <Icon size={12} /> {Math.abs(diff).toFixed(1)}% vs ayer
    </span>
  );
}

function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/dashboard/summary");
      setData(data);
    } finally { setLoading(false); }
  };
  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);
  const t = data?.today || {};
  const o = data?.op || {};
  return (
    <div>
      <Header
        title="Resumen del día"
        subtitle="Vista general del restaurant"
        right={
          <button onClick={load} className="btn-ghost w-9 h-9 p-0" title="Refrescar">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Stat icon={DollarSign} label="Ventas hoy" value={money(t.total_sales || 0)} hint={<Trend current={t.total_sales} previous={data?.yesterday_sales} />} />
        <Stat icon={Receipt} label="Pedidos cobrados" value={t.orders_count || 0} hint={`${t.delivery_count || 0} domicilios · ${t.table_count || 0} mesas · ${t.pickup_count || 0} llevar`} color="bg-amber-50 text-amber-700" darkColor="dark:bg-amber-900/30 dark:text-amber-300" />
        <Stat icon={ShoppingBag} label="Ticket promedio" value={money(t.avg_ticket || 0)} hint="Promedio por pedido" color="bg-indigo-50 text-indigo-700" darkColor="dark:bg-indigo-900/30 dark:text-indigo-300" />
        <Stat icon={Truck} label="Domicilios cobrados" value={t.delivery_count || 0} hint={`${t.table_count || 0} cuentas de mesa`} color="bg-sky-50 text-sky-700" darkColor="dark:bg-sky-900/30 dark:text-sky-300" />
      </div>
      <h2 className="text-sm font-semibold text-ink-500 dark:text-ink-400 uppercase tracking-wide mb-3">
        Operación en tiempo real
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <Link to="/delivery" className="card p-4 hover:shadow-pop transition group">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 flex items-center justify-center"><AlertCircle size={18} /></div>
            <span className="text-xs text-ink-500 dark:text-ink-400">Sin asignar</span>
          </div>
          <div className="text-2xl font-bold text-ink-800 dark:text-ink-100">{o.pending_to_assign || 0}</div>
          <div className="text-[11px] text-ink-400 dark:text-ink-500 mt-1">Domicilios esperando repartidor</div>
        </Link>
        <Link to="/delivery" className="card p-4 hover:shadow-pop transition group">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 flex items-center justify-center"><Clock size={18} /></div>
            <span className="text-xs text-ink-500 dark:text-ink-400">En preparación</span>
          </div>
          <div className="text-2xl font-bold text-ink-800 dark:text-ink-100">{o.preparing || 0}</div>
          <div className="text-[11px] text-ink-400 dark:text-ink-500 mt-1">Cocinándose</div>
        </Link>
        <Link to="/delivery" className="card p-4 hover:shadow-pop transition group">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 flex items-center justify-center"><Bike size={18} /></div>
            <span className="text-xs text-ink-500 dark:text-ink-400">En camino</span>
          </div>
          <div className="text-2xl font-bold text-ink-800 dark:text-ink-100">{o.on_the_way || 0}</div>
          <div className="text-[11px] text-ink-400 dark:text-ink-500 mt-1">Repartidores en la calle</div>
        </Link>
        <Link to="/tables" className="card p-4 hover:shadow-pop transition group">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 flex items-center justify-center"><Utensils size={18} /></div>
            <span className="text-xs text-ink-500 dark:text-ink-400">Mesas activas</span>
          </div>
          <div className="text-2xl font-bold text-ink-800 dark:text-ink-100">{o.active_tables || 0}</div>
          <div className="text-[11px] text-ink-400 dark:text-ink-500 mt-1">Con clientes en la acera</div>
        </Link>
        <Link to="/cashier" className="card p-4 hover:shadow-pop transition group">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 flex items-center justify-center"><PackageCheck size={18} /></div>
            <span className="text-xs text-ink-500 dark:text-ink-400">Por cobrar</span>
          </div>
          <div className="text-2xl font-bold text-ink-800 dark:text-ink-100">{o.ready_to_pay || 0}</div>
          <div className="text-[11px] text-ink-400 dark:text-ink-500 mt-1">Cuentas listas</div>
        </Link>
      </div>
      <div className="card p-6 text-sm text-ink-500 dark:text-ink-400">
        <p className="font-medium text-ink-700 dark:text-ink-200 mb-2">Cómo empezar</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Ve a <b>Mesas</b> para tomar pedidos en la acera.</li>
          <li>Ve a <b>Domicilios</b> para registrar pedidos por teléfono (tu prioridad).</li>
          <li>En <b>Menú</b> configura el catálogo de productos.</li>
          <li>En <b>Personal</b> agrega repartidores, meseros y asigna mesas.</li>
          <li>En <b>Reportes</b> consulta ventas, productos más vendidos y métricas.</li>
        </ul>
      </div>
    </div>
  );
}

function WaiterHome() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [d, t] = await Promise.all([api.get("/dashboard/summary"), api.get("/tables")]);
      setData(d.data);
      setTables(t.data);
    } finally { setLoading(false); }
  };
  useEffect(() => {
    load();
    const i = setInterval(load, 30_000);
    return () => clearInterval(i);
  }, []);

  const my = data?.my || {};
  const today = data?.today || {};
  const noTables = (user?.assigned_table_ids || []).length === 0;

  return (
    <div>
      <Header
        title={`Hola, ${user?.name?.split(" ")[0] || "mesero"}`}
        subtitle="Tu turno de hoy"
        right={
          <button onClick={load} className="btn-ghost w-9 h-9 p-0" title="Refrescar">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        }
      />

      {noTables && (
        <div className="card p-6 mb-4 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200 flex items-center justify-center shrink-0">
              <Utensils size={18}/>
            </div>
            <div>
              <div className="font-semibold text-amber-900 dark:text-amber-200">No tienes mesas asignadas</div>
              <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                Pídele al cajero que te asigne mesas desde <b>Personal → Asignaciones</b>.
                Mientras tanto no podrás tomar pedidos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPIs personales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-xs text-ink-500 dark:text-ink-400 mb-1">
            <Utensils size={14}/> Mis mesas
          </div>
          <div className="text-2xl font-bold text-ink-800 dark:text-ink-100">{my.assigned_count || 0}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-xs text-ink-500 dark:text-ink-400 mb-1">
            <ChefHat size={14}/> Abiertas ahora
          </div>
          <div className="text-2xl font-bold text-ink-800 dark:text-ink-100">{my.open_count || 0}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-xs text-ink-500 dark:text-ink-400 mb-1">
            <CheckCircle2 size={14}/> Listas para cobrar
          </div>
          <div className="text-2xl font-bold text-ink-800 dark:text-ink-100">{my.ready_to_pay || 0}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-xs text-ink-500 dark:text-ink-400 mb-1">
            <Receipt size={14}/> Total en juego
          </div>
          <div className="text-2xl font-bold text-ink-800 dark:text-ink-100">{money(my.open_amount || 0)}</div>
        </div>
      </div>

      {/* Mi turno de hoy */}
      <h2 className="text-sm font-semibold text-ink-500 dark:text-ink-400 uppercase tracking-wide mb-3">
        Mi turno de hoy
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="card p-5">
          <div className="text-xs text-ink-500 dark:text-ink-400">Cuentas cerradas</div>
          <div className="text-3xl font-bold text-ink-800 dark:text-ink-100 mt-1">{today.closed_count || 0}</div>
          <div className="text-[11px] text-ink-400 dark:text-ink-500 mt-1">Pedidos cobrados</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-ink-500 dark:text-ink-400">Total vendido</div>
          <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">{money(today.total_sold || 0)}</div>
          <div className="text-[11px] text-ink-400 dark:text-ink-500 mt-1">Suma de tus mesas cerradas hoy</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-ink-500 dark:text-ink-400">Ticket promedio</div>
          <div className="text-3xl font-bold text-ink-800 dark:text-ink-100 mt-1">{money(today.avg_ticket || 0)}</div>
          <div className="text-[11px] text-ink-400 dark:text-ink-500 mt-1">Promedio por mesa</div>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link to="/tables" className="card p-5 hover:shadow-pop transition group flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 flex items-center justify-center">
              <Utensils size={22}/>
            </div>
            <div>
              <div className="font-semibold text-ink-800 dark:text-ink-100">Ir a mis mesas</div>
              <div className="text-xs text-ink-500 dark:text-ink-400">Toma pedidos, agrega productos, marca cuenta</div>
            </div>
          </div>
          <ArrowRight size={20} className="text-ink-400 group-hover:text-brand-600 transition" />
        </Link>
        <Link to="/menu" className="card p-5 hover:shadow-pop transition group flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 flex items-center justify-center">
              <BookOpen size={22}/>
            </div>
            <div>
              <div className="font-semibold text-ink-800 dark:text-ink-100">Ver catálogo</div>
              <div className="text-xs text-ink-500 dark:text-ink-400">Productos disponibles y precios</div>
            </div>
          </div>
          <ArrowRight size={20} className="text-ink-400 group-hover:text-brand-600 transition" />
        </Link>
      </div>

      {/* Estado actual de mesas */}
      {!noTables && tables.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-ink-500 dark:text-ink-400 uppercase tracking-wide mb-3">
            Tus mesas en tiempo real
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {tables.map((t) => {
              const occ = !!t.current_order_id;
              const status = t.current_order_status;
              const readyToPay = status === "ready_to_pay";
              const preparing = status === "preparing";
              return (
                <div key={t.id} className={`card p-3 ${
                  readyToPay ? "border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-900/20" :
                  preparing ? "border-blue-300 bg-blue-50/60 dark:border-blue-800 dark:bg-blue-900/20" :
                  occ ? "border-rose-200 bg-rose-50/60 dark:border-rose-800 dark:bg-rose-900/20" :
                  "border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-900/20"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-ink-800 dark:text-ink-100">Mesa {t.number}</div>
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      readyToPay ? "bg-amber-500" : preparing ? "bg-blue-500" : occ ? "bg-rose-500" : "bg-emerald-500"
                    }`}/>
                  </div>
                  {occ ? (
                    <div className="mt-1">
                      <div className="text-xs text-ink-500 dark:text-ink-400">
                        {t.current_order_items || 0} productos
                      </div>
                      <div className="font-semibold text-ink-800 dark:text-ink-100">{money(t.current_order_total || 0)}</div>
                      <div className="text-[10px] text-ink-500 dark:text-ink-400 mt-0.5">
                        <span className={`badge ${statusColors[status] || ""}`}>{statusLabels[status] || ""}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">Libre</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  if (user?.role === "waiter") return <WaiterHome />;
  return <AdminDashboard />;
}
