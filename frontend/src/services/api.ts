import axios, { AxiosError } from "axios";
// Importamos la función global que dispara el modal de sesión expirada
import { triggerSessionExpiredModal } from "../context/AuthErrorContext";

const API_URL = "http://localhost:4000/api";

// Crear instancia de Axios
const api = axios.create({
  baseURL: API_URL,
});

// --- Interceptores ---

// 1. Interceptor de Petición: Añade el token a cada solicitud saliente.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error("Error en interceptor de petición:", error);
    return Promise.reject(error);
  }
);

// 2. Interceptor de Respuesta: Maneja errores globales, especialmente el 401 (No Autorizado).
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response && error.response.status === 401) {
      if (error.config?.url?.endsWith("/auth/login")) {
        return Promise.reject(error); // Deja que LoginForm lo maneje
      }
      localStorage.removeItem("token");
      triggerSessionExpiredModal();
      return Promise.reject(new Error("Sesión expirada manejada globalmente."));
    }
    return Promise.reject(error);
  }
);

// --- Funciones de API ---

// Autenticación
export const loginUser = async (credentials: any) => {
  const response = await api.post("/auth/login", credentials);
  return response.data;
};

// Líneas de Producción (CRUD)
export const getProductionLines = async () => {
  const response = await api.get("/lineas");
  return response.data;
};
export const getProductionLineById = async (id: string) => {
  const response = await api.get(`/lineas/${id}`);
  return response.data;
};
export const createProductionLine = async (lineaData: {
  nombre: string;
  descripcion?: string;
  limiteReprocesos?: number;
  opcuaUrl?: string | null;
}) => {
  const response = await api.post("/lineas", lineaData);
  return response.data;
};
export const updateProductionLine = async (
  id: string,
  lineaData: {
    nombre?: string;
    descripcion?: string;
    limiteReprocesos?: number;
    opcuaUrl?: string | null;
  }
) => {
  const response = await api.put(`/lineas/${id}`, lineaData);
  return response.data;
};

// Estaciones (CRUD)
export const createStation = async (estacionData: any) => {
  const response = await api.post("/lineas/estaciones", estacionData);
  return response.data;
};
export const createStationWithParameter = async (data: any) => {
  const response = await api.post("/lineas/estaciones-con-parametro", data);
  return response.data;
};
export const updateStation = async (
  id: string,
  // --- V4: Actualizado para incluir los nuevos campos ---
  estacionData: {
    nombreEstacion?: string;
    orden?: number;
    triggerNodeId?: string | null;
    serieNodeId?: string | null;
  }
) => {
  const response = await api.put(`/lineas/estaciones/${id}`, estacionData);
  return response.data;
};

// Parámetros (CRUD)
export const createParameterForStation = async ({
  estacionId,
  parametroData,
}: {
  estacionId: number;
  parametroData: any;
}) => {
  const response = await api.post(
    `/lineas/estaciones/${estacionId}/parametros`,
    parametroData
  );
  return response.data;
};
export const updateParameter = async (id: string, parametroData: any) => {
  const response = await api.put(`/lineas/parametros/${id}`, parametroData);
  return response.data;
};

// Eliminación Genérica
export const deleteResource = async (
  resourceType: "linea" | "estacion" | "parametro",
  id: string
) => {
  // Construir la URL genérica que espera el backend
  const endpoint = `/lineas/${resourceType}/${id}`;
  await api.delete(endpoint);
  return { success: true };
};

// Gestión de Usuarios (CRUD - Solo Superadmin)
export const getOperadores = async () => {
  const response = await api.get("/usuarios/operadores");
  return response.data;
};
export const getAdmins = async () => {
  const response = await api.get("/usuarios/admins");
  return response.data;
};
export const createUser = async (userData: {
  username: string;
  password: string;
  rol: "admin" | "operador";
}) => {
  const response = await api.post("/usuarios", userData);
  return response.data;
};
export const updateUser = async (userId: number, userData: any) => {
  const response = await api.put(`/usuarios/${userId}`, userData);
  return response.data;
};
export const deleteUser = async (userId: number) => {
  await api.delete(`/usuarios/${userId}`);
  return { success: true };
};

// Lógica de Producción
export const startNewLote = async (lineaId: number) => {
  const response = await api.post("/produccion/iniciar-lote", { lineaId });
  return response.data;
};
export const finishActiveLote = async (lineaId: number) => {
  const response = await api.post("/produccion/finalizar-lote", { lineaId });
  return response.data;
};

export const getActiveLoteRecordsByLinea = async (lineaId: string) => {
  const response = await api.get(`/produccion/registros/linea/${lineaId}`);
  return response.data;
};

// ========================================================================
// FUNCIÓN DE TRAZABILIDAD (BÚSQUEDA SIMPLE)
// ========================================================================
export const getProductTraceability = async (
  numeroSerie: string,
  lineaId?: string // <-- Parámetro opcional
) => {
  const queryString = lineaId ? `?lineaId=${lineaId}` : "";
  const response = await api.get(
    `/produccion/trazabilidad/${numeroSerie}${queryString}`
  );
  return response.data;
};

// ========================================================================
// FUNCIONES DE BÚSQUEDA AVANZADA (HISTORIAL)
// ========================================================================
// 1. Interfaz para los filtros
export interface FiltrosHistorial {
  año?: number;
  mes?: number;
  dia?: number;
  numeroSerie?: string;
  lineaId?: number;
  nombreLote?: string;
  // --- ¡NUEVO! Campo de estado añadido ---
  estado?: string;
  // --- Fin Nuevo ---
}

// 2. Función para buscar en el historial
export const buscarRegistrosHistorial = async (filtros: FiltrosHistorial) => {
  const params = new URLSearchParams();

  if (filtros.año) params.append("año", String(filtros.año));
  if (filtros.mes) params.append("mes", String(filtros.mes));
  if (filtros.dia) params.append("dia", String(filtros.dia));
  if (filtros.numeroSerie) params.append("numeroSerie", filtros.numeroSerie);
  if (filtros.lineaId) params.append("lineaId", String(filtros.lineaId));
  if (filtros.nombreLote) params.append("nombreLote", filtros.nombreLote);

  // --- ¡AÑADIDO! Lógica para enviar el filtro de estado ---
  if (filtros.estado && filtros.estado !== "todos") {
    params.append("estado", filtros.estado);
  }
  // --- Fin Añadido ---

  const response = await api.get(`/trazabilidad/buscar?${params.toString()}`);
  return response.data;
};

// 3. Función para obtener fechas
export const getFechasDisponibles = async () => {
  const response = await api.get("/trazabilidad/fechas-disponibles");
  return response.data;
};

// Función para el Simulador
export const simulateProductionStep = async (data: {
  numeroSerie: string;
  estacionId: number;
  registrosParametros: { parametroId: number; valorReportado: string }[];
}) => {
  const response = await api.post("/produccion/registrar-paso", data);
  return response.data;
};

// --- ¡NUEVO! Renombrar 'simulateProductionStep' para claridad ---
// Esta función hace lo mismo pero se usa en 'RegistroManualPage'
export const registrarPasoManual = async (data: {
  numeroSerie: string;
  estacionId: number;
  registrosParametros: { parametroId: number; valorReportado: string }[];
}) => {
  // Llama al mismo endpoint que usaba el simulador
  const response = await api.post("/produccion/registro-manual", data);
  return response.data;
};

// ...

// Función para obtener el detalle de fallas (Para el Modal de Historial)
// Función para obtener el detalle de fallas (Para el Modal de Historial)
export const getFallasProducto = async (productoId: number) => {
  // CORRECTO:
  const response = await api.get(`/trazabilidad/fallas/${productoId}`);
  return response.data;
};

// Exportar la instancia configurada
export default api;
