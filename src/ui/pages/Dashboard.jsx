// Dashboard.jsx – versión mobile‑first pro
import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Trophy, Medal, Users } from "lucide-react";

import Header from "../components/Header.jsx";
import { listDonations, getExpensesTotal } from "../../lib/firebase.js";

const fmt = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

// Helpers visuales mobile-first
const card =
  "rounded-2xl ring-1 ring-slate-200/70 dark:ring-slate-700 bg-white dark:bg-slate-900";
const kpi =
  "p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60";

export default function Dashboard() {
  const { campanaId } = useParams();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [expTotal, setExpTotal] = useState(0); // total gastos

  useEffect(() => {
  (async () => {
    setLoading(true);
    try {
      const [donData, gastosTotal] = await Promise.all([
        listDonations({ campanaId, max: 500 }),
        getExpensesTotal({ campanaId, pageSize: 200 }),
      ]);
      setRows(donData);
      setExpTotal(gastosTotal);
    } catch (e) {
      toast.error("No se pudieron cargar donaciones/gastos");
      if (import.meta.env.DEV) console.error(e);
    } finally { setLoading(false); }
  })();
}, [campanaId]);

  // KPIs
  const total = useMemo(() => rows.reduce((s, r) => s + (Number(r.monto) || 0), 0), [rows]);
const count = rows.length;
const balance = useMemo(() => total - expTotal, [total, expTotal]);

  // Top 3 donantes (por suma total, agrupando por nombre en minúsculas)
  const top3 = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      const key =
        (
          r.donante_nombre_lower ||
          (r.donante_nombre || "").toLowerCase() ||
          "anónimo"
        ).trim() || "anónimo";
      const display = r.donante_nombre || "Anónimo";
      const prev = map.get(key) || { nombre: display, total: 0, count: 0 };
      map.set(key, {
        nombre: display,
        total: prev.total + (Number(r.monto) || 0),
        count: prev.count + 1,
      });
    }
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 3);
  }, [rows]);

  return (
    <div>
      <Header title="Tablero" />
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="container px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
          {/* TOP 3 Donantes — versión compacta */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={card + " p-3 sm:p-4"}
          >
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="text-amber-500 w-4 h-4" />
              <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-50">
                Top 3 donantes
              </h3>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-10 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse"
                  />
                ))}
              </div>
            ) : top3.length === 0 ? (
              <p className="text-xs text-slate-500">Aún no hay donantes.</p>
            ) : (
              <ul className="space-y-1">
                {top3.map((d, idx) => (
                  <li
                    key={idx}
                    className={`flex items-center justify-between px-2 py-1.5 rounded-lg ${
                      idx === 0
                        ? "bg-amber-50/40 dark:bg-amber-500/10"
                        : idx === 1
                        ? "bg-slate-50/40 dark:bg-slate-500/10"
                        : "bg-orange-50/40 dark:bg-orange-500/10"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Medal
                        className={
                          idx === 0
                            ? "text-amber-500 w-4 h-4"
                            : idx === 1
                            ? "text-slate-400 w-4 h-4"
                            : "text-orange-500 w-4 h-4"
                        }
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-50 truncate">
                          {d.nombre}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {d.count} {d.count === 1 ? "aporte" : "aportes"}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-50 whitespace-nowrap">
                      {fmt.format(d.total)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </motion.section>

          {/* KPIs (1 col en mobile, 3 cols ≥ sm) */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.05 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4"
          >
            <div className={kpi}>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                Total recaudado
              </p>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-50">
                {fmt.format(total)}
              </h2>
            </div>
            <div className={kpi}>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                # Donaciones
              </p>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-50">
                {count}
              </h2>
            </div>
            <div className={kpi}>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                Balance
              </p>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-50">
                {fmt.format(balance)}
              </h2>
            </div>
          </motion.section>

          {/* Últimas donaciones (lista compacta) */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className={card + " p-3 sm:p-5"}
          >
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <Users className="text-teal-600" />
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-50">
                Últimas donaciones
              </h3>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse"
                  />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <p className="text-sm text-slate-500">
                Aún no hay donaciones. Toca el botón “+” para agregar la
                primera.
              </p>
            ) : (
              <ul className="space-y-2">
                {rows.slice(0, 5).map((r) => (
                  <li
                    key={r.id}
                    className="flex justify-between items-center p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate text-slate-900 dark:text-slate-100">
                        {r.donante_nombre || "Anónimo"}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {r.metodo || "N/D"} • {r.nota || "—"}
                      </div>
                    </div>
                    <div className="ml-3 text-sm sm:text-base font-bold text-slate-900 dark:text-slate-50 whitespace-nowrap">
                      {fmt.format(Number(r.monto) || 0)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </motion.section>
        </div>

        {/* FAB */}
        <Link
          to={`/c/${campanaId}/nueva`}
          className="fixed bottom-6 right-6 inline-flex items-center justify-center w-14 h-14 rounded-full
                     bg-teal-700 hover:bg-teal-800 text-white shadow-lg focus:outline-none focus:ring-4
                     focus:ring-teal-300/50 dark:focus:ring-teal-900/40"
          aria-label="Agregar donación"
          title="Agregar donación"
        >
          +
        </Link>
      </main>
    </div>
  );
}
