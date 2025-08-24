import React from "react";
import {
  Routes,
  Route,
  Navigate,
  Link,
  useParams,
  useNavigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "../lib/AuthContext.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import DonationsList from "./pages/DonationsList.jsx";
import NewDonation from "./pages/NewDonation.jsx";
import Expenses from "./pages/Expenses.jsx";
import EditDonation from "./pages/EditDonation.jsx";
import EditExpense from "./pages/EditExpense.jsx";
import NewExpense from "./components/NewExpense.jsx";

function Guarded({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="container py-10">Cargando…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* (opcional) Dashboard en su propia ruta */}
        <Route
          path="/c/:campanaId"
          element={
            <Guarded>
              <Dashboard />
            </Guarded>
          }
        />
        {/* Gastos como ruta padre para sheets anidados */}
        <Route
          path="/c/:campanaId/gastos"
          element={
            <Guarded>
              <Expenses />
            </Guarded>
          }
        >
          {/* Sheet de alta anidado */}
          <Route path="nuevo" element={<NewExpense />} />
          {/* Sheet de edición anidado */}
          <Route path="editar/:gastoId" element={<EditExpense />} />
          {/* (próximo paso: /gastos/nuevo si migramos NewExpense a modo ruta) */}
        </Route>
        <Route
          path="/c/:campanaId/lista"
          element={
            <Guarded>
              <DonationsList />
            </Guarded>
          }
        >
          <Route path="nueva" element={<NewDonation />} />
          <Route path="editar/:donacionId" element={<EditDonation />} />
        </Route>
        <Route path="*" element={<Navigate to="/c/default" replace />} />
      </Routes>
    </AuthProvider>
  );
}
