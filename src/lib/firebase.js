
import { initializeApp } from 'firebase/app'
import { getAuth, isSignInWithEmailLink, sendSignInLinkToEmail, signInWithEmailLink, signOut } from 'firebase/auth'
import { getFirestore, collection, query, where, orderBy, limit, getDocs, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore'

// TODO: reemplaza con tus variables de entorno en producción
const firebaseConfig = {
  apiKey: "AIzaSyA6wc4XhjdrEDbc__ilNzPV6tpz-pKLjBY",
  authDomain: "donaciones-9601c.firebaseapp.com",
  projectId: "donaciones-9601c",
  storageBucket: "donaciones-9601c.firebasestorage.app",
  messagingSenderId: "425988619412",
  appId: "1:425988619412:web:773f24f876be3821e70881",
  measurementId: "G-L0DHFGKT6X"
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

export async function sendMagicLink(email) {
  const actionCodeSettings = {
    url: window.location.origin + '/login',
    handleCodeInApp: true,
  }
  await sendSignInLinkToEmail(auth, email, actionCodeSettings)
  window.localStorage.setItem('emailForSignIn', email)
}

export async function completeMagicLinkSignIn() {
  if (isSignInWithEmailLink(auth, window.location.href)) {
    let email = window.localStorage.getItem('emailForSignIn')
    if (!email) {
      email = window.prompt('Confirma tu correo para continuar')
    }
    await signInWithEmailLink(auth, email, window.location.href)
    window.localStorage.removeItem('emailForSignIn')
    return true
  }
  return false
}

export function logout() {
  return signOut(auth)
}

export async function addDonation({ campanaId, nombre, monto, metodo, nota, uid }) {
  const ref = collection(db, 'donaciones')
  await addDoc(ref, {
    campana_id: campanaId,
    donante_nombre: nombre,
    donante_nombre_lower: (nombre || '').toLowerCase(),
    monto: Number(monto),
    metodo,
    nota: nota || '',
    creado_por: uid || null,
    creado_en: serverTimestamp(),
    actualizado_en: serverTimestamp(),
    estado: 'activo'
  })
}

export async function listDonations({ campanaId, qNameLower, max = 25 }) {
  const ref = collection(db, 'donaciones')
  const filters = [where('campana_id', '==', campanaId), where('estado', '==', 'activo')]
  // NOTE: Para búsqueda básica por nombre
  // Firestore no soporta contains nativo, así que esto es demostrativo.
  const qq = query(ref, ...filters, orderBy('creado_en', 'desc'), limit(max))
  const snap = await getDocs(qq)
  const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  if (qNameLower) {
    return rows.filter(r => (r.donante_nombre_lower || '').includes(qNameLower))
  }
  return rows
}
