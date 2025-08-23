
import React from 'react'
import { Routes, Route, Navigate, Link, useParams, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '../lib/AuthContext.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import DonationsList from './pages/DonationsList.jsx'
import NewDonation from './pages/NewDonation.jsx'
import Expenses from './pages/Expenses.jsx'

function Guarded({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="container py-10">Cargando…</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
   <Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/c/:campanaId" element={<Guarded><Dashboard /></Guarded>} />
  <Route path="/c/:campanaId/lista" element={<Guarded><DonationsList /></Guarded>} />
  <Route path="/c/:campanaId/nueva" element={<Guarded><NewDonation /></Guarded>} />
  <Route path="/c/:campanaId/gastos" element={<Guarded><Expenses /></Guarded>} /> {/* ⬅️ agrega */}
  <Route path="*" element={<Navigate to="/c/default" replace />} />
</Routes>
    </AuthProvider>
  )
}
