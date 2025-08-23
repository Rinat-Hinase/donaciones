import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast, Toaster } from "sonner";
import { Eye, EyeOff, Lock, Mail, User, KeyRound, LogIn, PlusCircle, Shield } from "lucide-react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import zxcvbn from "zxcvbn";


import { useAuth } from "../../lib/AuthContext.jsx";

// Firebase
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import {
  getAuth,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";

// ==========================
// Helpers UI
// ==========================
const card = "max-w-md mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl ring-1 ring-slate-200/70 dark:ring-slate-700 p-6";
const inputBase =
  "mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-4 focus:ring-teal-200/60 focus:border-teal-600 dark:focus:ring-teal-800/40 text-sm";
const btn = "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed";
const btnPrimary =
  "bg-teal-700 hover:bg-teal-800 text-white focus:ring-4 focus:ring-teal-300/50 dark:focus:ring-teal-900/40";
const btnGhost =
  "border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200";
const modes = [
  { id: "login", label: "Iniciar sesión" },
  { id: "register", label: "Crear cuenta" },
  { id: "pin", label: "Entrar con PIN" },
];

// ==========================
// Schemas de validación
// ==========================
const emailSchema = z.string().email("Correo inválido");
const passSchema = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .regex(/[a-z]/, "Incluye minúsculas")
  .regex(/[A-Z]/, "Incluye mayúsculas")
  .regex(/\d/, "Incluye números");

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

const registerSchema = z
  .object({
    name: z.string().min(2, "Nombre muy corto").max(60, "Nombre muy largo"),
    email: emailSchema,
    password: passSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Las contraseñas no coinciden",
    path: ["confirm"],
  });

const pinSchema = z.object({ pin: z.string().regex(/^\d{4,8}$/, "PIN de 4 a 8 dígitos") });

// ==========================
// Medidor de fuerza
// ==========================
function PasswordStrength({ value = "" }) {
  const { score } = useMemo(() => zxcvbn(value), [value]);
  const labels = ["Muy débil", "Débil", "Aceptable", "Buena", "Fuerte"]; // 0..4
  const pct = ((score + 1) / 5) * 100;
  const color = ["bg-red-500", "bg-orange-500", "bg-amber-500", "bg-emerald-500", "bg-teal-600"][score] || "bg-slate-300";
  return (
    <div className="mt-1">
      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <div className={twMerge("h-2 transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs mt-1 text-slate-600 dark:text-slate-400">Fuerza: {labels[score]}</p>
    </div>
  );
}

// ==========================
// Componente principal
// ==========================
export default function Login() {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState("login");
  const [showPass, setShowPass] = useState(false);
  const [showPassReg, setShowPassReg] = useState(false);

  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || "/c/default";

  useEffect(() => {
    document.title = "Entrar — Donaciones";
  }, []);

  // Forms
  const loginForm = useForm({ resolver: zodResolver(loginSchema), mode: "onBlur", defaultValues: { email: "", password: "" } });
  const registerForm = useForm({ resolver: zodResolver(registerSchema), mode: "onBlur", defaultValues: { name: "", email: "", password: "", confirm: "" } });
  const pinForm = useForm({ resolver: zodResolver(pinSchema), mode: "onChange", defaultValues: { pin: "" } });

  // ==========================
  // Acciones
  // ==========================
  async function signInGoogle() {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    try {
      const p = signInWithPopup(auth, provider);
      toast.promise(p, { loading: "Conectando con Google…", success: "¡Listo!", error: "No se pudo iniciar con Google" });
      const cred = await p;
      // Perfil mínimo/merge en Firestore
      const db = getFirestore();
      await setDoc(
        doc(db, "usuarios", cred.user.uid),
        {
          actualizado_en: serverTimestamp(),
          creado_en: serverTimestamp(),
          metodo_acceso: "google",
          rol: "visor",
          campana_actual: "default",
          nombre_mostrado: cred.user.displayName || null,
          email: cred.user.email || null,
          verificado: cred.user.emailVerified || false,
          ua: typeof navigator !== "undefined" ? navigator.userAgent : null,
        },
        { merge: true }
      );
    } catch (e) {
      // sonner ya mostró el error, pero log detallado en dev
      if (import.meta.env.DEV) console.error("Google sign-in error", e);
    }
  }

  async function onSubmitLogin(values) {
    const auth = getAuth();
    try {
      const p = signInWithEmailAndPassword(auth, values.email.trim(), values.password);
      toast.promise(p, { loading: "Entrando…", success: "Bienvenido", error: "Credenciales inválidas" });
      const cred = await p;
      const db = getFirestore();
      await setDoc(
        doc(db, "usuarios", cred.user.uid),
        { actualizado_en: serverTimestamp(), metodo_acceso: "email_password", email: cred.user.email || values.email.trim() },
        { merge: true }
      );
    } catch (e) {
      if (import.meta.env.DEV) console.error("Login error", e);
    }
  }

  async function onSubmitRegister(values) {
    const auth = getAuth();
    try {
      const p = createUserWithEmailAndPassword(auth, values.email.trim(), values.password);
      toast.promise(p, { loading: "Creando cuenta…", success: "Cuenta creada", error: "No se pudo crear la cuenta" });
      const cred = await p;
      try { await updateProfile(cred.user, { displayName: values.name.trim() }); } catch {}
      try { await sendEmailVerification(cred.user); } catch {}
      const db = getFirestore();
      await setDoc(
        doc(db, "usuarios", cred.user.uid),
        {
          creado_en: serverTimestamp(),
          actualizado_en: serverTimestamp(),
          metodo_acceso: "email_password",
          rol: "visor",
          campana_actual: "default",
          nombre_mostrado: values.name.trim(),
          email: values.email.trim(),
          verificado: cred.user.emailVerified || false,
          ua: typeof navigator !== "undefined" ? navigator.userAgent : null,
        },
        { merge: true }
      );
    } catch (e) {
      if (import.meta.env.DEV) console.error("Register error", e);
    }
  }

  async function onSubmitPin(values) {
    const clean = (values.pin || "").trim();
    try {
      const auth = getAuth();
      if (!auth.currentUser) await signInAnonymously(auth);

      const db = getFirestore();
      const ref = doc(db, "accesos", clean);
      const snap = await getDoc(ref);
      if (!snap.exists()) return toast.error("PIN no encontrado");
      const data = snap.data();
      if (data.activo === false) return toast.error("PIN desactivado");
      if (data.expires_at && Date.now() > Number(data.expires_at)) return toast.error("PIN expirado");

      await setDoc(
        doc(db, "usuarios", auth.currentUser.uid),
        {
          creado_en: serverTimestamp(),
          actualizado_en: serverTimestamp(),
          metodo_acceso: "pin",
          ultimo_pin: clean,
          rol: data.rol || "visor",
          campana_actual: data.campana_id || "default",
          nombre_mostrado: data.nombre_mostrado || data.nombre || null,
          ua: typeof navigator !== "undefined" ? navigator.userAgent : null,
        },
        { merge: true }
      );
      toast.success("Acceso con PIN concedido");
    } catch (e) {
      toast.error("No se pudo validar el PIN");
      if (import.meta.env.DEV) console.error("PIN error", e);
    }
  }

  if (!loading && user) return <Navigate to={redirectTo} replace />;

  // ==========================
  // UI
  // ==========================
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">

      <Toaster richColors position={typeof window !== "undefined" && window.innerWidth < 768 ? "bottom-center" : "top-right"} />

      <div className={card}>
        <div className="text-center space-y-1 mb-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Bienvenido 👋</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm">Accede a tu panel de donaciones</p>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {modes.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={twMerge(
                btn,
                mode === m.id
                  ? "bg-teal-700 text-white hover:bg-teal-800"
                  : btnGhost
              )}
            >
              {m.id === "login" && <LogIn size={18} />}
              {m.id === "register" && <PlusCircle size={18} />}
              {m.id === "pin" && <KeyRound size={18} />}
              <span className="text-sm">{m.label}</span>
            </button>
          ))}
        </div>

        {/* Google */}
        <button onClick={signInGoogle} className={twMerge(btn, btnGhost, "w-full mb-4")}> 
          <svg width="18" height="18" viewBox="0 0 48 48" className="mr-1" aria-hidden>
            <path fill="#FFC107" d="M43.61 20.08H42V20H24v8h11.32c-1.64 4.66-6.08 8-11.32 8-6.63 0-12-5.37-12-12s5.37-12 12-12c3.06 0 5.85 1.15 7.96 3.04l5.66-5.66C34.46 6.02 29.51 4 24 4 12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20c0-1.34-.14-2.65-.39-3.92z"/>
            <path fill="#FF3D00" d="M6.31 14.69l6.57 4.82C14.35 16.2 18.77 13 24 13c3.06 0 5.85 1.15 7.96 3.04l5.66-5.66C34.46 6.02 29.51 4 24 4c-7.73 0-14.41 4.37-17.69 10.69z"/>
            <path fill="#4CAF50" d="M24 44c5.18 0 9.94-1.98 13.52-5.22l-6.24-5.27C29.2 35.48 26.73 36 24 36c-5.2 0-9.61-3.31-11.28-7.93l-6.5 5.02C9.45 39.52 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.61 20.08H42V20H24v8h11.32c-.79 2.25-2.25 4.16-4 5.49l6.24 5.27C39.84 36.68 44 30.52 44 24c0-1.34-.14-2.65-.39-3.92z"/>
          </svg>
          <span>Continuar con Google</span>
        </button>

        <div className="relative my-4">
          <div className="h-px bg-slate-200 dark:bg-slate-700" />
          <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-900 px-3 text-xs text-slate-500">o continúa con tu correo</span>
        </div>

        <AnimatePresence mode="wait">
          {mode === "login" && (
            <motion.form
              key="login"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              onSubmit={loginForm.handleSubmit(onSubmitLogin)}
              className="space-y-3"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Correo</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input {...loginForm.register("email")} type="email" placeholder="tucorreo@ejemplo.com" className={inputBase + " pl-10"} aria-invalid={!!loginForm.formState.errors.email} />
                </div>
                {loginForm.formState.errors.email && (
                  <p className="text-xs text-red-600 mt-1">{loginForm.formState.errors.email.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input {...loginForm.register("password")} type={showPass ? "text" : "password"} placeholder="••••••••" className={inputBase + " pl-10 pr-10"} aria-invalid={!!loginForm.formState.errors.password} />
                  <button type="button" onClick={() => setShowPass((s) => !s)} className="absolute right-2 top-2.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="text-xs text-red-600 mt-1">{loginForm.formState.errors.password.message}</p>
                )}
              </div>
              <button type="submit" disabled={loginForm.formState.isSubmitting} className={twMerge(btn, btnPrimary, "w-full")}>
                <LogIn size={18} /> Entrar
              </button>
            </motion.form>
          )}

          {mode === "register" && (
            <motion.form
              key="register"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              onSubmit={registerForm.handleSubmit(onSubmitRegister)}
              className="space-y-3"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Nombre</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input {...registerForm.register("name")} placeholder="Tu nombre" className={inputBase + " pl-10"} aria-invalid={!!registerForm.formState.errors.name} />
                </div>
                {registerForm.formState.errors.name && (
                  <p className="text-xs text-red-600 mt-1">{registerForm.formState.errors.name.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Correo</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input {...registerForm.register("email")} type="email" placeholder="tucorreo@ejemplo.com" className={inputBase + " pl-10"} aria-invalid={!!registerForm.formState.errors.email} />
                </div>
                {registerForm.formState.errors.email && (
                  <p className="text-xs text-red-600 mt-1">{registerForm.formState.errors.email.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input {...registerForm.register("password")} type={showPassReg ? "text" : "password"} placeholder="Mínimo 8 caracteres" className={inputBase + " pl-10 pr-10"} aria-invalid={!!registerForm.formState.errors.password} />
                  <button type="button" onClick={() => setShowPassReg((s) => !s)} className="absolute right-2 top-2.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                    {showPassReg ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {registerForm.watch("password") && <PasswordStrength value={registerForm.watch("password")} />}
                {registerForm.formState.errors.password && (
                  <p className="text-xs text-red-600 mt-1">{registerForm.formState.errors.password.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Confirmar contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input {...registerForm.register("confirm")} type="password" placeholder="Repite tu contraseña" className={inputBase + " pl-10"} aria-invalid={!!registerForm.formState.errors.confirm} />
                </div>
                {registerForm.formState.errors.confirm && (
                  <p className="text-xs text-red-600 mt-1">{registerForm.formState.errors.confirm.message}</p>
                )}
              </div>
              <button type="submit" disabled={registerForm.formState.isSubmitting} className={twMerge(btn, btnPrimary, "w-full")}>
                <PlusCircle size={18} /> Crear cuenta
              </button>
            </motion.form>
          )}

          {mode === "pin" && (
            <motion.form
              key="pin"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              onSubmit={pinForm.handleSubmit(onSubmitPin)}
              className="space-y-3"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">PIN</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input {...pinForm.register("pin")} inputMode="numeric" pattern="\\d*" maxLength={8} placeholder="••••" className={inputBase + " pl-10 tracking-widest"} aria-invalid={!!pinForm.formState.errors.pin} onChange={(e) => { const v = e.target.value.replace(/[^\d]/g, ""); pinForm.setValue("pin", v, { shouldValidate: true }); }} />
                </div>
                {pinForm.formState.errors.pin && (
                  <p className="text-xs text-red-600 mt-1">{pinForm.formState.errors.pin.message}</p>
                )}
              </div>
              <button type="submit" disabled={pinForm.formState.isSubmitting || !pinForm.getValues("pin")} className={twMerge(btn, btnPrimary, "w-full")}>
                <KeyRound size={18} /> Validar PIN
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <p className="text-[11px] text-center mt-5 text-slate-500 dark:text-slate-400">
          Al continuar aceptas el acceso de solo lectura y el registro de actividad.
        </p>
      </div>
    </main>
  );
}
