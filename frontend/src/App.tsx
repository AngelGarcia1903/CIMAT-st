import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Contexto
import {
  AuthErrorProvider,
  useInitializeAuthErrorHandling,
} from "./context/AuthErrorContext";

// Layouts y Rutas
import ProtectedRoute from "./components/Layouts/ProtectedRoute";
import MainLayout from "./components/Layouts/MainLayout";

// Páginas
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import LineasPage from "./pages/LineasPage";
import CrearLineaPage from "./pages/CrearLineaPage";
import CrearEstacionPage from "./pages/CrearEstacionPage";
import MonitorProduccionPage from "./pages/MonitorProduccionPage";
import GestionUsuariosPage from "./pages/GestionUsuariosPage";
import VerOperadoresPage from "./pages/VerOperadoresPage";
import EditLineaPage from "./pages/EditLineaPage";
import EditEstacionPage from "./pages/EditEstacionPage";
import BusquedaAvanzadaPage from "./pages/BusquedaAvanzadaPage"; // <-- 1. Importar
import RegistroManualPage from "./pages/RegistroManualPage";

const queryClient = new QueryClient();
const InitializeErrorHandler: React.FC = () => {
  useInitializeAuthErrorHandling();
  return null;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthErrorProvider>
        <InitializeErrorHandler />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                {/* Rutas Principales */}
                <Route index element={<HomePage />} />
                <Route path="home" element={<HomePage />} />
                <Route
                  path="monitor/:lineaId"
                  element={<MonitorProduccionPage />}
                />
                <Route path="historial" element={<BusquedaAvanzadaPage />} />{" "}
                {/* <-- 2. Añadir Ruta */}
                {/* Rutas de Configuración */}
                <Route path="lineas" element={<LineasPage />} />
                <Route path="lineas/crear" element={<CrearLineaPage />} />
                <Route
                  path="lineas/:lineaId/crear-estacion"
                  element={<CrearEstacionPage />}
                />
                <Route
                  path="lineas/:lineaId/editar"
                  element={<EditLineaPage />}
                />
                <Route
                  path="lineas/:lineaId/estaciones/:estacionId/editar"
                  element={<EditEstacionPage />}
                />
                {/* Rutas Específicas de Roles */}
                <Route path="usuarios" element={<GestionUsuariosPage />} />
                <Route path="ver-operadores" element={<VerOperadoresPage />} />
                {/* Ruta del Simulador */}
                <Route
                  path="registro-manual"
                  element={<RegistroManualPage />}
                />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthErrorProvider>
    </QueryClientProvider>
  );
}

export default App;
