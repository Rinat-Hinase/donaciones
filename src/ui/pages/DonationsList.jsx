
import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import Header from '../components/Header.jsx'
import { listDonations } from '../../lib/firebase.js'
import * as htmlToImage from 'html-to-image'

const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

export default function DonationsList() {
  const { campanaId } = useParams()
  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const printableRef = useRef(null)

  useEffect(() => {
    (async () => {
      setLoading(true)
      const data = await listDonations({ campanaId, qNameLower: q.toLowerCase(), max: 250 })
      setRows(data)
      setLoading(false)
    })()
  }, [campanaId, q])

  const total = rows.reduce((s, r) => s + (r.monto || 0), 0)

  async function downloadPng() {
    const node = printableRef.current
    if (!node) return
    const dataUrl = await htmlToImage.toPng(node, { pixelRatio: 2 })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `lista-donaciones-${campanaId}.png`
    a.click()
  }

  return (
    <div>
      <Header title="Lista de donaciones" />
      <main className="container py-6 space-y-4">
        <div className="card flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <input placeholder="Buscar por nombre…" value={q} onChange={e => setQ(e.target.value)} className="sm:max-w-xs" />
          <button onClick={downloadPng} className="bg-blue-600 text-white">Descargar como PNG</button>
        </div>

        <div id="printable" ref={printableRef} className="space-y-3">
          <div className="text-center">
            <h2 className="text-xl font-bold">Donaciones — {campanaId}</h2>
            <p className="text-slate-500 text-sm">
              Total: <b>{fmt.format(total)}</b> • Registros: <b>{rows.length}</b> • Fecha: {new Date().toLocaleString()}
            </p>
          </div>

          {loading ? (
            <p>Cargando…</p>
          ) : rows.length === 0 ? (
            <p className="text-slate-500">No hay donaciones.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Método</th>
                  <th>Nota</th>
                  <th className="text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td className="border">{r.donante_nombre}</td>
                    <td className="border">{r.metodo}</td>
                    <td className="border">{r.nota || '—'}</td>
                    <td className="border text-right font-semibold">{fmt.format(r.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
