import { LogOut, X } from "lucide-react";

export default function LogoutConfirm({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-[60]">
      <div className="card w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-ink-800 dark:text-white">Cerrar sesión</h2>
          <button onClick={onCancel} className="btn-ghost"><X size={18}/></button>
        </div>
        <p className="text-sm text-ink-600 dark:text-ink-300 mb-6">
          ¿Seguro que quieres cerrar sesión? Volverás a la pantalla de inicio.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="btn-secondary">Cancelar</button>
          <button onClick={onConfirm} className="btn-danger flex items-center gap-1.5">
            <LogOut size={16}/> Salir
          </button>
        </div>
      </div>
    </div>
  );
}
