
import React, { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext.jsx'
import { sendMagicLink } from '../../lib/firebase.js'

export default function Login() {
  const { user, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const location = useLocation()

  useEffect(() => {
    document.title = 'Entrar — Donaciones para Raúl'
  }, [])

  async function submit(e) {
    e.preventDefault()
    if (!email) return alert('Escribe tu correo')
    try {
      await sendMagicLink(email)
      setSent(true)
    } catch (e) {
      alert('No se pudo enviar el enlace: ' + (e?.message || e))
    }
  }

  if (!loading && user) {
    // Regresa a la ruta previa o al dashboard por defecto
    return <Navigate to="/c/default" replace />
  }

  return (
    <main className="container py-10">
      <div className="max-w-md mx-auto card space-y-4">
        <h1 className="text-2xl font-bold text-center">Entrar</h1>
        <p className="text-slate-600 text-center">Recibirás un enlace mágico en tu correo. Tócalo y listo.</p>
        <form onSubmit={submit} className="space-y-3">
          <label>Correo</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" />
          <button type="submit" className="bg-blue-600 text-white w-full">Enviar enlace</button>
        </form>
        {sent && <p className="text-green-700 text-sm text-center">Enlace enviado. Revisa tu correo.</p>}
      </div>
    </main>
  )
}
