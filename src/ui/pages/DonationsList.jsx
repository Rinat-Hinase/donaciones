import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Outlet } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

import Header from "../components/Header.jsx";
import { listDonations, deleteDonation } from "../../lib/firebase.js";

import { AnimatePresence, motion } from "framer-motion";
import { Toaster, toast } from "sonner";
import {
  Search,
  Filter,
  ChevronDown,
  Calendar,
  Wallet,
  Banknote,
  CreditCard,
  MoreHorizontal,
  Pencil,
  Trash2,
  Plus,
  XCircle,
  Share2,
  Loader2,
} from "lucide-react";

// ===== Helpers
const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});
const dateFmt = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
});

const METHODS = [
  { id: "ALL", label: "Todos", icon: MoreHorizontal },
  { id: "efectivo", label: "Efectivo", icon: Wallet },
  { id: "transferencia", label: "Transferencia", icon: Banknote },
  { id: "tarjeta", label: "Tarjeta", icon: CreditCard },
  { id: "otro", label: "Otro", icon: MoreHorizontal },
];

const PRESETS = [
  { id: "ALL", label: "Todo" },
  { id: "TODAY", label: "Hoy" },
  { id: "7D", label: "7 días" },
];
function EmptyMobile({ onAdd }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center">
      <div className="text-base font-semibold text-slate-900 dark:text-slate-50">
        Sin donaciones
      </div>
      <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Cuando registres la primera, aparecerá aquí.
      </div>
      <button
        onClick={onAdd}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 text-sm"
      >
        <Plus className="h-4 w-4" />
        Agregar donación
      </button>
    </div>
  );
}

export default function DonationsList() {
  const { campanaId } = useParams();
  const nav = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // filtros UI
  const [q, setQ] = useState("");
  const [method, setMethod] = useState("ALL");
  const [range, setRange] = useState("ALL");
  const [methodOpen, setMethodOpen] = useState(false);
  const methodRef = useRef(null);

  // eliminar
  const [toDelete, setToDelete] = useState(null); // {id, nombre, monto}

  // ===== Cargar rol
  useEffect(() => {
    (async () => {
      try {
        const uid = getAuth().currentUser?.uid;
        if (!uid) return;
        const snap = await getDoc(doc(getFirestore(), "usuarios", uid));
        setIsAdmin(snap.exists() && snap.data()?.rol === "admin");
      } catch {
        setIsAdmin(false);
      }
    })();
  }, []);

  // ===== Click fuera para cerrar dropdown método
  useEffect(() => {
    function onDown(e) {
      if (methodRef.current && !methodRef.current.contains(e.target))
        setMethodOpen(false);
    }
    function onEsc(e) {
      if (e.key === "Escape") setMethodOpen(false);
    }
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("keydown", onEsc, true);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("keydown", onEsc, true);
    };
  }, []);

  // ===== Cargar donaciones (filtrado básico por nombre desde backend)
  async function load() {
    setLoading(true);
    try {
      const data = await listDonations({
        campanaId,
        qNameLower: q.trim().toLowerCase(),
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error("No se pudieron cargar las donaciones", {
        description: e?.message || String(e),
      });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campanaId, q]);
  // Escuchar eventos globales para crear/editar: toast + recarga
  useEffect(() => {
    function onCreated(e) {
      const nombre = e?.detail?.nombre || "—";
      const monto = Number(e?.detail?.monto || 0);
      toast.success("Donación registrada", {
        description: `${nombre} · ${money.format(monto)}`,
      });
      load();
    }
    function onUpdated(e) {
      const nombre = e?.detail?.nombre || "—";
      const monto = Number(e?.detail?.monto || 0);
      toast.success("Donación actualizada", {
        description: `${nombre} · ${money.format(monto)}`,
      });
      load();
    }
    window.addEventListener("donation:created", onCreated);
    window.addEventListener("donation:updated", onUpdated);
    return () => {
      window.removeEventListener("donation:created", onCreated);
      window.removeEventListener("donation:updated", onUpdated);
    };
  }, []);
  // ===== Filtrado en cliente (método + rango de fechas)
  const filtered = useMemo(() => {
    const now = Date.now();

    function inRange(d) {
      if (range === "ALL") return true;
      const ts = d?.getTime?.() ?? (d ? new Date(d).getTime() : 0);
      if (!ts) return false;
      if (range === "TODAY") {
        const today = new Date();
        const start = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        ).getTime();
        const end = start + 24 * 60 * 60 * 1000;
        return ts >= start && ts < end;
      }
      if (range === "7D") return ts >= now - 7 * 24 * 60 * 60 * 1000;
      return true;
    }

    return rows.filter((r) => {
      const metOk =
        method === "ALL" || (r.metodo || "").toLowerCase() === method;
      const date =
        r.creado_en?.toDate?.() || (r.creado_en ? new Date(r.creado_en) : null);
      return metOk && inRange(date);
    });
  }, [rows, method, range]);

  // ===== Métricas
  const total = useMemo(
    () => filtered.reduce((s, r) => s + (Number(r.monto) || 0), 0),
    [filtered]
  );

  // ===== Acciones
  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await deleteDonation(toDelete.id);
      setRows((prev) => prev.filter((r) => r.id !== toDelete.id));
      toast.success("Donación eliminada", {
        description: `${toDelete.nombre || "—"} · ${money.format(
          Number(toDelete.monto) || 0
        )}`,
      });
    } catch (e) {
      toast.error("No se pudo eliminar", {
        description: e?.message || String(e),
      });
    } finally {
      setToDelete(null);
    }
  }

  function shareList() {
    if (filtered.length === 0) {
      const text = `Donaciones — Campaña ${campanaId}\nSin donaciones registradas.`;
      if (navigator.share) {
        navigator
          .share({ title: `Donaciones ${campanaId}`, text })
          .catch(() => {});
      } else {
        navigator.clipboard?.writeText(text);
        toast.success("Resumen copiado");
      }
      return;
    }
    // Generar lista de donantes con monto
    const detalles = filtered
      .map(
        (r, i) =>
          `${i + 1}. ${r.donante_nombre || "—"} · ${money.format(
            Number(r.monto) || 0
          )}`
      )
      .join("\n");

    // Texto completo
    const text =
      `Donaciones — Campaña ${campanaId}\n` +
      `Total: ${money.format(total)} · Registros: ${filtered.length}\n\n` +
      `=== Detalle ===\n${detalles}`;

    if (navigator.share) {
      navigator
        .share({ title: `Donaciones ${campanaId}`, text })
        .catch(() => {});
    } else {
      navigator.clipboard?.writeText(text);
      toast.success("Resumen copiado con detalle");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1220]">
      <Header title="Donaciones" />

      <main className="container mx-auto px-4 py-6">
        {/* Resumen compacto */}
        <section className="grid grid-cols-2 gap-3 mb-4">
          <MiniMetric label="Total" value={money.format(total)} />
          <MiniMetric label="Registros" value={String(filtered.length)} />
        </section>

        {/* Controles (mobile-first) */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm mb-4">
          <div className="flex flex-col gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nombre"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            {/* Method pills (dropdown compacto) */}
            <div className="flex items-center gap-2">
              <div className="relative" ref={methodRef}>
                <button
                  type="button"
                  onClick={() => setMethodOpen((o) => !o)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-200"
                  aria-haspopup="listbox"
                  aria-expanded={methodOpen}
                >
                  <Filter className="h-4 w-4" />
                  {METHODS.find((m) => m.id === method)?.label || "Método"}
                  <ChevronDown className="h-4 w-4" />
                </button>
                <AnimatePresence>
                  {methodOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      role="listbox"
                      className="absolute z-50 mt-2 w-56 rounded-xl border border-slate-200 dark:border-slate-700 
           bg-white dark:bg-slate-900 shadow-lg p-1 text-slate-800 dark:text-slate-100"
                    >
                      {METHODS.map(({ id, label, icon: Icon }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            setMethod(id);
                            setMethodOpen(false);
                          }}
                          role="option"
                          aria-selected={method === id}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 ${
                            method === id
                              ? "bg-slate-100 dark:bg-slate-800"
                              : ""
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Presets de tiempo */}
              <div className="inline-flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setRange(p.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs ${
                      range === p.id
                        ? "bg-teal-600 border-teal-700 text-white"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {p.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Compartir resumen (ligero) */}
              <button
                onClick={shareList}
                className="ml-auto inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Share2 className="h-4 w-4" /> Compartir
              </button>
            </div>
          </div>
        </section>

        {/* LISTA — Mobile: cards; Desktop: tabla */}
        <div className="md:hidden space-y-3">
          {/* Cards móviles */}
          <AnimatePresence initial={false}>
            {loading && <ListSkeleton count={4} />}
            {!loading && filtered.length === 0 && (
              <EmptyMobile onAdd={() => nav(`/c/${campanaId}/lista/nueva`)} />
            )}

            {!loading &&
              filtered.map((r) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      {/* Nombre del donante */}
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {r.donante_nombre || "—"}
                      </div>

                      {/* Método + Fecha */}
                      <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                        {r.metodo || "—"} ·{" "}
                        {r.creado_en?.toDate?.()
                          ? dateFmt.format(r.creado_en.toDate())
                          : r.creado_en
                          ? dateFmt.format(new Date(r.creado_en))
                          : "—"}
                      </div>

                      {/* Nota opcional */}
                      {r.nota && (
                        <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                          {r.nota}
                        </div>
                      )}
                    </div>

                    {/* Monto + botón eliminar */}
                    <div className="text-right">
                      <div className="text-base font-semibold text-teal-700 dark:text-teal-300 tabular-nums">
                        {money.format(Number(r.monto) || 0)}
                      </div>

                      {isAdmin && (
                        <div className="mt-2 flex items-center justify-end gap-2">
                          <button
                            onClick={() =>
                              nav(`/c/${campanaId}/lista/editar/${r.id}`)
                            }
                            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-2.5 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <Pencil className="h-4 w-4" /> Editar
                          </button>
                          <button
                            onClick={() =>
                              setToDelete({
                                id: r.id,
                                nombre: r.donante_nombre || "",
                                monto: r.monto,
                              })
                            }
                            className="inline-flex items-center gap-1.5 rounded-md border border-red-200/70 dark:border-red-900/40 text-red-700 dark:text-red-400 px-2.5 py-1.5 text-xs hover:bg-red-50/60 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="h-4 w-4" /> Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>

        {/* Tabla solo para md+ */}
        <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10">
                <tr className="text-left text-slate-700 dark:text-slate-100">
                  <th className="p-3 font-semibold">#</th>
                  <th className="p-3 font-semibold">Donante</th>
                  <th className="p-3 font-semibold">Método</th>
                  <th className="p-3 font-semibold text-right">Monto</th>
                  <th className="p-3 font-semibold">Nota</th>
                  <th className="p-3 font-semibold">Fecha</th>
                  {isAdmin && (
                    <th className="p-3 font-semibold text-right">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {loading && <SkeletonRows cols={isAdmin ? 7 : 6} rows={6} />}
                {!loading &&
                  filtered.map((r, i) => (
                    <tr
                      key={r.id}
                      className="border-t border-slate-100 dark:border-slate-800"
                    >
                      <td className="p-3 text-slate-800 dark:text-slate-100">
                        {i + 1}
                      </td>
                      <td className="p-3 text-slate-800 dark:text-slate-100">
                        {r.donante_nombre || "—"}
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-200">
                        {r.metodo || "—"}
                      </td>
                      <td className="p-3 text-right tabular-nums text-teal-700 dark:text-teal-300">
                        {money.format(Number(r.monto) || 0)}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">
                        {r.nota || "—"}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">
                        {r.creado_en?.toDate?.()
                          ? dateFmt.format(r.creado_en.toDate())
                          : r.creado_en
                          ? dateFmt.format(new Date(r.creado_en))
                          : "—"}
                      </td>
                      {isAdmin && (
                        <td className="p-3 text-right">
                          <button
                            onClick={() =>
                              nav(`/c/${campanaId}/lista/editar/${r.id}`)
                            }
                            className="mr-2 inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-2.5 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <Pencil className="h-4 w-4" /> Editar
                          </button>
                          <button
                            onClick={() =>
                              setToDelete({
                                id: r.id,
                                nombre: r.donante_nombre || "",
                                monto: r.monto,
                              })
                            }
                            className="inline-flex items-center gap-1.5 rounded-md border border-red-200/70 dark:border-red-900/40 text-red-700 dark:text-red-400 px-2.5 py-1.5 text-xs hover:bg-red-50/60 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="h-4 w-4" /> Eliminar
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td
                      className="p-8 text-center text-slate-500 dark:text-slate-400"
                      colSpan={isAdmin ? 7 : 6}
                    >
                      Sin donaciones.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal eliminar */}
        <AnimatePresence>
          {toDelete && (
            <ConfirmModal
              title="Eliminar donación"
              description={`Esta acción moverá la donación a eliminado y no será visible en la lista.\n\n${
                toDelete.nombre || "(sin nombre)"
              } · ${money.format(Number(toDelete.monto) || 0)}`}
              onCancel={() => setToDelete(null)}
              onConfirm={confirmDelete}
            />
          )}
        </AnimatePresence>
      </main>

      {/* FAB móvil para agregar donación */}
      <button
        onClick={() => nav(`/c/${campanaId}/lista/nueva`)}
        className="md:hidden fixed bottom-5 right-5 rounded-full bg-teal-700 hover:bg-teal-800 text-white p-4 shadow-lg"
        aria-label="Agregar donación"
      >
        <Plus className="h-6 w-6" />
      </button>

      <Toaster richColors position="top-right" />
      <Outlet />
    </div>
  );
}

/* ====== UI helpers ====== */

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        {value}
      </div>
    </div>
  );
}

function ListSkeleton({ count = 4 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3"
        >
          <div className="h-5 w-1/3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="mt-2 h-4 w-1/2 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="mt-2 h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </div>
      ))}
    </>
  );
}

function SkeletonRows({ cols = 6, rows = 6 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j} className="p-3">
              <div className="h-4 w-full max-w-[240px] animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function ConfirmModal({ title, description, onCancel, onConfirm }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xl"
      >
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-2 text-red-700 dark:text-red-300">
            <XCircle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </h3>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">
              {description}
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-sm text-white"
          >
            Eliminar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
