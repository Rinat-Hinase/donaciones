import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Outlet } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

import Header from "../components/Header.jsx";
import { listExpensesPage, deleteExpense } from "../../lib/firebase.js";

import { Toaster, toast } from "sonner";
import {
  motion,
  AnimatePresence
} from "framer-motion";
import {
  Search,
  Filter,
  ChevronDown,
  Trash2,
  Loader2,
  Share2,
  PencilLine,
  Plus
} from "lucide-react";

const fmt = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const dfmt = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" });

// Presets reducidos para móvil
const PRESETS = [
  { key: "TODAY", label: "Hoy" },
  { key: "7D", label: "7 días" },
  { key: "ALL", label: "Todo" },
];

export default function Expenses() {
  const { campanaId } = useParams();
  const nav = useNavigate();

  // auth/admin
  const [isAdmin, setIsAdmin] = useState(false);
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

  // data paging
  const [rows, setRows] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef(null);

  async function loadPage(next = null) {
    if (loading || (!hasMore && next)) return;
    setLoading(true);
    try {
      const { items, nextCursor } = await listExpensesPage({
        campanaId,
        pageSize: 12,
        cursor: next,
      });
      setRows((prev) => [...prev, ...items]);
      setCursor(nextCursor);
      setHasMore(Boolean(nextCursor));
    } catch (e) {
      toast.error("No se pudo cargar la lista", {
        description: e?.message || String(e),
      });
    } finally {
      setLoading(false);
    }
  }

  // primera carga / reset por campana
  useEffect(() => {
    setRows([]);
    setCursor(null);
    setHasMore(true);
    setQuery("");
    setCategory("ALL");
    setPreset("ALL");
    loadPage(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campanaId]);

  // 🔁 refresco automático cuando se cree/edite desde sheets anidados
  useEffect(() => {
    async function reload() {
      // reset a primera página para evitar duplicados
      setRows([]);
      setCursor(null);
      setHasMore(true);
      await loadPage(null);
    }
    const onCreated = () => {
      toast.success("Gasto registrado correctamente");
      reload();
    };
    const onUpdated = () => {
      toast.success("Gasto actualizado correctamente");
      reload();
    };
    window.addEventListener("expense:created", onCreated);
    window.addEventListener("expense:updated", onUpdated);
    return () => {
      window.removeEventListener("expense:created", onCreated);
      window.removeEventListener("expense:updated", onUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campanaId]);

  // infinite scroll
  useEffect(() => {
    if (!sentinelRef.current) return;
    const ob = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) loadPage(cursor);
      },
      { rootMargin: "320px" }
    );
    ob.observe(sentinelRef.current);
    return () => ob.disconnect();
  }, [cursor, hasMore, loading]);

  // filtros mínimos
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [preset, setPreset] = useState("ALL");

  // categorías derivadas
  const categories = useMemo(() => {
    const s = new Set();
    rows.forEach((r) => r.categoria && s.add(r.categoria));
    return ["ALL", ...Array.from(s)];
  }, [rows]);

  // dropdown control
  const [catOpen, setCatOpen] = useState(false);
  const catRef = useRef(null);
  useEffect(() => {
    const onDown = (e) => {
      if (catRef.current && !catRef.current.contains(e.target)) setCatOpen(false);
    };
    const onEsc = (e) => { if (e.key === "Escape") setCatOpen(false); };
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("keydown", onEsc, true);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("keydown", onEsc, true);
    };
  }, []);

  // aplicar filtros
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = Date.now();
    const inPreset = (d) => {
      if (!d) return preset === "ALL";
      const ts = d.getTime ? d.getTime() : new Date(d).getTime();
      if (preset === "TODAY") {
        const base = new Date();
        const start = new Date(base.getFullYear(), base.getMonth(), base.getDate()).getTime();
        const end = start + 86400000;
        return ts >= start && ts < end;
      }
      if (preset === "7D") return ts >= now - 7 * 86400000;
      return true; // ALL
    };

    return rows.filter((r) => {
      const concepto = (r.concepto || "").toLowerCase();
      const nota = (r.nota || "").toLowerCase();
      const catOk = category === "ALL" || r.categoria === category;
      const qOk = !q || concepto.includes(q) || nota.includes(q);
      const fecha = r.creado_en?.toDate?.() || (r.creado_en ? new Date(r.creado_en) : null);
      return catOk && qOk && inPreset(fecha);
    });
  }, [rows, query, category, preset]);

  const total = useMemo(
    () => filtered.reduce((s, r) => s + (Number(r.monto) || 0), 0),
    [filtered]
  );

  // delete
  const [toDelete, setToDelete] = useState(null);
  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await deleteExpense(toDelete.id);
      setRows((prev) => prev.filter((r) => r.id !== toDelete.id));
      toast.success("Gasto eliminado");
      // (opcional) también podríamos despachar un evento global si hay otros widgets
      // window.dispatchEvent(new CustomEvent("expense:deleted", { detail: { id: toDelete.id } }));
    } catch (e) {
      toast.error("Error al eliminar", { description: e?.message || String(e) });
    } finally {
      setToDelete(null);
    }
  }

  // compartir
  function shareExpenses() {
    const detalles = filtered
      .map((r, i) => {
        const lineaBase = `${i + 1}. ${r.concepto || "—"} · ${fmt.format(Number(r.monto) || 0)}`;
        const cat = r.categoria ? ` · ${r.categoria}` : "";
        return lineaBase + cat;
      })
      .join("\n");

    const text =
      `Gastos — Campaña ${campanaId}\n` +
      `Total: ${fmt.format(total)} · Registros: ${filtered.length}\n\n` +
      `=== Detalle ===\n${detalles}`;

    if (navigator.share) {
      navigator.share({ title: `Gastos ${campanaId}`, text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text);
      toast.success("Resumen de gastos copiado");
    }
  }

  // navegación a routes hijas
  const goNew = () => nav(`/c/${campanaId}/gastos/nuevo`);
  const goEdit = (id) => nav(`/c/${campanaId}/gastos/editar/${id}`);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1220]">
      <Header title="Gastos" />

      <main className="container mx-auto px-4 py-6">
        {/* resumen compacto */}
        <div className="grid grid-cols-2 gap-3 mb-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
            <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Total
            </div>
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {fmt.format(total)}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
            <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Registros
            </div>
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {filtered.length}
            </div>
          </div>
          <div className="hidden md:block rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
            <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Campaña
            </div>
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
              {campanaId}
            </div>
          </div>
          {/* desktop: CTA nuevo via ruta */}
          <div className="hidden md:flex items-center justify-end">
            <button
              onClick={goNew}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold shadow-sm"
            >
              <Plus size={16} /> Registrar gasto
            </button>
          </div>

          {/* móvil: CTA nuevo + FAB */}
          <div className="md:hidden">
            <button
              onClick={goNew}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold shadow-sm"
            >
              <Plus size={16} /> Registrar gasto
            </button>
          </div>
          <div className="fixed bottom-6 right-6 md:hidden z-40">
            <button
              onClick={goNew}
              className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-teal-700 hover:bg-teal-800 text-white shadow-lg"
              aria-label="Nuevo gasto"
              title="Nuevo gasto"
            >
              <Plus size={22} />
            </button>
          </div>
        </div>

        {/* filtros mínimos */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

            <div className="flex-1 flex flex-wrap items-center gap-2">
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 pl-9 pr-3 py-2 min-h-[44px] text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              {/* categoría */}
              <div className="relative" ref={catRef}>
                <button
                  type="button"
                  onClick={() => setCatOpen((o) => !o)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 min-h[44px] text-sm text-slate-700 dark:text-slate-200"
                >
                  <Filter className="h-4 w-4" />
                  {category === "ALL" ? "Todas" : category}
                  <ChevronDown className="h-4 w-4" />
                </button>
                {catOpen && (
                  <div className="absolute z-50 mt-2 w-56 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg p-1 max-h-72 overflow-auto">
                    {categories.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setCategory(c);
                          setCatOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 ${
                          category === c ? "bg-slate-100 dark:bg-slate-700" : ""
                        }`}
                      >
                        {c === "ALL" ? "Todas" : c}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* presets */}
              <div className="flex gap-2 overflow-x-auto md:overflow-visible">
                {PRESETS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setPreset(p.key)}
                    className={`shrink-0 rounded-full border px-3 py-2 text-xs min-h-[36px] ${
                      preset === p.key
                        ? "bg-teal-600 border-teal-700 text-white"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* compartir */}
            <button
              onClick={shareExpenses}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 min-h-[44px] text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              aria-label="Compartir gastos"
            >
              <Share2 className="h-4 w-4" />
              Compartir
            </button>
          </div>
        </div>

        {/* lista responsive: cards en móvil, tabla en desktop */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          {/* móvil: cards */}
          <ul className="md:hidden divide-y divide-slate-200 dark:divide-slate-800">
            <AnimatePresence>
              {filtered.map((r) => (
                <motion.li
                  key={r.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-1000 dark:text-slate-100">
                        {r.concepto}
                      </div>
                      <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {dfmt.format(r.creado_en?.toDate?.() || new Date(r.creado_en))}
                      </div>
                      <div className="mt-2 inline-flex items-center gap-2 text-[12px]">
                        <span className="rounded-full border px-2 py-0.5 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                          {r.categoria || "—"}
                        </span>
                        {r.nota && (
                          <span className="text-slate-600 dark:text-slate-300">{r.nota}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-semibold text-teal-600">
                        {fmt.format(Number(r.monto) || 0)}
                      </div>

                      {/* acciones admin */}
                      {isAdmin && (
                        <div className="mt-2 flex items-center gap-3 justify-end">
                          <button
                            onClick={() => goEdit(r.id)}
                            className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200"
                          >
                            <PencilLine className="h-4 w-4" /> Editar
                          </button>
                          <button
                            onClick={() => setToDelete({ id: r.id })}
                            className="inline-flex items-center gap-1.5 text-xs text-red-600"
                          >
                            <Trash2 className="h-4 w-4" /> Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
            {filtered.length === 0 && !loading && (
              <li className="p-6 text-center text-slate-500 dark:text-slate-400">No hay gastos.</li>
            )}
            <div ref={sentinelRef} />
          </ul>

          {/* desktop: tabla */}
          <div className="hidden md:block max-h-[60vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10">
                <tr className="text-left text-slate-700 dark:text-slate-200">
                  <th className="p-3 font-semibold">Concepto</th>
                  <th className="p-3 font-semibold">Categoría</th>
                  <th className="p-3 font-semibold text-right">Monto</th>
                  <th className="p-3 font-semibold">Nota</th>
                  <th className="p-3 font-semibold">Fecha</th>
                  {isAdmin && <th className="p-3 font-semibold text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {filtered.map((r) => (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/60"
                    >
                      <td className="p-3 text-slate-800 dark:text-slate-100">{r.concepto}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-700 dark:text-slate-200">
                          {r.categoria || "—"}
                        </span>
                      </td>
                      <td className="p-3 text-right tabular-nums text-slate-900 dark:text-slate-100">
                        {fmt.format(Number(r.monto) || 0)}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">{r.nota || "—"}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">
                        {dfmt.format(r.creado_en?.toDate?.() || new Date(r.creado_en))}
                      </td>
                      {isAdmin && (
                        <td className="p-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => goEdit(r.id)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-2.5 py-1.5 text-xs hover:bg-slate-50/60 dark:hover:bg-slate-800/60"
                            >
                              <PencilLine className="h-4 w-4" /> Editar
                            </button>
                            <button
                              onClick={() => setToDelete({ id: r.id })}
                              className="inline-flex items-center gap-1.5 rounded-md border border-red-200/70 dark:border-red-900/40 text-red-700 dark:text-red-400 px-2.5 py-1.5 text-xs hover:bg-red-50/60 dark:hover:bg-red-950/30"
                            >
                              <Trash2 className="h-4 w-4" /> Eliminar
                            </button>
                          </div>
                        </td>
                      )}
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
            <div ref={sentinelRef} />
          </div>

          {/* footer estado */}
          <div className="p-3 text-center text-sm text-slate-500 dark:text-slate-400">
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
              </span>
            ) : !hasMore && rows.length > 0 ? (
              "No hay más resultados."
            ) : null}
          </div>
        </div>

        {/* modal eliminar */}
        <AnimatePresence>
          {toDelete && (
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
                className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xl"
              >
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Eliminar gasto
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Esta acción moverá el gasto a eliminado y no será visible en la lista.
                </p>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    onClick={() => setToDelete(null)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm text-slate-700 dark:text-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-sm text-white"
                  >
                    Eliminar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Aquí se pintan los sheets anidados: /gastos/nuevo y /gastos/editar/:id */}
      <Outlet />

      <Toaster richColors position="top-right" />
    </div>
  );
}
