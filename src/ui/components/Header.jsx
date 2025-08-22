
import React from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext.jsx'

export default function Header({ title }) {
  const { campanaId } = useParams()
  const { logout } = useAuth()
  return (
    <header className="bg-white border-b">
      <div className="container py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">📋 {title || 'Donaciones para Raúl'}</h1>
        <nav className="flex items-center gap-3">
          <Link className="text-blue-600" to={`/c/${campanaId}`}>Tablero</Link>
          <Link className="text-blue-600" to={`/c/${campanaId}/lista`}>Lista</Link>
          <button onClick={logout} className="bg-slate-800 text-white px-3 py-1 rounded-lg">Salir</button>
        </nav>
      </div>
    </header>
  )
}
