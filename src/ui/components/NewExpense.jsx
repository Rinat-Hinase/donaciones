// NewExpense.jsx — con callback onCreated y toasts
import React, { useEffect, useRef, useState } from "react";
import { addExpense } from "../../lib/firebase.js";
import { useAuth } from "../../lib/AuthContext.jsx";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Plus,
  X,
  Pill,
  Stethoscope,
  Syringe,
  Ambulance,
  Hospital,
  FileText,
} from "lucide-react";

const moneyFmt = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

const CATS = [
  { id: "medicinas", label: "Medicinas", icon: Pill },
  { id: "consultas", label: "Consultas", icon: Stethoscope },
  { id: "estudios", label: "Estudios", icon: Syringe },
  { id: "hospital", label: "Hospital", icon: Hospital },
  { id: "traslados", label: "Traslados médicos", icon: Ambulance },
  { id: "otros", label: "Otros", icon: FileText },
];

export default function NewExpense({ campanaId, onCreated }) {
  const { user } = useAuth();

  // sheet
  const [open, setOpen] = useState(false);
  const sheetRef = useRef(null);

  // form
  const [concepto, setConcepto] = useState("");
  const [categoria, setCategoria] = useState("medicinas");
  const [monto, setMonto] = useState(""); // string para input
  const [nota, setNota] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // cerrar con ESC / tap fuera
  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => e.key === "Escape" && setOpen(false);
    const onDown = (e) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("keydown", onEsc);
    document.addEventListener("mousedown", onDown, true);
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.removeEventListener("mousedown", onDown, true);
    };
  }, [open]);

  function addQuick(val) {
    const curr = Number(monto.replace(/,/g, ".")) || 0;
    setMonto(String(curr + val));
  }

  async function submit(e) {
    e.preventDefault();
    setErr("");
    const concept = concepto.trim();
    const amount = Number(monto.replace(/,/g, ".")); // soporta coma
    if (!concept) return setErr("Escribe el concepto.");
    if (!amount || amount <= 0) return setErr("Monto inválido.");

    try {
      setLoading(true);
      await addExpense({
        campanaId,
        concepto: concept,
        categoria,
        monto: amount,
        nota: nota.trim(),
        uid: user?.uid || null,
      });

      // feedback + reset UI
      setConcepto("");
      setMonto("");
      setNota("");
      setCategoria("medicinas");
      setOpen(false);

      // notificar al padre y mensaje de éxito
      onCreated?.();
      toast.success("Gasto registrado correctamente", {
        description:
          "Todo en orden: guardado en Firestore, animado con Framer Motion y notificado con Sonner.",
      });
    } catch (e) {
      setErr("No se pudo guardar. Intenta de nuevo.");
      toast.error("Error al guardar el gasto", {
        description: e?.message || String(e),
      });
      if (import.meta.env.DEV) console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* botón compacto (sirve para desktop y móvil) */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold shadow-sm"
      >
        <Plus size={16} /> Registrar gasto
      </button>

      {/* Bottom sheet móvil */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              ref={sheetRef}
              className="fixed inset-x-0 bottom-0 max-h-[88vh] rounded-t-2xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200/70 dark:ring-slate-700"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
            >
              {/* Handle + header */}
              <div className="pt-3 pb-2 px-4 sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur rounded-t-2xl">
                <div className="mx-auto h-1.5 w-10 rounded-full bg-slate-300/70 dark:bg-slate-700/70" />
                <div className="mt-3 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                    Nuevo gasto (apoyo a Raúl)
                  </h2>
                  <button
                    onClick={() => setOpen(false)}
                    className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    aria-label="Cerrar"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Formulario */}
              <form onSubmit={submit} className="px-4 pb-28 overflow-y-auto">
                {/* Concepto */}
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Concepto
                </label>
                <input
                  autoFocus
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                  placeholder="Ej. compra de analgésicos"
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white/90 dark:bg-slate-900/70 text-slate-900 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-4 focus:ring-teal-200/60 dark:focus:ring-teal-800/40 text-base px-3 py-3"
                />

                {/* Categorías (pocas y claras) */}
                <p className="mt-4 text-sm font-medium text-slate-700 dark:text-slate-200">
                  Categoría
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {CATS.map(({ id, label, icon: Icon }) => (
                    <button
                      type="button"
                      key={id}
                      onClick={() => setCategoria(id)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm
                        ${
                          categoria === id
                            ? "bg-teal-600 border-teal-700 text-white"
                            : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                        }`}
                    >
                      <Icon size={16} />
                      {label}
                    </button>
                  ))}
                </div>

                {/* Monto + atajos */}
                <label className="mt-5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Monto
                </label>
                <div className="mt-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <input
                    inputMode="decimal"
                    placeholder="0.00"
                    value={monto}
                    onChange={(e) =>
                      setMonto(e.target.value.replace(/[^\d.,]/g, ""))
                    }
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white/90 dark:bg-slate-900/70 pl-7 pr-3 py-3 text-right text-base text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-teal-200/60 dark:focus:ring-teal-800/40"
                  />
                </div>
                <div className="mt-2 flex gap-2 overflow-x-auto">
                  {[50, 100, 200].map((n) => (
                    <button
                      type="button"
                      key={n}
                      onClick={() => addQuick(n)}
                      className="shrink-0 rounded-full border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900"
                    >
                      +{moneyFmt.format(n)}
                    </button>
                  ))}
                </div>

                {/* Nota */}
                <label className="mt-5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Nota (opcional)
                </label>
                <textarea
                  rows={2}
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Detalles: farmacia, doctor, ticket..."
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white/90 dark:bg-slate-900/70 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-teal-200/60 dark:focus:ring-teal-800/40 text-base px-3 py-3 resize-none"
                />

                {err && (
                  <p className="mt-3 text-sm text-red-600 dark:text-red-400">{err}</p>
                )}
              </form>

              {/* CTA sticky */}
              <div className="fixed inset-x-0 bottom-0 rounded-t-2xl bg-gradient-to-t from-white/95 via-white/95 to-white/60 dark:from-slate-900/95 dark:via-slate-900/95 dark:to-slate-900/60 backdrop-blur px-4 pb-5 pt-3 ring-1 ring-slate-200/70 dark:ring-slate-700">
                <button
                  onClick={submit}
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold px-4 py-3 disabled:opacity-60"
                >
                  {loading ? "Guardando..." : "Guardar gasto"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
