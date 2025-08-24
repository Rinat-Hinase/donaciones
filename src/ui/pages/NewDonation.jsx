import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header.jsx";
import { useAuth } from "../../lib/AuthContext.jsx";
import { addDonation } from "../../lib/firebase.js";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus,
  X,
  Wallet,
  Banknote,
  CreditCard,
  MoreHorizontal,
  Check,
  Loader2,
  Shield,
} from "lucide-react";

const moneyFmt = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

const METHODS = [
  { id: "efectivo", label: "Efectivo", icon: Wallet },
  { id: "transferencia", label: "Transferencia", icon: Banknote },
  { id: "tarjeta", label: "Tarjeta", icon: CreditCard },
  { id: "otro", label: "Otro", icon: MoreHorizontal },
];

export default function NewDonation() {
  const { user } = useAuth();
  const { campanaId } = useParams();
  const nav = useNavigate();

  // sheet
  const [open, setOpen] = useState(true); // abre de inmediato al entrar
  const sheetRef = useRef(null);

  // form
  const [nombre, setNombre] = useState("");
  const [anonimo, setAnonimo] = useState(false);
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState("efectivo");
  const [nota, setNota] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // cerrar con ESC / tap fuera
  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => e.key === "Escape" && closeSheet();
    const onDown = (e) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target))
        closeSheet();
    };
    document.addEventListener("keydown", onEsc);
    document.addEventListener("mousedown", onDown, true);
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.removeEventListener("mousedown", onDown, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function closeSheet() {
    setOpen(false);
    // pequeña demora para dejar cerrar la animación
    setTimeout(() => nav(`/c/${campanaId}/lista`), 180);
  }

  function addQuick(val) {
    const curr = Number(String(monto).replace(/,/g, ".")) || 0;
    setMonto(String(curr + val));
  }

  async function submit(e) {
    e.preventDefault();
    setErr("");

    const cleanedName = (anonimo ? "Anónimo" : nombre).trim();
    const amount = Number(String(monto).replace(/,/g, "."));
    if (!cleanedName)
      return setErr("Escribe el nombre del donante o activa Anónimo.");
    if (!amount || amount < 1) return setErr("Monto inválido (≥ 1).");

    try {
      setLoading(true);
      await addDonation({
        campanaId,
        nombre: cleanedName,
        monto: amount,
        metodo,
        nota: (nota || "").trim(),
        uid: user?.uid || null,
      });

      // feedback + reset para capturar más donaciones
      setNombre("");
      setAnonimo(false);
      setMonto("");
      setNota("");
      // deja el mismo método seleccionado
      window.dispatchEvent(
        new CustomEvent("donation:created", {
          detail: { nombre: cleanedName, monto: amount },
        })
      );
    } catch (e) {
      setErr("No se pudo guardar. Intenta de nuevo.");
      if (import.meta.env.DEV) console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1220]">
      <Header title="Agregar donación" />

      <main className="container mx-auto px-4 py-6">
        {/* Botón redundante por si se navega aquí desde desktop */}
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold shadow-sm"
        >
          <Plus size={16} /> Registrar donación
        </button>
      </main>

      {/* Bottom sheet móvil — mismo patrón de NewExpense */}
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
              role="dialog"
              aria-label="Nueva donación"
            >
              {/* Handle + header */}
              <div className="pt-3 pb-2 px-4 sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur rounded-t-2xl">
                <div className="mx-auto h-1.5 w-10 rounded-full bg-slate-300/70 dark:bg-slate-700/70" />
                <div className="mt-3 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                    Nueva donación (apoyo a Raúl)
                  </h2>
                  <button
                    onClick={closeSheet}
                    className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    aria-label="Cerrar"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Formulario */}
              <form onSubmit={submit} className="px-4 pb-28 overflow-y-auto">
                {/* Nombre + Anónimo */}
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Nombre del donante
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    autoFocus={!anonimo}
                    disabled={anonimo}
                    value={anonimo ? "Anónimo" : nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Anónimo o Juan Pérez"
                    className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white/90 dark:bg-slate-900/70 text-slate-900 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-4 focus:ring-teal-200/60 dark:focus:ring-teal-800/40 text-base px-3 py-3"
                  />
                  <button
                    type="button"
                    onClick={() => setAnonimo((s) => !s)}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-3 text-sm border ${
                      anonimo
                        ? "bg-teal-600 border-teal-700 text-white"
                        : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                    }`}
                    aria-pressed={anonimo}
                    title="Donante anónimo"
                  >
                    <Shield size={16} />
                    {anonimo ? "Anónimo" : "Nombrar"}
                  </button>
                </div>

                {/* Monto + atajos */}
                <label className="mt-5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Monto
                </label>
                <div className="mt-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    $
                  </span>
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
                  {[50, 100, 200, 500, 1000].map((n) => (
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

                {/* Método (pills) */}
                <p className="mt-5 text-sm font-medium text-slate-700 dark:text-slate-200">
                  Método de pago
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {METHODS.map(({ id, label, icon: Icon }) => (
                    <button
                      type="button"
                      key={id}
                      onClick={() => setMetodo(id)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                        metodo === id
                          ? "bg-teal-600 border-teal-700 text-white"
                          : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      <Icon size={16} />
                      {label}
                      {metodo === id && <Check size={16} />}
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
                  placeholder="Ej. Ref. SPEI / Folio / Comentarios"
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white/90 dark:bg-slate-900/70 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-teal-200/60 dark:focus:ring-teal-800/40 text-base px-3 py-3 resize-none"
                />

                {err && (
                  <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                    {err}
                  </p>
                )}
              </form>

              {/* CTA sticky */}
              <div className="fixed inset-x-0 bottom-0 rounded-t-2xl bg-gradient-to-t from-white/95 via-white/95 to-white/60 dark:from-slate-900/95 dark:via-slate-900/95 dark:to-slate-900/60 backdrop-blur px-4 pb-5 pt-3 ring-1 ring-slate-200/70 dark:ring-slate-700">
                <div className="flex gap-2">
                  <button
                    onClick={submit}
                    disabled={loading}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold px-4 py-3 disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Guardando…
                      </>
                    ) : (
                      "Guardar y agregar otra"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={closeSheet}
                    className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-slate-700 dark:text-slate-200"
                  >
                    Terminar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
