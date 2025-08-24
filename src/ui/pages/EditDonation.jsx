import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import { getDonation, updateDonation } from "../../lib/firebase.js";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Wallet,
  Banknote,
  CreditCard,
  MoreHorizontal,
  Check,
  Loader2,
  Shield,
} from "lucide-react";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

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

export default function EditDonation() {
  const { user } = useAuth();
  const { campanaId, donacionId } = useParams();
  const nav = useNavigate();

  // ===== admin gate
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const uid = getAuth().currentUser?.uid;
        if (!uid) return;
        const snap = await getDoc(doc(getFirestore(), "usuarios", uid));
        setIsAdmin(snap.exists() && snap.data()?.rol === "admin");
      } catch {
        setIsAdmin(false);
      } finally {
        setAdminChecked(true);
      }
    })();
  }, []);

  // ===== sheet
  const [open, setOpen] = useState(true);
  const sheetRef = useRef(null);

  // ===== form
  const [nombre, setNombre] = useState("");
  const [anonimo, setAnonimo] = useState(false);
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState("efectivo");
  const [nota, setNota] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // ===== load existing
  useEffect(() => {
    (async () => {
      try {
        const data = await getDonation(donacionId);
        if (!data || data.campana_id !== campanaId) {
          setErr("Donación no encontrada.");
          setLoading(false);
          return;
        }
        const nom = data.donante_nombre || "";
        setNombre(nom);
        setAnonimo(nom.toLowerCase() === "anónimo");
        setMonto(String(Number(data.monto || 0)));
        setMetodo(data.metodo || "efectivo");
        setNota(data.nota || "");
      } catch (e) {
        setErr("No se pudo cargar la donación.");
      } finally {
        setLoading(false);
      }
    })();
  }, [campanaId, donacionId]);

  // ===== close helpers
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
    setTimeout(() => nav(`/c/${campanaId}/lista`), 180);
  }

  function addQuick(val) {
    const curr = Number(String(monto).replace(/,/g, ".")) || 0;
    setMonto(String(curr + val));
  }

  async function submit(e) {
    e.preventDefault();
    setErr("");

    if (!isAdmin) {
      setErr("Solo los administradores pueden editar donaciones.");
      return;
    }

    const cleanedName = (anonimo ? "Anónimo" : nombre).trim();
    const amount = Number(String(monto).replace(/,/g, "."));
    if (!cleanedName)
      return setErr("Escribe el nombre del donante o activa Anónimo.");
    if (!amount || amount < 1) return setErr("Monto inválido (≥ 1).");

    try {
      setSaving(true);
      await updateDonation(donacionId, {
        nombre: cleanedName,
        monto: amount,
        metodo,
        nota: (nota || "").trim(),
        uid: user?.uid || null,
      });
      // Avisar a la lista que recargue
      window.dispatchEvent(
        new CustomEvent("donation:updated", {
          detail: { id: donacionId, nombre: cleanedName, monto: amount },
        })
      );
    } catch (e) {
      setErr("No se pudo guardar. Intenta de nuevo.");
      if (import.meta.env.DEV) console.error(e);
      return;
    } finally {
      setSaving(false);
    }

    closeSheet();
  }

  // ===== No admin → modal ligero y regresar
  if (adminChecked && !isAdmin) {
    return (
      <AnimatePresence>
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Acceso restringido
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Solo los administradores pueden editar donaciones.
            </p>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => nav(`/c/${campanaId}/lista`)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Regresar
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ===== Sheet encima de la lista
  return (
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
            aria-label="Editar donación"
          >
            {/* Handle + header */}
            <div className="pt-3 pb-2 px-4 sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur rounded-t-2xl">
              <div className="mx-auto h-1.5 w-10 rounded-full bg-slate-300/70 dark:bg-slate-700/70" />
              <div className="mt-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                  Editar donación (apoyo a Raúl)
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
                  disabled={anonimo || loading}
                  value={anonimo ? "Anónimo" : nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Anónimo o Juan Pérez"
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white/90 dark:bg-slate-900/70 text-slate-900 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-4 focus:ring-teal-200/60 dark:focus:ring-teal-800/40 text-base px-3 py-3"
                />
                <button
                  type="button"
                  onClick={() => setAnonimo((s) => !s)}
                  disabled={loading}
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
                  disabled={loading}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white/90 dark:bg-slate-900/70 pl-7 pr-3 py-3 text-right text-base text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-teal-200/60 dark:focus:ring-teal-800/40"
                />
              </div>
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {[50, 100, 200, 500, 1000].map((n) => (
                  <button
                    type="button"
                    key={n}
                    onClick={() => addQuick(n)}
                    disabled={loading}
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
                    disabled={loading}
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
                disabled={loading}
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
                  disabled={saving || loading}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold px-4 py-3 disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Guardando…
                    </>
                  ) : (
                    "Guardar cambios"
                  )}
                </button>
                <button
                  type="button"
                  onClick={closeSheet}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-slate-700 dark:text-slate-200"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
