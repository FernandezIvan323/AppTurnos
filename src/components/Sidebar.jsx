import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";
import LogoutConfirm from "./LogoutConfirm";
import {
  LayoutDashboard,
  Truck,
  Utensils,
  Calculator,
  Users,
  BarChart3,
  LogOut,
  Home,
  BookOpen,
  ScrollText,
  TrendingDown,
  Package,
} from "lucide-react";

const items = [
  { to: "/",             label: "Inicio",         icon: Home,            roles: ["admin", "waiter"] },
  { to: "/tables",       label: "Mesas",          icon: Utensils,        roles: ["admin", "waiter"] },
  { to: "/menu",         labelKey: "catalog",     icon: BookOpen,        roles: ["admin", "waiter"] },
  { to: "/delivery",     label: "Domicilios",     icon: Truck,           roles: ["admin"] },
  { to: "/cashier",      label: "Caja",           icon: Calculator,      roles: ["admin"] },
  { to: "/cashier/closing", label: "Corte de caja", icon: ScrollText,    roles: ["admin"] },
  { to: "/admin/expenses",  label: "Gastos",      icon: TrendingDown,    roles: ["admin"] },
  { to: "/customers",    label: "Clientes",       icon: Users,           roles: ["admin"] },
  { to: "/staff",        label: "Personal",       icon: LayoutDashboard, roles: ["admin"] },
  { to: "/admin/inventory", label: "Inventario",   icon: Package,         roles: ["admin"] },
  { to: "/reports",      label: "Reportes",       icon: BarChart3,       roles: ["admin"] },
];

const labelFor = (it, role) => {
  if (it.label) return it.label;
  if (it.labelKey === "catalog") return role === "admin" ? "Menú" : "Catálogo";
  return "";
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [showLogout, setShowLogout] = useState(false);
  if (!user) return null;

  return (
    <aside className="w-60 shrink-0 bg-paper-50 border-r border-paper-300 dark:bg-obsidian-900 dark:border-obsidian-800 h-screen sticky top-0 flex flex-col">
      <div className="px-5 py-5 border-b border-paper-300 dark:border-obsidian-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-paper-50 dark:bg-obsidian-800 border border-paper-200 dark:border-obsidian-700 flex items-center justify-center p-1.5 shrink-0">
            <img src="/favicon.svg" alt="AppTurnos" className="w-full h-full" />
          </div>
          <div>
            <div className="text-lg font-semibold text-ink-800 dark:text-obsidian-50 leading-tight">AppTurnos</div>
            <div className="text-xs text-ink-500 dark:text-obsidian-400">Gestión del restaurant</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {items
          .filter((i) => i.roles.includes(user.role))
          .map((it) => {
            const Icon = it.icon;
            return (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.to === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? "bg-brand-50 text-brand-700 dark:bg-wine-900/40 dark:text-wine-300"
                      : "text-ink-600 hover:bg-paper-200 dark:text-obsidian-200 dark:hover:bg-obsidian-800"
                  }`
                }
              >
                <Icon size={18} />
                {labelFor(it, user.role)}
              </NavLink>
            );
          })}
      </nav>

      <div className="p-3 border-t border-paper-300 dark:border-obsidian-800">
        <div className="px-3 py-2 text-xs text-ink-500 dark:text-obsidian-400">
          Sesión iniciada como
          <div className="text-sm font-semibold text-ink-800 dark:text-obsidian-50">{user.name}</div>
          <div className="text-xs text-ink-500 dark:text-obsidian-400 capitalize">
            {user.role === "admin" ? "Cajero / Administrador" : "Mesero"}
          </div>
          {user.role === "waiter" && (
            <div className="mt-1 text-xs text-ink-500 dark:text-obsidian-400">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium">
                <Utensils size={10}/> {(user.assigned_table_ids || []).length} mesa{((user.assigned_table_ids || []).length === 1) ? "" : "s"} asignada{((user.assigned_table_ids || []).length === 1) ? "" : "s"}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowLogout(true)}
          className="btn-ghost w-full justify-start mt-1"
        >
          <LogOut size={16} /> Cerrar sesión
        </button>
      </div>
      {showLogout && (
        <LogoutConfirm
          onConfirm={() => { logout(); nav("/login"); }}
          onCancel={() => setShowLogout(false)}
        />
      )}
    </aside>
  );
}
