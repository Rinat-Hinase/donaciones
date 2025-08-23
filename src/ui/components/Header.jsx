// Header.jsx — Menú móvil pro y limpio
import React, { useState } from "react";
import { Link, NavLink, useParams } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import {
  LayoutDashboard,
  ListOrdered,
  Wallet,
  LogOut,
  Menu,
  X,
  HeartHandshake,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { twMerge } from "tailwind-merge";

export default function Header({ title }) {
  const { campanaId } = useParams();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);

  const baseLink =
    "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition select-none";
  const inactive =
    "text-slate-700 dark:text-slate-200 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/70";
  const active =
    "text-teal-700 dark:text-teal-300 bg-teal-600/10 dark:bg-teal-500/10 border-teal-200 dark:border-teal-800";

  return (
    <header
      className={
        "sticky top-0 z-40 shadow-sm ring-1 " +
        "bg-white/90 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800"
      }
    >
      <div className="mx-auto max-w-6xl px-4">
        <div className="h-16 flex items-center justify-between gap-3">
          {/* Brand */}
          <Link to={`/c/${campanaId}`} className="flex items-center gap-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-teal-600 text-white">
              <HeartHandshake size={28} />
            </div>

            <div className="leading-tight">
              <div className="text-base font-bold text-slate-900 dark:text-slate-50">
                {title || "Donaciones"}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Campaña: <span className="font-medium">{campanaId}</span>
              </div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-2">
            <NavLink
              end
              to={`/c/${campanaId}`}
              className={({ isActive }) =>
                twMerge(baseLink, isActive ? active : inactive)
              }
            >
              <LayoutDashboard size={16} /> <span>Tablero</span>
            </NavLink>
            <NavLink
              to={`/c/${campanaId}/lista`}
              className={({ isActive }) =>
                twMerge(baseLink, isActive ? active : inactive)
              }
            >
              <ListOrdered size={16} /> <span>Lista</span>
            </NavLink>
            <NavLink
              to={`/c/${campanaId}/gastos`}
              className={({ isActive }) =>
                twMerge(baseLink, isActive ? active : inactive)
              }
            >
              <Wallet size={16} /> <span>Gastos</span>
            </NavLink>
          </nav>

          {/* Actions desktop */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              to={`/c/${campanaId}/nueva`}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-teal-300/50 dark:focus:ring-teal-900/40"
            >
              <Plus size={16} /> Donación
            </Link>
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-300/60 dark:focus:ring-slate-700/60"
            >
              <LogOut size={16} /> Salir
            </button>
          </div>

          {/* Mobile toggler */}
          <button
            className="md:hidden inline-flex items-center justify-center w-12 h-12 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-300/60 dark:focus:ring-slate-700/60"
            aria-label="Abrir menú"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((s) => !s)}
          >
            {open ? <X size={42} /> : <Menu size={42} />}
          </button>
        </div>
      </div>

      {/* Mobile sheet + backdrop */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.button
              aria-label="Cerrar menú"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-40 bg-black/40"
            />
            {/* Sheet */}
            <motion.div
              id="mobile-menu"
              initial={{ y: -16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -16, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="md:hidden absolute left-0 right-0 z-50 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur"
            >
              <div className="px-4 py-3 space-y-2">
                <NavLink
                  end
                  onClick={() => setOpen(false)}
                  to={`/c/${campanaId}`}
                  className={({ isActive }) =>
                    twMerge(
                      baseLink + " w-full justify-start",
                      isActive ? active : inactive
                    )
                  }
                >
                  <LayoutDashboard size={16} /> <span>Tablero</span>
                </NavLink>

                <NavLink
                  onClick={() => setOpen(false)}
                  to={`/c/${campanaId}/lista`}
                  className={({ isActive }) =>
                    twMerge(
                      baseLink +
                        " w-full justify-start hover:ring-1 hover:ring-slate-200 dark:hover:ring-slate-700",
                      isActive ? active : inactive
                    )
                  }
                >
                  <ListOrdered size={16} /> <span>Lista</span>
                </NavLink>

                <NavLink
                  onClick={() => setOpen(false)}
                  to={`/c/${campanaId}/gastos`}
                  className={({ isActive }) =>
                    twMerge(
                      baseLink +
                        " w-full justify-start hover:ring-1 hover:ring-slate-200 dark:hover:ring-slate-700",
                      isActive ? active : inactive
                    )
                  }
                >
                  <Wallet size={16} /> <span>Gastos</span>
                </NavLink>

                {/* Acción primaria separada */}
                <Link
                  onClick={() => setOpen(false)}
                  to={`/c/${campanaId}/nueva`}
                  className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold w-full justify-center"
                >
                  <Plus size={16} /> Nueva donación
                </Link>

                <button
                  onClick={() => {
                    setOpen(false);
                    logout();
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 w-full text-left"
                >
                  <LogOut size={16} /> <span>Salir</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
