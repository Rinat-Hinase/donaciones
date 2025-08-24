// firebase.js
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  startAfter,
  getDoc,
} from "firebase/firestore";

// Lee envs (Vite)
const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Validación estricta para evitar el error genérico de Firebase
function assertFirebaseConfig(c) {
  const missing = Object.entries(c)
    .filter(([, v]) => !v || String(v).trim() === "")
    .map(([k]) => k);
  if (missing.length) {
    const msg = `[Firebase config inválida] Faltan variables: ${missing.join(
      ", "
    )}.
Asegúrate de definirlas en .env.local con prefijo VITE_. Reinicia el dev server.`;
    console.error(msg, { cfg: c });
    throw new Error(msg);
  }
}
assertFirebaseConfig(cfg);

// Inicializa una sola vez (evita doble init en Vite HMR)
export const app = getApps().length ? getApps()[0] : initializeApp(cfg);
export const auth = getAuth(app);
export const db = getFirestore(app);

/* ============================
 *  Gate rápido de administrador
 * ============================ */
let _adminCache = { uid: null, ok: null };
export async function assertAdmin() {
  const uid = getAuth().currentUser?.uid;
  if (!uid) throw new Error("Necesitas iniciar sesión.");
  if (_adminCache.uid !== uid) _adminCache = { uid, ok: null };
  if (_adminCache.ok === true) return true;

  const snap = await getDoc(doc(db, "usuarios", uid));
  const ok = snap.exists() && snap.data()?.rol === "admin";
  _adminCache.ok = ok;
  if (ok) _adminCache.ok = true;
  return true;
}

// ----- Helpers existentes de auth -----
export async function sendMagicLink(email) {
  const actionCodeSettings = {
    url: window.location.origin + "/login",
    handleCodeInApp: true,
  };
  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
  window.localStorage.setItem("emailForSignIn", email);
}

export async function completeMagicLinkSignIn() {
  if (isSignInWithEmailLink(auth, window.location.href)) {
    let email = window.localStorage.getItem("emailForSignIn");
    if (!email) email = window.prompt("Confirma tu correo para continuar");
    await signInWithEmailLink(auth, email, window.location.href);
    window.localStorage.removeItem("emailForSignIn");
    return true;
  }
  return false;
}

export function logout() {
  return signOut(auth);
}

/* ============== DONACIONES ============== */
export async function addDonation({
  campanaId,
  nombre,
  monto,
  metodo,
  nota,
  uid,
}) {
  await assertAdmin();
  const ref = collection(db, "donaciones");
  await addDoc(ref, {
    campana_id: campanaId,
    donante_nombre: nombre,
    donante_nombre_lower: (nombre || "").toLowerCase(),
    monto: Number(monto),
    metodo,
    nota: nota || "",
    creado_por: uid || null,
    creado_en: serverTimestamp(),
    actualizado_en: serverTimestamp(),
    estado: "activo",
  });
}

export async function listDonationsPage({
  campanaId,
  pageSize = 10,
  cursor = null,
}) {
  const ref = collection(db, "donaciones");
  const filters = [
    where("campana_id", "==", campanaId),
    where("estado", "==", "activo"),
  ];
  let q = query(ref, ...filters, orderBy("creado_en", "desc"), limit(pageSize));
  if (cursor) {
    q = query(
      ref,
      ...filters,
      orderBy("creado_en", "desc"),
      startAfter(cursor),
      limit(pageSize)
    );
  }
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data(), _snap: d }));
  const nextCursor = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;
  return { items, nextCursor };
}

export async function deleteDonation(id) {
  await assertAdmin();
  await updateDoc(doc(db, "donaciones", id), {
    estado: "eliminado",
    actualizado_en: serverTimestamp(),
  });
}

export async function getDonation(id) {
  const snap = await getDoc(doc(db, "donaciones", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
export async function getDonationsTotals({
  campanaId,
  qNameLower = "",   // string en minúsculas
  method = "ALL",    // "ALL" | "efectivo" | "transferencia" | "tarjeta" | "otro"
  range = "ALL",     // "ALL" | "TODAY" | "7D"
  pageSize = 200,    // batch grande para sumar rápido
}) {
  let sum = 0;
  let count = 0;
  let cursor = null;

  function inRange(d) {
    if (range === "ALL") return true;
    const ts = d?.getTime?.() ?? (d ? new Date(d).getTime() : 0);
    if (!ts) return false;
    if (range === "TODAY") {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      const end = start + 24 * 60 * 60 * 1000;
      return ts >= start && ts < end;
    }
    if (range === "7D") {
      return ts >= Date.now() - 7 * 24 * 60 * 60 * 1000;
    }
    return true;
  }

  while (true) {
    const { items, nextCursor } = await listDonationsPage({ campanaId, pageSize, cursor });
    if (!items.length) break;

    for (const r of items) {
      // filtro por nombre (aplicado aquí para evitar bajar todo)
      const nameOk = qNameLower
        ? (r.donante_nombre_lower || "").includes(qNameLower)
        : true;
      if (!nameOk) continue;

      // método
      const metOk = method === "ALL" || (r.metodo || "").toLowerCase() === method;

      // rango
      const date = r.creado_en?.toDate?.() || (r.creado_en ? new Date(r.creado_en) : null);
      if (metOk && inRange(date)) {
        sum += Number(r.monto) || 0;
        count += 1;
      }
    }

    cursor = nextCursor;
    if (!cursor) break;
  }

  return { sum, count };
}
export async function updateDonation(id, { nombre, monto, metodo, nota }) {
  await assertAdmin();
  await updateDoc(doc(db, "donaciones", id), {
    donante_nombre: nombre,
    donante_nombre_lower: (nombre || "").toLowerCase(),
    monto: Number(monto),
    metodo,
    nota: nota || "",
    actualizado_en: serverTimestamp(),
    // estado se mantiene tal cual (activo)
  });
}

/* ================ GASTOS ================ */
export async function addExpense({
  campanaId,
  concepto,
  monto,
  categoria,
  nota,
  uid,
}) {
  await assertAdmin();
  const ref = collection(db, "gastos");
  await addDoc(ref, {
    campana_id: campanaId,
    concepto,
    categoria,
    monto: Number(monto),
    nota: nota || "",
    creado_por: uid || null,
    creado_en: serverTimestamp(),
    actualizado_en: serverTimestamp(),
    estado: "activo",
  });
}

// Página de gastos (cursor-based)
export async function listExpensesPage({
  campanaId,
  pageSize = 10,
  cursor = null,
}) {
  try {
    const ref = collection(db, "gastos");
    const filters = [
      where("campana_id", "==", campanaId),
      where("estado", "==", "activo"),
    ];
    let q = query(
      ref,
      ...filters,
      orderBy("creado_en", "desc"),
      limit(pageSize)
    );
    if (cursor)
      q = query(
        ref,
        ...filters,
        orderBy("creado_en", "desc"),
        startAfter(cursor),
        limit(pageSize)
      );
    const snap = await getDocs(q);
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data(), _snap: d }));
    const nextCursor = snap.docs.length
      ? snap.docs[snap.docs.length - 1]
      : null;
    return { items, nextCursor };
  } catch (e) {
    console.error("listExpensesPage error:", e);
    throw e;
  }
}

export async function deleteExpense(id) {
  await assertAdmin();
  await updateDoc(doc(db, "gastos", id), {
    estado: "eliminado",
    actualizado_en: serverTimestamp(),
  });
}

export async function getExpense(id) {
  const snap = await getDoc(doc(db, "gastos", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateExpense(id, { concepto, categoria, monto, nota }) {
  await assertAdmin();
  await updateDoc(doc(db, "gastos", id), {
    concepto: (concepto || "").trim(),
    categoria: categoria || "otros",
    monto: Number(monto),
    nota: (nota || "").trim(),
    actualizado_en: serverTimestamp(),
    // estado se mantiene (activo)
  });
}

// Total de gastos (paginado, suma en servidor)
export async function getExpensesTotal({ campanaId, pageSize = 200 }) {
  const ref = collection(db, "gastos");
  const filters = [
    where("campana_id", "==", campanaId),
    where("estado", "==", "activo"),
  ];

  let sum = 0;
  let cursor = null;

  while (true) {
    let q = query(
      ref,
      ...filters,
      orderBy("creado_en", "desc"),
      limit(pageSize)
    );
    if (cursor)
      q = query(
        ref,
        ...filters,
        orderBy("creado_en", "desc"),
        startAfter(cursor),
        limit(pageSize)
      );

    const snap = await getDocs(q);
    if (snap.empty) break;

    for (const d of snap.docs) sum += Number(d.data().monto) || 0;

    cursor = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;
    if (!cursor) break;
  }

  return sum;
}
