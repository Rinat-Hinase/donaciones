
import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Header from '../components/Header.jsx'
import { listDonations } from '../../lib/firebase.js'

const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

export default function Dashboard() {
  const { campanaId } = useParams()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])

  useEffect(() => {
    (async () => {
      setLoading(true)
      const data = await listDonations({ campanaId, max: 100 })
      setRows(data)
      setLoading(false)
    })()
  }, [campanaId])

  const total = useMemo(() => rows.reduce((s, r) => s + (r.monto || 0), 0), [rows])
  const count = rows.length
  const promedio = count ? total / count : 0

  return (
    <div>
      <Header title="Tablero" />
      <main className="container py-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="stat">
            <p>Total recaudado</p>
            <h2>{fmt.format(total)}</h2>
          </div>
          <div className="stat">
            <p># Donaciones</p>
            <h2>{count}</h2>
          </div>
          <div className="stat">
            <p>Promedio</p>
            <h2>{fmt.format(promedio)}</h2>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Últimas donaciones</h3>
          {loading ? (
            <p>Cargando…</p>
          ) : rows.length === 0 ? (
            <p className="text-slate-500">Aún no hay donaciones. Toca el botón “+” para agregar la primera.</p>
          ) : (
            <ul className="space-y-2">
              {rows.slice(0,5).map(r => (
                <li key={r.id} className="flex justify-between items-center bg-white border rounded-xl p-3">
                  <div>
                    <div className="font-medium">{r.donante_nombre}</div>
                    <div className="text-xs text-slate-500">{r.metodo} • {r.nota || '—'}</div>
                  </div>
                  <div className="font-bold">{fmt.format(r.monto)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <Link to={`/c/${campanaId}/nueva`} className="fab">+</Link>
    </div>
  )
}
