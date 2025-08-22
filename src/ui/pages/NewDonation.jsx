
import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header.jsx'
import { useAuth } from '../../lib/AuthContext.jsx'
import { addDonation } from '../../lib/firebase.js'

export default function NewDonation() {
  const { user } = useAuth()
  const { campanaId } = useParams()
  const nav = useNavigate()
  const [form, setForm] = useState({ nombre: '', monto: '', metodo: 'efectivo', nota: '' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const update = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  async function save(e) {
    e.preventDefault()
    const montoNum = Number(form.monto)
    if (!form.nombre) return alert('Escribe el nombre del donante (o Anónimo)')
    if (!montoNum || montoNum <= 0) return alert('Monto inválido')
    setSaving(true)
    try {
      await addDonation({ campanaId, nombre: form.nombre, monto: montoNum, metodo: form.metodo, nota: form.nota, uid: user?.uid })
      setToast('¡Listo! Donación agregada.')
      setTimeout(()=> setToast(null), 2000)
      setForm({ nombre: '', monto: '', metodo: 'efectivo', nota: '' })
    } catch (e) {
      alert('Error al guardar: ' + (e?.message || e))
    } finally {
      setSaving(false)
    }
  }

  function finish() {
    nav(`/c/${campanaId}`)
  }

  return (
    <div>
      <Header title="Agregar donación" />
      <main className="container py-6">
        <form onSubmit={save} className="space-y-4 card">
          <div>
            <label>Nombre del donante</label>
            <input name="nombre" placeholder="Ej. Anónimo o Juan Pérez" value={form.nombre} onChange={update} />
          </div>
          <div>
            <label>Monto (MXN)</label>
            <input name="monto" type="number" min="1" step="0.01" placeholder="0.00" value={form.monto} onChange={update} />
          </div>
          <div>
            <label>Método</label>
            <select name="metodo" value={form.metodo} onChange={update}>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <label>Nota (opcional)</label>
            <textarea name="nota" rows="3" value={form.nota} onChange={update} placeholder="Ej. referencia de pago"></textarea>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="bg-blue-600 text-white">{saving ? 'Guardando…' : 'Guardar y agregar otra'}</button>
            <button type="button" onClick={finish} className="bg-slate-200">Terminar</button>
          </div>
        </form>
        {toast && <div className="toast">{toast}</div>}
      </main>
    </div>
  )
}
