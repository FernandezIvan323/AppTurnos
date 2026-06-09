import { useEffect, useState, useRef } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import api from "../lib/api";
import { serverEvents } from "../lib/events";

/**
 * Banner fijo que aparece cuando el servidor no responde.
 * - Hace ping a /api/health cada 10s como respaldo.
 * - Ademas escucha serverEvents (emitido por axios) para aparecer de inmediato.
 * - El boton "Reintentar" fuerza un re-check inmediato y oculta el banner si todo bien.
 */
export default function ServerStatus() {
  const [show, setShow] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const wasDownRef = useRef(false);

  const probe = async () => {
    try {
      await api.get("/health", { timeout: 5000 });
      wasDownRef.current = false;
      setShow(false);
      return true;
    } catch (_) {
      wasDownRef.current = true;
      setShow(true);
      return false;
    }
  };

  useEffect(() => {
    let timer = null;
    const tick = () => {
      probe();
      timer = setTimeout(tick, 10000);
    };
    tick();

    const offDown = serverEvents.on((evt) => {
      if (evt === serverEvents.NETWORK_DOWN) {
        wasDownRef.current = true;
        setShow(true);
      } else if (evt === serverEvents.NETWORK_UP) {
        probe();
      }
    });

    return () => {
      if (timer) clearTimeout(timer);
      offDown();
    };
  }, []);

  const manualRetry = async () => {
    setRetrying(true);
    await probe();
    setRetrying(false);
  };

  if (!show) return null;

  return (
    <div
      role="alert"
      className="fixed top-0 inset-x-0 z-[100] bg-rose-600 text-white px-4 py-3 shadow-lg"
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm sm:text-base">
          <WifiOff size={18} className="shrink-0" />
          <span className="font-medium">
            No se puede conectar con el servidor (puerto 3001).
          </span>
        </div>
        <button
          onClick={manualRetry}
          disabled={retrying}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/15 hover:bg-white/25 disabled:opacity-50 text-sm font-medium transition"
        >
          <RefreshCw size={14} className={retrying ? "animate-spin" : ""} />
          {retrying ? "Reintentando…" : "Reintentar"}
        </button>
      </div>
    </div>
  );
}
